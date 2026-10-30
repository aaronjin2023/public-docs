(async () => {
'use strict';
const IS_STATIC=Boolean(window.GuanChaoStatic);
async function api(path,value) {
  if(IS_STATIC)return window.GuanChaoStatic.request(path,value);
  const response=await fetch(path,value===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
  const data=await response.json();if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);return data;
}
const S=await api('/api/reader');
const notify=message=>{const box=document.getElementById('notice');box.textContent=message;box.hidden=false;setTimeout(()=>{box.hidden=true;},5000);};
const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe = u => /^https?:\/\//i.test(u || '') ? esc(u) : '#';
const failedNewsImages = new Set();
function publicImageURL(value) {
  if(typeof value!=='string'||value.length>4096||/[\\\u0000-\u0020\u007f]/.test(value))return null;
  try {
    const url=new URL(value),host=url.hostname.toLowerCase().replace(/\.$/,'');
    // Browser-side syntax guard only; no DNS lookup, proxy or image prefetch.
    // Literal IPs and local/reserved names are deliberately not image sources.
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||host.length>253||
       !host.includes('.')||host.includes(':')||/^[\d.]+$/.test(host)||
       /(^|\.)(localhost|local|localdomain|internal|intranet|corp|lan|home|arpa|test|invalid|example|onion)$/.test(host)||
       host.split('.').some(label=>!(/^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label))))return null;
    return url.href;
  } catch {return null;}
}
function newsImageMarkup(event,mode='detail') {
  const image=event?.image;
  if(!image||typeof image!=='object')return '';
  const url=publicImageURL(image.url),sourceURL=publicImageURL(image.source_url);
  if(!url||!sourceURL||failedNewsImages.has(url))return '';
  const sourceAlt=typeof image.alt==='string'?image.alt.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,180):'';
  const alt=sourceAlt&&sourceAlt!=='来源配图'?`来源配图（原站文字：${sourceAlt}）`:'来源配图';
  const picture=`<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`;
  return mode==='list'?`<span class="news-image news-image-thumb">${picture}</span>`:
    `<figure class="news-image news-image-detail">${picture}<figcaption><a href="${esc(sourceURL)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">配图来源 ↗</a><span>外链图片</span></figcaption></figure>`;
}
function bindNewsImages(root) {
  root.querySelectorAll('.news-image img').forEach(image=>{
    const fail=()=>{failedNewsImages.add(image.src);const wrapper=image.closest('.news-image');wrapper?.closest('.event-row')?.classList.remove('has-news-image');wrapper?.remove();};
    image.addEventListener('error',fail,{once:true});
    if(image.complete&&image.naturalWidth===0)fail();
  });
}
const NOW = new Date(S.status.generated_at);
const LENS = {opportunity:'机会研究', editorial:'内容选题', news:'资讯阅读'};
const PRI = {high:3, medium:2, low:1}, PRI_ZH = {high:'高', medium:'中', low:'低'}, CONF_ZH = {high:'高', medium:'中', low:'低'};
const DOMS = ['商业经济','科技产品','科学探索','健康生活','社会国际','文化与体育'];
const dn = d => DOMS.indexOf(d) + 1;
const DIMS = {entities:'主体', people:'人群', mechanisms:'机制', needs:'需求', risks:'风险', regions:'地域', horizon:'时间', stage:'阶段'};
const SLOTS = S.status.analysis_hours_jst;
const fmt = (iso, o) => !iso || !Number.isFinite(+new Date(iso)) ? '未知' : new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Tokyo', hour12:false, ...o}).format(new Date(iso));
const hm = iso => fmt(iso, {hour:'2-digit', minute:'2-digit'});
const md = iso => fmt(iso, {month:'numeric', day:'numeric'}).replace('/', '月') + '日';
const mdhm = iso => fmt(iso, {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'});
const jstParts = t => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Tokyo', hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}).formatToParts(new Date(t)).map(x => [x.type, x.value])); return {y:+p.year, m:+p.month, d:+p.day, h:+p.hour, mi:+p.minute}; };
const JST = 9 * 36e5;
const slotOf = t => { const p = jstParts(t); const s = [...SLOTS].reverse().find(x => x <= p.h) ?? SLOTS[SLOTS.length - 1]; return Date.UTC(p.y, p.m - 1, p.d, s) - JST - (s > p.h ? 864e5 : 0); };
const nextSlotT = () => { const p = jstParts(NOW); const n = SLOTS.find(x => x > p.h); return n == null ? Date.UTC(p.y, p.m - 1, p.d + 1, SLOTS[0]) - JST : Date.UTC(p.y, p.m - 1, p.d, n) - JST; };
const edHH = t => String(jstParts(t).h).padStart(2, '0') + ':00';
const edLabel = t => `${md(t)} ${edHH(t)} 版`;
const dayKey = t => { const p = jstParts(t); return `${p.m}/${p.d}`; };
const events = S.events.map(e => ({...e, views: Object.keys(e.views || {}).length ? e.views : null, _t: +new Date(e.first_seen), _u: +new Date(e.updated_at)}));
for (const e of events) {
  e._ed = e.views ? slotOf(e._u) : null;
  const sl = S.threads.nodes.find(n=>n.event_id===e.id)?.slices;
  e._sourceHay=(e.sources||[]).flatMap(s=>[s.id,s.name,s.publisher]).join(' ').toLowerCase();
  e._hay = [e.title_zh, e.summary, ...(e.tags || []), ...Object.values(e.views || {}).map(v => v.reason), ...(sl ? Object.values(sl).flat() : [])].join(' ').toLowerCase();
}
const byId = new Map(events.map(e => [e.id, e]));
const nodes = new Map((S.threads?.nodes || []).map(n => [n.event_id, n]));
const store = { get(k, d) { try { const v = localStorage.getItem('guanchao-reader:'+location.pathname+':'+k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('guanchao-reader:'+location.pathname+':'+k, JSON.stringify(v)); } catch { notify('浏览器未允许保存阅读偏好，本机关注和反馈不受影响'); } } };
const state = {lens:'news', q:'', domain:'', ed:null, selected:null, pendingOpen:false, sort:'time', newOnly:false, savedOnly:false};
const savedIds=new Set(events.filter(e=>e.saved).map(e=>e.id)),feedback=Object.fromEntries(events.filter(e=>e.feedback).map(e=>[e.id,e.feedback])),readIds=new Set(store.get('read',[]));
// New means updated since the actual previous visit, with no simulated activity.
const lastVisit = store.get('lastVisit', 0);
const seenAt = lastVisit || +NOW;
addEventListener('pagehide', () => store.set('lastVisit', +NOW));
const isNew = e => e._u > seenAt;
const mobile = () => matchMedia('(max-width: 900px)').matches;
const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

// ---------- query ----------
function parseQuery(q) {
  const out = {text:[], domain:'', pri:'', st:'', src:''};
  for (const tok of q.trim().split(/\s+/).filter(Boolean)) {
    const m = tok.match(/^(领域|优先|状态|来源)[:：](.+)$/);
    if (!m) { out.text.push(tok.toLowerCase()); continue; }
    const v = m[2];
    if (m[1] === '领域') out.domain = DOMS.find(d => d.includes(v)) || v;
    else if (m[1] === '优先') { if (v === '待分析') out.st = '待分析'; else out.pri = {高:'high', 中:'medium', 低:'low', 待判断:'pending'}[v] || v; }
    else if (m[1] === '状态') out.st = v; else out.src = v.toLowerCase();
  }
  return out;
}
const matchQ = (e, pq) => {
  if (pq.domain && e.category !== pq.domain) return false;
  const r = e.views?.[state.lens];
  if (pq.pri === 'pending' ? !(e.views && !r) : pq.pri && r?.priority !== pq.pri) return false;
  if (pq.st && !e.state.includes(pq.st)) return false;
  if(pq.src&&!e._sourceHay.includes(pq.src))return false;
  return pq.text.every(t => e._hay.includes(t));
};
const showPending = pq => pq.st === '待分析' || state.pendingOpen || state.ed === 'pending';
function visible() {
  const pq = parseQuery(state.q);
  const all = events.filter(e => (!state.domain || e.category === state.domain) && (state.ed == null || (state.ed === 'pending' ? !e.views : e._ed === state.ed)) && (!state.newOnly || isNew(e)) && (!state.savedOnly || savedIds.has(e.id)) && matchQ(e, pq));
  const pending = all.filter(e => !e.views);
  const list = showPending(pq) || state.savedOnly ? all : all.filter(e => e.views);
  // time order is edition-first so the group headers are contiguous; pending material (no edition yet) sits on top
  list.sort(state.sort === 'priority' ? (a, b) => (PRI[b.views?.[state.lens]?.priority] || 0) - (PRI[a.views?.[state.lens]?.priority] || 0) || b._t - a._t : (a, b) => ((b._ed ?? Infinity) - (a._ed ?? Infinity)) || b._t - a._t);
  return {list, pq, pending};
}
const hl = (text, terms) => { const ts = terms.filter(t => t.length > 1).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); return ts.length ? esc(text).replace(new RegExp(ts.join('|'), 'gi'), m => `<mark>${m}</mark>`) : esc(text); };
const priHtml = (e, k, cls = '') => { const r = e.views?.[k]; return r ? `<span class="pri p${PRI[r.priority]} ${cls}" role="img" aria-label="${PRI_ZH[r.priority]}优先级"><i></i><i></i><i></i></span>` : `<span class="pri p0 ${cls}" role="img" aria-label="${e.views ? '待判断' : '待分析'}"><i></i><i></i><i></i></span>`; };
const countIn = v => events.filter(e => (!state.domain || e.category === state.domain) && (!state.q || matchQ(e, parseQuery(state.q))) && v(e)).length;

// ---------- index header ----------
function renderEd() {
  const last=S.status.last_batch,nxt=nextSlotT();
  if(IS_STATIC){$('ed').innerHTML=`<b>阅读室 · ${md(NOW)}</b><span>公开快照 ${mdhm(NOW)} JST</span><span>关注仅保存在当前浏览器</span>`;return;}
  $('ed').innerHTML=`<b>阅读室 · ${md(NOW)}</b><span>下次分析计划 ${hm(nxt)} JST</span><span class="live">本机读取 ${hm(NOW)}</span>`;
}
function renderBars() {
  const p=jstParts(NOW),end=slotOf(+NOW),start=Date.UTC(p.y,p.m-1,p.d-6)-JST,slots=[];
  for (let t = start; t <= end; t += 4 * 36e5) slots.push(t);
  const cnt = new Map(); for (const e of events) if (e._ed != null) cnt.set(e._ed, (cnt.get(e._ed) || 0) + 1);
  const pend = events.filter(e => !e.views).length, max = Math.max(1, ...cnt.values());
  const days = []; for (const t of slots) { const k = dayKey(t); if (!days.length || days[days.length - 1].k !== k) days.push({k, slots:[]}); days[days.length - 1].slots.push(t); }
  const focusT = state.ed != null && state.ed !== 'pending' ? state.ed : end;
  $('bars').innerHTML = `<div class="row">${days.map(d => `<div class="day"><div class="slots">${d.slots.map(t => { const n = cnt.get(t) || 0; return `<button type="button" class="b ${t === end ? 'cur' : ''}" data-ed="${t}" tabindex="${t === focusT ? 0 : -1}" aria-pressed="${state.ed === t}" aria-label="${edLabel(t)}，${n} 条"><i style="height:${Math.round(n / max * 100)}%"></i></button>`; }).join('')}</div><span>${d.k}</span></div>`).join('')}</div><div class="foot"><span id="bar-cap"></span><button type="button" class="pp" data-ed="pending" aria-pressed="${state.ed === 'pending'}">待分析 <b>${pend}</b></button></div>`;
  const cap = $('bar-cap'), base = state.ed == null ? `近 7 天 ${slots.length} 个分析时段，按更新时间归组` : state.ed === 'pending' ? `<b>待分析</b> · 本页 ${pend} 条 / 可处理 ${S.status.queued} 条；按预算排队` : `<b>${edLabel(state.ed)}</b> · ${cnt.get(state.ed) || 0} 条`;
  cap.innerHTML = base;
  const bs = [...$('bars').querySelectorAll('[data-ed]')];
  bs.forEach(b => {
    const ed = b.dataset.ed === 'pending' ? 'pending' : +b.dataset.ed;
    b.onclick = () => { state.ed = state.ed === ed ? null : ed; update(); };
    b.onmouseenter = b.onfocus = () => { cap.innerHTML = ed === 'pending' ? `<b>待分析</b> · 本页 ${pend} 条 / 可处理 ${S.status.queued} 条；按预算排队` : `<b>${edLabel(ed)}</b> · ${cnt.get(ed) || 0} 条`; };
    b.onmouseleave = b.onblur = () => { cap.innerHTML = base; };
  });
  $('bars').onkeydown = ev => {                                        // one tab stop for the row; arrows walk the bars
    if (!['ArrowLeft', 'ArrowRight'].includes(ev.key)) return;
    const row = bs.filter(b => b.classList.contains('b')), i = row.indexOf(document.activeElement); if (i < 0) return;
    const n = row[Math.max(0, Math.min(row.length - 1, i + (ev.key === 'ArrowRight' ? 1 : -1)))];
    row.forEach(b => b.tabIndex = b === n ? 0 : -1); n.focus(); ev.preventDefault();
  };
}
function renderLens() {
  $('lens').innerHTML = Object.entries(LENS).map(([k, v], i) => `<button type="button" data-lens="${k}" aria-pressed="${state.lens === k}">${v}<i aria-hidden="true">${i + 1}</i></button>`).join('');
  $('lens').querySelectorAll('button').forEach(b => b.onclick = () => { state.lens = b.dataset.lens; update(); });
}
function renderChips(list, pending, pq) {
  const chips = [];
  if (state.domain) chips.push([`领域 <b>${esc(state.domain)}</b>`, () => state.domain = '']);
  if (state.ed != null) chips.push([state.ed === 'pending' ? '<b>待分析</b>' : `<b>${edLabel(state.ed)}</b>`, () => state.ed = null]);
  if (state.pendingOpen && pending.length && !pq.st) chips.push([`含 <b>待分析</b>`, () => state.pendingOpen = false]);
  const nNew = countIn(e => e.views && isNew(e)), nSaved = savedIds.size;
  $('chips').innerHTML = `<span><span class="n">${list.length}</span> 条</span>` + chips.map((c, i) => `<button type="button" class="chip" data-chip="${i}">${c[0]}<span class="x" aria-hidden="true">×</span><span class="sr">，清除</span></button>`).join('')
    + (nNew || state.newOnly ? `<button type="button" class="chip" id="new-b" aria-pressed="${state.newOnly}">新 <b>${nNew}</b></button>` : '')
    + `<button type="button" class="chip" id="saved-b" aria-controls="list" aria-pressed="${state.savedOnly}" title="查看已关注的事件">我的关注 <b>${nSaved}</b></button>`
    + `<button type="button" class="sort" id="sort-b" aria-label="切换排序，当前${state.sort === 'time' ? '按时间' : '按优先级'}">${state.sort === 'time' ? '按时间 ↓' : `按${LENS[state.lens]}优先级 ↓`}</button>`;
  $('chips').querySelectorAll('[data-chip]').forEach(b => b.onclick = () => { chips[+b.dataset.chip][1](); update(); });
  $('new-b')?.addEventListener('click', () => { state.newOnly = !state.newOnly; update(); });
  $('saved-b')?.addEventListener('click', () => { const savedOnly=!state.savedOnly;Object.assign(state,{savedOnly,q:'',domain:'',ed:null,newOnly:false});$('q').value='';listLimit=80;update(); });
  $('sort-b').onclick = () => { state.sort = state.sort === 'time' ? 'priority' : 'time'; update(); };
}

// ---------- list ----------
function itemHtml(e, pq) {
  const r = e.views?.[state.lens], otherDay = e._ed != null && dayKey(e._t) !== dayKey(e._ed);
  return `<button type="button" class="it ${readIds.has(e.id) && !isNew(e) ? 'read' : ''}" data-id="${e.id}" aria-current="${state.selected === e.id}"><span class="m"><time>${otherDay ? dayKey(e._t) + ' ' : ''}${hm(e.first_seen)}</time><i class="dot c${dn(e.category)}"></i>${esc(e.category)}${e.critical ? '<span class="flag red">重要线索</span>' : ''}${e.state === '重要更新' ? '<span class="flag">重要更新</span>' : ''}${e.correction ? '<span class="flag amber">更正</span>' : ''}${priHtml(e, state.lens)}</span><span class="t">${isNew(e) && r && !readIds.has(e.id) ? '<i class="nw"><span class="sr">新：</span></i>' : ''}${hl(e.title_zh, pq.text)}</span><span class="r ${r ? '' : 'raw'}">${r ? hl(r.reason, pq.text) : e.views ? '这个视角待判断' : '原始标题，尚未分析'}</span></button>`;
}
let listLimit=80;
function renderList(list, pending, pq) {
  const total=list.length;list=list.slice(0,listLimit);
  let out = '';
  if (pending.length && !showPending(pq) && !state.savedOnly) out += `<button type="button" class="pend" id="pend-open" aria-expanded="false"><b>可处理 ${S.status.queued} 条 · 本页最近 ${pending.length} 条</b><span>每批处理量有限，刷新读取最新状态</span><span class="ar">展开 ▾</span></button>`;
  if (!list.length) out += `<div class="empty">${state.savedOnly?'还没有关注的事件。打开一条事件，点击“关注”，就会出现在这里。':'这个范围里没有事件。'}<br><button type="button" id="reset">${state.savedOnly?'返回全部事件':'清除全部筛选'}</button></div>`;
  const head = (label, n, extra = '') => `<div class="edh">${label}<span>${n}</span><i></i>${extra}</div>`;
  if (state.sort === 'priority') {
    const cnt = new Map(); for (const e of list) { const p = e.views ? (e.views[state.lens]?.priority || 'pending') : 'raw'; cnt.set(p, (cnt.get(p) || 0) + 1); }
    let g;
    for (const e of list) { const p = e.views ? (e.views[state.lens]?.priority || 'pending') : 'raw'; if (p !== g) { g = p; out += head(`<span style="font:600 13px var(--f-head)">${p === 'raw' ? '待分析' : p === 'pending' ? '待判断' : PRI_ZH[p] + '优先级'}</span>`, cnt.get(p)); } out += itemHtml(e, pq); }
  } else {
    const cnt = new Map(); for (const e of list) if (e._ed != null) cnt.set(e._ed, (cnt.get(e._ed) || 0) + 1);
    let ed, pendHead = false;
    for (const e of list) {
      if (!e.views) { if (!pendHead) { pendHead = true; out += head(`<button type="button" data-edh="pending" aria-pressed="${state.ed === 'pending'}">待分析</button>`, pending.length, state.pendingOpen && state.ed !== 'pending' && !pq.st ? '<button type="button" id="pend-close" class="cl">收起</button>' : ''); } }
      else if (e._ed !== ed) { ed = e._ed; out += head(`<button type="button" data-edh="${ed}" aria-pressed="${state.ed === ed}" title="只看这一版">${edLabel(ed)}</button>`, cnt.get(ed)); }
      out += itemHtml(e, pq);
    }
  }
  if(total>list.length)out+=`<button type="button" class="more-list" id="more-list">继续显示 · 已显示 ${list.length} / ${total}</button>`;
  $('list').innerHTML = out;
  $('more-list')?.addEventListener('click',()=>{listLimit+=80;update();});
  $('pend-open')?.addEventListener('click', () => { state.pendingOpen = true; update(); });
  $('pend-close')?.addEventListener('click', () => { state.pendingOpen = false; update(); });
  $('reset')?.addEventListener('click', () => { Object.assign(state, {q:'', domain:'', ed:null, newOnly:false, savedOnly:false}); $('q').value = ''; update(); });
  $('list').querySelectorAll('[data-edh]').forEach(b => b.onclick = () => { const ed = b.dataset.edh === 'pending' ? 'pending' : +b.dataset.edh; state.ed = state.ed === ed ? null : ed; update(); });
  $('list').querySelectorAll('.it').forEach(b => b.onclick = () => open(b.dataset.id));
}

// ---------- reader ----------
let shown = null;                                                    // [id, lens] the page was last built for
let detailRequest=0;
async function open(id, {scroll = true, mark = true} = {}) {
  state.selected = id;
  const request=++detailRequest;
  const position=visible().list.findIndex(event=>event.id===id);
  if(position>=listLimit){listLimit=Math.ceil((position+1)/80)*80;const {list,pending,pq}=visible();renderList(list,pending,pq);}
  renderBar();
  if(mobile()){document.body.classList.add('reading');$('index').inert=true;$('back').focus();}
  if(byId.has(id)&&!S.details[id]) {
    $('page').innerHTML='<p class="load-note">正在读取证据详情…</p>';
    try { const detail=await api('/api/events/'+encodeURIComponent(id));S.details[id]=detail; }
    catch(error){if(request===detailRequest){$('page').innerHTML='<p class="load-note">证据读取失败，请重新选择此条重试。</p>';notify(error.message);}return;}
    if(request!==detailRequest||state.selected!==id)return;
  }

  if (mark) { readIds.add(id); store.set('read', [...readIds].slice(-500)); }
  const key = focusKey();
  document.querySelectorAll('.it').forEach(r => { const on = r.dataset.id === id; r.setAttribute('aria-current', on); if (on && scroll) r.scrollIntoView({block:'nearest'}); });
  renderBar(); renderPage(); $('reader').scrollTop = 0;
  if (mobile()) { document.body.classList.add('reading'); $('index').inert = true; $('back').focus(); }
  else if (key) document.querySelector(key)?.focus({preventScroll:true});
}
function back() { detailRequest++;document.body.classList.remove('reading'); $('index').inert = false; document.querySelector(`.it[data-id="${state.selected}"]`)?.focus(); }
const REL = S.threads?.types || {}, REL_ST = S.threads?.states || {};
const current = () => byId.get(state.selected) || (nodes.has(state.selected) ? {...nodes.get(state.selected), id:state.selected, title_zh:nodes.get(state.selected).title, kind:'', state:nodes.get(state.selected).archived ? '已归档' : '', views:null, _node:true} : null);
function renderBar() {
  const e = current(); const {list} = visible(); const i = list.findIndex(x => x.id === state.selected);
  if (!e) { $('rb').innerHTML = `<button type="button" class="back" id="back" aria-label="返回索引">←</button><span class="crumb">观潮 · 阅读室</span>`; $('back').onclick = back; return; }
  const evid = S.details[e.id]?.evidence || [];
  $('rb').innerHTML = `<button type="button" class="back" id="back" aria-label="返回索引">←</button><span class="nav"><button type="button" id="prev" aria-label="上一条 (↑)" title="上一条 · 方向键 ↑" ${i <= 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg></button><button type="button" id="next" aria-label="下一条 (↓)" title="下一条 · 方向键 ↓" ${i < 0 || i >= list.length - 1 ? 'disabled' : ''}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></span><span class="pos">${i >= 0 ? `${i + 1} / ${list.length}` : '不在当前列表'}</span><span class="crumb">${esc(e.category)} · ${e._ed ? edLabel(e._ed) : e._node ? '已归档' : '待分析'}</span><span class="sp"></span><button type="button" class="btn" id="save" aria-pressed="${savedIds.has(e.id)}">${savedIds.has(e.id) ? '已关注' : '关注'}</button>${evid[0] ? `<a class="btn" href="${safe(evid[0].url)}" target="_blank" rel="noopener">来源 ↗<span class="sr">（新窗口）</span></a>` : ''}`;
  $('back').onclick = back;
  $('prev').onclick = () => { if (i > 0) open(list[i - 1].id); };
  $('next').onclick = () => { if (i < list.length - 1) open(list[i + 1].id); };
  $('save').disabled=Boolean(e._node);
  $('save').onclick=async()=>{
    const on=!savedIds.has(e.id);$('save').disabled=true;
    try {await api('/api/preferences',{event_id:e.id,saved:on,feedback:feedback[e.id]||null});on?savedIds.add(e.id):savedIds.delete(e.id);update();}
    catch(error){notify(error.message);$('save').disabled=false;}
  };

}
function relCards(e) {
  const rels = (S.threads?.relations || []).filter(r => r.source === e.id || r.target === e.id).map(r => { const oid = r.source === e.id ? r.target : r.source; const o = byId.get(oid) || nodes.get(oid); return o ? {r, oid, title:o.title_zh || o.title, dir:r.source === e.id ? '指向' : '来自'} : null; }).filter(Boolean);
  return rels.length ? `<div class="rel">${rels.map(x => `<button type="button" data-rel="${x.oid}"><span class="ty"><b>${esc(REL[x.r.type] || x.r.type)}</b><span>${x.dir}</span><span>置信 ${CONF_ZH[x.r.confidence] || esc(x.r.confidence)}</span><span>${x.r.needs_recheck?'证据变化 · 待复核':esc(REL_ST[x.r.status] || x.r.status)}</span>${byId.has(x.oid) ? '' : '<span>已归档</span>'}</span><span class="tt">${esc(x.title)}</span><span class="rr">${esc(x.r.reason)}</span>${x.r.missing_link ? `<span class="ml">缺口：${esc(x.r.missing_link)}</span>` : ''}</button>`).join('')}</div>` : '';
}
function renderPage() {
  const e = current();
  if (!e) {
    $('page').innerHTML = `<div class="welcome"><h1>挑一条开始读</h1><p>左边是索引：最上面一排柱子是最近七天的每一版，点一根只看那一版；再往下是三个视角、一个搜索框和按版次排好的事件。右边这一页就是用来读的，不会被别的东西挤。</p><ul><li><kbd>↑</kbd> <kbd>↓</kbd> 上下一条，读完直接往下翻</li><li><kbd>/</kbd> 搜索，支持 <kbd>领域:科技</kbd> <kbd>优先:高</kbd> <kbd>状态:重要更新</kbd> <kbd>来源:nhk</kbd></li><li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> 切换机会 / 选题 / 资讯视角，列表排序和理由跟着换</li><li><kbd>s</kbd> 关注，<kbd>o</kbd> 打开来源</li></ul></div>`;
    shown = null; return;
  }
  shown = [e.id, state.lens];
  const d = S.details[e.id] || (e._node?{research:nodes.get(e.id),evidence:[],materials:[]}:null), views = e.views || {}, fb = feedback[e.id] || '', evid = d?.evidence || [], sl = d?.research?.slices;
  const srcChip = ids => (ids || []).map(id => { const x = evid.find(v => v.id === id); return x ? `<a class="src" href="${safe(x.url)}" target="_blank" rel="noopener">${esc(x.meta?.publisher || x.source_id || '')} ↗<span class="sr">（新窗口）</span></a>` : `<span class="src">${esc(id.slice(0, 6))}</span>`; }).join('');
  const secs = [];
  const sec = (id, name, n) => { secs.push([id, name, n]); return `<h2 class="sec" id="s-${id}">${name}${n != null ? `<em>${n}</em>` : ''}</h2>`; };
  const hits = v => events.filter(x => x._hay.includes(String(v).toLowerCase())).length;
  let html = `<div class="col"><p class="k"><span class="dm"><i class="dot c${dn(e.category)}"></i>${esc(e.category)}</span>${e.kind ? `<span>${esc(e.kind)}</span>` : ''}${e.state ? `<span>${esc(e.state)}</span>` : ''}${e.critical ? '<span class="flag red">重要线索</span>' : ''}${e.correction ? '<span class="flag amber">更正</span>' : ''}${e.first_seen ? `<span class="mono">首见 ${mdhm(e.first_seen)} JST</span>` : ''}${e._u - e._t > 6e5 ? `<span class="mono">更新 ${mdhm(e.updated_at)}</span>` : ''}</p>
    <h1>${esc(e.title_zh)}</h1><p class="lede">${esc(e.summary)}</p>${newsImageMarkup(d||e)}`;
  if (e._node) {
    html += `<p class="note" style="margin-top:20px">这条已归档，保留研究摘要和出处，不补造已过保留期的正文。</p>` + `<div class="rel">${(d.research.evidence||[]).map(x=>`<div class="mat"><a href="${safe(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)} ↗</a><p>${esc(x.quote)}</p></div>`).join('')}</div>` + sec('rel', '关联线索') + relCards(e);
  } else {
    html += `<div class="v3">${Object.entries(LENS).map(([k, n]) => { const r = views[k]; return `<button type="button" data-lens="${k}" aria-pressed="${state.lens === k}" title="切换到${n}视角"><span class="n">${n}${priHtml(e, k)}</span>${r ? `<span class="p">${PRI_ZH[r.priority]}优先级</span><span class="r">${esc(r.reason)}</span>` : e.views ? '<span class="p">待判断</span><span class="r">这个视角没有给出优先级</span>' : `<span class="p">待分析</span><span class="r">按现有预算排队处理</span>`}</button>`; }).join('')}</div>
    <div class="acts">${IS_STATIC?'':`<span>这条对你</span><span class="fb" role="group" aria-label="反馈">${['有用', '噪声', '重复'].map(k => `<button type="button" data-fb="${k}" aria-pressed="${fb === k}">${k}</button>`).join('')}</span>`}<span class="tags">${(e.tags || []).slice(0, 5).map(t => `<button type="button" class="chip" data-q="${esc(t)}">#${esc(t)}</button>`).join('')}</span></div>`;
    if (!d) html += `<p class="note" style="margin-top:28px">${e.views ? '尚未加载完整证据卡，请重新选择此条读取。' : '尚未分析：现在只有原始标题与摘要，等待现有批次预算处理。'}</p>`;
    if (d?.facts?.length) html += sec('facts', '事实', d.facts.length) + `<ol class="facts">${d.facts.map(f => `<li><span>${esc(f.text)}</span><span class="srcs">${srcChip(f.evidence_ids)}</span></li>`).join('')}</ol>`;
    if (d?.analysis) html += sec('ana', '分析') + `<p class="body">${esc(d.analysis)}</p>`;
    if (d?.gap || e.gap) html += sec('gap', '证据缺口') + `<div class="gap"><b>待核实</b>${esc(d?.gap || e.gap)}</div>`;
    if (d?.research?.chain?.length) html += sec('chain', '研究链', d.research.chain.length) + `<ol class="chain">${d.research.chain.map(c => `<li class="${c.status === 'gap' ? 'gap-s' : c.status === 'hypothesis' ? 'hyp' : ''}"><span class="st">${{reported:'来源陈述', gap:'缺失环节', hypothesis:'影响推测'}[c.status] || esc(c.status)}</span><span>${esc(c.statement)} ${srcChip(c.evidence_ids)}</span></li>`).join('')}</ol>${d.research.question ? `<div class="q"><b>下一步核实</b> ${esc(d.research.question)}</div>` : ''}`;
    if (d?.opportunity || d?.editorial) html += sec('angle', '两个视角的展开') + `<div class="rel">${d.opportunity ? `<div class="mat"><div class="mm"><b>机会研究</b></div><p class="body">${esc(d.opportunity)}</p></div>` : ''}${d.editorial ? `<div class="mat"><div class="mm"><b>内容选题</b></div><p class="body">${esc(d.editorial)}</p></div>` : ''}</div>`;
    if (sl) html += sec('slices', '切片') + `<div class="slices">${Object.entries(DIMS).filter(([k]) => sl[k]?.length).map(([k, n]) => `<div><span>${n}</span><div>${sl[k].map(v => { const h = hits(v); return `<button type="button" class="${h > 1 ? '' : 'none'}" data-q="${esc(v)}" title="${h > 1 ? `索引里 ${h} 条含此切片` : '当前已归类索引中仅此条命中'}">${esc(v)}${h > 1 ? `<small>${h}</small>` : ''}</button>`; }).join('')}</div></div>`).join('')}</div>`;
    const rel = relCards(e); if (rel) html += sec('rel', '关联线索', (rel.match(/data-rel=/g) || []).length) + rel + `<p class="note">${esc(S.threads?.note || '')}</p>`;
    if (evid.length) html += sec('mat', '证据材料', evid.length) + evid.map(x => { const m = (d.materials || []).find(mm => mm.article_id === x.id); return `<div class="mat"><div class="mt"><a href="${safe(x.url)}" target="_blank" rel="noopener">${esc(x.title)} ↗<span class="sr">（新窗口）</span></a></div><div class="mm"><b>${esc(x.meta?.publisher || x.source_id)}</b><span>${esc(x.meta?.language)} / ${esc(x.meta?.region)}</span><span>发布 ${x.published_at ? mdhm(x.published_at) : '未知'}</span><span>首次发现 ${mdhm(x.first_seen)}</span></div>${x.content ? `<div class="ex"><span>${esc(x.meta?.material_scope || '来源摘要')}</span><blockquote>${esc(x.content)}</blockquote><button type="button" class="more" aria-expanded="false">展开</button></div>` : ''}${m?.content ? `<div class="ex"><span>${esc(m.material_scope)}${m.truncated ? ' · 已截断' : ''}</span><blockquote>${esc(m.content)}</blockquote><button type="button" class="more" aria-expanded="false">展开</button></div>` : ''}</div>`; }).join('');
    if(d?.history?.length)html+=`<details class="mat"><summary>分析历史 · ${d.history.length} / ${d.history_total}</summary>${d.history.map(h=>`<div class="ex"><b>${mdhm(h.created_at)}</b><p class="body">${esc(h.payload.summary)}${h.payload.analysis?'\n'+esc(h.payload.analysis):''}</p></div>`).join('')}</details>`;
    html += sec('rec', '记录') + `<div class="kv"><span>事件 ID</span><b>${esc(e.id)}</b><span>版次</span><b>${e._ed ? edLabel(e._ed) : '待分析'}</b><span>更新</span><b>${mdhm(e.updated_at)} JST</b>${e.merge_reason ? `<span>合并依据</span><b>${esc(e.merge_reason)}</b>` : ''}${d?.history_total > 1 ? `<span>历史版本</span><b>${d.history_total}（下方保留历史记录）</b>` : ''}</div>`;
  }
  html += `</div><aside class="rail">${secs.length >= 3 ? `<h3>本页</h3>${secs.map(([id, n, c]) => `<a href="#s-${id}" data-to="s-${id}">${n}${c != null ? `<em>${c}</em>` : ''}</a>`).join('')}` : ''}<div class="keys"><span><kbd>↑</kbd><kbd>↓</kbd>上下一条</span><span><kbd>/</kbd>搜索</span><span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>切视角</span><span><kbd>s</kbd>关注 <kbd>o</kbd>来源</span></div></aside>`;
  $('page').innerHTML = html;bindNewsImages($('page'));
  $('page').querySelectorAll('.ex').forEach(x => { const b = x.querySelector('blockquote'); if (b && b.scrollHeight <= b.clientHeight + 1) x.querySelector('.more')?.remove(); });   // no toggle when nothing is clamped
  $('page').querySelectorAll('.v3 [data-lens]').forEach(b => b.onclick = () => { state.lens = b.dataset.lens; update(); });
  $('page').querySelectorAll('[data-fb]').forEach(b=>b.onclick=async()=>{
    const value=feedback[e.id]===b.dataset.fb?null:b.dataset.fb;b.disabled=true;
    try {await api('/api/preferences',{event_id:e.id,saved:savedIds.has(e.id),feedback:value});feedback[e.id]=value;$('page').querySelectorAll('[data-fb]').forEach(x=>x.setAttribute('aria-pressed',value===x.dataset.fb));}
    catch(error){notify(error.message);}finally{b.disabled=false;}
  });
  $('page').querySelectorAll('[data-q]').forEach(b => b.onclick = () => { setQ(b.dataset.q); if (mobile()) back(); });
  $('page').querySelectorAll('[data-rel]').forEach(b => b.onclick = () => open(b.dataset.rel));
  $('page').querySelectorAll('.more').forEach(b => b.onclick = () => { const x = b.closest('.ex'); x.classList.toggle('open'); const on = x.classList.contains('open'); b.textContent = on ? '收起' : '展开'; b.setAttribute('aria-expanded', on); });
  $('page').querySelectorAll('[data-to]').forEach(a => a.onclick = ev => { ev.preventDefault(); $(a.dataset.to)?.scrollIntoView({behavior:smooth(), block:'start'}); });
}

// ---------- search ----------
let sIdx = -1, sItems = [];
function setQ(q) { state.q = q; $('q').value = q; update(); }
function renderSug() {
  const q = $('q').value.trim(), pq = parseQuery(q); sItems = [];
  const opt = (html, fn, r = '') => { const i = sItems.push(fn) - 1; return `<button type="button" class="opt" role="option" id="sug-${i}" aria-selected="${i === sIdx}" data-i="${i}">${html}${r ? `<span class="r">${r}</span>` : ''}</button>`; };
  let html = '';
  if (!q) {
    html += `<p class="syn">直接输入关键词，边打边筛；可以组合 <code>领域:科技产品</code> <code>优先:高</code> <code>状态:待分析</code> <code>状态:重要更新</code> <code>来源:nhk</code>。</p>`;
    html += `<h5>领域</h5>` + DOMS.map((d, i) => opt(`<i class="dot c${i + 1}"></i><span>${d}</span>`, () => { state.domain = d; update(); }, `${events.filter(e => e.category === d).length}`)).join('');
    const sl = (S.research.mechanisms?.slices || []).map(s => ({...s, n:events.filter(e => e._hay.includes(s.value.toLowerCase())).length})).filter(s => s.n).slice(0, 5);
    if (sl.length) html += `<h5>常用切片</h5>` + sl.map(s => opt(`<span>${esc(s.value)}</span>`, () => setQ(s.value), `${s.n} 条 · 库内 ${s.count}`)).join('');
  } else {
    const {list} = visible();
    const sliceHits = []; for (const [dim, r] of Object.entries(S.research)) for (const s of r.slices || []) if (pq.text.some(t => s.value.toLowerCase().includes(t))) { const n = events.filter(e => e._hay.includes(s.value.toLowerCase())).length; if (n) sliceHits.push([dim, s, n]); }
    if (sliceHits.length) html += `<h5>切片</h5>` + sliceHits.slice(0, 4).map(([dim, s, n]) => opt(`<span>${DIMS[dim]} · ${hl(s.value, pq.text)}</span>`, () => setQ(s.value), `${n} 条 · 库内 ${s.count}`)).join('');
    html += `<h5>事件 · ${list.length}</h5>` + (list.slice(0, 6).map(e => opt(`<i class="dot c${dn(e.category)}"></i><span>${hl(e.title_zh, pq.text)}</span>`, () => open(e.id), `${md(e.first_seen)} ${hm(e.first_seen)}`)).join('') || `<p class="syn">没有匹配的事件。</p>`);
  }
  $('sug').innerHTML = html; $('sug').hidden = false; $('q').setAttribute('aria-expanded', 'true'); $('q').setAttribute('aria-activedescendant', sIdx >= 0 ? `sug-${sIdx}` : '');
  $('sug').querySelectorAll('.opt').forEach(b => { b.onmousedown = ev => ev.preventDefault(); b.onclick = () => { closeSug(); sItems[+b.dataset.i](); $('q').blur(); }; });
}
function closeSug() { $('sug').hidden = true; $('q').setAttribute('aria-expanded', 'false'); $('q').removeAttribute('aria-activedescendant'); }
let qt = 0;
$('q').oninput = () => { sIdx = -1; clearTimeout(qt); qt = setTimeout(() => { state.q = $('q').value; update(); if (document.activeElement === $('q')) renderSug(); }, 120); };
$('q').onfocus = () => renderSug();
$('q').onblur = ev => { if (ev.relatedTarget?.closest?.('#sug')) return; setTimeout(closeSug, 120); };
$('q').onkeydown = ev => {
  if (ev.key === 'ArrowDown') { sIdx = Math.min(sIdx + 1, sItems.length - 1); renderSug(); ev.preventDefault(); }
  else if (ev.key === 'ArrowUp') { sIdx = Math.max(sIdx - 1, -1); renderSug(); ev.preventDefault(); }
  else if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); clearTimeout(qt); state.q = $('q').value; update(); const fn = sIdx >= 0 ? sItems[sIdx] : null; closeSug(); $('q').blur(); fn?.(); }
  else if (ev.key === 'Escape') { ev.stopPropagation(); if ($('q').value) setQ(''); $('q').blur(); closeSug(); }
};
$('q-clr').onclick = () => { setQ(''); $('q').focus(); };

// ---------- status ----------
function openStatus() {
  if(IS_STATIC){
    const st=S.status;
    $('drawer').innerHTML=`<button type="button" class="x" id="st-x" aria-label="关闭">×</button><h2>数据快照</h2><p class="s">发布数据 ${mdhm(st.generated_at)} JST · 最近分析 ${st.last_analysis_at?mdhm(st.last_analysis_at):'暂无'} JST</p><p>${st.events} 条公开事件 · ${st.sources.length} 个来源入口</p><p class="s">关注仅保存在当前浏览器。反馈与关联审核请在本机进行。</p>`;
    $('drawer').showModal();$('st-x').onclick=()=>$('drawer').close();return;
  }
  const st = S.status, srcs = [...st.sources].sort((a, b) => (a.health === 'ok') - (b.health === 'ok') || a.name.localeCompare(b.name)), ok = srcs.filter(r => r.health === 'ok' && !r.overdue).length;
  $('drawer').innerHTML = `<button type="button" class="x" id="st-x" aria-label="关闭">×</button><h2>运行状态</h2><p class="s">本机检查 ${mdhm(st.generated_at)} JST · 每日 ${SLOTS.map(h => String(h).padStart(2, '0')).join(' / ')} 时计划分析 · 试运行自 ${st.pilot_started?md(st.pilot_started):'未知'} 起 · 付费 API 调用 ${st.paid_api_calls}</p>
    <div class="stats"><div class="stat"><b>${st.events.toLocaleString('en')}</b><span>本机库事件</span></div><div class="stat"><b>${st.queued.toLocaleString('en')}</b><span>排队可处理 · ${st.queue_expired.toLocaleString('en')} 超窗</span></div><div class="stat"><b>${st.batches_today}/${st.batch_limit}</b><span>今日版次</span><div class="bar"><i style="width:${st.batches_today / st.batch_limit * 100}%"></i></div></div><div class="stat"><b>${st.calls_today}/${st.call_limit}</b><span>今日模型调用（CLI）</span><div class="bar"><i style="width:${st.calls_today / st.call_limit * 100}%"></i></div></div></div>
    <h3>最近一版</h3><p class="s" style="margin:0">${st.last_batch?`${st.last_batch.finished?edLabel(slotOf(+new Date(st.last_batch.finished))):'当前批次'} · ${esc(st.last_batch.status)}${st.last_batch.finished?' · 用时 '+Math.round((new Date(st.last_batch.finished)-new Date(st.last_batch.started))/6e4)+' 分钟':''}`:'暂无分析批次'}</p>
    <h3>通知记录</h3><ul class="alerts">${st.alerts.slice(0, 6).map(a => `<li><time>${mdhm(a.created_at)}</time><span>${esc(a.message.replace(/^观潮(重要线索|恢复)?[：:]\s*/, ''))}</span><span class="flag ${a.category === 'event' ? 'red' : ''}">${{event:'重要线索', recovery:'已恢复', coverage:'来源故障'}[a.category]}</span></li>`).join('')}</ul>
    <h3>来源入口 · ${ok}/${srcs.length} 正常</h3><div class="srcs">${srcs.map(r => `<div class="srow"><i class="st ${r.health === 'ok' ? (r.overdue ? 'wait' : '') : r.health === 'pending' ? 'wait' : 'bad'}"></i><span class="nm" title="${esc(r.name)}">${esc(r.name)}</span><span class="lg" title="${esc(r.error || '')}">${{ok:'正常', pending:'待首次采集', error:'读取失败', partial:'部分失败'}[r.health] || esc(r.health)}${r.overdue ? ' · 逾期' : ''}</span></div>`).join('')}</div>`;
  $('drawer').showModal(); $('st-x').onclick = () => $('drawer').close();
}
$('drawer').onclick = ev => { if (ev.target === $('drawer')) $('drawer').close(); };
$('drawer').onclose = () => $('status-open').focus();
$('status-open').onclick=async()=>{try{S.status=await api('/api/status');openStatus();}catch(error){notify(error.message);}};

// ---------- theme ----------
const root = document.documentElement;
const curTheme = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const syncTheme = () => $('theme').setAttribute('aria-pressed', curTheme() === 'dark');
$('theme').onclick = () => { root.dataset.theme = curTheme() === 'dark' ? 'light' : 'dark'; store.set('theme', root.dataset.theme); syncTheme(); };
{ const t = store.get('theme', ''); if (t) root.dataset.theme = t; syncTheme(); }

// ---------- keyboard ----------
document.addEventListener('keydown', ev => {
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); $('q').focus(); $('q').select(); return; }
  if ($('drawer').open || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
  if (ev.key === 'Escape') { if (mobile()) back(); return; }
  const {list} = visible(); const i = list.findIndex(e => e.id === state.selected);
  if (ev.key === 'j' || ev.key === 'ArrowDown') { const n = list[Math.min(i + 1, list.length - 1)]; if (n) open(n.id); ev.preventDefault(); }
  else if (ev.key === 'k' || ev.key === 'ArrowUp') { const n = list[Math.max(i - 1, 0)]; if (n) open(n.id); ev.preventDefault(); }
  else if (ev.key === 's' && state.selected) $('save')?.click();
  else if (ev.key === '/') { ev.preventDefault(); $('q').focus(); }
  else if (['1', '2', '3'].includes(ev.key)) { state.lens = Object.keys(LENS)[+ev.key - 1]; update(); }
  else if (ev.key === 'o' && state.selected) { const u = S.details[state.selected]?.evidence?.[0]?.url; if (/^https?:\/\//i.test(u || '')) window.open(u, '_blank', 'noopener'); }
});

// ---------- update ----------
function focusKey() {                                                // remember what had focus so a re-render can give it back
  const f = document.activeElement; if (!f || f === document.body) return null;
  if (f.id) return '#' + f.id;
  if (f.dataset.lens) return (f.closest('.v3') ? '.v3' : '.lens') + ` [data-lens="${f.dataset.lens}"]`;
  if (f.dataset.ed) return `#bars [data-ed="${f.dataset.ed}"]`;
  if (f.dataset.edh) return `[data-edh="${f.dataset.edh}"]`;
  if (f.dataset.id) return `.it[data-id="${f.dataset.id}"]`;
  return null;
}
function update() {
  const key = focusKey();
  const {list, pq, pending} = visible();
  $('q-clr').hidden = !state.q;
  renderEd(); renderBars(); renderLens(); renderChips(list, pending, pq); renderList(list, pending, pq); renderBar();
  const e = current();
  if (!e) renderPage();
  else if (!shown || shown[0] !== e.id) renderPage();
  else if (shown[1] !== state.lens) { shown[1] = state.lens; $('page').querySelectorAll('.v3 [data-lens]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lens === state.lens)); }
  if (key) document.querySelector(key)?.focus({preventScroll:true});
}
update();
if (!mobile()) { const {list} = visible(); if (list[0]) open(list[0].id, {scroll:false, mark:false}); }   // the desk is never empty on a wide screen; not counted as read
})().catch(error=>{const box=document.getElementById('list');box.innerHTML='<p class="load-note">本机数据读取失败，请确认服务运行后刷新重试。</p>';console.error(error);});

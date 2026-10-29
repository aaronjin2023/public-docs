'use strict';
const IS_STATIC = Boolean(window.GuanChaoStatic);
const $ = id => document.getElementById(id);
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp = value => value ? new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)) : '未知';
const titles = {opportunity:'机会研究',editorial:'内容选题',news:'资讯阅读'};
const priorities = {high:'高',medium:'中',low:'低'};
let view = 'news', category = '', savedOnly = false, page = 1, selected, current, response, sources = new Map(), requestNumber = 0, detailSequence = 0, timer;
let reviewMode = false;
const radarRoute = new URLSearchParams(location.search);
let researchDimension = ['entities','people','mechanisms','needs','risks','regions','horizon','stage'].includes(radarRoute.get('dimension'))?radarRoute.get('dimension'):'mechanisms', researchSlice = (radarRoute.get('slice')||'').slice(0,80);
async function api(path, value) {
  if(IS_STATIC) return window.GuanChaoStatic.request(path, value);
  const result = await fetch(path, value ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)} : {cache:'no-store'});
  const body = await result.json();
  if (!result.ok) throw new Error(body.error || `HTTP ${result.status}`);
  return body;
}
function error(message) { $('system-note').textContent = `${IS_STATIC?'公开快照':'本地服务'}提示：${message}。当前已显示的结果保留。`; }
function navigation() {
  const entries = [['全部候选','',response.all,false],['我的关注','',response.saved,true],...Object.entries(response.counts).map(([name,count])=>[name,name,count,false])];
  $('navigation').innerHTML = entries.map(([label,domain,count,saved], i) => `${i===2?'<p class="nav-group-title">按领域浏览</p>':''}<button type="button" class="nav-button" data-domain="${esc(domain)}" data-saved="${saved}" aria-pressed="${category===domain&&savedOnly===saved}"><span>${esc(label)}</span><span class="nav-count">${count}</span></button>`).join('');
  $('mobile-navigation').innerHTML=entries.map(([label,domain,count,saved])=>`<option value="${saved?'saved':esc(domain)}" ${category===domain&&savedOnly===saved?'selected':''}>${esc(label)} · ${count}</option>`).join('');
  $('navigation').querySelectorAll('button').forEach(b=>b.onclick=()=>{category=b.dataset.domain;savedOnly=b.dataset.saved==='true';page=1;document.body.classList.remove('reading-detail');load();});
}
async function load() {
  const sequence = ++requestNumber;
  const params = new URLSearchParams({view,category,saved:savedOnly?'1':'0',q:$('search').value,hide_low:$('event-only').checked?'1':'0',page,dimension:researchDimension,slice:researchSlice,days:$('relation-days').value});
  try {
    const data = await api(`/api/events?${params}`);
    if (sequence !== requestNumber) return;
    response = data; navigation();
    $('view-count').textContent = `${data.total} 条事件`;
    $('page-label').textContent = `${page} / ${Math.max(1,Math.ceil(data.total/data.size))}`;
    $('previous').disabled = page===1; $('next').disabled = page*data.size>=data.total;
    if (!current?.archived && !data.events.some(e=>e.id===selected)) selected=data.events.find(e=>['已分析','重要更新'].includes(e.state))?.id||data.events[0]?.id;
    $('events').innerHTML = data.events.length ? data.events.map(e=>{
      const rating=e.views?.[view];
      return `<button type="button" class="event-row" data-id="${esc(e.id)}" aria-pressed="${selected===e.id}" aria-controls="detail"><span class="row-top"><span>${esc(e.category)} · ${rating?`${priorities[rating.priority]}优先级`:'待判断'}</span><time datetime="${esc(e.updated_at)}">${stamp(e.updated_at)}</time></span><span class="event-title">${esc(e.title_zh)}</span><span class="row-reason">${esc(rating?.reason||e.summary)}</span><span class="row-meta"><span>${esc(e.state)}${e.saved?' · 已关注':''}</span><span>${esc(e.kind)}</span></span></button>`;
    }).join('') : '<div class="empty-state"><strong>没有符合条件的事件</strong><p>调整关键词、领域或优先级筛选。</p><button id="reset" class="reset-button" type="button">恢复全部候选</button></div>';
    $('reset')?.addEventListener('click',()=>{category='';savedOnly=false;researchSlice='';if(typeof loadResearch==='function')loadResearch();$('search').value='';$('event-only').checked=false;load();});
    $('events').querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{selected=b.dataset.id;await showDetail();$('events').querySelectorAll('[data-id]').forEach(r=>r.setAttribute('aria-pressed',r.dataset.id===selected));if(matchMedia('(max-width:640px)').matches){document.body.classList.add('reading-detail');$('detail').focus();$('main').scrollIntoView();}});
    if(selected) await showDetail(); else {$('detail').innerHTML='<h2>等待新的线索</h2><p class="detail-copy">采集后将在这里显示事件证据。</p>';document.body.classList.remove('reading-detail');}
  } catch(e) { error(e.message); }
}
function metrics(article) {
  const rows=article.observations||[];
  if(rows.length<2) return '尚无可比较的连续观测';
  const newest=rows[0], previous=rows.find(r=>r.source_id===newest.source_id&&r.native_id===newest.native_id&&r.observed_at!==newest.observed_at);
  if(!previous) return '尚无同一入口的连续观测';
  const hours=(Date.parse(newest.observed_at)-Date.parse(previous.observed_at))/3600000;
  if(hours<=0) return '观测间隔不足';
  const names={stars:'Star',score:'分数',comments:'评论',likes:'喜欢',rank:'榜单名次',probability_yes:'Yes 盘口价格',volume_24h_usd:'滚动24小时成交额 USD'};
  return Object.entries(newest.metrics).map(([k,v])=>`${names[k]||k} ${v}${['rank','probability_yes','volume_24h_usd'].includes(k)?`（前次 ${previous.metrics[k]??'—'}）`:`（${((v-(previous.metrics[k]??v))/hours).toFixed(1)}/小时）`}`).join(' · ')+`；间隔 ${hours.toFixed(2)} 小时`;
}
async function showDetail() {
  if(current?.archived && current.id===selected)return;
  const identity=selected, sequence=++detailSequence;
  const e=await api(`/api/events/${identity}`);
  if(identity!==selected || sequence!==detailSequence) return;
  current=e;
  const refs=new Map((e.evidence||[]).map((a,i)=>[a.id,i+1]));
  const rating=e.views?.[view];
  $('detail').innerHTML=`<button type="button" class="back-button" id="back">← 返回候选列表</button><div class="detail-topline"><span>${esc(e.category)} · ${esc(e.kind)}</span><span class="new-tag">${esc(e.state)}</span></div><h2>${esc(e.title_zh)}</h2><p class="detail-summary">${esc(e.summary)}</p><h3>${titles[view]} · ${rating?priorities[rating.priority]+'优先级':'待判断'}</h3><p class="detail-copy">${esc(rating?.reason||'等待定时分析')}</p>
    <h3>来源陈述 · 可追溯事实</h3>${e.facts?.length?`<ol class="fact-list">${e.facts.map(f=>`<li>${esc(f.text)} ${f.evidence_ids.map(id=>`<a href="#evidence-${esc(id)}" aria-label="查看证据 ${refs.get(id)||id}">[${refs.get(id)||'?'}]</a>`).join(' ')}</li>`).join('')}</ol>`:'<p class="detail-copy">尚未生成完整证据卡，原始材料可在下方查看。</p>'}
    <h3>${view==='opportunity'?'机会假设与验证':view==='editorial'?'受众与选题角度':'分析与可能解释'}</h3><p class="detail-copy long-copy">${esc(e[view==='news'?'analysis':view]||'等待下一次完整分析。')}</p><h3>还缺什么证据</h3><p class="detail-copy">${esc(e.gap)}</p>
    <div class="detail-actions"><button id="follow" class="follow-button" type="button" aria-pressed="${e.saved}">${e.saved?'已加入关注':'加入我的关注'}</button><span class="local-note">保存在本机，可导出</span></div><div class="feedback" role="group" aria-label="事件反馈">${['有用','噪声','重复'].map(f=>`<button type="button" data-feedback="${f}" aria-pressed="${e.feedback===f}">${f}</button>`).join('')}</div>
    <details class="evidence-details" open><summary>来源与观测 · ${e.evidence.length} 条材料</summary>${e.evidence.map(a=>{const m=e.materials?.find(r=>r.article_id===a.id);return `<div class="evidence-block" id="evidence-${esc(a.id)}"><p class="evidence-name">[${refs.get(a.id)}] ${esc(sources.get(a.source_id)?.name||a.source_id)} · ${esc(a.meta.language)} / ${esc(a.meta.region)}</p><p class="evidence-title">${esc(a.title)}</p><a class="source-link" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">阅读原始来源 ↗</a><dl class="detail-facts"><dt>发布时间</dt><dd>${stamp(a.published_at)}</dd><dt>首次发现</dt><dd>${stamp(a.first_seen)}</dd><dt>材料范围</dt><dd>${esc(m?.material_scope||a.meta.material_scope)}${m?.truncated?' · 已截取':''}</dd></dl><p class="detail-copy metric-note">${esc(metrics(a))}</p><details><summary>${IS_STATIC?'来源短摘录':'本地证据摘录'}</summary><p class="detail-copy long-copy">${esc(m?.content||a.content||'仅有标题，暂无摘要')}</p></details></div>`;}).join('')}</details>
    <details class="history"><summary>分析历史 · 最近 ${e.history.length}/${e.history_total} 版</summary>${e.history.map(h=>`<details><summary>${stamp(h.created_at)} · ${esc(h.payload.state)}</summary><p class="detail-copy">${esc(h.payload.summary)}</p><p class="detail-copy">${esc(h.payload.analysis||'分类记录')}</p></details>`).join('')}</details><section id="event-research" aria-label="事件研究切片"></section><div id="review-form"></div>`;
  $('back').onclick=()=>{document.body.classList.remove('reading-detail');$('events').querySelector(`[data-id="${identity}"]`)?.focus();};
  $('follow').onclick=()=>savePreference(!e.saved,e.feedback);
  $('detail').querySelectorAll('[data-feedback]').forEach(b=>b.onclick=()=>savePreference(e.saved,e.feedback===b.dataset.feedback?null:b.dataset.feedback));
  if(typeof renderEventResearch==='function')renderEventResearch(e);
  if(IS_STATIC){$('detail').querySelector('.feedback')?.remove();$('detail').querySelector('.history')?.remove();$('detail').querySelector('.detail-actions .local-note').textContent='仅保存在当前浏览器，不上传';}
  if(reviewMode) renderReview();
}
async function savePreference(saved,feedback) {
  try {await api('/api/preferences',{event_id:current.id,saved,feedback});await load();} catch(e){error(e.message);}
}
function renderReview() {
  $('review-form').innerHTML=`<form id="audit-form"><h3>人工抽查 · 当前事件</h3><p class="detail-copy">逐项核对原始来源，未检查的条目请勿提交。</p>${[['provenance','每条事实都能追溯来源'],['unsupported','存在来源不支持的事实'],['mismerge','把不同事件错误合并'],['duplicate','与其他事件重复'],['useful','至少一个视角对我有用']].map(([key,label])=>`<label class="review-question">${label}<select name="${key}" required><option value="">请选择</option><option value="true">是</option><option value="false">否</option></select></label>`).join('')}<button class="follow-button" type="submit">保存抽查结果</button><p id="review-result" role="status"></p></form>`;
  $('audit-form').onsubmit=async event=>{event.preventDefault();const form=new FormData(event.target);const value={event_id:current.id};for(const [k,v]of form)value[k]=v==='true';try{await api('/api/review',value);$('review-result').textContent='已保存本日抽查，可修改后再次提交。';await loadStatus();}catch(e){error(e.message);}};
}
async function loadStatus() {
  const s=await api('/api/status');
  sources=new Map(s.sources.map(r=>[r.id,r]));
  if(IS_STATIC) {
    $('sample-time').textContent=`数据快照 ${stamp(s.generated_at)} JST`;
    $('system-note').textContent=`公开 ${s.events} 条已归类事件 · 本机已采集 ${s.collected} 条材料，${s.queued} 条可处理，${s.queue_expired||0} 条已超分析窗口，${s.queue_quarantined||0} 条隔离。最近成功分析 ${stamp(s.last_analysis_at)} JST。这里是定期发布的快照，不是实时采集；优先级属于编辑判断。`;
    $('coverage-total').textContent=`快照中 ${s.sources.length} 个来源入口`;
    const states={ok:'读取成功',pending:'尚未读取',error:'读取失败',partial:'部分失败'};
    $('sources').innerHTML=s.sources.map(r=>`<div class="source-row"><span class="source-name">${esc(r.name)}</span><span class="source-state ${r.health!=='ok'?'stale':''}">${esc(states[r.health]||r.health)}（截至快照）<br>${esc(r.language)} / ${esc(r.region)}<br>成功 ${stamp(r.last_success)}</span></div>`).join('');
    $('review-open').hidden=true;
    $('pilot-note').textContent='本站仅发布已归类事件、公开来源短摘录及研究线索，不代表所有采集材料都已完成 AI 分析。人工抽查、反馈与关系审核继续在本机进行；收藏仅保存在当前浏览器。刷新页面可读取最新发布版本。';
    return;
  }
  const fresh=s.sources.filter(r=>r.health==='ok'&&!r.overdue).length;
  $('sample-time').textContent=`本机检查 ${stamp(s.generated_at)} JST`;
  $('system-note').textContent=`${s.events} 条事件 · ${s.queued} 条可处理 · ${s.queue_expired||0} 条超窗 · ${s.queue_quarantined||0} 条隔离 · 今日分析 ${s.batches_today}/${s.batch_limit} 批 · CLI ${s.calls_today}/${s.call_limit} 次。每 4 小时分析；未分析材料保留原始标题，优先级是编辑判断。${s.last_batch?.status==='failed'?' 最近模型批次失败，队列与上一版保留。':''}`;
  $('coverage-total').textContent=`${fresh}/${s.sources.length} 个入口正常`;
  const states={ok:'正常',pending:'待首次采集',error:'读取失败',partial:'部分失败'};
  const content={updated:'有更新',unchanged:'未变化',quiet:'暂无新内容',unknown:'未观测'};
  $('sources').innerHTML=s.sources.map(r=>`<div class="source-row"><span class="source-name">${esc(r.name)}</span><span class="source-state ${r.health!=='ok'||r.overdue?'stale':''}">${esc(states[r.health])}${r.overdue?' · 逾期':''} · ${esc(content[r.content_state])}<br>${esc(r.language)} / ${esc(r.region)}<br>成功 ${stamp(r.last_success)}${r.error?`<br>${esc(r.error)}`:''}</span></div>`).join('');
  const review=s.review;
  $('pilot-note').textContent=`开始 ${stamp(s.pilot_started)} JST · 已人工抽查 ${review.reviewed} 条。目标：来源追溯 100%、无依据事实 0、误合并 ≤5%、重复 ≤10%、有用 ≥60%。${review.reviewed?`当前：有用 ${(review.useful*100).toFixed(0)}%、误合并 ${(review.mismerge*100).toFixed(0)}%、重复 ${(review.duplicate*100).toFixed(0)}%、无依据事实 ${review.unsupported} 条。`:''} 七天效果尚待验证。`;
}
$('review-open').onclick=async()=>{try{reviewMode=true;const r=await api('/api/review');$('review-queue').innerHTML=`<p class="coverage-caption">今日 ${r.actual}/${r.target} 个独立事件 · 已评 ${r.completed.length} 个，材料不足时按实际数量。</p><div class="review-buttons">${r.event_ids.map((id,i)=>`<button type="button" data-review="${id}">事件 ${i+1}${r.completed.some(c=>c.event_id===id)?' 已评':''}</button>`).join('')}</div>`;$('review-queue').querySelectorAll('[data-review]').forEach(b=>b.onclick=async()=>{selected=b.dataset.review;await showDetail();if(matchMedia('(max-width:640px)').matches)document.body.classList.add('reading-detail');$('detail').scrollIntoView();});if(current)renderReview();}catch(e){error(e.message);}};
$('mobile-navigation').onchange=()=>{const v=$('mobile-navigation').value;category=v==='saved'?'':v;savedOnly=v==='saved';page=1;document.body.classList.remove('reading-detail');load();};
$('search').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{page=1;load();},200);};
$('event-only').onchange=()=>{page=1;load();};
$('previous').onclick=()=>{page--;load();};$('next').onclick=()=>{page++;load();};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;page=1;document.querySelectorAll('[data-view]').forEach(r=>r.setAttribute('aria-pressed',r===b));load();});
async function refresh(){try{await loadStatus();await load();if(typeof loadResearch==='function'&&!document.activeElement?.closest('.relation-review'))await loadResearch(true);}catch(e){error(e.message);}}
async function migrateBookmarks(){if(IS_STATIC)return;try{if(localStorage.getItem('guanchao-bookmarks-imported'))return;const ids=JSON.parse(localStorage.getItem('crossfield-radar-saved-v1')||'[]');if(Array.isArray(ids))for(const id of ids){if(typeof id!=='string'||!/^[a-f0-9]{16}$/.test(id))continue;let e;try{e=await api(`/api/events/${id}`);}catch{continue;}await api('/api/preferences',{event_id:e.id,saved:true,feedback:e.feedback});}localStorage.setItem('guanchao-bookmarks-imported','1');}catch{ /* Existing browser bookmarks remain untouched. */ }}
(async()=>{await migrateBookmarks();await refresh();})();setInterval(()=>{if(!document.hidden&&!$('audit-form')?.contains(document.activeElement))refresh();},60000);

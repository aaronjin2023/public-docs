'use strict';
let researchData, researchSequence = 0;
const stepNames={reported:'来源陈述',hypothesis:'影响推测',gap:'缺失环节'};
const confidenceNames={low:'低',medium:'中',high:'高'};
function researchParams(extra={}) { return new URLSearchParams({dimension:researchDimension,slice:researchSlice,type:$('relation-type').value,status:$('relation-status').value,days:$('relation-days').value,...extra}); }
function researchClickEvents(root) {
  root.querySelectorAll('[data-research-event]').forEach(button=>{button.onclick=()=>openResearchEvent(button.dataset.researchEvent);button.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openResearchEvent(button.dataset.researchEvent);}};});
}
async function openResearchEvent(identity) {
  const node=researchData?.nodes.find(n=>n.event_id===identity);
  if(node?.archived) {
    $('detail').innerHTML=`<button id="research-back" class="back-button" type="button">← 返回候选列表</button><h2>${esc(node.title)}</h2><p class="detail-summary">${esc(node.summary)}</p><p class="detail-copy">原事件已归档。以下为长期保留的研究摘要与来源引用，完整正文可能已过保留期。</p><section id="event-research"></section><h3>存档引用</h3>${node.evidence.map(e=>`<p class="detail-copy"><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.title)} ↗</a><br>${esc(e.quote)}</p>`).join('')}`;
    renderEventResearch({id:identity,research:node});
    $('research-back').onclick=()=>document.body.classList.remove('reading-detail');
  } else {selected=identity;await showDetail();}
  if(matchMedia('(max-width:640px)').matches)document.body.classList.add('reading-detail');
  $('detail').scrollIntoView({block:'start'});$('detail').focus();
}
function researchNodeLink(identity, label) {const node=researchData.nodes.find(n=>n.event_id===identity);return `<button type="button" class="text-button" data-research-event="${esc(identity)}">${esc(label||node?.title||identity)}</button>`;}
async function loadResearch(background=false) {
  const sequence=++researchSequence;
  try {
    const data=await api(`/api/research?${researchParams()}`);
    if(sequence!==researchSequence)return;
    if(background===true&&researchData&&JSON.stringify(data)===JSON.stringify(researchData))return;
    const hadPath=Boolean($('thread-path').textContent.trim());
    researchData=data;
    if(!$('slice-dimension').options.length){
      $('slice-dimension').innerHTML=Object.entries(data.dimensions).map(([key,label])=>`<option value="${key}" ${key===researchDimension?'selected':''}>${esc(label)}</option>`).join('');
      $('relation-type').insertAdjacentHTML('beforeend',Object.entries(data.types).map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join(''));
      $('relation-status').insertAdjacentHTML('beforeend',Object.entries(data.states).map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join(''));
    }
    $('research-count').textContent=`${data.nodes.length} 个已切片事件 · ${data.relations.length} 条分析关系`;
    $('slice-values').innerHTML=`<button type="button" data-slice="" aria-pressed="${!researchSlice}">全部事件</button>`+data.slices.map(s=>`<button type="button" data-slice="${esc(s.value)}" aria-pressed="${researchSlice===s.value}">${esc(s.value)} <span>${s.count}</span></button>`).join('');
    $('slice-values').querySelectorAll('button').forEach(b=>b.onclick=()=>{researchSlice=b.dataset.slice;page=1;document.body.classList.remove('reading-detail');loadResearch();load();});
    $('research-note').textContent=data.note;
    const options='<option value="">选择事件</option>'+data.nodes.map(n=>`<option value="${esc(n.event_id)}">${esc(n.title)}</option>`).join('');
    for(const name of ['path-from','path-to']){const before=$(name).value;$(name).innerHTML=options;$(name).value=data.nodes.some(n=>n.event_id===before)?before:'';}
    renderResearchGraph();renderRelations();$('thread-path').textContent=background===true&&hadPath?'研究材料已更新，请重新查询路径。':'';
    if(current&&$('event-research'))renderEventResearch(current);
  } catch(e){$('research-count').textContent=`切片读取失败：${e.message}`;}
}
function renderResearchGraph() {
  const data=researchData;
  const degree=new Map();for(const r of data.relations)for(const id of [r.source,r.target])degree.set(id,(degree.get(id)||0)+1);
  const nodes=[...data.nodes].filter(n=>degree.has(n.event_id)).sort((a,b)=>degree.get(b.event_id)-degree.get(a.event_id)).slice(0,12);
  const coordinates=new Map(nodes.map((n,i)=>[n.event_id,i===0?{x:246,y:22}:{x:22+((i-1)%(nodes.length===3?2:3))*(nodes.length===3?448:224),y:118+Math.floor((i-1)/(nodes.length===3?2:3))*96}]));
  const links=data.relations.filter(r=>coordinates.has(r.source)&&coordinates.has(r.target));
  const lines=links.map(r=>{const a=coordinates.get(r.source),b=coordinates.get(r.target);return `<line x1="${a.x+100}" y1="${a.y+31}" x2="${b.x+100}" y2="${b.y+31}" class="thread-line ${r.type==='reported_cause'?'source-cause':''} ${r.status==='refuted'?'refuted':''}"><title>${esc(data.types[r.type])} · ${esc(r.reason)}</title></line>`;}).join('');
  const boxes=nodes.map(n=>{const p=coordinates.get(n.event_id);const title=n.title.slice(0,26);return `<g role="button" tabindex="0" data-research-event="${esc(n.event_id)}" aria-label="${esc(n.title)}"><title>${esc(n.title)}</title><rect x="${p.x}" y="${p.y}" width="200" height="64" rx="4"/><text x="${p.x+10}" y="${p.y+25}">${esc(title.slice(0,13))}</text><text x="${p.x+10}" y="${p.y+46}">${esc(title.slice(13))}${n.title.length>26?'…':''}</text></g>`;}).join('');
  $('thread-graph').innerHTML=nodes.length?`<svg viewBox="0 0 700 ${Math.max(...[...coordinates.values()].map(p=>p.y))+88}" role="group" aria-label="${nodes.length}个事件，${links.length}条关系，虚线不表示因果">${lines}${boxes}</svg>`:'<p class="detail-copy">当前切片没有事件间关系，保留孤立事件，等待后续证据。</p>';
  $('graph-caption').textContent=`图中 ${nodes.length} 个节点、${links.length} 条关系；清单共 ${data.relations.length} 条，位置不表示时间先后。虚线为分析关联，实线仅表示来源提出因果，均需核实。`;
  researchClickEvents($('thread-graph'));
}
function renderRelations() {
  const data=researchData;
  $('relation-list').innerHTML=data.relations.length?data.relations.map((r,i)=>{
    const evidence=[...new Map(data.nodes.filter(n=>[r.source,r.target].includes(n.event_id)).flatMap(n=>n.evidence).filter(e=>r.evidence_ids.includes(e.article_id)).map(e=>[e.article_id,e])).values()];
    return `<details class="relation-entry" ${i===0?'open':''}><summary><span class="relation-kind">${esc(data.types[r.type])} · ${esc(r.needs_recheck?'证据变化·待复核':data.states[r.status])}</span><span class="relation-title">${esc(data.nodes.find(n=>n.event_id===r.source)?.title)} ${['analogy','shared_context'].includes(r.type)?'↔':'→'} ${esc(data.nodes.find(n=>n.event_id===r.target)?.title)}</span></summary><p class="detail-copy">${esc(r.reason)}</p><p class="relation-meta">置信度 ${confidenceNames[r.confidence]}（编辑判断） · ${r.report_gap_hours===null?'报道间隔未知':`报道相隔 ${r.report_gap_hours} 小时`}</p><h3>缺少的中间环节</h3><p class="detail-copy">${esc(r.missing_link)}</p><h3>下一步怎样验证或推翻</h3><p class="detail-copy">${esc(r.test)}</p>${Array.isArray(r.quotes)?r.quotes.map(q=>`<blockquote class="detail-copy">${esc(q.text)}</blockquote>`).join(''):''}<div class="relation-evidence">${evidence.map((e,k)=>`<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">来源 ${k+1}：${esc(e.title)} ↗</a>`).join('')}</div><div class="relation-events">${researchNodeLink(r.source,'查看起点事件')}${researchNodeLink(r.target,'查看另一事件')}</div><details class="relation-review"><summary>标记判断与查看历史</summary><form data-relation="${r.id}"><label>判断状态<select name="status" required>${Object.entries(data.states).map(([k,v])=>`<option value="${k}" ${r.status===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>依据或反证<textarea name="note" required maxlength="800" placeholder="记录支持材料、反例或尚缺条件">${esc(r.review_note||'')}</textarea></label><button type="submit">保存判断</button><span class="review-result" role="status"></span></form><button type="button" data-relation-history="${r.id}">查看判断演变</button><div class="relation-history"></div></details></details>`;
  }).join(''):'<p class="detail-copy">暂无符合条件的连线；没有连接不代表没有价值。</p>';
  if(IS_STATIC)$('relation-list').querySelectorAll('.relation-review').forEach(section=>section.remove());
  researchClickEvents($('relation-list'));
  $('relation-list').querySelectorAll('form').forEach(form=>form.onsubmit=async event=>{event.preventDefault();const fields=new FormData(form);try{await api('/api/research/review',{relation_id:form.dataset.relation,status:fields.get('status'),note:fields.get('note')});await loadResearch();}catch(e){form.querySelector('.review-result').textContent=e.message;}});
  $('relation-list').querySelectorAll('[data-relation-history]').forEach(b=>b.onclick=async()=>{try{const response=await api(`/api/research/history?id=${b.dataset.relationHistory}`);b.nextElementSibling.innerHTML=response.history.map(h=>`<p class="detail-copy">${stamp(h.created_at)} · ${esc(h.origin)} · ${esc(data.states[h.payload.status])}<br>${esc(h.payload.review_note||h.payload.reason)}</p>`).join('');}catch(e){b.nextElementSibling.textContent=e.message;}});
}
function renderEventResearch(event) {
  const box=$('event-research');if(!box)return;
  const node=event.research;
  if(!node){box.innerHTML='<h3>多角度切片</h3><p class="detail-copy">尚未切片，等待后续分析；不根据标题自动补出因果。</p>';return;}
  const labels=researchData?.dimensions||{entities:'主体',people:'受影响人群',mechanisms:'作用机制',needs:'需求假设',risks:'风险',regions:'地域',horizon:'时间尺度',stage:'事件阶段'};
  box.innerHTML=`<h3>八维切片 · 编辑归纳</h3><dl class="slice-facts">${Object.entries(labels).map(([key,label])=>`<dt>${label}</dt><dd>${node.slices[key]?.length?node.slices[key].map(v=>`<button type="button" data-event-slice="${esc(v)}" data-dimension="${key}">${esc(v)}</button>`).join(' '):'未知'}</dd>`).join('')}</dl><h3>事件内的传导环节</h3><ol class="mechanism-chain">${node.chain.map(step=>`<li><span>${stepNames[step.status]}</span><p>${esc(step.statement)}</p></li>`).join('')}</ol><h3>后续观察问题</h3><p class="detail-copy">${esc(node.question)}</p><p class="local-note">${esc(node.origin||'研究分析')} · 需求与影响为假设，不能替代事实核实。</p>`;
  box.querySelectorAll('[data-event-slice]').forEach(b=>b.onclick=()=>{researchDimension=b.dataset.dimension;researchSlice=b.dataset.eventSlice;$('slice-dimension').value=researchDimension;page=1;document.body.classList.remove('reading-detail');loadResearch();load();$('slice-heading').scrollIntoView();});
}
$('slice-dimension').onchange=()=>{researchDimension=$('slice-dimension').value;researchSlice='';page=1;loadResearch();load();};
$('relation-days').onchange=loadResearch;$('relation-type').onchange=loadResearch;$('relation-status').onchange=loadResearch;
$('threads-toggle').onclick=()=>{const open=$('threads-panel').hidden;$('threads-panel').hidden=!open;$('threads-toggle').setAttribute('aria-expanded',String(open));$('threads-toggle').textContent=open?'收起事件脉络':'展开事件脉络';};
$('find-path').onclick=async()=>{try{const from=$('path-from').value,to=$('path-to').value;if(!from||!to||from===to){$('thread-path').textContent='请选择两个不同事件。';return;}const result=await api(`/api/research?${researchParams({from,to})}`);$('thread-path').innerHTML=result.paths.length?result.paths.map(p=>`<p class="path-result">${p.nodes.map((id,i)=>`${i?`<span class="path-kind"> ${['analogy','shared_context'].includes(result.relations.find(r=>r.id===p.relations[i-1])?.type)?'↔':'→'} ${esc(result.types[result.relations.find(r=>r.id===p.relations[i-1])?.type])} </span>`:''}${researchNodeLink(id)}`).join('')}</p>`).join('')+'<p class="detail-copy">这是一条分析路径，包含类比或假设，不能据此推出前者导致后者。</p>':`<p class="detail-copy">${result.path_search_limited?'搜索达到上限，可缩小切片再查。':'当前切片内未找到三步以内的有效路径；已否定关系不参与路径。'}</p>`;researchClickEvents($('thread-path'));}catch(e){$('thread-path').textContent=e.message;}};
if(radarRoute.get('threads')==='1'){$('threads-panel').hidden=false;$('threads-toggle').setAttribute('aria-expanded','true');$('threads-toggle').textContent='收起事件脉络';}
loadResearch();

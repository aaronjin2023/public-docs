import {startLanguageUI} from './i18n.js?v=council-1';
import {renderCouncil} from './council-view.js';
import {swallowReading} from './ember-swallows.js';
import {shipmentKey} from './shipment-scene.js';
import {butterflyReading} from './spire-butterflies.js';
import {frogReading} from './moss-frogs.js';
import {heronReading} from './reed-herons.js';
import {nurseryTideReading} from './nursery-fish.js';
import {renderDevelopmentLog} from './development-log.js';
import {JOURNAL_FILTERS,journalSelection} from './journal.js?v=council-1';
import {WALKS,walkReading} from './city-walk.js';
import {FIELD_STAGES,foodSeasons} from './food-scene.js';
import {CITIES,LANDMARKS,METHODS,POLICIES,START_YEAR,SEASONS} from './world-data.js';
import {createWorld,advance,setCouncilEnabled,planCouncil,enact,retire,policyReason,totals,tideAt,dateLabel,discover,validateSave,compare,record,SAVE_KEY,decide,decisionReason,passageSummary,transportFor} from './simulation.js?v=council-1';
import {createScene} from './scene.js?v=artist-4';
import {ART_STYLES,ART_STYLE_KEY,artStyle,loadArtStyle} from './art-styles.js';
import {createSoundscape} from './audio.js?v=music-2';
import {MUSIC_KEY,MUSIC_STYLES,musicStyle,loadMusic} from './music.js';
import {parseSave,replaceSave,writeSave,SaveConflictError} from './save-store.js?v=council-1';
import {PETITIONS,pendingPetitions,petitionOpenedAt,residentAt,aftermathFor,outcomeFor} from './residents.js';

const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('zh-CN');
const grainAmount=n=>n>0&&n<.1?'不足 0.1':n.toLocaleString('zh-CN',{maximumFractionDigits:1});
const delta=(n,digits=0)=>{const value=Number(n.toFixed(digits));return `${value>0?'+':value<0?'−':''}${Math.abs(value).toLocaleString('zh-CN',{minimumFractionDigits:digits,maximumFractionDigits:digits})}`;};
let state=createWorld(),scene=null,selected=null,tab='place',playing=false,playTimer=null,soundOn=false,toastTimer=null,modalKind=null;
let saveBlocked=false,loadIssue='',audioBusy=false,savedRaw=null;
let sceneFocus=null;
let artId='original';try{artId=loadArtStyle(localStorage);}catch{}
let walkIndex=0;
let drawerScroll=0;
const resumeDetail=document.createElement('button');resumeDetail.id='resume-detail';resumeDetail.textContent='继续阅读 ↗';resumeDetail.hidden=true;
resumeDetail.setAttribute('aria-controls','drawer');document.querySelector('.map-caption').append(resumeDetail);
$('close-drawer').setAttribute('aria-label','收起详情，保留当前视角');$('close-drawer').title='收起详情';
let motionEnabled=!matchMedia('(prefers-reduced-motion: reduce)').matches;
try{savedRaw=localStorage.getItem(SAVE_KEY);if(savedRaw!==null)state=parseSave(savedRaw);}catch{saveBlocked=true;loadIssue='当前存档无法读取，原件已保留。可从设置恢复上一份存档；临时世界不会覆盖原件。';}
if(saveBlocked)$('save-status').textContent='临时世界 · 未保存';
const sound=createSoundscape();
let musicPrefs={style:'ambient',volume:.65};try{musicPrefs=loadMusic(localStorage);}catch{}
sound.setStyle(musicPrefs.style);sound.setVolume(musicPrefs.volume);
const modal=$('modal');
const modalMessage=$('modal-message')??document.createElement('p');modalMessage.id='modal-message';
modalMessage.setAttribute('role','status');modalMessage.setAttribute('aria-live','polite');modalMessage.setAttribute('aria-atomic','true');
modal.querySelector('.modal-head').append(modalMessage);
function toast(message){
  clearTimeout(toastTimer);$('toast').hidden=true;
  if(modal.open){modalMessage.textContent=message;return;}
  $('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4400);
}
function save(){
  if(saveBlocked)return;
  try{savedRaw=writeSave(localStorage,state,savedRaw);$('save-status').textContent='已保存于此浏览器';}
  catch(error){if(error instanceof SaveConflictError){saveConflict();return;}saveBlocked=true;pause();$('save-status').textContent='保存空间不足';toast('浏览器无法保存。请保留此页面，或从设置导出存档。');}
}
function saveConflict(){pause();saveBlocked=true;$('save-status').textContent='另一窗口已更新 · 未保存';loadIssue='另一个窗口更新了存档。本窗口的未保存变化仍在；需要保留时先导出，再刷新载入最新世界。';toast(loadIssue);}
function replaceCurrent(next,backupKey){
  const replacement=replaceSave(localStorage,state,next,backupKey,savedRaw);
  savedRaw=JSON.stringify(replacement);return replacement;
}
function renderStats(){
  $('council-button').textContent=state.council?.enabled?'议事会 · 自治':'议事会';
  const t=totals(state);$('year').textContent=START_YEAR+Math.floor(state.tick/4);$('season').textContent=SEASONS[state.tick%4];
  $('population').textContent=fmt(t.population);$('ecology').textContent=Math.round(t.ecology*100);
  const tide=tideAt(state.tick),next=tideAt(state.tick+1);$('tide-state').textContent=tide>.88?'长潮高水位':next>tide?'潮水渐涨':'潮水渐退';
  $('latest-news').textContent=state.events[0]?.text??'海上平静。';$('event-count').textContent=state.events.length;
  if(sceneFocus&&selected)$('view-subtitle').textContent=detailCaption(sceneFocus);
  scene?.update(state);updateLegend();sound.setEnvironment({tide:tideAt(state.tick)});
}
function enter(){document.body.classList.add('entered');$('intro').hidden=true;}
function pause(){playing=false;clearInterval(playTimer);playTimer=null;$('play').textContent='▶';$('play').setAttribute('aria-pressed','false');$('play').setAttribute('aria-label','让时间流动');}
function step(n=1){
  if(!saveBlocked){clearTimeout(toastTimer);$('toast').hidden=true;}
  const before=n>1?structuredClone(state):null;advance(state,n);
  const passage=before?passageSummary(before,state):null;
  if(passage)record(state,`${passage.years}年回望`,`${dateLabel(before)}至${dateLabel(state)}。${passage.cities.map(c=>`${CITIES.find(d=>d.id===c.id).name}：居民 ${delta(c.populationChange)} 人，生态 ${delta(c.ecologyChange*100,1)} 个百分点，粮仓 ${c.foodBefore.toFixed(1)} → ${c.foodAfter.toFixed(1)} 季用量，公库 ${delta(c.wealthChange)} 铜`).join('；')}。这些是气候、建设与旧约共同作用后的变化。`,null,'passage');
  renderStats();if(selected)renderDrawer();save();if(passage)showPassage(passage);
}
function togglePlay(){enter();if(playing){pause();return;}playing=true;$('play').textContent='Ⅱ';$('play').setAttribute('aria-pressed','true');$('play').setAttribute('aria-label','暂停时间');playTimer=setInterval(()=>{if(!document.hidden&&!modal.open)step();},3200);}
function hideDrawer(){if(!selected)return;drawerScroll=$('drawer').scrollTop;document.body.classList.remove('has-drawer');document.body.classList.add('reading-collapsed');$('drawer').hidden=true;resumeDetail.hidden=false;resumeDetail.setAttribute('aria-label',`继续阅读${$('view-title').textContent}详情`);$('world').focus({preventScroll:true});}
function resumeDrawer(){if(!selected)return;pause();document.body.classList.remove('reading-collapsed');document.body.classList.add('has-drawer');resumeDetail.hidden=true;$('drawer').hidden=false;$('drawer').scrollTop=drawerScroll;$('close-drawer').focus({preventScroll:true});}
function closeDrawer(){sceneFocus=null;selected=null;drawerScroll=0;resumeDetail.hidden=true;document.body.classList.remove('has-drawer','reading-collapsed');$('drawer').hidden=true;scene?.home();$('view-title').textContent='长潮群岛';$('view-subtitle').textContent='七座岛屿 · 六种生活';$('world').focus({preventScroll:true});}
function select(id){
  enter();modal.close();modalKind=null;pause();sceneFocus=null;walkIndex=0;selected=id;tab='place';
  document.body.classList.remove('reading-collapsed');resumeDetail.hidden=true;drawerScroll=0;document.body.classList.add('has-drawer');$('drawer').hidden=false;
  scene?.focus(id);const c=[...CITIES,...LANDMARKS].find(c=>c.id===id);$('view-title').textContent=c.name;$('view-subtitle').textContent=c.type??'旅人的发现';
  const landmark=LANDMARKS.find(c=>c.id===id);if(landmark&&discover(state,id,landmark.discovery)){renderStats();save();}
  renderDrawer();$('drawer').scrollTop=0;const title=$('drawer-content').querySelector('h2');title.tabIndex=-1;title.focus({preventScroll:true});
}
function fact(label,value,unit=''){return `<div class="fact"><span>${label}</span><b>${value}</b><small>${unit}</small></div>`;}
function queueCaption(){const trace=transportFor(state,'haven');if(!trace)return '本季分配次序未记录';const first=trace.queue[0];return first?`本季接粮首位：${CITIES.find(c=>c.id===first.id).name} · 实收 ${grainAmount(first.imported)} 份`:'本季没有需要接粮的城';}
function detailCaption(kind){
  const city=state.cities.find(c=>c.id===selected);
  if(kind.startsWith('walk:'))return WALKS[selected][walkIndex][0]+' · 沿街漫游';
  if(kind==='queue')return queueCaption();
  if(kind.startsWith('shipment:')){const leg=state.shipments?.legs.find(l=>shipmentKey(l)===kind.slice(9));return leg?`${CITIES.find(c=>c.id===leg.from).name} → ${CITIES.find(c=>c.id===leg.to).name} · ${grainAmount(leg.amount)} 份粮`:'上一航单本季没有继续 · 以当前账本为准';}
  if(kind==='river')return `回灰河东段 · 累积污染 ${(city.pollution*100).toFixed(1)}%`;
  if(kind==='herons')return `${heronReading(city,state.tick).season} · ${heronReading(city,state.tick).label}`;
  if(kind==='ember-swallows')return `${swallowReading(city).label} · 累积污染 ${(city.pollution*100).toFixed(1)}%`;
  if(kind==='spire-butterflies')return `${butterflyReading(city,state.tick,$('light').value).season} · ${butterflyReading(city,state.tick,$('light').value).label}`;
  if(kind==='moss-frogs')return `${frogReading(city,state.tick,state.climate).season} · ${frogReading(city,state.tick,state.climate).label}`;
  if(kind==='wind-grass')return `迎风坡地 · 全城生态 ${(city.ecology*100).toFixed(1)}%`;
  if(kind==='nursery')return nurseryTideReading(state.tick).label;
  return kind==='fields'?`${SEASONS[state.tick%4]} · ${FIELD_STAGES[state.tick%4].name}`:`港边粮架 · 现存 ${foodSeasons(city).toFixed(1)} 季用量`;
}
function transportLedger(city){
  const trace=transportFor(state,city.id);
  if(!trace)return '<p class="ledger-caption">这份旧航单没有分配前的账页；从下一季开始记录原因，不倒推过去。</p>';
  const {local,queue,donors,rank,reason,rotation}=trace,name=id=>CITIES.find(c=>c.id===id).name;
  const reasons={
    filled:'本城已补到调配时两季用粮的目标线。此后的出生与迁居会改变当前库存季数。',
    'local-capacity':'本城接粮运力已用尽，尚有需求没有补足；增加本城港口容量仍要看邻岛是否有余粮和送粮运力。',
    'no-surplus':'本季没有任何城的库存高于各自留粮线；港口不能凭空造出粮食。',
    'supply-spent':'供给城高于留粮线的可出粮食已经分完。仍有空余运力，也不能越过它们的留粮线。',
    'source-capacity':'仍有可出粮库存的供给城已经用尽本季送粮运力。本城虽有接粮余量，也只能等下一次分配。',
    donor:`本城超过留粮线的库存为 ${grainAmount(local.supply)} 份，本季实际运出 ${grainAmount(local.exported)} 份。余粮不一定全部启运，还受需求与两端运力限制。`,
    reserve:'本城没有低于两季补给线，也没有超过本城留粮线，这一季未参与岛间调配。',
  };
  const targets=reason==='local-capacity'?[city.id]:reason==='source-capacity'?donors.filter(p=>p.remainingSupply>1e-7).map(p=>p.id):[];
  return `<details class="transport-reason" data-transport><summary>为什么本季这样分粮</summary><p>${reasons[reason]}</p><dl class="life-ledger"><dt>调配前人口 / 粮仓</dt><dd>${fmt(local.population)} 人 / ${local.stockSeasons.toFixed(2)} 季</dd><dt>本城当季运力 / 已用</dt><dd>${grainAmount(local.capacity)} / ${grainAmount(local.imported+local.exported)} 份</dd><dt>本城留粮线</dt><dd>${(local.reserve/.24).toFixed(2)} 季</dd>${local.demand>0?`<dt>本次补粮需求 / 未补足</dt><dd>${grainAmount(local.demand)} / ${grainAmount(local.unmet)} 份</dd>`:''}</dl><h5>本季接粮顺序${rank?` · 本城第 ${rank} 位`:''}</h5>${queue.length?`<ol>${queue.map(p=>`<li><span>${name(p.id)} · 调配前 ${p.stockSeasons.toFixed(2)} 季</span><span>实际收到 ${grainAmount(p.imported)} 份</span></li>`).join('')}</ol>`:'<p>没有城低于两季补给线。</p>'}<h5>可出粮的城</h5>${donors.length?`<ul>${donors.map(p=>`<li><span>${name(p.id)} · 留粮线 ${(p.reserve/.24).toFixed(2)} 季</span><span>留粮线以上余 ${grainAmount(p.remainingSupply)} 份；运力余 ${grainAmount(p.remainingCapacity)} / ${grainAmount(p.capacity)} 份</span></li>`).join('')}</ul>`:'<p>本季没有可出粮城。</p>'}<p class="ledger-caption">先结算本地收成与用粮，再按人均库存从少到多补至两季；显示保留两位，排序使用原始值；${rotation===null?'完全同值按海图城序':`完全同值使用轮换次序，本季是执行的第 ${rotation+1} 季`}。供给城按人均库存从多到少出粮。${tideAt(state.tick)>.88?'本季长潮使两端运力降为六成。':''}这些是出生、迁居和随后行动之前的读数，当前建设不会改写已结算的账页。</p>${targets.map(id=>`<button data-transport-city="${id}">查看${name(id)}的建设与代价 ↗</button>`).join('')}</details>`;
}
function shipmentLedger(city){
  if(!state.shipments)return '<p class="ledger-caption">旧存档没有留下本季运粮去向；净调配仍在上方，下一季开始记录明细。</p>';
  if(!state.tick)return '<p class="ledger-caption">航单从下一季开始记起。</p>';
  const legs=state.shipments.legs.filter(l=>l.from===city.id||l.to===city.id);
  return `<div class="shipment-ledger"><h4>本季航单</h4>${legs.length?`<ul>${legs.map(l=>`<li><button data-shipment="${shipmentKey(l)}"><span>${CITIES.find(c=>c.id===l.from).name} → ${CITIES.find(c=>c.id===l.to).name}</span><strong>${grainAmount(l.amount)} 份 ↗</strong></button></li>`).join('')}</ul><p class="ledger-caption">点航单在海图追踪。粮食已按季结算；箭头展示来源与去向，航迹不计算航时，帆船不是逐船货运。</p>`:'<p class="ledger-caption">本城这一季没有岛间运粮。已有粮仓仍会被本地产出与居民消耗改变。</p>'}${transportLedger(city)}</div>`;
}
function lifeLedger(city){
  const row=(label,value)=>`<dt>${label}</dt><dd>${value}</dd>`;
  return `<section class="city-note"><h3>生活怎样流动</h3>${state.tick?`<p>${dateLabel(state)} · 最近一季</p><dl class="life-ledger">${row(city.balance<0?'本地产粮缺口':'本地产粮余量',`${fmt(Math.abs(city.balance))} 份`)}${row('海运调配',city.trade===0?'本季未调运':`${city.trade>0?'运入':'运出'} ${grainAmount(Math.abs(city.trade))} 份`)}${row('岛间净迁居',city.migration===0?'本季没有迁居':`${city.migration>0?'迁入':'迁出'} ${fmt(Math.abs(city.migration))} 人`)}</dl><p class="ledger-caption">产粮余缺是当季产出与需求之差；海运来自邻岛的真实库存。迁居另计，不包含出生、死亡或外海旅人。</p>`:'<p>首份季节收支会在下一季留下。现在的粮仓来自你抵达前的生活。</p>'}${shipmentLedger(city)}<dl class="life-ledger">${row('累积污染',`${(city.pollution*100).toFixed(1)}%`)}${row('公共知识',city.knowledge.toFixed(1))}</dl><p class="ledger-caption">矿炉的污染会压低生态与产量；学堂积累的知识会改善耕作。看过一季，再回来看看十二年。</p><p class="ledger-caption">港边八格粮架，每格表示一季用量，超过八季仍显示满架。它是全城库存的缩影，实数以账本为准。</p>${city.id==='ember'?`<p class="ledger-caption" data-river-reading>回灰河东段 · 此刻累积污染 ${(city.pollution*100).toFixed(1)}%。水色、岸痕与河口沉积表现全城累积污染，不是实际水质采样或流体扩散。停炉后的痕迹随现有污染逐季变化。</p>`:''}<div class="city-action-row">${city.id==='ember'?'<button data-river>去看回灰河东段 ↗</button>':''}<button data-food-scene="store">去看港边粮架 ↗</button>${['haven','reed'].includes(city.id)?`<button data-food-scene="fields">去看${SEASONS[state.tick%4]}的田 ↗</button>`:""}</div></section>`;
}
function populationChart(){
  const local=state.history.filter(h=>h.cities?.some(c=>c.id===selected)).slice(-80),hasLocal=local.length>=2;
  const hist=hasLocal?local:state.history.slice(-80),name=hasLocal?CITIES.find(c=>c.id===selected).name:'群岛';
  if(hist.length<2)return '<p class="chart-title">时间流动后，这里会留下居民的变化曲线。</p>';
  const values=hist.map(h=>hasLocal?h.cities.find(c=>c.id===selected).population:h.population),min=Math.min(...values),max=Math.max(...values),span=max-min||1;
  const points=values.map((v,i)=>`${10+i/(values.length-1)*280},${65-(v-min)/span*48}`).join(' ');
  return `<p class="chart-title">${name}居民 · ${fmt(min)}—${fmt(max)} 人</p><svg class="mini-chart" viewBox="0 0 300 82" role="img" aria-label="${name}人口从 ${fmt(values[0])} 人变为 ${fmt(values.at(-1))} 人"><polyline points="${points}" fill="none" stroke="#c4d4ad" stroke-width="1.5"/></svg><div class="chart-range"><span>${START_YEAR+Math.floor(hist[0].tick/4)} 年</span><span>${dateLabel(state)}</span></div>`;
}
function tideChart(){
  const points=Array.from({length:49},(_,i)=>`${10+i/48*280},${70-tideAt(i)*55}`).join(' '),phase=state.tick%48;
  return `<p class="chart-title">十二年潮历 · 当前第 ${Math.floor(phase/4)+1} 年</p><svg class="mini-chart" viewBox="0 0 300 82" role="img" aria-label="十二年中每季的相对潮位，圆点是现在"><polyline points="${points}" fill="none" stroke="#93b9b3" stroke-width="1.5"/><circle cx="${10+phase/48*280}" cy="${70-tideAt(phase)*55}" r="4" fill="#e3cb99"/></svg><div class="chart-range"><span>雨生 · 起点</span><span>十二年 · 下一轮</span></div>`;
}

function petitionContent(city){
  const p=pendingPetitions(state).find(p=>p.city===city.id);
  if(!p)return '';
  const opened=petitionOpenedAt(state,p),context=(state.petitionOpenings??[]).find(o=>o.id===p.id)?.context;
  return `<section class="petition"><p class="city-type">一封未答的来信 · ${START_YEAR+Math.floor(opened/4)} 年提出</p><h3>${p.title}</h3>${context?`<p class="city-description">${escape(context)}这封信会保留到你作出回应。</p>`:""}${state.tick>opened+40?`<p class="city-description">${residentAt(city,state.tick).name}把这个尚未决定的旧议题重新带到桌上。最初的两种声音仍写在信里。</p>`:''}${p.voices.map(([name,text],i)=>{const speaker=p.trigger?(i===0?name.replace(city.person.name,residentAt(city,opened).name):opened>200?name.replace(' · ','一家的后辈 · '):name):name;return `<div class="petition-voice"><b>${speaker}</b><p>“${text}”</p></div>`;}).join('')}<p class="treasury">公共库藏 ${fmt(state.cities.find(c=>c.id===city.id).wealth)} 铜</p>${p.options.map(o=>{const reason=decisionReason(state,p.id,o.id);return `<section class="policy"><h4>${o.label}</h4><p>${o.cost}</p><small>${o.detail}${o.trace?`<br>会留下：${o.trace}。`:""}</small><button data-decision="${p.id}" data-choice="${o.id}" ${reason?'disabled':''}>${reason||`选择：${o.label}`}</button></section>`;}).join('')}<p class="city-description">也可以暂不回应，让世界继续。两年后的生活片段会进入年代记。</p></section>`;
}
function readingTable(before,after,left,right){
  const rows=outcomeFor({before,after});
  const value=(r,n)=>n.toLocaleString('zh-CN',{minimumFractionDigits:r.digits,maximumFractionDigits:r.digits})+(r.unit?' '+r.unit:'');
  return `<table class="reading-table"><thead><tr><th scope="col">账目</th><th scope="col">${left}</th><th scope="col">${right}</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${r.label}</th><td>${value(r,r.before)}</td><td>${value(r,r.after)}</td></tr>`).join('')}</tbody></table>`;
}
function receiptContent(decision){
  if(!outcomeFor(decision))return `<p class="ledger-caption">${decision.followedUp?'当时未留下完整数值账页，原信保留，不追补过去的读数。':decision.before?'已留下决定前的账页，回信抵达时再记录实际变化。':'这份旧决定没有留下数值起点。回信会保留原有叙事，不追补过去的读数。'}</p>`;
  return `<section class="decision-receipt" data-receipt="${decision.id}"><h4>留给后人的账页</h4><p class="ledger-caption">${dateLabel({tick:decision.tick})} → ${dateLabel(decision.after)}</p>${readingTable(decision.before,decision.after,'决定前','回信时')}<p class="ledger-caption">粮仓季数按各时点居民用量计算。变化包含同期气候、建设与其他旧约的作用，不能单独归于这份决定。</p></section>`;
}
function memoryContent(city){
  return (state.decisions??[]).filter(d=>PETITIONS.find(p=>p.id===d.id)?.city===city.id).map(decision=>{
  const petition=PETITIONS.find(p=>p.id===decision.id),option=petition.options.find(o=>o.id===decision.choice);
  return `<div class="city-note"><h3>这座城仍记得 · ${petition.title}</h3><p>${START_YEAR+Math.floor(decision.tick/4)} 年，人们选择了「${option.label}」。${option.detail}</p><p>${decision.followedUp?(decision.after?`${dateLabel(decision.after)}，居民写来了回信。`:'决定之后，居民已经写来回信。'):'回信将在决定两年后写入年代记。'} 这份旧约会跨代保留。</p>${decision.followedUp?`<details class="old-letter"><summary>阅读当年的回信</summary><p>${aftermathFor(decision)}</p>${receiptContent(decision)}</details>`:receiptContent(decision)}${option.trace?`<p>眼前的痕迹：${option.trace}。</p>${decision.id==='haven-queue'&&decision.choice==='rotation'?`<p class="ledger-caption" data-order-reading>${queueCaption()}。盘上六枚签对应六城颜色，指针显示当季接粮首位；顺序靠前不保证有粮抵达。</p>`:''}${decision.id==='haven-shore'&&decision.choice==='nursery'?`<p class="ledger-caption" data-nursery-reading>${nurseryTideReading(state.tick).label}。朝向取当前季到下一季的潮历涨退，贴水身影随水面升降。五条鱼是保育浅湾的代表性表现，不是鱼群实数、流场或捕捞模拟。</p><button data-action="tide-step">看下一季的浅湾 ↗</button>`:''}<button data-trace="${petition.id}" data-trace-choice="${option.id}">在地图上看这处变化 ↗</button>`:""}<button data-action="legacy">翻阅世代与旧约 ↗</button></div>`;}).join('');
}
function walkContent(city){
  const place=walkReading(state,city.id,walkIndex);
  return `<section class="city-walk"><p class="city-type">${city.name} · 沿街漫游 · ${walkIndex+1} / 3 · ${place.season}</p><h3 id="walk-title" tabindex="-1" data-walk-title>${place.title}</h3><div class="walk-paging"><button data-walk="${walkIndex-1}" ${walkIndex===0?'disabled':''}>← 上一处</button><button data-walk="${walkIndex+1}" ${walkIndex===2?'disabled':''}>下一处 →</button></div><p class="walk-setting">${place.setting}</p><nav aria-label="漫游地点">${WALKS[city.id].map(([title],i)=>`<button data-walk="${i}" ${i===walkIndex?'aria-current="step"':''}>${i+1}. ${title}</button>`).join('')}</nav><div class="walk-reading"><h4>眼前的这一季</h4><p>${place.reading}</p></div><p class="ledger-caption">三处近景沿用已有街区。切换视点不会推进季节；日常片段是原创叙事，下方读数来自当前世界，行人仍是代表性场景。</p><button data-tab="place">回到城镇总览 ↗</button></section>`;
}
function visitWalk(index){
  if(!walkReading(state,selected,index))return;
  walkIndex=index;tab='walk';scene?.focusWalk(selected,index);sceneFocus=`walk:${index}`;
  $('view-subtitle').textContent=detailCaption(sceneFocus);renderDrawer();
  $('drawer-content').querySelector('.city-walk').scrollIntoView({block:'start'});
  $('drawer-content').querySelector('[data-walk-title]').focus({preventScroll:true});
}
function renderDrawer(){
  const transportWasOpen=$('drawer-content').querySelector('[data-transport]')?.open;
  const d=CITIES.find(c=>c.id===selected),landmark=LANDMARKS.find(c=>c.id===selected);
  if(!d){$('drawer-content').innerHTML=`<p class="city-type">群岛遗迹 · 已收录旅行札记</p><h2 class="city-title">${landmark.name}</h2><p class="city-motto">${landmark.title}</p><p class="city-description">${landmark.text}</p>${landmark.id==='garden'?'<div class="city-action-row"><button data-action="garden-water">近看竹管与水钵 ↗</button><button data-action="garden-place">回到小径与远景 ↗</button></div>':''}${landmark.id==='bell'?`<div class="city-action-row"><button data-bell-view="tablet">近看迁居石板 ↗</button><button data-bell-view="steps">走到旧港潮阶 ↗</button><button data-bell-view="tower">回到钟楼 ↗</button></div><div class="city-note"><h3>脚下的潮水</h3><p>${tideAt(state.tick)>.8?'水位很高，旧港的石阶正没入海里。':tideAt(state.tick)<.25?'潮水退低了，旧港的石阶正在露出。':'水位在两次极值之间。推进季节，留意岛屿南端的石阶。'}</p>${tideChart()}<button data-action="tide-step">再看下一季的潮水 ↗</button></div>`:''}<div class="city-note"><h3>你留下的足迹</h3><p>已发现 ${state.discoveries.length} / ${LANDMARKS.length} 处地方。已访地点与札记长久保留，近期发现消息另存于年代记的 400 条窗口。</p></div><div class="city-action-row"><button data-action="journal">重读旅行札记 ↗</button></div>`;bindDrawer();return;}
  const c=state.cities.find(c=>c.id===selected),person=residentAt(d,state.tick),petition=pendingPetitions(state).find(p=>p.city===d.id);
  const shore=d.id==='haven'?(state.decisions??[]).find(choice=>choice.id==='haven-shore'):null;
  const title=`<p class="city-type">${d.type} · ${d.en}</p><h2 class="city-title">${d.name}</h2><p class="city-motto">${d.motto}</p><div class="city-tabs" role="tablist" aria-label="城镇详情"><button role="tab" aria-selected="${tab==='place'}" data-tab="place">此地</button><button role="tab" aria-selected="${tab==='walk'}" data-tab="walk">漫游</button><button role="tab" aria-selected="${tab==='people'}" data-tab="people">此人${petition?' · 来信':''}</button><button role="tab" aria-selected="${tab==='choices'}" data-tab="choices">改变</button></div>`;
  let body='';
  if(tab==='place')body=`${petition?'<div class="city-action-row"><button data-tab="people">有一封居民来信 · 进入议事 ↗</button></div>':''}<p class="city-description">${d.description}</p><div class="city-action-row place-routes"><button data-tab="walk">沿街走走 · 三处地方 ↗</button><button data-action="species">寻找本地物种 ↗</button></div><div class="facts">${fact('居民',fmt(c.population),'人')}${fact('粮仓', (c.food/(c.population*.24)).toFixed(1),'季用量')}${fact('生态',Math.round(c.ecology*100),'%')}${fact('互信',Math.round(c.trust*100),'%')}</div><div class="city-note"><h3>正在发生</h3><p>${c.lastShortage?(c.trade>0?'粮食低于警戒线，邻岛补给已经抵港，但尚未补足缺口。':'粮食低于警戒线，本季没有收到邻岛补给。居民正靠剩下的库存等待下一次收成。'):c.ecology<.5?'土地正在失去恢复力。矿炉、港口和耕作共同挤压自然。':c.policies.school>0?'学堂的窗户开着。观察、记录和技艺开始在居民间传递。':'日常生活仍在继续。人们修补渔网，给粮仓添上新的刻度。'} ${Math.abs(c.trade)>1?`本季${c.trade>0?'运入':'运出'} ${fmt(Math.abs(c.trade))} 份粮食。`:''}</p></div>${lifeLedger(c)}<div class="city-note"><h3>${d.craft}</h3><p>${d.material}。${d.history}</p></div><div class="city-note"><h3>餐桌上的故乡</h3><p>${d.food}。${d.ritual}</p></div><div class="city-note" id="species-note"><h3 id="species-title" tabindex="-1">${d.species}</h3><p>${d.adaptation}。</p>${d.id==='haven'?`<p class="ledger-caption" data-fish-reading>${shore?.choice==='nursery'?`这里已留下鱼苗浅湾。${nurseryTideReading(state.tick).label}。五个身影表现保育选择与当前潮势，不是鱼群实数。`:shore?'这里选择修建共用渡口，眼前保留候船棚与泊位；没有鱼苗保育近景。原有决定与代价仍在居民旧约里。':'岸线尚未作出决定。第一季起，居民会讨论共用渡口与鱼苗浅湾的取舍；阅读不会替你选择。'}</p><div class="city-action-row">${shore?.choice==='nursery'?'<button data-observe data-trace="haven-shore" data-trace-choice="nursery">去看浅湾的银鳞鱼 ↗</button><button data-species-back>回到望潮湾街区 ↗</button>':''}<button data-tab="people">前往居民议事 ↗</button></div>`:''}${d.id==='reed'?`<p class="ledger-caption" data-heron-reading>${heronReading(c,state.tick).season} · ${heronReading(c,state.tick).label}。全城生态 ${(c.ecology*100).toFixed(1)}%。根毯上的分趾支撑身体，归潮时苇穗显露。苇丛与停栖身影是现有生态读数的场景表现，不是鸟类实数或个体模拟。</p><div class="city-action-row"><button data-observe data-herons>去看河湾的苇鹭 ↗</button><button data-herons-back>回到苇原街区 ↗</button></div>`:''}${d.id==='ember'?`<p class="ledger-caption" data-swallow-reading>${swallowReading(c).label}。累积污染 ${(c.pollution*100).toFixed(1)}%，全城生态 ${(c.ecology*100).toFixed(1)}%。污染使泥沿积灰；停炉后，旧灰与空巢不会立刻消失。身影只代表现有污染、生态的场景变化，不是鸟类实数或温度模拟。</p><div class="city-action-row"><button data-observe data-ember-swallows>去看岩缝边的石燕 ↗</button><button data-swallows-back>回到烬山街区 ↗</button></div>`:''}${d.id==='spire'?`<p class="ledger-caption" data-butterfly-reading>${butterflyReading(c,state.tick,$('light').value).season} · ${butterflyReading(c,state.tick,$('light').value).label}。暖季日光下展开深色翼脉，暮夜与静冬收翼。停栖身影随全城生态减退或回来，是地方习性的表现，不是实测蝶数、体温或个体模拟。</p><div class="city-action-row"><button data-observe data-spire-butterflies>去看山脊上的薄翼 ↗</button><button data-butterflies-back>回到白塔街区 ↗</button></div>`:''}${d.id==='moss'?`<p class="ledger-caption" data-frog-reading>${frogReading(c,state.tick,state.climate).season} · ${frogReading(c,state.tick,state.climate).label}。常态长昼或持续少雨时，身影伏入积水枝窝；丰雨年代保持外露。停栖身影沿用这棵树原有的生态存活条件，是物种习性的代表性场景，不是个体或蓄水模拟。</p><div class="city-action-row"><button data-observe data-moss-frogs>去看树冠的积水枝窝 ↗</button><button data-frogs-back>回到林汐街区 ↗</button></div>`:''}${d.id==='wind'?`<p class="ledger-caption" data-grass-reading>全城生态 ${(c.ecology*100).toFixed(1)}%。叶片高度与色泽回应现有生态。在右上“场景光照”切换日光与夜航，看银叶和叶尖雾滴；这是物种设定的表现，不改变季节、库存或产量。</p><div class="city-action-row"><button data-observe data-wind-grass>去看迎风坡的银叶 ↗</button><button data-grass-back>回到风栖街区 ↗</button></div>`:''}</div>${populationChart()}<div class="city-action-row"><button data-action="city-journal">阅读本城年代记 ↗</button><button data-tab="choices">为这里做一个选择 ↗</button></div>`;
  if(tab==='walk')body=walkContent(d);
  if(tab==='people'){
    const decisionToday=(state.decisions??[]).some(choice=>choice.tick===state.tick&&PETITIONS.find(p=>p.id===choice.id)?.city===d.id);
    const moment=c.lastShortage?`${person.name}把今天的粮票折成两半，分给刚搬来的邻居。空下来的陶碗排在窗边。`:c.migration>0?`${person.name}替新到的人认门。有人带来了种子，有人只带着一只装过故乡泥土的杯子。`:decisionToday?`${person.name}把今天的决定写进地方志。有人已经去看改变的地方，也有人还在等它兑现承诺。新的规则，要在往后的日常里经受检验。`:state.events.some(e=>e.city===d.id&&e.tick===state.tick&&e.kind==='aftermath')?`${person.name}把今天抵达的回信摊在桌上。旧决定已经进入日常，账页留下了这段时间的变化，也留下仍需追问的地方。`:c.policies.school?`孩子们带着自己的问题来到学堂。有人想知道月亮为何错开，有人想知道远方的歌为什么没有同样的节拍。${person.name}在一旁听着。`:`${person.name}在${SEASONS[state.tick%4]}的清晨出门。港口传来另一座岛的口音，饭桌上多了一样远方的食物。今天还没有发生足以写进史书的事。`;
    body=`${petitionContent(d)}<div class="person"><div class="person-name"><strong>${person.name}</strong><span>${person.age} 岁 · ${person.role}</span></div>${person.generation?`<p class="city-type">第 ${person.generation+1} 代记录者 · 从${d.person.name}的那一页继续</p>`:''}<blockquote class="voice">“${d.person.voice}”</blockquote>${person.generation?'<p>这是最初的记录者留下的话。后来的人保留它，也可以做出不同的决定。</p>':''}<h3>一个愿望</h3><p>${d.person.wish}。</p></div>${memoryContent(d)}<div class="city-note"><h3>${dateLabel(state)} · 生活片段</h3><p>${moment}</p></div><div class="city-action-row"><button data-tab="choices">查看城镇建设 ↗</button></div>`;
  }
  if(tab==='choices')body=`<p class="city-description">${d.dilemma}</p><p class="treasury">公共库藏 ${fmt(c.wealth)} 铜 · 行动会立即记入历史</p>${POLICIES.map(p=>{const reason=policyReason(state,c.id,p.id);return `<section class="policy"><div class="policy-head"><h3>${p.name}</h3><span>${c.policies[p.id]} / ${p.max} 级</span></div><p>${p.effect}</p><button data-policy="${p.id}" ${reason?'disabled':''}>${reason||`投入 ${p.cost} 铜`}</button><small>${p.detail}<br>地图上会出现：${p.visible}。</small>${c.policies[p.id]>0?`<button data-retire="${p.id}">撤除一级 · 不退款</button>`:""}</section>`;}).join('')}<p class="ledger-caption">撤除不额外扣款，也不退回建设投入；重建仍按原价。已有污染与知识保留，下一季按新等级计算。居民旧约继续有效。</p><div class="city-action-row"><button data-action="compare">推演十二年后的分歧 ↗</button></div>`;
  if(tab==='people'||tab==='choices')body+='<div class="city-action-row"><button data-action="council">查看本城自治议事 ↗</button></div>';
  $('drawer-content').innerHTML=title+body;const transport=$('drawer-content').querySelector('[data-transport]');if(transport)transport.open=Boolean(transportWasOpen);bindDrawer();
}
function bindDrawer(){
  $('drawer-content').querySelector('[data-action="council"]')?.addEventListener('click',()=>showCouncil(selected));
  $('drawer-content').querySelector('[data-action="species"]')?.addEventListener('click',()=>{
    const note=$('species-note');note.scrollIntoView({block:'start'});$('species-title').focus({preventScroll:true});
    note.querySelector('[data-observe]')?.click();
  });
  $('drawer-content').querySelector('[data-species-back]')?.addEventListener('click',()=>select(selected));
  $('drawer-content').querySelectorAll('[data-bell-view]').forEach(b=>b.onclick=()=>{scene?.focusBell(b.dataset.bellView);$('view-subtitle').textContent={tablet:'迁居人的旧条款',steps:'旧港六级潮阶',tower:'没有钟声的钟楼'}[b.dataset.bellView];});
  $('drawer-content').querySelector('[data-action="garden-water"]')?.addEventListener('click',()=>{scene?.focusGardenWater();$('view-subtitle').textContent='竹管与水钵';});
  $('drawer-content').querySelector('[data-action="garden-place"]')?.addEventListener('click',()=>{scene?.focus('garden');$('view-subtitle').textContent='小径尽头 · 留白之庭';});
  $('drawer-content').querySelectorAll('[data-transport-city]').forEach(b=>b.onclick=()=>{select(b.dataset.transportCity);tab='choices';renderDrawer();$('drawer-content').querySelector('[data-tab="choices"]').focus({preventScroll:true});});
  $('drawer-content').querySelectorAll('[data-shipment]').forEach(b=>b.onclick=()=>{setMapLayer('trade');if(scene?.focusShipment(b.dataset.shipment)){sceneFocus=`shipment:${b.dataset.shipment}`;$('view-subtitle').textContent=detailCaption(sceneFocus);}});
  $('drawer-content').querySelector('[data-river]')?.addEventListener('click',()=>{scene?.focusRiver();sceneFocus='river';$('view-subtitle').textContent=detailCaption(sceneFocus);toast('水色与岸痕来自当前累积污染。撤除矿炉会改变以后，已经留下的污染继续逐季结算。');});
  $('drawer-content').querySelector('[data-herons]')?.addEventListener('click',()=>{scene?.focusHerons();sceneFocus='herons';$('view-subtitle').textContent=detailCaption(sceneFocus);});
  $('drawer-content').querySelector('[data-herons-back]')?.addEventListener('click',()=>select('reed'));
  $('drawer-content').querySelector('[data-wind-grass]')?.addEventListener('click',()=>{scene?.focusWindGrass();sceneFocus='wind-grass';$('view-subtitle').textContent=detailCaption(sceneFocus);});
  $('drawer-content').querySelector('[data-ember-swallows]')?.addEventListener('click',()=>{scene?.focusEmberSwallows();sceneFocus='ember-swallows';$('view-subtitle').textContent=detailCaption(sceneFocus);});
  $('drawer-content').querySelector('[data-swallows-back]')?.addEventListener('click',()=>select('ember'));
  $('drawer-content').querySelector('[data-spire-butterflies]')?.addEventListener('click',()=>{scene?.focusSpireButterflies();sceneFocus='spire-butterflies';$('view-subtitle').textContent=detailCaption(sceneFocus);});
  $('drawer-content').querySelector('[data-butterflies-back]')?.addEventListener('click',()=>select('spire'));
  $('drawer-content').querySelector('[data-moss-frogs]')?.addEventListener('click',()=>{scene?.focusMossFrogs();sceneFocus='moss-frogs';$('view-subtitle').textContent=detailCaption(sceneFocus);});
  $('drawer-content').querySelector('[data-frogs-back]')?.addEventListener('click',()=>select('moss'));
  $('drawer-content').querySelector('[data-grass-back]')?.addEventListener('click',()=>select('wind'));
  $('drawer-content').querySelectorAll('[data-food-scene]').forEach(b=>b.onclick=()=>{
    if(scene?.focusFood(selected,b.dataset.foodScene)){sceneFocus=b.dataset.foodScene;$('view-subtitle').textContent=detailCaption(sceneFocus);toast(sceneFocus==='fields'?`${FIELD_STAGES[state.tick%4].name}的田。作物外观随季节与生态变化，是全城农业的代表性片段。`:'八格粮架显示全城现有粮仓，每格一季，最多八季。');}
  });
  $('drawer-content').querySelector('[data-action="tide-step"]')?.addEventListener('click',()=>{if(selected==='haven'){scene?.focusTrace('haven-shore','nursery');sceneFocus='nursery';}pause();step();$('drawer-content').querySelector('[data-action="tide-step"]').focus({preventScroll:true});});
  $('drawer-content').querySelectorAll('[data-decision]').forEach(button=>button.onclick=()=>{
    const result=decide(state,button.dataset.decision,button.dataset.choice);
    toast(result.ok?'议事会作出了决定。代价已支付，新的规则开始生效。':result.reason);renderStats();renderDrawer();save();$('drawer-content').querySelector('[data-tab="people"]').focus({preventScroll:true});
  });
  $('drawer-content').querySelectorAll('[data-action="legacy"]').forEach(b=>b.onclick=()=>showJournal('legacy',selected));
  $('drawer-content').querySelector('[data-action="city-journal"]')?.addEventListener('click',()=>showJournal('all',selected));
  $('drawer-content').querySelectorAll('[data-trace]').forEach(b=>b.onclick=()=>{if(scene?.focusTrace(b.dataset.trace,b.dataset.traceChoice)){sceneFocus=b.dataset.trace==='haven-queue'&&b.dataset.traceChoice==='rotation'?'queue':b.dataset.trace==='haven-shore'&&b.dataset.traceChoice==='nursery'?'nursery':null;const p=PETITIONS.find(p=>p.id===b.dataset.trace),o=p.options.find(o=>o.id===b.dataset.traceChoice);$('view-subtitle').textContent=sceneFocus?detailCaption(sceneFocus):o.trace;if(!b.hasAttribute('data-observe'))toast(o.trace+'。');}});

  $('drawer-content').querySelectorAll('[data-walk]').forEach(b=>b.onclick=()=>visitWalk(Number(b.dataset.walk)));
  $('drawer-content').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
    if(b.dataset.tab==='walk'){visitWalk(walkIndex);return;}
    if(sceneFocus?.startsWith('walk:')){sceneFocus=null;scene?.focus(selected);$('view-subtitle').textContent=CITIES.find(c=>c.id===selected).type;}
    tab=b.dataset.tab;renderDrawer();$('drawer-content').querySelector('.city-tabs').scrollIntoView({block:'start'});$('drawer-content').querySelector(`[data-tab="${tab}"]`).focus({preventScroll:true});
  });
  $('drawer-content').querySelectorAll('[data-policy]').forEach(b=>b.onclick=()=>{const id=b.dataset.policy,result=enact(state,selected,id);toast(result.ok?'建设已经出现在地图中，决定已记入历史。让时间流动，看看后果。':result.reason);renderStats();renderDrawer();save();($('drawer-content').querySelector(`[data-policy="${id}"]:enabled`)??$('drawer-content').querySelector('[data-tab="choices"]')).focus({preventScroll:true});});
  $('drawer-content').querySelectorAll('[data-retire]').forEach(button=>{
    let confirmed=false;button.onclick=()=>{
      if(!confirmed){confirmed=true;button.textContent='确认撤除一级 · 投入不退款';return;}
      const id=button.dataset.retire,result=retire(state,selected,id);
      toast(result.ok?'设施已撤除一级。过去的污染与知识仍在，下一季开始显现新的取舍。':result.reason);
      renderStats();renderDrawer();save();$('drawer-content').querySelector(`[data-policy="${id}"]`).focus({preventScroll:true});
    };
  });
  $('drawer-content').querySelector('[data-action="compare"]')?.addEventListener('click',showComparison);
  $('drawer-content').querySelector('[data-action="journal"]')?.addEventListener('click',()=>showJournal('discovery'));
}
function openModal(title,html,kind){pause();modalKind=kind;modalMessage.textContent='';$('toast').hidden=true;$('modal-title').textContent=title;$('modal-body').innerHTML=html;if(!modal.open)modal.showModal();modal.scrollTop=0;$('modal-body').scrollTop=0;}
let developmentRequest=0;
async function showDevelopmentLog(){
  const request=++developmentRequest,refresh=document.activeElement?.id==='refresh-development';
  openModal('开发日志','<p class="empty" role="status">正在读取本地开发记录…</p>','development');
  try{
    const response=await fetch('./data/development-log.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Log unavailable');
    const html=renderDevelopmentLog(await response.json());
    if(!modal.open||modalKind!=='development'||request!==developmentRequest)return;
    $('modal-body').innerHTML=html;
    $('refresh-development').onclick=showDevelopmentLog;
    if(refresh)$('refresh-development').focus({preventScroll:true});
  }catch{
    if(!modal.open||modalKind!=='development'||request!==developmentRequest)return;
    $('modal-body').innerHTML='<p class="empty" role="status">开发记录暂时无法读取，你的世界和存档未受影响。</p><button id="refresh-development">重新读取</button>';
    $('refresh-development').onclick=showDevelopmentLog;
    if(refresh)$('refresh-development').focus({preventScroll:true});
  }
}
$('development-button').onclick=showDevelopmentLog;
function showPassage(passage){
  const {cities,years,replies,letters}=passage,least=cities.reduce((a,b)=>a.foodAfter<b.foodAfter?a:b);
  const changed=[...cities].sort((a,b)=>Math.abs(b.ecologyChange)-Math.abs(a.ecologyChange))[0];
  const focus=least.foodAfter<1?least:changed,name=CITIES.find(c=>c.id===focus.id).name;
  const lead=least.foodAfter<1?`${name}的粮仓，只够不到一季。`:`${name}的土地，留下了最明显的变化。`;
  const note=c=>c.ecologyChange<-.03?'林冠比从前稀了。城里的库藏与土地的恢复力，走出了不同的曲线。':c.foodAfter<1?'仓门里的刻度很低。去看看收成、海运和还在等待的人。':c.populationChange<0?'常住居民变少了。到城里看看粮仓与最近一季的迁居账。':c.ecologyChange>.03?'林冠正在恢复。再去街道与饭桌旁看看，谁分享了这段好时光。':'生活继续积累。新的居民、旧的技艺，都写进了同一本地方志。';
  openModal(`${years}年回望`,`${saveBlocked?'<p class="modal-intro">这段变化仍在本页，但尚未保存。请先导出存档，再处理保存提示。</p>':''}<p class="passage-dates">${dateLabel({tick:passage.from})} — ${dateLabel({tick:passage.to})}</p><p class="book-lead">${lead}</p><div class="passage-totals"><p>群岛居民 <b>${delta(passage.populationChange)} 人</b></p><p>生态均值 <b>${delta(passage.ecologyChange*100,1)} 个百分点</b></p></div><p class="modal-intro">${replies?`这段时间，${replies} 封决定之后的回信已经抵达。`:''}下面是实际走过的${years}年。气候、建设与旧约共同影响了结果，不能把所有变化归于某一项行动。</p><div class="city-action-row"><button data-city="${focus.id}">先去${name}看看 ↗</button><button data-passage-journal>翻阅这段历史 ↗</button></div>${letters.length?`<section class="book-section"><h3>这些年，新问题也到了桌上</h3>${letters.map(id=>{const p=PETITIONS.find(p=>p.id===id);return `<p><button data-letter="${p.city}">${CITIES.find(c=>c.id===p.city).name} · ${p.title} ↗</button></p>`;}).join('')}</section>`:""}<div class="passage-cities">${cities.map(c=>`<article class="passage-city"><div><h3>${CITIES.find(d=>d.id===c.id).name}</h3><p>${note(c)}</p><button data-city="${c.id}">走进这座城 ↗</button></div><dl><dt>居民</dt><dd>${fmt(c.populationBefore)} → ${fmt(c.populationAfter)}<small>${delta(c.populationChange)} 人</small></dd><dt>生态</dt><dd>${(c.ecologyBefore*100).toFixed(1)}% → ${(c.ecologyAfter*100).toFixed(1)}%<small>${delta(c.ecologyChange*100,1)} 个百分点</small></dd><dt>粮仓</dt><dd>${c.foodBefore.toFixed(1)} → ${c.foodAfter.toFixed(1)} 季<small>按各时点居民用量</small></dd><dt>公共库藏</dt><dd>${delta(c.wealthChange)} 铜<small>这段时间的净变化</small></dd></dl></article>`).join('')}</div><p class="ledger-caption">回望已写入年代记。粮仓“季数”表示现有库存能够供给当时居民多久，不包含未来收成。</p>`,'passage');
  $('modal-body').querySelectorAll('[data-city]').forEach(b=>b.onclick=()=>select(b.dataset.city));
  $('modal-body').querySelectorAll('[data-letter]').forEach(b=>b.onclick=()=>{select(b.dataset.letter);tab='people';renderDrawer();$('drawer-content').querySelector('[data-tab="people"]').focus({preventScroll:true});});
  $('modal-body').querySelector('[data-passage-journal]').onclick=()=>showJournal('world');
}
function showAtlas(){
  const total=totals(state),least=state.cities.reduce((a,b)=>a.food/a.population<b.food/b.population?a:b),leastName=CITIES.find(c=>c.id===least.id).name;
  openModal('群岛图志',`<p class="modal-intro">六座城没有同一种生活。选择一处地方，沿着它的街道与故事走进去。</p><p class="food-distribution">群岛共有 <b>${fmt(total.food)}</b> 份粮食。库存最紧的是 <b>${leastName}</b>，约够 <b>${(least.food/(least.population*.24)).toFixed(1)}</b> 季当前用量。<small>这是现有粮仓的比较，不包含未来的收成。</small></p><div class="city-list" id="city-nav">${CITIES.map(d=>{const c=state.cities.find(c=>c.id===d.id);return `<button class="atlas-city" data-city="${d.id}"><strong>${d.name} ↗</strong><span>${d.type} · ${fmt(c.population)} 位居民${pendingPetitions(state).some(p=>p.city===d.id)?' · 有来信':''}</span><p>${d.motto}</p><small>粮仓 ${(c.food/(c.population*.24)).toFixed(1)} 季 · 生态 ${Math.round(c.ecology*100)}%</small></button>`;}).join('')}</div><div class="book-section"><h3>地图边缘</h3><p>城镇之外，还有一些值得停留的地方。</p><div class="landmark-list">${LANDMARKS.map(l=>`<button data-city="${l.id}">${l.name} ${state.discoveries.includes(l.id)?'· 已访':'↗'}</button>`).join('')}</div></div>`,'atlas');
  $('modal-body').querySelectorAll('[data-city]').forEach(b=>b.onclick=()=>select(b.dataset.city));
}
function showJournal(requestedFilter='all',cityId='all'){
  const {filter,city,events,places,oldestTick}=journalSelection(state,requestedFilter,cityId),scope=city?.id??'all';
  const cities=city?[city]:CITIES;
  const legacy=`<p class="modal-intro">名册与居民旧约跨代保留。旧消息离开近期窗口后，已作出的居民决定与留存账页仍在这里。</p>${cities.map(city=>{const person=residentAt(city,state.tick),memory=memoryContent(city);return `<article class="journal-entry"><div class="journal-date">${city.name}<br>第 ${person.generation+1} 代</div><div><h3>${person.name} · ${person.age} 岁</h3><p>${person.role}。${person.generation?`从${city.person.name}留下的记录接续至今。`:'你抵达时，这个人已在这里生活。'}</p>${memory||'<p class="ledger-caption">本城尚无已作出的居民旧约。</p>'}<div class="city-action-row"><button data-recent="${city.id}">阅读本城近期记录 ↗</button><button data-city="${city.id}">前往这座城 ↗</button></div></div></article>`;}).join('')}`;
  const news=events.length?events.map(e=>{const place=CITIES.find(c=>c.id===e.city),destination=e.kind==='migration'?CITIES.find(c=>c.id===e.destination):null;return `<article class="journal-entry"><div class="journal-date">${START_YEAR+Math.floor(e.tick/4)} 年<br>${SEASONS[e.tick%4]}${place?`<br>${place.name}${destination?`<br>→ ${destination.name}`:''}`:''}</div><div><h3>${escape(e.title)}</h3><p>${escape(e.text)}</p>${place?destination?`<div class="city-action-row"><button data-city="${place.id}">出发城 · ${place.name} ↗</button><button data-city="${destination.id}">迁入城 · ${destination.name} ↗</button></div>`:`<button data-city="${place.id}">前往这座城 ↗</button>`:''}</div></article>`;}).join(''):'<p class="empty">当前保留的近期记录中，没有符合这一筛选的消息。这不表示更早的历史从未发生；居民决定可在「世代与旧约」中寻找。</p>';
  const travel=city?'<p class="empty">旅行札记记在群岛名下。城外那些曾停留的地方，可以从这里重新翻开。</p><button data-travel-all>阅读群岛旅行札记 ↗</button>':`<section class="travel-notes"><h3>留下的地方 · ${places.length} / ${LANDMARKS.length}</h3><p class="ledger-caption">已访地点与札记长久保留。名录未单独保存首次到访日期；仍在近期窗口内的发现消息另列在下方。</p>${places.length?places.map(l=>`<article class="journal-entry" data-discovered="${l.id}"><div class="journal-date">已到访<br>地点名录</div><div><h3>${l.name}</h3><p class="travel-subtitle">${l.title}</p><p>${l.discovery}</p><button data-city="${l.id}">回到这里 ↗</button></div></article>`).join(''):'<p class="empty">还没有留下到访札记。从海图边缘走进一处地方，回来就会多一页。</p><button data-travel-atlas>展开群岛图志 ↗</button>'}</section><details class="travel-recent"><summary>近期发现消息 · ${events.length} 条</summary>${events.length?news:'<p class="ledger-caption">当前窗口没有发现消息。上方名录中的已访地点仍可重读，不补写旧日期。</p>'}</details>`;
  const count=filter==='legacy'?`${cities.length} 座城的名册`:filter==='discovery'&&!city?`${places.length} 处已访 · ${events.length} 条近期发现`:`${events.length} 条近期记录`;
  const content=filter==='legacy'?legacy:filter==='discovery'?travel:`<button class="journal-legacy" data-filter="legacy">${city?'阅读本城旧约':'阅读永久旧约'} ↗</button>${news}`;
  openModal('年代记',`<p class="modal-intro">${dateLabel(state)}。近期消息保留 ${state.events.length} / 400 条${oldestTick===null?'。':`，现有记录最早为 ${dateLabel({tick:oldestTick})}。`}${state.events.length===400?'窗口已满，更早的消息可能已离开；不补写缺失的历史。':''}</p><div class="journal-scope"><label for="journal-city">记录归属</label><select id="journal-city"><option value="all" ${city?'':'selected'}>全部群岛</option>${CITIES.map(c=>`<option value="${c.id}" ${city?.id===c.id?'selected':''}>${c.name}</option>`).join('')}</select><span role="status">${city?.name??'全部群岛'} · ${count}</span></div><p class="ledger-caption">迁居可按出发城或迁入城查阅；旧记录沿用出发城归属，去向请读原文。群岛札记与旅行发现请选「全部群岛」。</p><div class="journal-filters" role="group" aria-label="历史类别">${JOURNAL_FILTERS.map(([id,t])=>`<button data-filter="${id}" aria-pressed="${filter===id}" class="${filter===id?'active':''}">${t}</button>`).join('')}</div>${content}`,'journal');
  $('journal-city').onchange=event=>{showJournal(filter,event.target.value);$('journal-city').focus({preventScroll:true});};
  $('modal-body').querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{showJournal(b.dataset.filter,scope);$('modal-body').querySelector(`[data-filter="${b.dataset.filter}"]`).focus({preventScroll:true});});
  $('modal-body').querySelectorAll('[data-recent]').forEach(b=>b.onclick=()=>{showJournal('all',b.dataset.recent);$('journal-city').focus({preventScroll:true});});
  $('modal-body').querySelector('[data-travel-all]')?.addEventListener('click',()=>{showJournal('discovery');$('journal-city').focus({preventScroll:true});});
  $('modal-body').querySelector('[data-travel-atlas]')?.addEventListener('click',showAtlas);
  $('modal-body').querySelectorAll('[data-city]').forEach(b=>b.onclick=()=>select(b.dataset.city));
  $('modal-body').querySelectorAll('[data-action="legacy"],[data-trace]').forEach(b=>b.remove());
}

function showBook(){
  openModal('世界之书',`<p class="book-lead">海把土地分开。<br>生活把它们重新连接。</p><p class="modal-intro"><a href="docs/world-atlas.html" target="_blank" rel="noopener">展开完整图册 · 六城故事、海图公约与方法来源 ↗</a></p><p class="modal-intro">潮生是一片原创的虚构群岛。你抵达的这一年，六座城刚刚开始共用海图，新的航线与旧的生活同时存在。</p><section class="book-section"><h3>潮历与土地</h3><p>一年有雨生、长昼、归潮、静冬四季。两轮月亮的节律叠加，每十二年形成一个长潮循环。火山石、抬升的古海床与沉积平原，留下不同的土壤和海岸。地质与物种适应属于世界的背景设定；游戏时间推进的是城邦社会。</p></section><section class="book-section"><h3>世界如何回应你</h3><p>每季，环境与农田决定粮食产量，居民消耗库存。海运把富余粮食转给缺粮的地方。短缺与污染降低互信，持续的差异会推动迁居。共有林恢复生态，学堂积累知识，港口扩大交换，矿炉增加收入也留下污染。人口、库存与事件均由同一个本地规则模型产生。五类建设会在城中逐级出现；也可以撤除一级，建设投入不退款，过去的污染与知识保留，重建仍按原价。生态下降时，野生林冠会缩小、凋落，恢复时重新长出。望潮湾与苇原的田块随四季育苗、青穗、收割和休田，生态改变作物长势；六城港边八格粮架显示现有库存，每格约一季，超过八季显示满架。它们是全城农业与粮仓的代表性缩影。烬山的回灰河东段另以水色与岸痕表现累积污染，生活账本可直接定位；停炉后随已有污染逐季恢复。它们不是水质采样、植物生长或水流的物理模型。</p></section><section class="book-section"><h3>观察、选择与记忆</h3><p>没有必须完成的任务。你可以只看船只经过，也可以进入城镇改变它的道路。时间可以暂停，一季一季推进，也可以越过十二年。推演功能会在副本中比较当前建设和撤去五类常规建设的结果，不改变正在生活的世界。推演可展开六城的各项结果，并直接回到相应城镇调整建设。</p></section><section class="book-section"><h3>思想的来处</h3><p>参考 human-distillation-lab 的 14 个条目，把方法改写为具体的规则、空间与叙事。以下是创作者对资料的应用，不是这些人物本人参与创作或发表意见。专家库当前实测含 36 类、3,610 个条目，存在跨领域重复人物，内容仍为草稿。</p><div class="method-list">${METHODS.map(m=>`<article class="method"><div><strong>${m.name}</strong><span>${m.field} · ${m.kind}</span></div><div><p>${m.idea}<br>${m.use}</p><code>${m.path}</code></div></article>`).join('')}</div></section><section class="book-section"><h3>关于这个模型</h3><p>它是一部可交互的世界作品。产量、人口和生态系数服务于内部一致的玩法，未经过现实校准，不用于现实预测。潮汐采用两个正弦周期的简化历法；海岸地形固定，水面高度随简化潮历变化；沉钟旧港的台阶会随水位隐现。波纹和航船运动是视觉表现，不计算真实水流。没有后台大模型在扮演居民，文字是原创叙事与状态条件的组合。前六季有六项居民议题，十二年后另有留粮线与污染争议；二十四年后，同为空仓却有人收到、有人没收到时，望潮湾还会讨论分配次序。每项各有两种回应，会改变持续的产量、污染、知识或收入规则；两年后出现相应回信。新决定会保存行动前与回信时的城镇账页，反映同期气候、建设和旧约的共同结果；旧存档缺少的读数不会事后补造。记录者会代际交接，已经作出的旧约跨代保留。页面关闭后，模拟时间停止。</p></section><section class="book-section"><h3>声音与保存</h3><p>声景由浏览器实时合成。顶部「音乐」提供潮音和五种借鉴作曲语言的原创背景音乐，可调音量并随时停止。日光、暮色、夜航改变音区与音色，潮位改变风声强弱；切到后台时暂停声音。没有引用现成录音。世界自动保存于当前浏览器；换浏览器或清理站点数据不会带走存档，请先在设置中导出。Three.js 使用 MIT 许可，完整许可保留在项目中。</p></section>`,'book');
}
function showCouncil(scope='all'){
  openModal('六城自治议事会',renderCouncil(state,planCouncil(state),scope),'council');
  $('council-city').onchange=e=>{showCouncil(e.target.value);$('council-city').focus({preventScroll:true});};
  $('council-mode').onchange=e=>{
    if(saveBlocked){e.target.value=state.council?.enabled?'on':'off';toast('暂不能保存自治设置，请先处理存档提示。');return;}
    setCouncilEnabled(state,e.target.value==='on');renderStats();if(selected)renderDrawer();save();
    const message=modalMessage.textContent;showCouncil(scope);if(message)toast(message);$('council-mode').focus({preventScroll:true});
  };
  $('council-step').onclick=()=>{enter();step();const message=modalMessage.textContent;showCouncil(scope);if(message)toast(message);$('council-step').focus({preventScroll:true});};
  $('council-journal').onclick=()=>showJournal('council',scope);
  $('modal-body').querySelectorAll('[data-council-visit]').forEach(button=>button.onclick=()=>select(button.dataset.councilVisit));
}
$('council-button').onclick=()=>showCouncil();
function showComparison(){
  const r=compare(state),line=t=>`<p>居民 ${fmt(t.population)} 人</p><p>生态均值 ${Math.round(t.ecology*100)}%</p><p>公共库藏 ${fmt(t.wealth)} 铜</p><p>粮食库存 ${fmt(t.food)} 份</p>`;
  const cities=[...r.cities].sort((a,b)=>(b.id===selected)-(a.id===selected));
  openModal('十二年后的分歧',`<p class="passage-dates">${dateLabel(state)} → ${dateLabel(r)}</p><p class="modal-intro">从当前人口、库存与环境出发，在相同的气候序列里走过十二年。左边保留当前所有建设；右边把六城的五类常规建设等级归零。居民旧约在两边保留，已花掉的铜不会返还。这是一个规则内对照，不是预言，也不会推进真实时间。</p><p class="ledger-caption">本次建设对照暂不运行自治，两条路径都不增加新的自主行动。</p><div class="comparison"><div><h3>保留当前建设</h3>${line(r.future)}</div><div><h3>撤去常规建设</h3>${line(r.baseline)}</div></div><section class="book-section"><h3>每一座城承担什么</h3><p>海运与迁居仍在两条路径中各自演化。粮仓季数按各路径的居民用量计算；收入、生态与人口可能朝不同方向变化。</p>${cities.map(c=>{const name=CITIES.find(d=>d.id===c.id).name;return `<details class="projection-city" data-projection="${c.id}" ${c.id===selected?'open':''}><summary>${name}${c.id===selected?' · 你正在看的城':''}</summary>${readingTable(c.future,c.baseline,'保留建设','撤去建设')}<button data-comparison-city="${c.id}">回到${name}调整建设 ↗</button></details>`;}).join('')}</section>`,'compare');
  $('modal-body').querySelectorAll('[data-comparison-city]').forEach(b=>b.onclick=()=>{select(b.dataset.comparisonCity);tab='choices';renderDrawer();$('drawer-content').querySelector('[data-tab="choices"]').focus({preventScroll:true});});
}
function showOptions(){
  const backups=[['previous','恢复上一份存档'],['before-restore','撤销最近一次恢复']].map(([suffix,label])=>{
    try{const raw=localStorage.getItem(`${SAVE_KEY}-${suffix}`);if(!raw)return '';const saved=parseSave(raw);return `<div class="option-row"><label>${label}<button data-restore="${suffix}">${label}</button></label><p>${dateLabel(saved)} · ${fmt(totals(saved).population)} 位居民。恢复后当前有效世界仍会保留。点击两次确认。</p></div>`;}
    catch{return `<div class="option-row"><p>${label}：暂时无法读取，已保留原件。</p></div>`;}
  }).join('');
  openModal('世界设置',`<div class="option-row"><label>气候情景<select id="climate"><option value="temperate">常态气候</option><option value="dry">持续少雨</option><option value="wet">丰雨年代</option></select></label><p>改变未来各季的降水系数，保留此前历史。这是创作情景，不是现实气候预报。</p></div><div class="option-row"><label>场景动态<input id="motion" type="checkbox" ${matchMedia('(prefers-reduced-motion: reduce)').matches?'':'checked'}></label><p>控制船只、飞鸟与镜头过渡。模拟时间由底部播放按钮单独控制。</p></div><div class="option-row"><label>保存这片世界<button id="export-save">导出存档 ↗</button></label><p>存档包含群岛状态与历史，不包含账户或个人信息。建议在清理浏览器前留存。</p></div><div class="option-row"><label for="import-save">从存档继续<input type="file" id="import-save" accept=".json,application/json" style="max-width:190px"></label><p>验证成功后替换当前世界；当前有效世界会先保留为浏览器中的上一份存档。</p></div>${backups}<div class="option-row"><label>从最初的海图重新开始<button id="new-world" class="danger">重开世界</button></label><p>重新开始前保留当前有效存档。需要再按一次确认，避免误触。</p></div>`,'options');
  $('climate').value=state.climate;$('climate').onchange=e=>{state.climate=e.target.value;record(state,'新的气候情景',`你将未来气候设为「${{temperate:'常态气候',dry:'持续少雨',wet:'丰雨年代'}[e.target.value]}」。此前的历史保留。`,null,'choice');renderStats();if(selected)renderDrawer();toast('未来的气候情景已改变。');save();};
  $('motion').checked=motionEnabled;$('motion').onchange=e=>{motionEnabled=e.target.checked;scene?.setMotion(motionEnabled);};
  $('export-save').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`潮生-${START_YEAR+Math.floor(state.tick/4)}年.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('import-save').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    if(file.size>2_000_000){toast('存档大于 2 MB，未读取。');e.target.value='';return;}
    try{const next=parseSave(await file.text());
      state=replaceCurrent(next);saveBlocked=false;loadIssue='';renderStats();closeDrawer();modal.close();enter();$('save-status').textContent='已保存于此浏览器';toast('存档已载入，世界从这里继续。');
    }catch(error){if(error instanceof SaveConflictError)saveConflict();else toast('无法验证存档或安全保存，当前世界保持原样。');}finally{e.target.value='';}
  };
  $('modal-body').querySelectorAll('[data-restore]').forEach(button=>{
    let confirmed=false;button.onclick=()=>{
      if(!confirmed){confirmed=true;button.textContent='确认恢复';button.setAttribute('aria-label','确认恢复');return;}
      try{
        const suffix=button.dataset.restore,next=parseSave(localStorage.getItem(`${SAVE_KEY}-${suffix}`));
        const backup=suffix==='previous'?`${SAVE_KEY}-before-restore`:`${SAVE_KEY}-previous`;
        state=replaceCurrent(next,backup);saveBlocked=false;loadIssue='';
        renderStats();closeDrawer();modal.close();enter();$('save-status').textContent='已保存于此浏览器';toast('世界已恢复。原先的有效世界仍保留在设置中。');
      }catch(error){if(error instanceof SaveConflictError)saveConflict();else toast('无法安全恢复。当前世界与恢复来源保持原样，请先导出存档。');}
    };
  });
  let confirm=false;$('new-world').onclick=()=>{if(!confirm){confirm=true;$('new-world').textContent='确认重开';$('new-world').setAttribute('aria-label','确认重开');return;}
    try{state=replaceCurrent(createWorld());}catch(error){if(error instanceof SaveConflictError)saveConflict();else toast('无法保留现有存档，请先导出再重开。');return;}
    saveBlocked=false;loadIssue='';renderStats();closeDrawer();modal.close();$('save-status').textContent='已保存于此浏览器';toast('海图重新展开。');
  };
}
function showHelp(){openModal('在群岛中旅行',`<section class="book-section"><h3>看看世界</h3><p>拖动地图旋转视角，滚轮缩放。手机可双指缩放。点击城名进入城镇；“群岛图志”也能到达每一个地方。地图可切换地貌、航线、生态与海拔，日光、暮色与夜航只改变观看方式。</p><p>“此地”的本季航单可以追踪运粮：金色箭头指向收粮城，灰虚线是常设航路。航单随季节替换，旧档缺失明细从下一季开始记录；往返帆船只作场景表现。</p></section><section class="book-section"><h3>让历史发生</h3><p>按播放键，每 3.2 秒过去一季；打开阅读窗口、进入城镇或切换到后台时，时间会停下。选择“下一季”观察即时变化，选择“十二年后”查看长期后果；时间跳跃后会展开六城回望，变化也记入年代记。行动前先读代价，之后去年代记查看变化。</p></section><section class="book-section"><h3>键盘与声音</h3><p>Tab 可以走遍导航与城镇按钮；Enter 选择。详情右上角可收起文字，保留近景，用“继续阅读”回到原页签；Esc 先收起详情，再按一次回全景。阅读窗口仍用 Esc 关闭。在地图聚焦时，+ / − 缩放，Home 回全景。声音默认关闭，右上角可开启；系统减少动态偏好会被尊重。</p></section><section class="book-section"><h3>本地保存</h3><p>有效存档会自动保存。另一个窗口保存时，本窗口同步并暂停时间；若已有未保存的变化，会保留在本页并提示先导出再刷新。建议在一个窗口中推进世界。页面关闭后，世界不会在后台继续演化。设置中可以导出、导入、恢复上一份存档或重开；清除浏览器数据前请先导出存档。</p></section>`,'help');}

$('enter').onclick=()=>{enter();$('world').focus({preventScroll:true});toast('点击城镇进入它的生活，或让时间开始流动。');};
$('home').onclick=()=>{enter();closeDrawer();};$('back-to-world').onclick=closeDrawer;$('close-drawer').onclick=hideDrawer;resumeDetail.onclick=resumeDrawer;
$('reset-camera').onclick=()=>{enter();closeDrawer();};$('zoom-in').onclick=()=>{enter();scene?.zoom(.8);};$('zoom-out').onclick=()=>{enter();scene?.zoom(1.25);};
$('atlas-button').onclick=showAtlas;$('journal-button').onclick=()=>showJournal();$('book-button').onclick=showBook;
$('latest-news').onclick=()=>showJournal();$('options-button').onclick=showOptions;$('help-button').onclick=showHelp;
$('close-modal').onclick=()=>modal.close();modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
$('play').onclick=togglePlay;$('step').onclick=()=>{enter();pause();step();};$('decade').onclick=()=>{enter();pause();step(48);};
function updateLegend(){
  const value=$('layer').value,transport=!state.shipments?'旧档尚无航单':`本季已结算运粮 ${state.shipments.legs.length} 笔`;
  const legends={terrain:'',trade:`金色箭头：${transport}。灰虚线：常设航路。帆船为场景表现。`,ecology:'土褐 → 叶绿：生态由低到高',height:'低地 → 高山：颜色逐渐变浅'};
  $('layer-legend').textContent=legends[value];$('layer-legend').hidden=value==='terrain';
}
function setMapLayer(value){$('layer').value=value;scene?.setLayer(value);updateLegend();updateArtCaption();}
$('layer').onchange=e=>{if(sceneFocus?.startsWith('shipment:')){sceneFocus=null;$('view-subtitle').textContent=CITIES.find(c=>c.id===selected)?.type??'七座岛屿 · 六种生活';}setMapLayer(e.target.value);};
$('light').onchange=e=>{scene?.setLight(e.target.value);sound.setEnvironment({light:e.target.value});if(selected==='spire'){if(sceneFocus==='spire-butterflies')$('view-subtitle').textContent=detailCaption(sceneFocus);if(tab==='place')renderDrawer();}};
function updateSoundControls(){
  $('sound').setAttribute('aria-pressed',String(soundOn));$('sound').innerHTML=`声景 <span>${soundOn?'开':'关'}</span>`;$('sound').disabled=audioBusy;
  if($('music-toggle')){$('music-toggle').textContent=soundOn?'停止播放':'播放所选声景';$('music-toggle').disabled=audioBusy;$('music-toggle').setAttribute('aria-pressed',String(soundOn));}
  if($('music-current'))$('music-current').textContent=`${soundOn?'正在播放':'已选择'} · ${musicStyle(musicPrefs.style).name}`;
}
async function toggleSound(){
  if(audioBusy)return;audioBusy=true;updateSoundControls();
  try{if(soundOn){await sound.stop();soundOn=false;}else{await sound.start();soundOn=true;}}
  catch{soundOn=false;toast('此浏览器暂时无法开启声音，世界仍可继续。');}
  finally{audioBusy=false;updateSoundControls();}
}
function rememberMusic(){try{localStorage.setItem(MUSIC_KEY,JSON.stringify(musicPrefs));}catch{toast('本次声音设置已应用，浏览器暂时无法记住选择。');}}
function showMusic(){
  openModal('音乐与声景',`<p class="modal-intro">为群岛选一段背景音乐。播放时切换会淡出上一段，海风仍在远处。</p><fieldset class="music-choices"><legend class="sr-only">音乐风格</legend>${MUSIC_STYLES.map(m=>`<label class="music-choice"><input type="radio" name="music-style" value="${m.id}" ${m.id===musicPrefs.style?'checked':''}><span><strong>${m.name}</strong><small>${m.detail}</small></span></label>`).join('')}</fieldset><div class="music-controls"><button id="music-toggle" aria-pressed="${soundOn}"></button><label for="music-volume">音量 <output id="music-volume-value">${Math.round(musicPrefs.volume*100)}%</output></label><input id="music-volume" type="range" min="0" max="100" step="1" value="${Math.round(musicPrefs.volume*100)}"></div><p id="music-current" class="music-current" role="status"></p><p class="music-note">原创程序乐句，借鉴作曲语言。声音由浏览器合成；风格与音量会记住，刷新后保持静音。页面在后台时暂停发声。</p>`,'music');
  $('modal-body').querySelectorAll('[name="music-style"]').forEach(input=>input.onchange=()=>{musicPrefs.style=musicStyle(input.value).id;sound.setStyle(musicPrefs.style);rememberMusic();updateSoundControls();});
  $('music-toggle').onclick=toggleSound;
  $('music-volume').oninput=event=>{musicPrefs.volume=Number(event.target.value)/100;sound.setVolume(musicPrefs.volume);$('music-volume-value').textContent=`${event.target.value}%`;};
  $('music-volume').onchange=rememberMusic;updateSoundControls();
}
$('sound').onclick=toggleSound;$('music-button').onclick=showMusic;
$('world').addEventListener('keydown',e=>{if(['+','=','-','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='Home')closeDrawer();else if(e.key.startsWith('Arrow'))scene?.rotate(e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0,e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0);else scene?.zoom(e.key==='-'?1.15:.87);}});
document.querySelector('.skip-link').onclick=e=>{e.preventDefault();showAtlas();$('city-nav').querySelector('button').focus();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.open&&selected){if($('drawer').hidden)closeDrawer();else hideDrawer();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();sound.setHidden(document.hidden).catch(()=>{});});
// shortcut: tabs share snapshots, not atomic transactions; use a write lock for collaborative editing.
window.addEventListener('storage',event=>{
  if(event.storageArea!==localStorage||(event.key!==SAVE_KEY&&event.key!==null))return;
  const raw=localStorage.getItem(SAVE_KEY);if(raw===savedRaw)return;
  pause();if(saveBlocked){saveConflict();return;}
  let next;try{next=parseSave(raw);}catch{
    savedRaw=raw;saveBlocked=true;loadIssue='另一窗口移除了存档或写入了无法读取的内容。当前世界仍在，但不会自动覆盖原件；可先导出，再从设置恢复或刷新。';
    $('save-status').textContent='存档发生变化 · 未保存';toast(loadIssue);return;
  }
  state=next;savedRaw=raw;loadIssue='';renderStats();if(selected)renderDrawer();if(modal.open)modal.close();
  $('save-status').textContent='已同步另一窗口';toast('另一个窗口更新了世界，当前页面已同步并暂停时间。');
});

function updateArtCaption(){
  const style=artStyle(artId);$('artist-name').textContent=style.name.split(' · ')[0];
  $('artist-description').textContent=style.description;
  $('artist-layer-note').textContent=$('layer').value==='terrain'?'数据图层保留原色；回到自然地貌后恢复画风。':'当前数据图层使用原始配色；切回自然地貌后应用所选画风。';
}
function initArtPicker(){
  const choice=style=>`<label class="artist-choice"><input type="radio" name="art-style" value="${style.id}" ${style.id===artId?'checked':''}><span class="artist-swatch" aria-hidden="true">${style.colors.map(c=>`<i style="background:${c}"></i>`).join('')}</span><span>${style.name}</span></label>`;
  $('artist-options').innerHTML=choice(ART_STYLES[0])+`<div class="artist-columns">${['绘画','漫画'].map(group=>`<fieldset><legend>${group}</legend>${ART_STYLES.filter(s=>s.group===group).map(choice).join('')}</fieldset>`).join('')}</div>`;
  $('artist-options').addEventListener('change',event=>{
    if(event.target.name!=='art-style')return;
    artId=artStyle(event.target.value).id;scene?.setArtStyle(artId);updateArtCaption();
    try{localStorage.setItem(ART_STYLE_KEY,artId);}catch{toast('画风已应用，本次浏览器无法记住选择。');}
  });
  const menu=$('artist-menu'),summary=menu.querySelector('summary');
  menu.addEventListener('toggle',()=>{if(menu.open)menu.querySelector('.artist-panel').scrollTop=0;});
  $('artist-close').onclick=()=>{menu.open=false;summary.focus();};
  document.addEventListener('pointerdown',event=>{if(menu.open&&!menu.contains(event.target))menu.open=false;});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){event.preventDefault();event.stopImmediatePropagation();menu.open=false;summary.focus();}},true);
  updateArtCaption();
}
initArtPicker();
startLanguageUI();
renderStats();
let renderStage='准备场景',renderIssue=null;
const lightweight=new URLSearchParams(location.search).get('graphics')==='lite'||matchMedia('(pointer: coarse)').matches;
try{scene=createScene($('world'),select,lightweight);renderStage='设置初始世界';scene.setArtStyle(artId);scene.home();scene.update(state);renderStage='绘制第一帧';await scene.ready;$('loading').hidden=true;if(state.tick>0)enter();if(loadIssue)toast(loadIssue);}
catch(error){
  console.error(error);scene?.dispose();scene=null;
  renderIssue={stage:renderStage,code:error.code||error.name||'Error',message:String(error.message||error).slice(0,1000)};
  $('loading').classList.add('render-error');
  $('loading').innerHTML=`<p>${error.code==='WEBGL_CONTEXT_UNAVAILABLE'?'浏览器未能建立 WebGL 2 绘图连接。':'三维场景启动失败。'}</p><p>仍可从「群岛图志」进入城镇，推进时间与阅读历史。</p><button id="retry-graphics">${lightweight?'重新尝试三维':'以轻量三维重试'}</button><details><summary>查看启动错误</summary><p>${escape(renderIssue.stage)} · ${escape(renderIssue.code)}</p><pre>${escape(renderIssue.message)}</pre><p>错误仅显示在此页面，不会上传。</p></details>`;
  $('world').append($('loading'));$('world').style.touchAction='auto';$('intro').hidden=true;
  $('retry-graphics').onclick=()=>{save();if(saveBlocked){toast('当前世界未能保存，请先从设置导出存档，再刷新重试。');return;}const url=new URL(location.href);url.searchParams.set('graphics','lite');location.assign(url.href);};
}
// Read-only diagnostics for local checks; user state is never exposed to another service.
window.tideborn={snapshot:()=>structuredClone(state),renderStats:()=>scene?.stats(),renderIssue:()=>renderIssue?{...renderIssue}:null,soundStats:()=>sound.stats()};


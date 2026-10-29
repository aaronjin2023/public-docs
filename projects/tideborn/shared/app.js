import {createScene} from '../src/scene.js?v=elements-1';
import {createElementLandscape} from './element-landscape.js';
import {createTournamentUI} from './tournament-ui.js';
import {createSpiritUI} from './spirit-ui.js';
import {elementOf} from './elements.js';
import {CITIES,LANDMARKS} from '../src/world-data.js';
import {dateLabel,totals} from '../src/simulation.js';
import {ART_STYLES} from '../src/art-styles.js';
import {graphicsProfile} from '../src/render-support.js?v=mobile-4';
import {createSoundscape} from '../src/audio.js?v=music-2';
import {icon,hydrateIcons} from './icons.js?v=game-1';
import {appearanceOf,portraitSVG,OUTFITS} from './appearance.js';
import {createTheatre} from './theatre.js?v=stories-1';
import {createStoryBook} from './story-book.js';
import {createWorldSync} from './world-sync.js?v=state-2';
import {createStateReader} from './state-reader.js';
import {API_BASE} from './deployment.js';
const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const identityKey='tideborn-shared-identity-v1'+(API_BASE?`:${API_BASE}`:'');
let token=null,snapshot=null,scene=null,busy=false,selected=null,lastRevision=-1,lifeSignature='',soundOn=false,serverOffset=0,older=[],olderDone=false;
let focusedElement=null;
let activePanel=null,panelOpener=null,expanded=false,noticeTimer=null;
const scrollPositions={},panels={atlas:['群岛图志','compass'],life:['我的人生','person'],build:['故乡共建','build'],lineage:['家族传承','lineage'],history:['潮生史册','book'],settings:['世界设置','settings'],spirits:['元素与精灵','spirit'],stories:['街巷与伙伴','book'],tournament:['十年精灵大赛','spirit']};
const names={health:'体力',knowledge:'见识',skill:'手艺',bond:'情谊',coins:'积蓄'},activityIcons={care:'heart',curiosity:'compass',study:'book',work:'build',contribute:'leaf'},projectIcons={commons:'leaf',school:'book',water:'water',port:'port'};
try{token=localStorage.getItem(identityKey);}catch{}
const sound=createSoundscape();hydrateIcons();
let birthLook=null,heirLook=null;
const theatre=createTheatre({read:()=>snapshot?{...snapshot,clockOffset:serverOffset}:null,submit,onDraft:(kind,look)=>{if(kind==='birth')birthLook=look;else heirLook=look;draftButtons();}});
const spiritUI=createSpiritUI({host:$('spirit-content'),read:()=>snapshot,submit,loadBattle:async()=>{const e=await api(`/api/memory?seq=${snapshot.battleSeq}`);return e.battle;},onError:e=>showNotice(e.message,true),openTournament:()=>setPanel('tournament'),focus:id=>{select(id);if(scene?.focusElements(id)){focusedElement=id;$('place-name').textContent=CITIES.find(c=>c.id===id).name+' · 元素原野';$('place-copy').textContent=snapshot.elements.islands.find(c=>c.city===id).land;}}});
const tournamentUI=createTournamentUI({host:$('tournament-content'),read:()=>snapshot,submit,api,replay:data=>spiritUI.replay(data)});
const storyBookUI=createStoryBook({host:$('story-book'),read:()=>snapshot,submit,theatre});
$('story-library').onclick=e=>setPanel('stories',{opener:e.currentTarget});
$('atlas-stories').onclick=e=>setPanel('stories',{opener:e.currentTarget});
function draftButtons(){for(const [id,look,city] of [['birth-appearance',birthLook,document.querySelector('input[name=city]:checked')?.value??'haven'],['heir-appearance',heirLook??snapshot?.person?.appearance,snapshot?.person?.city??'haven']]){const a=appearanceOf(look,city);$(id).innerHTML=`${portraitSVG(a,city)}<span>选择人物造型<small>${OUTFITS.find(o=>o.id===a.outfit).name}</small></span>${icon('arrow')}`;}}
$('birth-appearance').onclick=()=>theatre.appearance('birth',birthLook,document.querySelector('input[name=city]:checked')?.value??'haven');
$('heir-appearance').onclick=()=>theatre.appearance('heir',heirLook??snapshot?.person?.appearance,snapshot?.person?.city??'haven');
$('person-appearance').onclick=()=>{if(snapshot?.person)theatre.appearance('current',snapshot.person.appearance,snapshot.person.city);};
$('journal').onclick=e=>{const b=e.target.closest('[data-replay]');if(b)theatre.replay([...snapshot.journal,...older].find(e=>e.seq===Number(b.dataset.replay)));const duel=e.target.closest('[data-battle-replay]');if(duel)spiritUI.replay([...snapshot.journal,...older].find(e=>e.seq===Number(duel.dataset.battleReplay))?.battle);};
$('last-memory').onclick=async()=>{try{theatre.replay(await api(`/api/memory?seq=${snapshot.memorySeq}`));}catch(e){showNotice(e.message,true);}};

function setExpanded(value){expanded=value;document.body.classList.toggle('sheet-expanded',value);$('sheet-expand').innerHTML=icon(value?'collapse':'expand');$('sheet-expand').setAttribute('aria-pressed',String(value));$('sheet-expand').setAttribute('aria-label',value?'缩小手册':'展开手册');$('sheet-expand').title=value?'缩小手册':'展开手册';}
function setPanel(key,{focus=true,opener=null,load=true}={}){
  if(activePanel)scrollPositions[activePanel]=$('sheet-scroll').scrollTop;
  if(opener)panelOpener=opener;
  activePanel=key;document.body.classList.toggle('sheet-open',!!key);$('life').hidden=!key;
  document.querySelectorAll('[data-pane]').forEach(el=>{el.hidden=el.dataset.pane!==key;});
  document.querySelectorAll('[data-panel]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.panel===(key==='stories'?'life':key==='tournament'?'spirits':key))));
  $('settings').setAttribute('aria-pressed',String(key==='settings'));
  if(key){$('sheet-title').textContent=panels[key][0];$('sheet-symbol').innerHTML=icon(panels[key][1]);$('sheet-scroll').scrollTop=scrollPositions[key]??0;if(focus)$('sheet-title').focus({preventScroll:true});}
  else{setExpanded(false);if(focus){const target=panelOpener?.getClientRects().length?panelOpener:$('identity').getClientRects().length?$('identity'):document.querySelector('[data-panel=life]');target.focus({preventScroll:true});}}
  updatePrompt();if(load&&snapshot&&key&&!busy)worldSync.refresh(panelResources());
}
function showNotice(message,error=false){clearTimeout(noticeTimer);$('notice').textContent=message;$('notice').hidden=false;if(!error)noticeTimer=setTimeout(()=>{$('notice').hidden=true;},7000);}
function select(id){focusedElement=null;selected=id;scene?.focus(id);const c=[...CITIES,...LANDMARKS].find(c=>c.id===id);if(!c)return;$('place-name').textContent=c.name;$('place-copy').textContent=c.description??c.text;const radio=document.querySelector(`input[name=city][value="${id}"]`);if(radio)radio.checked=true;document.querySelectorAll('[data-city]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.city===id)));}
function overview(){focusedElement=null;scene?.home();selected=null;$('place-name').textContent='潮生群岛';$('place-copy').textContent='六座城，一片共同经历的海。';document.querySelectorAll('[data-city]').forEach(el=>el.setAttribute('aria-pressed','false'));}
$('cities').innerHTML=CITIES.map((c,i)=>`<label><input type="radio" name="city" value="${c.id}" ${i===0?'checked':''}><span><strong>${c.name}</strong><small>${c.type}</small></span></label>`).join('');
$('atlas-cities').innerHTML=CITIES.map(c=>`<button data-city="${c.id}" aria-pressed="false"><span><strong>${c.name}</strong><small>${c.type} · ${c.craft}</small></span>${icon('arrow')}</button>`).join('');
$('cities').addEventListener('change',e=>{select(e.target.value);draftButtons();});draftButtons();
$('atlas-cities').onclick=e=>{const b=e.target.closest('[data-city]');if(b){select(b.dataset.city);if(matchMedia('(max-width:760px)').matches)setPanel(null,{focus:false});}};
$('art').innerHTML=ART_STYLES.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
async function api(path,body,signal){const response=await fetch(API_BASE+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit',signal:signal??AbortSignal.timeout(10000)});const data=await response.json();if(!response.ok)throw new Error(data.error??'连接暂时中断');if(data&&typeof data==='object')Object.defineProperty(data,'serverNow',{value:Number(response.headers.get('X-Server-Time')),enumerable:false});return data;}
const journalHTML=events=>events.map(e=>`<li><time>第 ${e.generation??1} 代 · ${dateLabel(e)}</time><h4>${escape(e.title)}</h4><p>${escape(e.text)}</p>${e.changes?`<p>${Object.entries(e.changes).filter(([,v])=>v).map(([k,v])=>`${names[k]} ${v>0?'+':''}${v}`).join(' · ')}</p>`:''}${e.deadline?`<p>截止 ${new Date(e.deadline).toLocaleString('zh-CN')} · ${e.choice==='expired'?'超时结算':'已回应'} · ${new Date(e.resolvedAt).toLocaleString('zh-CN')}</p>`:''}${e.elements?`<p>本岛元素力 ${e.elements.before.totalForce} → ${e.elements.after.totalForce} · 主导 ${elementOf(e.elements.before.dominant).element} → ${elementOf(e.elements.after.dominant).element}</p>`:''}${e.battle?`<button class="replay-story" data-battle-replay="${e.seq}">回放精灵切磋</button>`:''}${e.story?`<button class="replay-story" data-replay="${e.seq}">${icon('book')}重看这一幕</button>`:''}</li>`).join('');
const remaining=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/60)} 分 ${s%60} 秒`;};
function updatePrompt(){
  if(!snapshot){$('encounter-alert').hidden=true;return;}
  const p=snapshot.person,e=p?.encounter,dead=p&&p.endedAt!==null;
  $('encounter-alert').hidden=activePanel==='life'||(dead&&activePanel==='lineage')||!!(p&&!e&&!dead);
  $('prompt-title').textContent=!p?'在群岛里，开始你的一生':dead?'这一生已留在潮声里':e?.title??'';
  $('prompt-copy').textContent=!p?'选择故乡 · 给自己一个名字':dead?'打开家谱，迎接下一代':e?`等待回应 · ${remaining(e.expiresAt-Date.now()-serverOffset)}`:'这一刻，海面平静。';
  $('life-dot').hidden=!e&&!dead;
}
function updateClock(){if(!snapshot)return;const now=Date.now()+serverOffset,delta=snapshot.nextAt-now;$('next-season').textContent=delta>0?`下季还有 ${remaining(delta)}`:'公共季节同步中…';if($('deadline')&&snapshot.person?.encounter){const left=snapshot.person.encounter.expiresAt-now;$('deadline').textContent=left>0?remaining(left):'已到期';if(left<=0)document.querySelectorAll('[data-choice]').forEach(b=>b.disabled=true);}updatePrompt();theatre.update(snapshot?{...snapshot,clockOffset:serverOffset}:null);}
function render(){
  const w=snapshot.world,p=snapshot.person,t=totals(w);serverOffset=snapshot.serverNow-Date.now();$('time').textContent=dateLabel(w);
  $('connection').textContent=`每15分钟同步 · 第 ${snapshot.revision} 次更新`;
  $('clock-note').textContent='现实 1 小时 = 潮生 1 季，4 小时 = 1 年。离线也会成长；未安排的季节默认安稳照料。际遇需在 5 分钟内回应。';
  document.querySelectorAll('#season-track i').forEach((el,i)=>el.classList.toggle('active',i===w.tick%4));
  if(lastRevision!==snapshot.revision){scene?.update(w);scene?.updateElements(snapshot.elements);if(focusedElement)$('place-copy').textContent=snapshot.elements.islands.find(c=>c.city===focusedElement).land;$('world-count').textContent=`${t.population.toLocaleString()} 位模拟居民 · ${snapshot.citizens} 位已降生访客。访客是居民的具名视角，不额外增加城市人口。`;lastRevision=snapshot.revision;}
  $('history').innerHTML=w.events.map(e=>`<li><time>${dateLabel(e)}</time><h4>${escape(e.title)}</h4><p>${escape(e.text)}</p></li>`).join('');
  spiritUI.render(snapshot);tournamentUI.render(snapshot);storyBookUI.render(snapshot);$('story-library-copy').textContent='打开故事手册，查看解锁条件与家族纪念';
  $('birth-panel').hidden=!!p;$('person-panel').hidden=!p;$('purse').hidden=!p;$('journal-empty').hidden=!!p;
  if(!p){$('projects').innerHTML='<p class="quiet-note">先在一座岛上降生，再和居民一起修建故乡。</p>';$('lineage-status').textContent='你的家谱，从第一次降生开始。';}
  const signature=JSON.stringify([p,snapshot.tick,snapshot.projects,snapshot.journal,snapshot.ancestors,snapshot.memorySeq]);
  if(p&&signature!==lifeSignature){
    const age=(((p.endedAt??w.tick)-p.bornTick)/4).toFixed(2).replace(/\.00$/,''),city=CITIES.find(c=>c.id===p.city),dead=p.endedAt!==null;
    $('person-portrait').innerHTML=portraitSVG(p.appearance,p.city);$('person-appearance').hidden=dead;draftButtons();$('last-memory').hidden=!snapshot.memorySeq;if(snapshot.memorySeq)$('last-memory').innerHTML=`${icon('book')}重看最近的一幕`;
    $('person-name').textContent=p.name;$('person-name').classList.toggle('long-name',Array.from(p.name).length>12);$('person-detail').textContent=`${city.name} · 第 ${p.generation} 代 · ${age} 岁${dead?' · 此生已归档':''}\n${p.family}`;
    $('identity-name').textContent=p.name;$('identity-meta').textContent=`${city.name} · 第 ${p.generation} 代 · ${age} 岁`;$('purse-value').textContent=p.coins;
    $('readings').innerHTML=`<div class="health-reading"><dt>${icon('heart')}体力</dt><dd>${p.health} / 100</dd><progress value="${p.health}" max="100" aria-label="体力"></progress></div>`+['knowledge','skill','bond','coins'].map(k=>`<div><dt>${names[k]}</dt><dd>${p[k]}${k==='coins'?'<small> 铜</small>':''}</dd></div>`).join('');
    $('pending').textContent=dead?'这一生已经结束。':p.pending?'本季已安排，下一次公共换季时结算。':'每季安排一次，长大后会有新的选择。';
    $('season-actions').hidden=dead;$('legacy-link').hidden=!dead;$('inherit').hidden=!dead;
    $('lineage-status').textContent=dead?`${p.name}的生平已经归档。为后继者取名，让故事继续。`:`第 ${p.generation} 代 · ${p.name}仍在这片海上生活。此生结束后，可在这里迎接后继者。`;
    $('ancestors').innerHTML=snapshot.ancestors.length?`<h3>家族留下的名字</h3>${snapshot.ancestors.map(a=>`<article class="ancestor"><span class="ancestor-portrait">${portraitSVG(a.appearance,a.city)}</span><time>第 ${a.generation} 代 · ${((a.endedAt-a.bornTick)/4).toFixed(2)} 岁</time><h4>${escape(a.name)}</h4><p>留下 ${a.bequest.coins} 铜、${a.bequest.knowledge} 见识、${a.bequest.skill} 手艺。</p></article>`).join('')}`:'<p class="quiet-note">尚无前代记录。你正在写下这个家族的开篇。</p>';
    $('encounter').hidden=!p.encounter;$('no-encounter').hidden=!!p.encounter||dead;
    if(p.encounter){const e=p.encounter;$('encounter').innerHTML=`<div class="encounter-top">${icon('mail')}<span>人生际遇</span><b id="deadline"></b></div><h3>${escape(e.title)}</h3><p>${escape(e.reason)}</p>${e.elements?`<p>本岛元素力 ${e.elements.before.totalForce} → ${e.elements.after.totalForce} · 主导 ${elementOf(e.elements.before.dominant).element} → ${elementOf(e.elements.after.dominant).element}</p>`:''}${e.battle?`<button class="replay-story" data-battle-replay="${e.seq}">回放精灵切磋</button>`:''}${e.story||e.summary?`<button class="story-entry" data-open-story>${icon('book')}进入这一幕</button>`:''}${e.options.map(o=>`<button data-choice="${o.id}" ${(o.cost??0)>p.coins||(o.minHealth??0)>p.health||busy?'disabled':''}>${icon('arrow')}<span>${escape(o.label)}<small>${escape(o.detail)}</small></span></button>`).join('')}<p class="fine">${escape(e.fallback)}</p>`;}
    const projects=snapshot.projects.filter(x=>x.city===p.city);$('build-context').textContent=`${city.name}的公共工程。幼年由家人代为投入，资金凑足后，岛上会出现真实设施。`;
    $('build-pending').textContent=dead?'此生已归档，可由后继者接续贡献。':p.pending?'本季已有安排，下一季可以再次贡献。':p.coins<5?'贡献一次需要 5 铜；可以先积攒赠礼，成年后通过谋生获得收入。':'每季可以为一项工程投入 5 铜，与其他居民一起凑足建设费用。';
    $('projects').innerHTML=projects.map(x=>{const unavailable=dead||p.pending||p.coins<5||x.level>=x.max||busy;return `<article class="project"><div class="project-head"><div>${icon(projectIcons[x.id])}<b>${x.name}</b></div><span>${x.level} / ${x.max} 级</span></div><small>${escape(x.visible)}</small><div class="project-funding"><span>${x.level===x.max?'全部落成':'下一期工程'}</span><span>${x.level===x.max?'工程已完成':`${x.funded} / ${x.cost} 铜`}</span></div><progress value="${x.level===x.max?x.cost:x.funded}" max="${x.cost}" aria-label="${x.name}共建进度"></progress><button data-project="${x.id}" ${unavailable?'disabled':''}>${icon(x.level===x.max?'check':'build')}${x.level===x.max?'工程已满级':dead?'等待后继者':p.pending?'本季已安排':p.coins<5?'积蓄不足 5 铜':'本季投入 5 铜'}</button></article>`;}).join('');
    $('choices').innerHTML=snapshot.choices.map(c=>`<button data-activity="${c.id}" ${p.pending||busy?'disabled':''}>${icon(activityIcons[c.id])}<span><strong>${escape(c.label)}</strong><small>${escape(c.id==='contribute'?'选择一项故乡工程，查看进度与投入。':c.detail)}</small></span></button>`).join('');
    const seen=new Set(snapshot.journal.map(e=>e.seq));$('journal').innerHTML=journalHTML([...snapshot.journal,...older.filter(e=>!seen.has(e.seq))]);$('older').hidden=olderDone||(snapshot.journal.length<40&&!older.length);lifeSignature=signature;
  }
  updateClock();
}
function panelResources(){
  return ({life:token?['person','encounter']:[],build:token?['world','person','projects']:[],spirits:token?['world','person','spirits']:['world'],stories:['person','stories'],tournament:token?['person','spirits','competition']:['competition'],lineage:token?['person','ancestors']:[],history:$('personal-history-tab').getAttribute('aria-selected')==='true'&&token?['journal']:['history']})[activePanel]??[];
}
const worldSync=createWorldSync({
  request:createStateReader({api,read:()=>snapshot,identity:()=>token}),
  identity:()=>token,active:()=>!document.hidden&&!busy&&navigator.onLine,visible:panelResources,
  onState:next=>{snapshot=next;render();},onClock:now=>{serverOffset=now-Date.now();},
  onStatus:status=>{$('connection').textContent=status==='connected'?`每15分钟同步 · 第 ${snapshot?.revision??0} 次更新`:'连接中断 · 保留当前画面，稍后自动重试';},
});
function refresh(){return worldSync.refresh();}
async function submit(path,payload){
  if(busy)return;busy=true;worldSync.pause();document.querySelectorAll('[data-activity],[data-project],[data-choice],#birth button,#inherit button').forEach(b=>b.disabled=true);let success=false,result=null;
  try{const data=await api(path,{...payload,requestId:crypto.randomUUID()});success=true;result={ok:true,data};showNotice(({'/api/tournament':'本届报名已更新，开赛取当时伙伴状态。','/api/story':'这一章已开启，五分钟内回应。','/api/spirits':'精灵行动已结算，影响写入生平。','/api/appearance':'人物造型已保存。','/api/birth':'你已降生，与所有人经历同一个季节。','/api/choice':'选择已结算，影响写入了你的生平。','/api/intent':'本季安排已保存，下次换季时结算。','/api/inherit':'上一代已归档。后继者与故乡继续生活。'})[path]);lifeSignature='';
    const resources=({'/api/intent':['person'],'/api/appearance':['person'],'/api/story':['person','encounter','stories'],'/api/tournament':['competition'],'/api/spirits':['world','person','spirits'],'/api/birth':['world','person','encounter'],'/api/inherit':['world','person','encounter'],'/api/choice':['world','person',...(activePanel==='stories'?['stories']:[])]})[path];
    const fresh=await worldSync.refresh(resources);
    if(!fresh){result.data={person:null,journal:[]};showNotice('操作已保存，状态暂未刷新；联网后会重新同步，请勿重复提交。',true);return result;}
    result.data={person:snapshot?.person,journal:[]};
    if(['/api/birth','/api/inherit','/api/choice'].includes(path)&&snapshot?.memorySeq){try{result.data.journal=[await api(`/api/memory?seq=${snapshot.memorySeq}`)];}catch(e){showNotice('操作已保存，剧情回看暂时无法读取。',true);}}
    if(path==='/api/spirits'&&payload.action==='battle'&&snapshot?.battleSeq){try{const event=await api(`/api/memory?seq=${snapshot.battleSeq}`);result.data.person={...snapshot.person,lastSpiritBattle:event.battle};}catch(e){showNotice('切磋已保存，战报暂时无法读取。',true);}}
  }
  catch(e){result={ok:false,error:e.message};showNotice(e.message,true);lifeSignature='';await refresh();}
  finally{busy=false;worldSync.resume();document.querySelectorAll('#birth button,#inherit button').forEach(b=>b.disabled=false);lifeSignature='';if(snapshot)render();if(success&&(path==='/api/birth'||path==='/api/inherit')){setPanel('life',{load:false});$('sheet-scroll').scrollTop=0;scrollPositions.life=0;if(snapshot?.person)select(snapshot.person.city);}else if(activePanel&&!document.querySelector('dialog[open]'))$('sheet-title').focus({preventScroll:true});}
  if(success&&!theatre.isOpen()&&['/api/birth','/api/inherit','/api/choice'].includes(path)){const event=path==='/api/choice'?result.data.journal.find(e=>e.encounterId===payload.encounterId):result.data.journal.find(e=>e.story);if(event?.story)theatre.replay(event);}
  return result;
}
$('birth').addEventListener('submit',async e=>{e.preventDefault();try{if(!token){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(identityKey,token);if(localStorage.getItem(identityKey)!==token)throw new Error('身份无法保存');}}catch{token=null;showNotice('浏览器无法保存身份，请允许站点存储后再降生。',true);return;}await submit('/api/birth',{name:$('name').value,city:new FormData(e.target).get('city'),appearance:appearanceOf(birthLook,new FormData(e.target).get('city'))});});
$('choices').onclick=e=>{const b=e.target.closest('[data-activity]');if(!b||!snapshot)return;if(b.dataset.activity==='contribute')setPanel('build',{opener:b});else submit('/api/intent',{activity:b.dataset.activity,expectedTick:snapshot.tick,project:null});};
$('projects').onclick=e=>{const b=e.target.closest('[data-project]');if(b&&snapshot)submit('/api/intent',{activity:'contribute',expectedTick:snapshot.tick,project:b.dataset.project});};
$('encounter').onclick=async e=>{if(e.target.closest('[data-open-story]')){if(snapshot.person.encounter.summary)await worldSync.refresh(['person','encounter']);theatre.encounter(snapshot?.person?.encounter);return;}const b=e.target.closest('[data-choice]');if(b&&snapshot?.person?.encounter)submit('/api/choice',{encounterId:snapshot.person.encounter.id,choice:b.dataset.choice});};
$('inherit').onsubmit=e=>{e.preventDefault();if(snapshot?.person)submit('/api/inherit',{name:$('heir-name').value,generation:snapshot.person.generation,appearance:appearanceOf(heirLook??snapshot.person.appearance,snapshot.person.city)});};
$('older').onclick=async()=>{const before=Math.min(...snapshot.journal.map(e=>e.seq),...older.map(e=>e.seq));$('older').disabled=true;try{const rows=await api(`/api/journal?before=${before}`);older.push(...rows);if(rows.length<40)olderDone=true;lifeSignature='';render();}catch(e){showNotice(e.message,true);}finally{$('older').disabled=false;}};
$('game-nav').onclick=e=>{const b=e.target.closest('[data-panel]');if(b)setPanel(activePanel===b.dataset.panel?null:b.dataset.panel,{opener:b});};
$('settings').onclick=e=>setPanel(activePanel==='settings'?null:'settings',{opener:e.currentTarget});
$('identity').onclick=e=>setPanel('life',{opener:e.currentTarget});$('legacy-link').onclick=e=>setPanel('lineage',{opener:e.currentTarget});
$('encounter-alert').onclick=e=>setPanel(snapshot?.person?.endedAt!==null&&snapshot?.person?'lineage':'life',{opener:e.currentTarget});
$('sheet-close').onclick=()=>setPanel(null);$('sheet-expand').onclick=()=>setExpanded(!expanded);
$('art-open').onclick=e=>{setPanel('settings',{opener:e.currentTarget});$('art').focus();};
$('refresh').onclick=refresh;$('art').onchange=e=>scene?.setArtStyle(e.target.value);$('zoom-in').onclick=()=>scene?.zoom(.8);$('zoom-out').onclick=()=>scene?.zoom(1.25);
$('overview').onclick=overview;$('home').onclick=()=>{overview();setPanel(null,{focus:false});};
document.querySelector('.skip').onclick=e=>{e.preventDefault();setPanel('life',{opener:document.querySelector('[data-panel=life]')});};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activePanel&&!document.querySelector('dialog[open]')){e.preventDefault();setPanel(null);}});
function historyTab(personal,focus=false){for(const [id,on] of [['personal-history-tab',personal],['world-history-tab',!personal]]){$(id).setAttribute('aria-selected',String(on));$(id).tabIndex=on?0:-1;if(on&&focus)$(id).focus();}$('personal-history').hidden=!personal;$('public-history').hidden=personal;if(snapshot&&activePanel==='history')worldSync.refresh(panelResources());}
$('personal-history-tab').onclick=()=>historyTab(true);$('world-history-tab').onclick=()=>historyTab(false);
document.querySelector('.history-tabs').onkeydown=e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();historyTab(e.key==='Home'?true:e.key==='End'?false:$('personal-history-tab').getAttribute('aria-selected')!=='true',true);}};
$('music').onclick=async()=>{try{if(soundOn){await sound.stop();soundOn=false;}else{await sound.start();soundOn=true;}$('music').innerHTML=icon(soundOn?'volume':'volumeOff');$('music').setAttribute('aria-pressed',String(soundOn));$('music').setAttribute('aria-label',soundOn?'关闭潮音':'开启潮音');$('music').title=soundOn?'关闭潮音':'开启潮音';}catch{showNotice('声音暂时无法开启。',true);}};
function sceneFailed(error){scene?.dispose();scene=null;document.querySelector('.view').classList.add('failed');$('render-status').hidden=false;$('render-status').textContent=`三维暂时无法显示：${error.message}。你的人生与共享历史仍可使用。`;$('art').disabled=true;}
setPanel(matchMedia('(max-width:760px)').matches?null:'life',{focus:false});
try{scene=createScene($('world'),select,graphicsProfile(location.search,null,matchMedia('(pointer:coarse)').matches||innerWidth<=760).lightweight,createElementLandscape);scene.setMotion(!matchMedia('(prefers-reduced-motion:reduce)').matches);$('world').querySelector('canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();sceneFailed(new Error('绘图连接中断，刷新可重试'));},{once:true});await scene.ready;$('render-status').hidden=true;}catch(e){sceneFailed(e);}
await refresh();if(snapshot?.person)select(snapshot.person.city);
setInterval(updateClock,1000);
function connectionVisibility(){sound.setHidden(document.hidden);if(document.hidden||!navigator.onLine)worldSync.pause();else worldSync.resume();if(!navigator.onLine)$('connection').textContent='设备离线 · 保留当前画面，联网后自动同步';}
document.addEventListener('visibilitychange',connectionVisibility);window.addEventListener('offline',connectionVisibility);window.addEventListener('online',connectionVisibility);
window.addEventListener('pagehide',()=>worldSync.pause());window.addEventListener('pageshow',connectionVisibility);


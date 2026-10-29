import {CHRONICLES} from './chronicle-catalogue.js';
import {CITIES,POLICIES} from '../../src/world-data.js';
import {appearanceOf} from '../appearance.js';
import {elementOf,levelOf} from '../elements.js';
import {CHOICE_WINDOW_MS} from './encounters.js';
export {CHRONICLES};
const labels={health:'体力',knowledge:'见识',skill:'手艺',bond:'情谊',coins:'积蓄'};
const progress=(p,a)=>p?.chronicles?.[a.id]?.steps??[];
export function storyBook(p,w,units=[],owner=null){
 return CHRONICLES.map(a=>{
  const steps=progress(p,a),index=steps.length,chapter=a.chapters[index];
  const companions=units.filter(u=>u.owner===owner&&u.city===p?.city&&u.element===a.element);
  let locked='';
  if(!p)locked='先在群岛降生';
  else if(index>=3)locked='故事已完成';
  else if(a.city&&a.city!==p.city)locked='属于另一座故乡';
  else if(p.endedAt!==null)locked='此生已归档，等待后继者';
  else if(p.encounter)locked=p.encounter.arcId===a.id?'这一章正在发生':'先回应眼前的际遇';
  else if(p.lastChronicleTick===w.tick)locked='本季已探访，下季继续';
  else if((w.tick-p.bornTick)/4<a.ages[index])locked=`${a.ages[index]}岁起开启`;
  else if(a.element&&!companions.length)locked=`先结伴一只${elementOf(a.element).name}`;
  else if(a.element&&index>=1&&!companions.some(u=>levelOf(u.xp)>=2))locked='先将这类伙伴培养到二级';
  else if(a.element&&index>=2&&p.lastSpiritBattle?.left.element!==a.element)locked='最近一场切磋须由这类伙伴出战，胜负不限';
  const earned=p?.chronicles?.[a.id]?.ending;
  return {id:a.id,title:a.title,theme:a.theme,city:a.city??null,element:a.element??null,who:a.who,place:a.place,chapterIndex:index,chapterTitle:chapter?.title??'终章已归档',chapterCount:3,steps:steps.map(s=>({...s})),ending:earned??null,locked,available:!locked,active:p?.encounter?.arcId===a.id,local:!p||!a.city||a.city===p.city};
 });
}
function condition(a,p,w,reading){
 const city=w.cities.find(c=>c.id===p.city),name=CITIES.find(c=>c.id===p.city).name;
 if(a.element){const island=reading.islands.find(i=>i.city===p.city),entry=island.forces.find(e=>e.element===a.element);
  return `${name}当前${elementOf(a.element).element}元素占比 ${Math.round(entry.share*1000)/10}%，本岛共 ${island.count} 只精灵。${island.dominant===a.element?'它已是此刻最强的元素，照料时也要留意其他五种力量。':'它并非此刻最强的元素，弱一些也不意味着应该被忽略。'}`;
 }
 const subject=a.chapters.at(-1).options.find(o=>o.project)?.project,policy=POLICIES.find(x=>x.id===subject);
 return `${name}此刻${city.food<city.population*.24?'粮食紧张，邻里更在意眼前能否度过一季':'粮食尚足，人们有余力讨论更长远的安排'}；生态 ${Math.round(city.ecology*100)}%。${policy?`${policy.name}现为 ${city.policies[subject]} 级。`:''}`;
}
export function openChronicle(a,index,p,w,now,reading){
 const ch=a.chapters[index],steps=progress(p,a),previous=steps.at(-1),legacy=p.storyLegacy?.find(x=>x.arcId===a.id);
 const memory=previous?`你在上一章选择了「${previous.label}」。${previous.outcome}`:legacy?`上一代留下「${legacy.ending}」的记录。这一次，你可以走出不同的路。`:'这是你与这段故事的第一次相遇。';
 // A previous choice changes the next chapter's numerical learning opportunity as well as its prose.
 const carry=previous?.choice==='a'?{knowledge:1}:previous?.choice==='b'?{bond:1}:{};
 const options=ch.options.map(o=>{
  const effects={...o.effects};for(const [k,n] of Object.entries(carry))effects[k]=(effects[k]??0)+n;
  const detail=[...Object.entries(effects).map(([k,n])=>`${labels[k]} ${n>0?'+':''}${n}`),...(o.project?[`向${POLICIES.find(p=>p.id===o.project).name}投入最多5铜，仅扣实际接收额；接收投入时情谊最多+2`]:[]),...(Object.keys(carry).length?[`包含前章延续：${previous.choice==='a'?'见识 +1':'情谊 +1'}`]:[])].join('；');
  return {...o,effects,detail:detail+'。属性最高100，以结算收据为准。',minHealth:o.effects.health<0?1-o.effects.health:0};
 });
 const place=a.city?a.place:`${CITIES.find(c=>c.id===p.city).name} · ${a.place}`,context=condition(a,p,w,reading);
 const battle=a.element&&index===2?p.lastSpiritBattle:null;
 const battleText=battle?`最近一次由该元素出战的切磋：${battle.rounds.length}回合，${({win:'胜出',loss:'落败',draw:'平局'})[battle.outcome]}。${battle.outcome==='win'?'胜利没有替你回答怎样照料伙伴。':battle.outcome==='loss'?'失利没有夺走伙伴，也不堵住这段故事。':'平局让双方的长处都留在记录里。'}`:'';
 const title=`${a.title} · ${ch.title}`;
 const beats=[{speaker:a.who,text:ch.opening,pose:'arrive'},{speaker:'此前与此刻',text:`${memory}\n${context}${battleText}`,pose:'read'},{speaker:a.who,text:ch.question,pose:index===2?'light':'offer'}];
 return {kind:'chronicle',arcId:a.id,chapterIndex:index,title,reason:`${a.theme}。${context}`,options,fallback:'你没有及时回应，这一章记为错过，不支出积蓄、不获得属性；后章仍可继续。',id:`${p.generation}:${p.bornTick}:${w.tick}:chronicle:${a.id}:${index}`,openedTick:w.tick,openedAt:now,expiresAt:now+CHOICE_WINDOW_MS,story:{version:1,kind:'chronicle',motif:a.element??a.city,city:p.city,place,companion:a.who,actor:p.name,appearance:appearanceOf(p.appearance,p.city),age:(w.tick-p.bornTick)/4,beats}};
}
export function finishChronicle(e,p,choice,expired,tick,impact){
 const option=e.options.find(o=>o.id===choice);
 const outcome=expired?e.fallback:option.project?(impact?.spent>0?`你将 ${impact.spent} 铜交给故乡公共工程，实际进度留在收据里。`:'这次工程未接收投入，积蓄仍留在你手中。'):option.outcome;
 p.chronicles??={};const state=p.chronicles[e.arcId]??={steps:[]};
 state.steps.push({choice:expired?'missed':choice,label:expired?'错过':option.label,title:e.title,outcome,tick});
 if(state.steps.length===3)state.ending=expired?'未完的回声':option.ending;
 return {...e.story,beats:[...e.story.beats,{speaker:'选择之后',text:outcome+(impact?' '+impact.text:''),pose:expired?'rest':option.project?'work':choice==='a'?'read':'listen'}],outcome,choice:expired?'expired':choice,ending:state.ending??null,built:!!(impact&&impact.afterLevel>impact.beforeLevel)};
}
export function completedLegacy(p){return [...new Map([...(p.storyLegacy??[]),...CHRONICLES.filter(a=>p.chronicles?.[a.id]?.ending).map(a=>({arcId:a.id,title:a.title,ending:p.chronicles[a.id].ending,generation:p.generation}))].map(x=>[x.arcId,x])).values()];}

// Versioned state tuples. Static definitions and derived presentation live in JS.
import {CITIES,POLICIES} from '../src/world-data.js';
import {ELEMENTS,elementOf} from './elements.js';
import {habitatOf} from './habitat.js';
import {choices} from './rules/life.js';
import {spiritView} from './rules/spirits.js';
import {evolutionTree} from './rules/evolution.js';
import {CHRONICLES,storyBook} from './rules/chronicles.js';

export const STATE_SCHEMA=1;
export const CITY_FIELDS=['population','food','wealth','ecology','trust','knowledge','pollution','balance','trade','migration','lastShortage','discoveryLevel','satisfaction'];
export const PROJECT_IDS=['commons','school','water','port'];
export const FAMILIES=['手艺人之家','照料田园之家','往来船户之家'];
const forms=['base','keeper','warden','runner','ranger'];
const kindTitles={gift:'第一份降生礼',scarcity:'粮仓前的长队',mentor:'街角的一次邀请',gathering:'潮声里的小聚',lantern:'退潮后的一盏灯',promise:'灯下的第一张约定',crossing:'渡口留下的两个位置',beacon:'把灯光留给后来的人'};
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
export function packWorld(w,e){return {
  seed:w.seed,tick:w.tick,climate:w.climate,
  cities:w.cities.map(c=>[...CITY_FIELDS.map(k=>c[k]),POLICIES.map(p=>c.policies[p.id])]),
  decisions:w.decisions.map(d=>[d.id,d.choice]),shipments:w.shipments,
  elements:{genesisTick:e.genesisTick,offshore:e.offshore,islands:e.islands.map(i=>[i.levelCounts,i.forces.map(f=>[f.count,f.wild,Math.round(f.averageLevel*f.count),f.base])])},
};}
export function unpackWorld(data){
  const world={version:1,seed:data.seed,tick:data.tick,climate:data.climate,cities:data.cities.map((row,i)=>({id:CITIES[i].id,...Object.fromEntries(CITY_FIELDS.map((k,n)=>[k,row[n]])),policies:Object.fromEntries(POLICIES.map((p,n)=>[p.id,row[CITY_FIELDS.length][n]]))})),decisions:data.decisions.map(([id,choice])=>({id,choice})),shipments:data.shipments,events:[]};
  const source=data.elements,islands=source.islands.map(([levelCounts,rows],ci)=>{
    const forces=rows.map(([count,wild,levels,base],ei)=>{const resonance=80+20*((world.tick+ci+ei)%4);return {element:ELEMENTS[ei].id,count,wild,averageLevel:count?levels/count:0,base,resonance,force:Math.round(base*resonance/100)};});
    const totalForce=forces.reduce((n,e)=>n+e.force,0);for(const e of forces)e.share=totalForce?e.force/totalForce:0;
    const dominant=forces.reduce((a,b)=>b.force>a.force?b:a,forces[0]),count=forces.reduce((n,e)=>n+e.count,0);
    const reading={city:CITIES[ci].id,count,bonded:forces.reduce((n,e)=>n+e.count-e.wild,0),averageLevel:count?levelCounts.reduce((n,v,i)=>n+v*(i+1),0)/count:0,levelCounts,totalForce,forces,dominant:dominant.element,land:totalForce?elementOf(dominant.element).land:'元素沉寂，保留原地貌'};
    return {...reading,habitat:habitatOf(reading)};
  });
  const elements={total:288,offshore:source.offshore,active:288-source.offshore,totalForce:islands.reduce((n,i)=>n+i.totalForce,0),phase:['涨潮','满潮','退潮','低潮'][(world.tick-source.genesisTick)%4],genesisTick:source.genesisTick,islands};
  return {world,elements,tick:world.tick,revision:data.revision,nextAt:data.nextAt,seasonMs:data.seasonMs,citizens:data.citizens};
}
export function packPerson(p){if(!p)return null;return {...pick(p,['name','city','appearance','bornTick','generation','health','knowledge','skill','bond','coins','pending','endedAt','spiritActions']),family:FAMILIES.indexOf(p.family),encounter:p.encounter?pick(p.encounter,['id','kind','arcId','chapterIndex','openedTick','openedAt','expiresAt']):null};}
export function unpackPerson(p){if(!p)return null;const e=p.encounter,arc=e?.arcId?CHRONICLES.find(a=>a.id===e.arcId):null;return {...p,family:FAMILIES[p.family],encounter:e?{...e,title:arc?`${arc.title} · ${arc.chapters[e.chapterIndex].title}`:kindTitles[e.kind],reason:'打开这一幕，阅读当时的经过并回应。',options:[],fallback:'',summary:true}:null};}
export function packUnit(u,owned=false){const index=ELEMENTS.findIndex(e=>e.id===u.element)*48+Number(u.id.split('-')[1])-1;return [index,CITIES.findIndex(c=>c.id===u.city),u.xp,forms.indexOf((u.form??'base').replace(`${u.element}-`,'')),u.trainedTick,u.battledTick,...(owned?[u.growth??null,u.evolutions??[]]:[])];}
export function unpackUnit(row){const [index,city,xp,form,trainedTick,battledTick,growth,evolutions]=row,element=ELEMENTS[Math.floor(index/48)].id;return {id:`${element}-${index%48+1}`,element,city:CITIES[city].id,xp,form:form?`${element}-${forms[form]}`:'base',trainedTick,battledTick,...(growth?{growth}:{}),evolutions:evolutions??[]};}
export function unpackSpirits(data,p,elements){const local=elements?.islands.find(i=>i.city===p?.city);return {owned:data.owned.map(row=>{const u=unpackUnit(row);return {...spiritView(u),tree:evolutionTree(u,p,data.tick,local)};}),wild:data.wild.map(row=>spiritView(unpackUnit(row))),actions:p?.spiritActions??{},maxOwned:6,tick:data.tick};}
export function unpackProjects(data,world){return PROJECT_IDS.map((id,n)=>{const spec=POLICIES.find(p=>p.id===id);return {city:data.city,id,name:spec.name,cost:spec.cost,visible:spec.visible,max:spec.max,funded:data.funded[n],level:world.cities.find(c=>c.id===data.city).policies[id]};});}
export function packStories(p,units){return {progress:Object.entries(p?.chronicles??{}).map(([id,state])=>[id,state.steps.map(s=>[s.choice,s.tick,/你将 (\d+) 铜/.test(s.outcome)?Number(s.outcome.match(/你将 (\d+) 铜/)[1]):0])]),legacy:(p?.storyLegacy??[]).map(l=>{const a=CHRONICLES.find(a=>a.id===l.arcId);return [l.arcId,l.generation,a.chapters[2].options.find(o=>o.ending===l.ending)?.id??'missed'];}),lastChronicleTick:p?.lastChronicleTick??null,battleElement:p?.lastSpiritBattle?.left.element??null,companions:units.map(u=>[u.element,u.xp,u.city])};}
export function unpackStories(data,p,w){
  if(!p)return {storyBook:storyBook(null,w),storyLegacy:[]};
  const chronicles=Object.fromEntries(data.progress.map(([id,steps])=>{const a=CHRONICLES.find(a=>a.id===id);return [id,{steps:steps.map(([choice,tick,spent],n)=>{const ch=a.chapters[n],o=ch.options.find(o=>o.id===choice);return {choice,tick,label:o?.label??'错过',title:`${a.title} · ${ch.title}`,outcome:!o?'你没有及时回应，这一章记为错过，不支出积蓄、不获得属性；后章仍可继续。':o.project?(spent?`你将 ${spent} 铜交给故乡公共工程，实际进度留在收据里。`:'这次工程未接收投入，积蓄仍留在你手中。'):o.outcome};}),...(steps.length===3?{ending:a.chapters[2].options.find(o=>o.id===steps[2][0])?.ending??'未完的回声'}:{})}];}));
  const storyLegacy=data.legacy.map(([id,generation,choice])=>{const a=CHRONICLES.find(a=>a.id===id);return {arcId:id,generation,title:a.title,ending:a.chapters[2].options.find(o=>o.id===choice)?.ending??'未完的回声'};});
  const person={...p,chronicles,storyLegacy,lastChronicleTick:data.lastChronicleTick,lastSpiritBattle:data.battleElement?{left:{element:data.battleElement}}:null};
  return {storyBook:storyBook(person,w,data.companions.map(([element,xp,city])=>({element,xp,city,owner:'self'})),'self'),storyLegacy};
}
export const personChoices=(p,tick)=>p&&p.endedAt===null?choices(p,tick):[];

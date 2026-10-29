import {CITIES} from '../../src/world-data.js';
import {ELEMENTS,XP_STEPS,elementOf,levelOf,spiritForce,spiritStats,spiritName} from '../elements.js';
import {validGrowth,evolutionTree} from './evolution.js';
import {growthOf} from '../evolution-data.js';
import {habitatOf} from '../habitat.js';

export const SPIRIT_TOTAL=288;
const homes={haven:'water',ember:'fire',moss:'wood',spire:'ice',reed:'earth',wind:'wind'};
const phases=[{name:'涨潮',target:28},{name:'满潮',target:32},{name:'退潮',target:20},{name:'低潮',target:16}];
export function seedSpirits(tick){
  const units=[];
  for(const e of ELEMENTS){let serial=1;
    const add=city=>units.push({id:`${e.id}-${serial++}`,element:e.id,city,owner:null,xp:0,trainedTick:-1,battledTick:-1});
    for(const c of CITIES)for(let i=0;i<(homes[c.id]===e.id?9:3);i++)add(c.id);
    for(let i=0;i<24;i++)add('sea');
  }
  return {version:1,genesisTick:tick,lastTick:tick,units,movement:[]};
}
export function validSpiritWorld(s){
  return s?.version===1&&Number.isSafeInteger(s.genesisTick)&&Number.isSafeInteger(s.lastTick)&&s.lastTick>=s.genesisTick&&Array.isArray(s.units)&&s.units.length===SPIRIT_TOTAL&&new Set(s.units.map(x=>x.id)).size===SPIRIT_TOTAL&&s.units.every(u=>elementOf(u.element)&&new RegExp(`^${u.element}-([1-9]|[1-3][0-9]|4[0-8])$`).test(u.id)&&[...CITIES.map(c=>c.id),'sea'].includes(u.city)&&(u.owner===null||(/^[a-f0-9]{64}$/.test(u.owner)&&u.city!=='sea'))&&Number.isSafeInteger(u.xp)&&u.xp>=0&&u.xp<=45&&Number.isSafeInteger(u.trainedTick)&&u.trainedTick>=-1&&u.trainedTick<=s.lastTick&&Number.isSafeInteger(u.battledTick)&&u.battledTick>=-1&&u.battledTick<=s.lastTick&&validGrowth(u,s.lastTick));
}
export function tide(s,tick){
  if(tick<=s.lastTick)return;
  const phase=phases[(tick-s.genesisTick)%4],movement=[];
  // Departures precede arrivals; everyone draws from the same finite offshore registry.
  for(const c of CITIES){const local=s.units.filter(u=>u.city===c.id),excess=Math.max(0,local.length-phase.target);
    const wild=local.filter(u=>!u.owner).sort((a,b)=>a.id.localeCompare(b.id,'en'));
    for(let i=0;i<Math.min(excess,4,wild.length);i++){const u=wild[(tick+i)%wild.length];u.city='sea';movement.push({id:u.id,from:c.id,to:'sea'});}
  }
  for(let offset=0;offset<6;offset++){
    const c=CITIES[(tick+offset)%6],missing=Math.max(0,phase.target-s.units.filter(u=>u.city===c.id).length);
    for(let i=0;i<Math.min(4,missing);i++){const sea=s.units.filter(u=>u.city==='sea');if(!sea.length)break;const u=sea[(tick*7+offset*5+i)%sea.length];u.city=c.id;movement.push({id:u.id,from:'sea',to:c.id});}
  }
  s.lastTick=tick;s.movement=movement;
}
export function spiritView(u){return {id:u.id,element:u.element,city:u.city,xp:u.xp,level:levelOf(u.xp),force:spiritForce(u),nextXP:XP_STEPS[levelOf(u.xp)]??null,trainedTick:u.trainedTick,battledTick:u.battledTick,form:u.form??'base',growth:structuredClone(growthOf(u)),evolutions:structuredClone(u.evolutions??[]),...spiritStats(u)};}
export function elementReading(s,tick){
  const phaseIndex=(tick-s.genesisTick)%4,phase=phases[phaseIndex];
  const islands=CITIES.map((c,ci)=>{
    const local=s.units.filter(u=>u.city===c.id);
    const forces=ELEMENTS.map((e,ei)=>{const units=local.filter(u=>u.element===e.id),base=units.reduce((n,u)=>n+spiritForce(u),0),resonance=80+20*((tick+ci+ei)%4);return {element:e.id,count:units.length,wild:units.filter(u=>!u.owner).length,averageLevel:units.length?units.reduce((n,u)=>n+levelOf(u.xp),0)/units.length:0,base,resonance,force:Math.round(base*resonance/100)};});
    const totalForce=forces.reduce((n,e)=>n+e.force,0);for(const e of forces)e.share=totalForce?e.force/totalForce:0;
    const dominant=forces.reduce((a,b)=>b.force>a.force?b:a,forces[0]);
    const reading={city:c.id,count:local.length,bonded:local.filter(u=>u.owner).length,averageLevel:local.length?local.reduce((n,u)=>n+levelOf(u.xp),0)/local.length:0,levelCounts:Array.from({length:6},(_,i)=>local.filter(u=>levelOf(u.xp)===i+1).length),totalForce,forces,dominant:dominant.element,land:totalForce?elementOf(dominant.element).land:'元素沉寂，保留原地貌'};
    return {...reading,habitat:habitatOf(reading)};
  });
  return {total:SPIRIT_TOTAL,offshore:s.units.filter(u=>u.city==='sea').length,active:s.units.filter(u=>u.city!=='sea').length,totalForce:islands.reduce((n,c)=>n+c.totalForce,0),phase:phase.name,genesisTick:s.genesisTick,islands,movement:s.movement};
}
export function spiritPersonal(s,owner,p,tick){const local=p?elementReading(s,tick).islands.find(c=>c.city===p.city):null;return {owned:owner?s.units.filter(u=>u.owner===owner).map(u=>({...spiritView(u),tree:evolutionTree(u,p,tick,local)})):[],wild:p?s.units.filter(u=>u.city===p.city&&!u.owner).map(spiritView):[],actions:p?.spiritActions??{},maxOwned:6,tick};}
export function duel(a,b,tick){
  const stats=u=>({...spiritView(u),name:spiritName(u)});
  const left=stats(a),right=stats(b),rounds=[];let hpA=left.maxHP,hpB=right.maxHP;
  const hit=(u,v)=>{const advantage=elementOf(u.element).beats===v.element?1.25:1;return {advantage,damage:Math.max(2,Math.floor(u.attack*advantage-v.guard*.5))};};
  const x=hit(left,right),y=hit(right,left);
  for(let round=1;round<=12&&hpA>0&&hpB>0;round++){hpA=Math.max(0,hpA-y.damage);hpB=Math.max(0,hpB-x.damage);rounds.push({round,leftDamage:x.damage,rightDamage:y.damage,leftAdvantage:x.advantage,rightAdvantage:y.advantage,leftHP:hpA,rightHP:hpB});}
  const balance=hpA/left.maxHP-hpB/right.maxHP;
  return {tick,left,right,rounds,outcome:balance>0?'win':balance<0?'loss':'draw',rule:'每回合双方同时攻击；伤害=max(2, floor(攻击×克制倍率−防御×0.5))。克制1.25倍，否则1倍。最多12回合，比剩余体力比例。切磋不死亡、不转移精灵。'};
}

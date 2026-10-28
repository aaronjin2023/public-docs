import {CITIES,POLICIES} from './world-data.js';
import {PETITIONS} from './residents.js';

export const COUNCIL_HORIZON=12,COUNCIL_COOLDOWN=4,COUNCIL_MEMORY=8;
export const COUNCIL_GOALS={food:'粮食安全',ecology:'土地恢复',wealth:'公共库藏',trust:'居民互信',knowledge:'公共知识'};
export const COUNCIL_PROFILES=[
  {city:'haven',motto:'让往来的船，也接住岸上的生活。',weights:{food:.30,ecology:.15,wealth:.20,trust:.25,knowledge:.10}},
  {city:'ember',motto:'炉火要养家，河岸也要留下明天。',weights:{food:.20,ecology:.25,wealth:.35,trust:.15,knowledge:.05}},
  {city:'moss',motto:'先给森林留下位置，再讨论新的屋檐。',weights:{food:.20,ecology:.45,wealth:.08,trust:.15,knowledge:.12}},
  {city:'spire',motto:'把这一季的问题，写成下一代能用的知识。',weights:{food:.20,ecology:.15,wealth:.08,trust:.17,knowledge:.40}},
  {city:'reed',motto:'仓里的刻度，既要顾本地，也要看邻岛。',weights:{food:.45,ecology:.20,wealth:.10,trust:.20,knowledge:.05}},
  {city:'wind',motto:'风停下的时候，人仍要彼此接住。',weights:{food:.30,ecology:.15,wealth:.10,trust:.35,knowledge:.10}},
];
export function councilReading(city){
  return {population:city.population,food:city.food/(city.population*.24),wealth:city.wealth,ecology:city.ecology,trust:city.trust,knowledge:city.knowledge,pollution:city.pollution};
}
export function councilMemory(state,city){return state.council?.agents.find(a=>a.city===city);}
export function councilObservation(state,city){
  const c=state.cities.find(c=>c.id===city),memory=councilMemory(state,city),short=c.food<c.population*.24;
  const streak=memory?.observedTick===state.tick?memory.shortageStreak:short?(memory?.observedTick===state.tick-1?memory.shortageStreak:0)+1:0;
  const recent=Math.max(memory?.records.at(-1)?.tick??-COUNCIL_COOLDOWN,...state.interventions.filter(a=>a.city===city).map(a=>a.tick));
  return {reading:councilReading(c),streak,cooldown:Math.max(0,COUNCIL_COOLDOWN-(state.tick-recent))};
}
export function councilActionLabel(action){
  if(action.kind==='wait')return '暂不行动';
  if(action.kind==='decide')return PETITIONS.find(p=>p.id===action.id).options.find(o=>o.id===action.choice).label;
  const label=POLICIES.find(p=>p.id===action.id).name;
  return action.kind==='retire'?`撤除一级：${label}`:label;
}
export function councilCost(action){
  if(action.kind==='build')return {wealth:POLICIES.find(p=>p.id===action.id).cost,food:0};
  if(action.kind==='decide'){const e=PETITIONS.find(p=>p.id===action.id).options.find(o=>o.id===action.choice).effects;return {wealth:Math.max(0,-(e.wealth??0)),food:Math.max(0,-(e.food??0))};}
  return {wealth:0,food:0};
}
export function councilAffordable(city,action){
  const cost=councilCost(action);
  return (cost.wealth===0||city.wealth-cost.wealth>=60)&&(cost.food===0||city.food-cost.food>=city.population*.24);
}
export function councilScore(profile,observation,before,baseline,future){
  const scale=r=>({food:Math.min(r.food,5)/5,ecology:r.ecology,wealth:Math.log1p(r.wealth/100)/Math.log(11),trust:r.trust,knowledge:Math.min(r.knowledge,100)/100});
  const a=scale(baseline),b=scale(future),weights={...profile.weights};
  weights.food*=1+Math.min(observation.streak,8)*.25;
  if(before.ecology<.6)weights.ecology*=1.5;
  const parts=Object.fromEntries(Object.keys(weights).map(key=>[key,weights[key]*(b[key]-a[key])]));
  const risk=Math.max(0,baseline.food-future.food)*(baseline.food<1?.15:0)+Math.max(0,future.pollution-baseline.pollution)*.15;
  return {score:Object.values(parts).reduce((sum,n)=>sum+n,0)-risk,goal:Object.keys(parts).sort((x,y)=>parts[y]-parts[x])[0]};
}
export function validCouncil(council,tick){
  if(council===undefined)return true;
  const at=n=>Number.isInteger(n)&&n>=0&&n<=tick;
  const reading=r=>r&&Number.isInteger(r.population)&&r.population>=40&&r.population<=1e8&&['food','wealth','knowledge'].every(k=>Number.isFinite(r[k])&&r[k]>=0&&r[k]<=1e9)&&['ecology','trust','pollution'].every(k=>Number.isFinite(r[k])&&r[k]>=0&&r[k]<=1);
  if(!council||typeof council.enabled!=='boolean'||!at(council.startedAt)||!Array.isArray(council.agents)||council.agents.length!==CITIES.length)return false;
  return council.agents.every((agent,i)=>{
    if(!agent||agent.city!==CITIES[i].id||!Number.isInteger(agent.observedTick)||agent.observedTick<council.startedAt-1||agent.observedTick>tick||!Number.isInteger(agent.shortageStreak)||agent.shortageStreak<0||agent.shortageStreak>tick+1||!Array.isArray(agent.records)||agent.records.length>COUNCIL_MEMORY)return false;
    return agent.records.every((r,j)=>{
      if(!r||!at(r.tick)||r.tick<council.startedAt||r.tick>agent.observedTick||(j&&r.tick<=agent.records[j-1].tick)||!Object.hasOwn(COUNCIL_GOALS,r.goal)||!Number.isFinite(r.score)||r.score<=0||r.score>100||!reading(r.before)||!reading(r.expected))return false;
      const a=r.action;if(!a||!['build','retire','decide'].includes(a.kind))return false;
      if(a.kind==='decide'){const p=PETITIONS.find(p=>p.id===a.id&&p.city===agent.city);if(!p?.options.some(o=>o.id===a.choice))return false;}
      else if(!POLICIES.some(p=>p.id===a.id))return false;
      return r.after===undefined?r.afterTick===undefined:reading(r.after)&&r.afterTick===r.tick+COUNCIL_HORIZON&&at(r.afterTick);
    });
  });
}

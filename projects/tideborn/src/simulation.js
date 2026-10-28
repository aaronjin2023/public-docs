import { CITIES, POLICIES, START_YEAR, SEED, SEASONS } from './world-data.js';
import { clamp } from './terrain.js';
import {PETITIONS,pendingPetitions,petitionOpenedAt,civicRules,residentAt,aftermathFor,outcomeText} from './residents.js';

export const SAVE_KEY = 'tideborn-world-v1';
const READING_FIELDS=['population','food','wealth','ecology','pollution','knowledge','trust'];
const cityReading=c=>Object.fromEntries(READING_FIELDS.map(key=>[key,c[key]]));
function validReading(c){
  return c&&READING_FIELDS.every(key=>Number.isFinite(c[key]))&&Number.isInteger(c.population)&&c.population>=40&&c.population<=1e8&&c.food>=0&&c.wealth>=0&&c.knowledge>=0&&c.knowledge<=250&&['ecology','pollution','trust'].every(key=>c[key]>=0&&c[key]<=1);
}
export const dateLabel = s => `${START_YEAR + Math.floor(s.tick / 4)} 年 · ${SEASONS[s.tick % 4]}`;
export const yearOf = s => START_YEAR + s.tick / 4;
export function tideAt(tick) {
  // shortcut: a fictional two-period tide calendar, not a hydrodynamic forecast.
  return .5 + .34 * Math.sin(tick * Math.PI / 24) + .16 * Math.sin(tick * Math.PI / 6 + .8);
}
export const waterHeightAt=tick=>.15+tideAt(tick)*.85;
export function weatherAt(tick, seed = SEED) {
  return .77 + .18 * Math.sin(tick * .31 + seed) + .16 * Math.cos(tick * .13 + seed * .01);
}
export function createWorld(seed = SEED) {
  const state = {
    version:1, seed, tick:0, cities:CITIES.map(c => ({id:c.id, population:c.population, food:c.population * .9,
      wealth:c.wealth, ecology:c.ecology, trust:c.trust, knowledge:12, pollution:0,
      policies:Object.fromEntries(POLICIES.map(p=>[p.id,0])), balance:0, trade:0, migration:0,
      lastShortage:false, discoveryLevel:0, satisfaction:1})),
    events:[], history:[], discoveries:[], interventions:[], decisions:[], petitionOpenings:[], shipments:{tick:0,legs:[]}, climate:'temperate',
  };
  record(state, '起航', '长潮纪 208 年，六座城邦共同打开海图。你抵达时，世界已经在生活。', null, 'origin');
  snapshot(state);
  return state;
}
export function record(s, title, text, city=null, kind='history', destination) {
  const event={id:`${s.tick}-${s.events.length}-${title}`, tick:s.tick, title, text, city, kind};
  if(destination!==undefined)event.destination=destination;
  s.events.unshift(event);
  s.events = s.events.slice(0,400);
}
export function totals(s) {
  return s.cities.reduce((a,c)=>({population:a.population+c.population, food:a.food+c.food, wealth:a.wealth+c.wealth,
    ecology:a.ecology+c.ecology/s.cities.length, knowledge:a.knowledge+c.knowledge/s.cities.length}),
    {population:0,food:0,wealth:0,ecology:0,knowledge:0});
}
export function passageSummary(before,after) {
  const cities=CITIES.map(({id})=>{
    const a=before.cities.find(c=>c.id===id),b=after.cities.find(c=>c.id===id);
    return {id,populationBefore:a.population,populationAfter:b.population,populationChange:b.population-a.population,
      ecologyBefore:a.ecology,ecologyAfter:b.ecology,ecologyChange:b.ecology-a.ecology,
      foodBefore:a.food/(a.population*.24),foodAfter:b.food/(b.population*.24),wealthChange:b.wealth-a.wealth};
  });
  const replies=(after.decisions??[]).filter(d=>d.followedUp&&!(before.decisions??[]).some(old=>old.id===d.id&&old.followedUp)).length;
  return {from:before.tick,to:after.tick,years:(after.tick-before.tick)/4,cities,replies,letters:pendingPetitions(after).filter(p=>!pendingPetitions(before).some(old=>old.id===p.id)).map(p=>p.id),
    populationChange:totals(after).population-totals(before).population,
    ecologyChange:totals(after).ecology-totals(before).ecology};
}
export function snapshot(s) {
  const point={tick:s.tick,...totals(s),cities:s.cities.map(c=>({id:c.id,population:c.population,ecology:c.ecology}))};
  if(s.history.at(-1)?.tick===s.tick)s.history[s.history.length-1]=point;else s.history.push(point);
  if (s.history.length>401) s.history.splice(1,1);
}
export function policyReason(s, cityId, policyId) {
  const c=s.cities.find(c=>c.id===cityId), p=POLICIES.find(p=>p.id===policyId);
  if(!c||!p) return '未知的城镇或行动';
  if(c.policies[p.id]>=p.max) return '已完成全部三级建设';
  if(c.wealth<p.cost) return `还需要 ${Math.ceil(p.cost-c.wealth)} 铜`;
  return '';
}
export function enact(s,cityId,policyId) {
  const reason=policyReason(s,cityId,policyId);
  if(reason) return {ok:false,reason};
  const c=s.cities.find(c=>c.id===cityId), p=POLICIES.find(p=>p.id===policyId), d=CITIES.find(c=>c.id===cityId);
  c.wealth-=p.cost; c.policies[p.id]++;
  s.interventions.push({tick:s.tick,city:cityId,policy:policyId});s.interventions=s.interventions.slice(-200);
  record(s,`${d.name} · ${p.name}`,`议事会投入 ${p.cost} 铜，完成第 ${c.policies[p.id]} 级建设。${p.effect}`,cityId,'choice');
  snapshot(s);
  return {ok:true};
}
export function retire(s,cityId,policyId){
  const c=s.cities.find(c=>c.id===cityId),p=POLICIES.find(p=>p.id===policyId);
  if(!c||!p)return {ok:false,reason:'未知的城镇或设施'};
  if(c.policies[p.id]===0)return {ok:false,reason:'这里没有可撤除的设施'};
  c.policies[p.id]--;
  s.interventions.push({tick:s.tick,city:cityId,policy:policyId,action:'retire'});s.interventions=s.interventions.slice(-200);
  record(s,`${CITIES.find(d=>d.id===cityId).name} · 撤除一级设施`,`${p.visible}撤除一级，当前保留 ${c.policies[p.id]} 级。建设投入不退款，重建按原价。已有污染、知识与历史保留；下一季起按保留等级计算产出与代价。`,cityId,'choice');
  snapshot(s);return {ok:true};
}
export function decisionReason(s,id,choice){
  const petition=pendingPetitions(s).find(p=>p.id===id),option=petition?.options.find(o=>o.id===choice);
  if(!option)return '议题尚未出现、已经决定或选项无效';
  const city=s.cities.find(c=>c.id===petition.city);
  for(const field of ['wealth','food']){
    const cost=-(option.effects[field]??0);
    if(city[field]<cost)return `还需要 ${Math.ceil(cost-city[field])} ${field==='wealth'?'铜':'份粮食'}`;
  }
  return '';
}
export function decide(s,id,choice){
  const reason=decisionReason(s,id,choice);if(reason)return {ok:false,reason};
  const petition=PETITIONS.find(p=>p.id===id),option=petition.options.find(o=>o.id===choice),city=s.cities.find(c=>c.id===petition.city);
  const before=cityReading(city);
  const limits={wealth:[0,99999],food:[0,Infinity],population:[40,1e8],ecology:[.08,1],trust:[.12,.99],pollution:[0,1],knowledge:[0,250]};
  for(const [field,amount] of Object.entries(option.effects))city[field]=clamp(city[field]+amount,...limits[field]);
  s.decisions??=[];s.decisions.push({id,choice,tick:s.tick,followedUp:false,before});
  record(s,`${CITIES.find(c=>c.id===city.id).name} · ${option.label}`,`议事会回应了「${petition.title}」。${option.detail} 两年后，会有人把日常的变化写回来。`,city.id,'choice');
  snapshot(s);return {ok:true};
}
function rotationFor(s,tick){const d=(Array.isArray(s.decisions)?s.decisions:[]).find(d=>d?.id==='haven-queue'&&d.choice==='rotation');return d&&tick>d.tick?tick-d.tick-1:null;}
function receivingOrder(rows,rotation=null){
  const queue=rows.filter(c=>c.food<c.population*.48).sort((a,b)=>a.food/a.population-b.food/b.population);
  if(rotation!==null)for(let i=0;i<queue.length;){
    let end=i+1;while(end<queue.length&&queue[end].food/queue[end].population===queue[i].food/queue[i].population)end++;
    const group=queue.slice(i,end),offset=rotation%group.length;queue.splice(i,group.length,...group.slice(offset),...group.slice(0,offset));i=end;
  }
  return queue;
}
function distributeFood(flows,rotation=null){
  const legs=[];
  const receivers=receivingOrder(flows.map(f=>f.c),rotation).map(c=>flows.find(f=>f.c===c));
  const donors=flows.filter(({c,reserve})=>c.food>c.population*reserve).sort((a,b)=>b.c.food/b.c.population-a.c.food/a.c.population);
  for(const target of receivers)for(const source of donors){
    const amount=Math.max(0,Math.min(source.c.food-source.c.population*source.reserve,target.c.population*.48-target.c.food,source.capacity,target.capacity));
    if(amount>0)legs.push({from:source.c.id,to:target.c.id,amount});
    source.c.food-=amount;target.c.food+=amount;
    source.c.trade-=amount;target.c.trade+=amount;
    source.capacity-=amount;target.capacity-=amount;
  }
  return legs;
}
export function transportFor(s,cityId){
  if(!s.shipments?.ports)return null;
  const rows=s.shipments.ports.map(p=>{
    const imported=s.shipments.legs.filter(l=>l.to===p.id).reduce((n,l)=>n+l.amount,0),exported=s.shipments.legs.filter(l=>l.from===p.id).reduce((n,l)=>n+l.amount,0);
    const demand=Math.max(0,p.population*.48-p.food),supply=Math.max(0,p.food-p.population*p.reserve);
    return {...p,stockSeasons:p.food/(p.population*.24),demand,supply,imported,exported,unmet:Math.max(0,demand-imported),remainingSupply:Math.max(0,supply-exported),remainingCapacity:Math.max(0,p.capacity-imported-exported)};
  });
  const local=rows.find(p=>p.id===cityId);if(!local)return null;
  const rotation=s.shipments.rotation??null,queue=receivingOrder(rows,rotation),donors=rows.filter(p=>p.supply>0).sort((a,b)=>b.food/b.population-a.food/a.population);
  const reason=local.demand===0?(local.supply>0?'donor':'reserve'):local.unmet<1e-7?'filled':local.remainingCapacity<1e-7?'local-capacity':!donors.length?'no-surplus':donors.every(p=>p.remainingSupply<1e-7)?'supply-spent':'source-capacity';
  return {local,queue,donors,rank:queue.findIndex(p=>p.id===cityId)+1,reason,rotation};
}
export function advance(s, steps=1) {
  if(!Number.isInteger(steps)||steps<0||steps>4000) throw new Error('推进步数必须是 0–4000 的整数');
  const rules=CITIES.map(c=>civicRules(s,c.id));
  for(let k=0;k<steps;k++) {
    s.tick++;s.shipments={tick:s.tick,legs:[]};
    const season = s.tick%4, weather=weatherAt(s.tick,s.seed)*(s.climate==='dry'?.72:s.climate==='wet'?1.18:1);
    const tide=tideAt(s.tick), flows=[];
    for(let i=0;i<s.cities.length;i++) {
      const c=s.cities[i], d=CITIES[i], p=c.policies, civic=rules[i];
      const water=clamp(d.rainfall*weather+p.water*.12,.22,1.2);
      const seasonal=[1.12,1.02,1.22,.66][season];
      const flood=tide>.88 && ['haven','reed'].includes(c.id) ? Math.min(1,.84+civic.floodResistance) : 1;
      const production=d.population*.31*d.fertility*(.67+water*.55)*seasonal*(.5+c.ecology*.6)
        *(1+p.water*.12)*(1-p.commons*.04)*(1+Math.min(c.knowledge,100)*.0018)*flood*(1+civic.productionMultiplier);
      const consumption=c.population*.24;
      c.balance=production-consumption;
      c.food=clamp(c.food+production-consumption,0,c.population*2);
      c.trade=0; c.migration=0;
      c.pollution=clamp(c.pollution*.965+p.mine*.006-p.commons*.0015+civic.pollutionRate);
      c.ecology=clamp(c.ecology+.004*(1-c.ecology)+p.commons*.006-p.mine*.0035-p.port*.0012-p.water*.0003-c.pollution*.009+civic.ecologyRate,.08,1);
      c.knowledge=clamp(c.knowledge+.10+p.school*.25+c.trust*.05+civic.knowledgeRate,0,250);
      c.wealth=clamp(c.wealth+4+c.population*.003+p.mine*9+p.port*2-p.school*2-p.water*.5+civic.income,0,99999);
      c.satisfaction=clamp(c.food/(c.population*.45),0,1);
      flows.push({c,reserve:.70+civic.reserveBuffer,capacity:(55+p.port*25+civic.tradeCapacity)*(tide>.88?.6:1)});
      if(flood<1 && season===2) record(s,`${d.name}的高水位`, '长潮越过旧堤，部分农田暂时减产。仓储与港口正在分担压力。',c.id,'climate');
    }
    // Trade transfers existing food; no production is invented at either end.
    s.shipments.ports=flows.map(({c,reserve,capacity})=>({id:c.id,population:c.population,food:c.food,reserve,capacity}));
    s.shipments.rotation=rotationFor(s,s.tick);
    s.shipments.legs=distributeFood(flows,s.shipments.rotation);
    for(let i=0;i<s.cities.length;i++) {
      const c=s.cities[i], d=CITIES[i];
      c.satisfaction=clamp(c.food/(c.population*.45));
      c.trust=clamp(c.trust+(c.satisfaction-.83)*.012+c.policies.school*.0012-c.pollution*.002,.12,.99);
      const shortage=c.food<c.population*.18;
      if(shortage&&!c.lastShortage) record(s,`${d.name}的粮仓见底`, c.trade>0?'库存不足一季基本用粮。邻岛送来的粮食仍未补足缺口，部分居民考虑迁居。':'库存不足一季基本用粮。本季没有收到邻岛补给，部分居民考虑迁居。',c.id,'warning');
      if(!shortage&&c.lastShortage) record(s,`${d.name}重新开仓`, '收成与运粮使库存回到警戒线以上。街角的面包炉重新点火。',c.id,'recovery');
      c.lastShortage=shortage;
      const births=Math.round(c.population*(.0015+c.trust*.001));
      const losses=shortage?Math.round(c.population*.007*(1-c.satisfaction)):0;
      c.population=Math.max(40,c.population+births-losses);
      const milestone=Math.floor(c.knowledge/25);
      if(milestone>c.discoveryLevel) {
        c.discoveryLevel=milestone;
        const discoveries=['新的水位刻度','耐潮种子试验','共享航海图','雨水过滤法','跨岛课堂','新的星表'];
        record(s,`${d.name} · ${discoveries[Math.min(milestone-1,5)]}`, `${residentAt(d,s.tick).name}所在的社群把多年记录整理成公共知识。下一代将从这里继续。`,c.id,'knowledge');
      }
    }
    // Compare the same post-trade readings, then move everyone together.
    const migration=[];
    if(s.tick%4===0)for(const c of s.cities) {
      if(c.satisfaction<.8||c.trust<.42) {
        const dest=s.cities.filter(x=>x.id!==c.id).sort((a,b)=>(b.satisfaction+b.trust)-(a.satisfaction+a.trust))[0];
        if(dest.satisfaction+dest.trust>c.satisfaction+c.trust+.15) migration.push({from:c,to:dest,n:Math.min(Math.round(c.population*.018),c.population-40)});
      }
    }
    for(const m of migration) {
      m.from.population-=m.n; m.to.population+=m.n; m.from.migration-=m.n; m.to.migration+=m.n;
      const a=CITIES.find(c=>c.id===m.from.id),b=CITIES.find(c=>c.id===m.to.id);
      record(s,'迁居的帆',`${m.n} 位居民从${a.name}迁往${b.name}，寻找更稳定的粮食与生活。他们带走种子，也带走旧城的歌。`,m.from.id,'migration',m.to.id);
    }
    for(const petition of PETITIONS){
      let context='';
      if(petition.trigger){
        if(s.tick<petition.opens||petitionOpenedAt(s,petition)!==undefined||!(s.decisions??[]).some(d=>d.id===petition.requires))continue;
        context=petition.trigger(s);if(!context)continue;
        s.petitionOpenings??=[];s.petitionOpenings.push({id:petition.id,tick:s.tick,context});
      }else if(s.tick!==petition.opens)continue;
      record(s,`${CITIES.find(c=>c.id===petition.city).name} · 一封来信`,`${petition.title}。${context}居民提出了两种不同的办法，等待你进入城中的「此人」页阅读。`,petition.city,'petition');
    }
    for(const decision of s.decisions??[]){
      if(decision.followedUp||s.tick<decision.tick+8)continue;
      const p=PETITIONS.find(p=>p.id===decision.id),city=CITIES.find(c=>c.id===p.city);
      if(decision.before)decision.after={tick:s.tick,...cityReading(s.cities.find(c=>c.id===p.city))};
      decision.followedUp=true;
      record(s,`${city.name} · ${s.tick===decision.tick+8?'决定之后的第二年':'决定之后的回信'}`,aftermathFor(decision)+outcomeText(decision),city.id,'aftermath');
    }
    for(const city of CITIES){
      const now=residentAt(city,s.tick),before=residentAt(city,s.tick-1);
      if(now.generation!==before.generation)record(s,`${city.name} · 把名字交给后来的人`,`${before.name}退出日常职务，${now.name}接过${city.person.role}的工作。记录中的旧约继续有效，新的问题仍要由活着的人回答。`,city.id,'generation');
    }
    if(s.tick%16===0) {
      const t=totals(s), weakest=s.cities.reduce((a,b)=>a.food/a.population<b.food/b.population?a:b);
      record(s,'群岛四年札记',`群岛共有 ${t.population.toLocaleString('zh-CN')} 位居民。生态均值 ${Math.round(t.ecology*100)}%。粮食最紧张的是${CITIES.find(c=>c.id===weakest.id).name}。`,null,'summary');
    }
    snapshot(s);
  }
  return s;
}
export function discover(s,id,text) {
  if(s.discoveries.includes(id)) return false;
  s.discoveries.push(id); record(s,'旅人的发现',text,null,'discovery'); return true;
}
export function validateSave(s) {
  if(!s||s.version!==1||!Number.isInteger(s.tick)||s.tick<0||s.tick>1000000||!Number.isFinite(s.seed)) return false;
  if(!Array.isArray(s.cities)||s.cities.length!==CITIES.length||!['temperate','dry','wet'].includes(s.climate))return false;
  for(let i=0;i<CITIES.length;i++) {
    const c=s.cities[i];
    if(c?.id!==CITIES[i].id||!Number.isInteger(c.population)||c.population<40||c.population>1e8) return false;
    for(const f of ['food','wealth','ecology','trust','knowledge','pollution','balance','trade','migration','satisfaction']) if(!Number.isFinite(c[f]))return false;
    if(c.food<0||c.wealth<0||c.knowledge<0||c.knowledge>250||c.satisfaction<0||c.satisfaction>1||c.ecology<0||c.ecology>1||c.trust<0||c.trust>1||c.pollution<0||c.pollution>1)return false;
    for(const p of POLICIES)if(!Number.isInteger(c.policies?.[p.id])||c.policies[p.id]<0||c.policies[p.id]>p.max)return false;
    if(!Number.isInteger(c.discoveryLevel)||c.discoveryLevel<0||typeof c.lastShortage!=='boolean')return false;
  }
  if(rotationFor(s,s.tick)!==null&&!s.shipments)return false;
  if(s.shipments!==undefined){
    const m=s.shipments;
    if(!m||m.tick!==s.tick||!Array.isArray(m.legs)||m.legs.length>30||(s.tick===0&&m.legs.length))return false;
    const rotation=rotationFor(s,s.tick);
    if((m.rotation??null)!==rotation||(rotation!==null&&!m.ports))return false;
    const incoming=Object.fromEntries(CITIES.map(c=>[c.id,0])),outgoing={...incoming},pairs=new Set();
    for(const leg of m.legs){
      if(!leg||typeof leg.from!=='string'||typeof leg.to!=='string'||!Object.hasOwn(incoming,leg.from)||!Object.hasOwn(incoming,leg.to)||leg.from===leg.to||!Number.isFinite(leg.amount)||leg.amount<=0)return false;
      const key=`${leg.from}:${leg.to}`;if(pairs.has(key))return false;pairs.add(key);
      outgoing[leg.from]+=leg.amount;incoming[leg.to]+=leg.amount;
    }
    for(const c of s.cities){
      // Largest possible port capacity: 55 base + 75 construction + 35 from the grain charter.
      if(incoming[c.id]>165+1e-7||outgoing[c.id]>165+1e-7||(incoming[c.id]>0&&outgoing[c.id]>0)||Math.abs(incoming[c.id]-outgoing[c.id]-c.trade)>1e-7)return false;
    }
    if(m.ports!==undefined){
      if(!s.tick||!Array.isArray(m.ports)||m.ports.length!==CITIES.length)return false;
      const factor=tideAt(s.tick)>.88?.6:1;
      for(let i=0;i<CITIES.length;i++){
        const p=m.ports[i];
        if(!p||p.id!==CITIES[i].id||!Number.isInteger(p.population)||p.population<40||p.population>1e8||!Number.isFinite(p.food)||p.food<0||p.food>p.population*2)return false;
        const reserves=p.id==='reed'?[.55,.70,.88]:[.70],capacities=p.id==='reed'?[55,80,105,130,90,115,140,165]:[55,80,105,130];
        if(!Number.isFinite(p.reserve)||!reserves.some(n=>Math.abs(n-p.reserve)<1e-9)||!Number.isFinite(p.capacity)||!capacities.some(n=>Math.abs(n*factor-p.capacity)<1e-9))return false;
      }
      const replay=distributeFood(m.ports.map(p=>({c:{id:p.id,population:p.population,food:p.food,trade:0},reserve:p.reserve,capacity:p.capacity})),rotation);
      if(replay.length!==m.legs.length||replay.some((l,i)=>l.from!==m.legs[i].from||l.to!==m.legs[i].to||Math.abs(l.amount-m.legs[i].amount)>1e-7))return false;
    }
  }
  if(s.petitionOpenings!==undefined){
    if(!Array.isArray(s.petitionOpenings)||s.petitionOpenings.length>PETITIONS.filter(p=>p.trigger).length||new Set(s.petitionOpenings.map(o=>o?.id)).size!==s.petitionOpenings.length)return false;
    for(const o of s.petitionOpenings){
      const p=PETITIONS.find(p=>p.id===o?.id);
      if(!p?.trigger||!Number.isInteger(o.tick)||o.tick<p.opens||o.tick>s.tick||typeof o.context!=='string'||o.context.length>300||!Array.isArray(s.decisions)||!s.decisions.some(d=>d?.id===p.requires&&d.tick<=o.tick))return false;
    }
  }
  if(s.decisions!==undefined){
    if(!Array.isArray(s.decisions)||s.decisions.length>PETITIONS.length||new Set(s.decisions.map(d=>d?.id)).size!==s.decisions.length)return false;
    for(const d of s.decisions){
      const p=PETITIONS.find(p=>p.id===d?.id);
      if(!p||!p.options.some(o=>o.id===d.choice)||!Number.isInteger(d.tick)||d.tick<p.opens||d.tick>s.tick||typeof d.followedUp!=='boolean'||(p.trigger&&(petitionOpenedAt(s,p)===undefined||d.tick<petitionOpenedAt(s,p))))return false;
      if(d.before!==undefined&&!validReading(d.before))return false;
      if(d.after!==undefined&&(!d.before||!d.followedUp||!validReading(d.after)||!Number.isInteger(d.after.tick)||d.after.tick<d.tick+8||d.after.tick>s.tick))return false;
    }
  }
  if(!Array.isArray(s.events)||s.events.length>400||s.events.some(e=>!e||typeof e.title!=='string'||typeof e.text!=='string'||!Number.isInteger(e.tick)))return false;
  if(s.events.some(e=>e.destination!==undefined&&(e.kind!=='migration'||!CITIES.some(c=>c.id===e.city)||!CITIES.some(c=>c.id===e.destination)||e.city===e.destination||e.tick<0||e.tick>s.tick)))return false;
  if(!Array.isArray(s.history)||s.history.length>401||s.history.some(h=>!h||!['tick','population','food','wealth','ecology','knowledge'].every(k=>Number.isFinite(h[k]))))return false;
  if(s.history.some(h=>h.cities!==undefined&&(!Array.isArray(h.cities)||h.cities.length!==CITIES.length||h.cities.some((c,i)=>c?.id!==CITIES[i].id||!Number.isFinite(c.population)||c.population<40||!Number.isFinite(c.ecology)||c.ecology<0||c.ecology>1))))return false;
  if(!Array.isArray(s.discoveries)||s.discoveries.length>20||!s.discoveries.every(x=>typeof x==='string'))return false;
  if(!Array.isArray(s.interventions)||s.interventions.length>200||s.interventions.some(x=>!x||!CITIES.some(c=>c.id===x.city)||!POLICIES.some(p=>p.id===x.policy)||!Number.isInteger(x.tick)||x.tick<0||x.tick>s.tick||(x.action!==undefined&&!['build','retire'].includes(x.action))))return false;
  return true;
}
export function compare(s,years=12) {
  const future=structuredClone(s), baseline=structuredClone(s);
  baseline.cities.forEach(c=>{c.policies=Object.fromEntries(POLICIES.map(p=>[p.id,0]));});
  advance(future,years*4); advance(baseline,years*4);
  return {future:totals(future),baseline:totals(baseline),years,tick:future.tick,
    cities:future.cities.map((c,i)=>({id:c.id,future:cityReading(c),baseline:cityReading(baseline.cities[i])}))};
}

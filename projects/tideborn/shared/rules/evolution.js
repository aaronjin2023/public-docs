import {elementOf,levelOf} from '../elements.js';
import {treeOf,formOf,growthOf} from '../evolution-data.js';

export function validGrowth(u,tick){
  const count=n=>Number.isSafeInteger(n)&&n>=0;
  const g=u.growth;
  if(g!==undefined&&(!g||!count(g.care)||!count(g.battles)||!g.opponents||Array.isArray(g.opponents)||Object.entries(g.opponents).some(([e,n])=>!elementOf(e)||!count(n))||Object.values(g.opponents).reduce((a,b)=>a+b,0)!==g.battles))return false;
  if(u.form!==undefined&&u.form!=='base'&&!formOf(u))return false;
  const history=u.evolutions??[];if(!Array.isArray(history)||history.length>2)return false;
  let current='base',last=-1;
  for(const h of history){const f=treeOf(u.element)?.nodes.find(n=>n.id===h.to);
    if(!f||h.from!==current||f.parent!==current||!count(h.tick)||h.tick>tick||h.tick<=last||h.cost!==f.cost||levelOf(u.xp)<f.level)return false;
    current=h.to;last=h.tick;
  }
  return current===(u.form??'base');
}

export function evolutionTree(u,p,tick,local){
  const g=growthOf(u),e=elementOf(u.element),form=u.form??'base',last=u.evolutions?.at(-1)?.tick;
  return treeOf(u.element).nodes.map(f=>{
    const checks=[{label:`等级达到 ${f.level}`,value:levelOf(u.xp),target:f.level,met:levelOf(u.xp)>=f.level}];
    if(f.care)checks.push({label:'这只精灵累计培养',value:g.care,target:f.care,met:g.care>=f.care});
    if(f.battles)checks.push({label:'这只精灵累计切磋（胜负不限）',value:g.battles,target:f.battles,met:g.battles>=f.battles});
    if(f.share){const share=local?.forces.find(x=>x.element===u.element)?.share??0;checks.push({label:`故乡${e.element}元素力占比`,value:Math.floor(share*1000)/10,target:25,unit:'%',met:share>=f.share});}
    if(f.trial){const n=g.opponents[e.beats]??0;checks.push({label:`与${elementOf(e.beats).name}切磋过（胜负不限）`,value:n,target:1,met:n>=1});}
    checks.push({label:'人物积蓄（进阶消耗）',value:p?.coins??0,target:f.cost,unit:'铜',met:(p?.coins??0)>=f.cost});
    const reached=(u.evolutions??[]).some(h=>h.to===f.id),direct=f.parent===form;
    const alternative=form!=='base'&&formOf(u)?.path!==f.path;
    let reason=reached?(form===f.id?'当前形态':'已走过的形态'):alternative?'已选择另一条路线':!direct?'先完成前一阶':p?.endedAt!==null?'需要在世的守护者':p?.spiritActions?.evolve===tick||last===tick?'本季已进阶，下季继续':checks.some(c=>!c.met)?'条件尚未满足':'';
    return {...f,checks,reached,current:form===f.id,available:!reason,reason};
  });
}

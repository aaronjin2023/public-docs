import {CITIES} from '../../src/world-data.js';
import {defaultAppearance} from '../appearance.js';
export const ACTIVITIES={
  care:{label:'安稳照料',detail:'休养与家人的陪伴，恢复体力。',min:0},
  curiosity:{label:'听潮与探索',detail:'认识身边的声音与事物，积累见识。',min:0},
  study:{label:'在城里求学',detail:'六岁起开放；学堂越完善，学习收获越多。',min:6},
  work:{label:'学艺谋生',detail:'十六岁起开放；体力换取手艺与个人收入。',min:16},
  contribute:{label:'为故乡共建',detail:'投入 5 铜到本城工程；幼年由家人代为执行。',min:0},
};
export const ageAt=(p,tick)=>(tick-p.bornTick)/4;
export function choices(p,tick){return Object.entries(ACTIVITIES).filter(([key,a])=>ageAt(p,tick)>=a.min&&(key!=='contribute'||p.coins>=5)).map(([id,a])=>({id,...a}));}
export function birth(name,city,tick,familyIndex){return {name,city,appearance:defaultAppearance(city),storyFlags:{},bornTick:tick,generation:1,family:['手艺人之家','照料田园之家','往来船户之家'][familyIndex],health:85,knowledge:0,skill:0,bond:25,coins:0,pending:null,endedAt:null,encounter:null,lastEncounterTick:tick};}
export function settle(p,world){
  if(p.endedAt!==null)return null;
  const c=world.cities.find(c=>c.id===p.city),d=CITIES.find(c=>c.id===p.city),before={health:p.health,knowledge:p.knowledge,skill:p.skill,bond:p.bond,coins:p.coins};
  const activity=p.pending?.activity??'care';p.pending=null;
  const age=ageAt(p,world.tick),scarcity=c.food< c.population*.24,pressure=(scarcity?3:0)+c.pollution*2+(age>=65?1:0);
  p.health-=pressure;
  if(activity==='care'){p.health+=2;p.bond+=1;}
  if(activity==='curiosity'){p.knowledge+=1;p.bond+=.5;}
  if(activity==='study'){p.knowledge+=2+c.policies.school;p.health-=.5;}
  if(activity==='work'){p.skill+=1;p.coins+=Math.max(1,Math.floor(4+p.skill/8-(scarcity?2:0)));p.health-=1;}
  
  for(const key of ['health','knowledge','skill','bond'])p[key]=Math.round(Math.max(0,Math.min(100,p[key]))*10)/10;
  if(age>=90||p.health<=0)p.endedAt=world.tick;
  const context=`${d.name}本季${scarcity?'粮食紧张':'粮食尚足'}，生态 ${Math.round(c.ecology*100)}%，污染 ${Math.round(c.pollution*100)}%。`;
  const changes=Object.fromEntries(Object.keys(before).map(k=>[k,Math.round((p[k]-before[k])*10)/10]));
  return {tick:world.tick,age,activity,title:p.endedAt!==null?'这一生留在了潮声里':ACTIVITIES[activity].label,text:`${context}${activity==='work'?`你练习${d.craft}，换来 ${changes.coins} 铜。`:activity==='contribute'?'本季工程结算见下方收据。':activity==='study'?`公共学堂现有 ${c.policies.school} 级，影响本季学习收获。`:activity==='care'?'家人替你留了一碗热饭。':'海风、树影和街头的声音，成为这一季的记忆。'}`,changes};
}

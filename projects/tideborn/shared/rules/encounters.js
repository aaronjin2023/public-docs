import {CITIES} from '../../src/world-data.js';
import {ageAt} from './life.js';
import {storyArcFor,makeStory} from './stories.js';
export const SEASON_MS=60*60*1000;
export const CHOICE_WINDOW_MS=5*60*1000;
export function encounterFor(p,w,now,first=false){
  const c=w.cities.find(c=>c.id===p.city),city=CITIES.find(c=>c.id===p.city),age=ageAt(p,w.tick);
  let e;const arc=first?null:storyArcFor(p,w,age);
  if(first)e={kind:'gift',title:'第一份降生礼',reason:`${city.name}的家人凑出 20 铜，作为你来到群岛的第一份礼物。`,options:[{id:'keep',label:'留下赠礼',detail:'个人积蓄 +20 铜，留给以后的生活。'},{id:'grove',label:'与岛屿一起长大',detail:'把 20 铜赠礼投入故乡共有林工程；资金凑足 75 铜时，岛上出现一级共有林。'}],fallback:'超时后赠礼由家人代为保管，积蓄 +20 铜，不自动捐出。'};
  else if(arc)e=arc;
  else if(c.food<c.population*.24)e={kind:'scarcity',title:'粮仓前的长队',reason:`${city.name}现有粮食不足一季基本用量。照料你的家庭正在重新安排日常开支。`,options:[{id:'supply',label:'买一份补给',detail:'支出 3 铜，体力 +6。',cost:3},{id:'rest',label:'留在家中休养',detail:'不花钱，体力 +2。'}],fallback:'超时维持原有生活安排，不自动花费积蓄。'};
  else if(age>=6)e={kind:'mentor',title:'街角的一次邀请',reason:`${city.name}的${city.craft}作坊愿意接待你；城里的读书人也留下了一个位置。`,options:[{id:'books',label:'跟着读书人',detail:'见识 +4，体力 −2。'},{id:'craft',label:'走进作坊',detail:'手艺 +3，情谊 +1。'}],fallback:'超时错过这次邀请，保留现有状态；未来仍有新际遇。'};
  else e={kind:'gathering',title:'潮声里的小聚',reason:`这一年，${city.name}的家人带你听城里人讲${city.species}的故事。`,options:[{id:'listen',label:'听完这个故事',detail:'见识 +1，情谊 +2。'},{id:'rest',label:'让家人带你回家',detail:'体力 +3。'}],fallback:'超时由家人继续日常照料，不改变人生安排。'};
  return {...e,story:makeStory(e.kind,p,w),id:`${p.bornTick}:${w.tick}:${e.kind}`,openedTick:w.tick,openedAt:now,expiresAt:now+CHOICE_WINDOW_MS};
}

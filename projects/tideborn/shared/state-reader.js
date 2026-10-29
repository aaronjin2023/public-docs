import {STATE_SCHEMA,unpackWorld,unpackPerson,unpackSpirits,unpackProjects,unpackStories,personChoices} from './state-codec.js';

export function createStateReader({api,read,identity}){
  let owner=identity();
  return async({resources,signal})=>{
    const id=identity(),previous=id===owner?read():null,data={},wanted=new Set(resources);
    if(!id)for(const key of ['person','spirits','encounter','journal','ancestors','projects'])wanted.delete(key);
    if(!previous?.world)wanted.add('world');
    const route=key=>key==='world'||key==='person'||key==='spirits'||key==='stories'||key==='competition'?`/api/state/${key}`:`/api/${key}`;
    await Promise.all([...wanted].filter(k=>k!=='projects').map(async key=>{data[key]=await api(route(key),undefined,signal);}));
    for(const value of Object.values(data))if(value?.schema!==undefined&&value.schema!==STATE_SCHEMA)throw new Error('世界版本已更新，请刷新页面');
    // A season may cross between the two HTTP reads. Repair just those two resources.
    if(data.person&&(data.world?.tick??previous?.tick)!==data.person.tick){data.world=await api('/api/state/world',undefined,signal);if(data.person.tick!==data.world.tick)data.person=await api('/api/state/person',undefined,signal);if(data.person.tick!==data.world.tick)throw new Error('换季同步中，请稍后重试');}
    const next={person:null,projects:[],journal:[],ancestors:[],storyBook:[],spirits:{owned:[],wild:[],actions:{},maxOwned:6},competition:null,...previous};
    if(data.world){Object.assign(next,unpackWorld(data.world));next.world.events=previous?.world.events??[];}
    if(data.person){
      next.person=unpackPerson(data.person.person);next.journalSeq=data.person.journalSeq;next.memorySeq=data.person.memorySeq;next.battleSeq=data.person.battleSeq;
      if(next.person?.encounter&&next.person.encounter.id===previous?.person?.encounter?.id&&!previous.person.encounter.summary)next.person.encounter=previous.person.encounter;
      if(next.person&&next.battleSeq)next.person.lastSpiritBattle={reference:next.battleSeq};
    }
    if('encounter' in data&&next.person&&data.encounter?.id===next.person.encounter?.id)next.person={...next.person,encounter:data.encounter};
    if(wanted.has('projects')&&next.person)data.projects=await api(`/api/state/projects?city=${encodeURIComponent(next.person.city)}`,undefined,signal);
    if(data.projects)next.projects=unpackProjects(data.projects,next.world);
    if(data.spirits)next.spirits=unpackSpirits(data.spirits,next.person,next.elements);
    if(data.stories){const result=unpackStories(data.stories,next.person,next.world);next.storyBook=result.storyBook;if(next.person)next.person={...next.person,storyLegacy:result.storyLegacy};}
    if(data.competition){next.competition=data.competition.competition;next.tournamentEntry=data.competition.tournamentEntry;}
    if(data.journal)next.journal=data.journal;
    if(data.ancestors)next.ancestors=data.ancestors;
    if(data.history)next.world={...next.world,events:data.history};
    next.choices=personChoices(next.person,next.tick);
    const serverNow=Math.max(...Object.values(data).map(v=>v?.serverNow??0));
    if(!serverNow)throw new Error('服务端时间缺失');
    owner=id;
    return {serverNow,changes:next};
  };
}

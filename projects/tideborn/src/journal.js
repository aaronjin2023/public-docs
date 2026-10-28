import {CITIES,LANDMARKS} from './world-data.js';

export const JOURNAL_FILTERS=[['all','全部'],['world','世界的变化'],['choice','你的选择'],['council','自治议事'],['discovery','旅行札记'],['legacy','世代与旧约']];

export function journalSelection(state,filter='all',cityId='all'){
  if(!JOURNAL_FILTERS.some(([id])=>id===filter))filter='all';
  const city=CITIES.find(c=>c.id===cityId)??null;
  const events=state.events.filter(e=>{
    if(city&&e.city!==city.id&&!(e.kind==='migration'&&e.destination===city.id))return false;
    if(filter==='choice'||filter==='discovery'||filter==='council')return e.kind===filter;
    return filter!=='world'||(e.kind!=='choice'&&e.kind!=='discovery');
  });
  const places=filter==='discovery'&&!city?LANDMARKS.filter(l=>state.discoveries.includes(l.id)):[];
  return {filter,city,events,places,oldestTick:state.events.length?Math.min(...state.events.map(e=>e.tick)):null};
}

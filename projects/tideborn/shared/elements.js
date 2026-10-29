import {formOf} from './evolution-data.js';
export const ELEMENTS = [
  {id:'water',name:'潮灵',element:'水',color:'#70b8ce',land:'水洼与湿润浅谷',beats:'fire',attack:10,guard:6},
  {id:'fire',name:'烬灵',element:'火',color:'#df9771',land:'熔岩脊与赭色岩面',beats:'wood',attack:13,guard:3},
  {id:'wood',name:'芽灵',element:'木',color:'#9dbb79',land:'苔丘与新生林簇',beats:'earth',attack:9,guard:7},
  {id:'earth',name:'岩灵',element:'土',color:'#c8b184',land:'隆起的台地与石柱',beats:'wind',attack:8,guard:9},
  {id:'wind',name:'岚灵',element:'风',color:'#ded1ae',land:'起伏沙脊与风蚀石',beats:'ice',attack:12,guard:4},
  {id:'ice',name:'霜灵',element:'霜',color:'#c5dce1',land:'霜脊与结晶岩',beats:'water',attack:10,guard:7},
];
export const XP_STEPS=[0,3,9,18,30,45];
export const elementOf=id=>ELEMENTS.find(e=>e.id===id);
export const levelOf=xp=>XP_STEPS.filter(n=>xp>=n).length;
export const forceOf=xp=>[2,7,15,26,40,58][levelOf(xp)-1];
export const spiritForce=s=>forceOf(s.xp)+(formOf(s)?.force??0);
export const spiritStats=s=>{const e=elementOf(s.element),level=levelOf(s.xp),f=formOf(s);return {maxHP:36+level*12+(f?.hp??0),attack:e.attack+level*3+(f?.attack??0),guard:e.guard+level*2+(f?.guard??0)};};
export const spiritName=s=>`${formOf(s)?.name??elementOf(s.element).name} · ${s.id.split('-')[1]}`;
export function spiritSVG(id,form='base'){
  const e=elementOf(id)??ELEMENTS[0];
  const f=formOf({element:e.id,form}),keeper=f?.path==='keeper';
  const halo=f?`<g fill="none" stroke="${e.color}" stroke-width="${f.tier===2?2.5:1.5}">${keeper?'<ellipse cx="32" cy="38" rx="28" ry="19"/><path d="M5 32 11 20M59 32 53 20"/>':'<path d="m17 32-14-9 5 19 11 7m28-17 14-9-5 19-11 7"/>'}${f.tier===2?'<path d="m20 14 1-10 11 6 11-6 1 10"/>':''}</g>`:'';
  const shapes={water:'M30 6C26 17 12 27 14 39a16 16 0 0 0 32 0C47 27 36 16 30 6Z',fire:'M29 5c9 9 2 13 10 18l5-8c17 27 2 42-14 42S3 41 15 23l4 8c7-6 1-15 10-26Z',wood:'M30 58C1 41 6 13 14 7c13 1 20 9 16 23C32 11 43 6 53 7c3 25-1 42-23 51Z',earth:'m30 7 20 12 4 25-23 13L9 46 7 22Z',wind:'M4 32c8-25 32-30 47-15-20-5-25 9-14 12 20 6 21 20 5 27 6-10-2-14-15-14C8 42 10 30 18 25Z',ice:'m30 4 13 12-5 10 16 7-2 16-20-3-14 11-12-13 12-17-1-14Z'};
  return `<svg class="spirit-avatar" viewBox="0 0 64 64" aria-hidden="true">${halo}<g transform="${f?'translate(6 6) scale(.8)':''}"><path d="${shapes[e.id]}" fill="${e.color}"/><circle cx="25" cy="35" r="2" fill="#203c3d"/><circle cx="37" cy="35" r="2" fill="#203c3d"/><path d="M27 43q4 3 8 0" fill="none" stroke="#203c3d" stroke-width="1.5"/></g></svg>`;
}

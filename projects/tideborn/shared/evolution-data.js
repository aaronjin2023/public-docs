// Forms are cumulative bonuses, never extra individuals or a change of element.
const names={
  water:['泉铃','归海守望','逐浪','破潮行者','以泉环接住潮声，留下更深的水脉。','让水滴拉成长鳍，在浪尖留下回声。'],
  fire:['炉心','长明守望','流焰','赤曜行者','围起炉壁，把火种留给寒夜。','火冠向前舒展，带着明亮的尾焰。'],
  wood:['苔芽','古树守望','荆芽','青棘行者','枝叶合拢成荫，根须向原野延伸。','细枝化成棘冠，守住每一道生长的缝隙。'],
  earth:['叠岩','山岳守望','砾锋','震岳行者','层层岩甲围成台地，稳住岛的脊梁。','岩角向前成锋，步履带起碎石。'],
  wind:['息羽','天穹守望','疾羽','长空行者','羽环收拢流风，让风声缓缓回旋。','双翼展开成疾流，穿过迎面的风。'],
  ice:['凝露','永霜守望','霜刃','极光行者','霜环封存露水，结晶层层生长。','冰晶化为长棱，映出远行的光。'],
};
export const EVOLUTION_TREES=Object.entries(names).map(([element,n])=>({element,nodes:[
  {id:`${element}-keeper`,parent:'base',name:n[0],tier:1,path:'keeper',cost:3,level:3,care:3,force:6,hp:12,attack:1,guard:3,description:n[4]},
  {id:`${element}-warden`,parent:`${element}-keeper`,name:n[1],tier:2,path:'keeper',cost:8,level:5,care:6,share:.25,force:16,hp:28,attack:2,guard:7,description:n[4]},
  {id:`${element}-runner`,parent:'base',name:n[2],tier:1,path:'runner',cost:3,level:3,battles:2,force:3,hp:4,attack:5,guard:1,description:n[5]},
  {id:`${element}-ranger`,parent:`${element}-runner`,name:n[3],tier:2,path:'runner',cost:8,level:5,battles:5,trial:true,force:8,hp:10,attack:11,guard:2,description:n[5]},
]}));
export const treeOf=element=>EVOLUTION_TREES.find(t=>t.element===element);
export const formOf=u=>treeOf(u.element)?.nodes.find(n=>n.id===u.form)??null;
export const growthOf=u=>u.growth??{care:0,battles:0,opponents:{}};

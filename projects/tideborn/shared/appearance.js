// One finite catalogue shared by server validation, portraits and the 3D cast.
export const OUTFITS=[
  {id:'sail',name:'海盐旅装',color:'#829da5',trim:'#e4dfcb',detail:'短外衣、斜挎包，适合往来海岸。'},
  {id:'kiln',name:'窑火围裙',color:'#a87351',trim:'#d2be91',detail:'厚围裙和卷袖，衣角留着工坊的颜色。'},
  {id:'grove',name:'林织斗篷',color:'#668574',trim:'#d7d6ad',detail:'覆肩短披风，苔色布料接住林间的光。'},
  {id:'star',name:'观星长衫',color:'#667486',trim:'#e0d8b5',detail:'长衣与细腰带，随身带着折叠笔记。'},
  {id:'reed',name:'苇田短褂',color:'#b3a56e',trim:'#e6dbc1',detail:'宽短褂与束脚裤，方便穿过田埂。'},
  {id:'wind',name:'信风披肩',color:'#b5847c',trim:'#e8d4b5',detail:'不对称披肩与系绳，随海风轻轻展开。'}
];
export const HAIRS=[{id:'crop',name:'短发'},{id:'bob',name:'齐耳发'},{id:'knot',name:'束髻'},{id:'braid',name:'长辫'}];
export const TONES=[{id:'shell',name:'浅贝',color:'#e4bca0'},{id:'sand',name:'暖砂',color:'#c99572'},{id:'clay',name:'赤陶',color:'#9c684e'},{id:'earth',name:'深土',color:'#654639'}];
const hometown={haven:'sail',ember:'kiln',moss:'grove',spire:'star',reed:'reed',wind:'wind'};
export const defaultAppearance=city=>({outfit:hometown[city]??'sail',hair:'crop',tone:'sand'});
export function validAppearance(a){return !!a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).length===3&&OUTFITS.some(x=>x.id===a.outfit)&&HAIRS.some(x=>x.id===a.hair)&&TONES.some(x=>x.id===a.tone);}
export function appearanceOf(a,city){return validAppearance(a)?{outfit:a.outfit,hair:a.hair,tone:a.tone}:defaultAppearance(city);}
export function lookParts(a,city){a=appearanceOf(a,city);return {look:a,outfit:OUTFITS.find(x=>x.id===a.outfit),skin:TONES.find(x=>x.id===a.tone).color};}
export function portraitSVG(a,city){const {look,outfit,skin}=lookParts(a,city);return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="${outfit.color}" d="M16 120V87Q20 68 50 68T84 87V120Z"/><path fill="${outfit.trim}" d="m33 73 17 16 17-16-10 25H43Z"/><path fill="#30302c" d="M26 37Q25 7 50 9T75 38V68H26Z"/><ellipse cx="50" cy="44" rx="22" ry="28" fill="${skin}"/><path fill="#30302c" d="M27 38Q23 10 49 10Q77 8 74 41L61 23Q44 37 27 38Z"/>${look.hair==='knot'?'<circle cx="52" cy="10" r="10" fill="#30302c"/>':look.hair==='braid'?'<path d="M72 48Q86 74 67 95" stroke="#30302c" stroke-width="10" fill="none"/>':look.hair==='bob'?'<path d="M29 30 24 68 35 68M70 28 77 68 66 68" fill="#30302c"/>':''}<circle cx="42" cy="44" r="1.8" fill="#292c29"/><circle cx="59" cy="44" r="1.8" fill="#292c29"/><path d="M46 58q4 3 9-1" stroke="#704e43" stroke-width="1.5" fill="none"/></svg>`;}

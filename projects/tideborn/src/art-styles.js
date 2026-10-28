export const ART_STYLE_KEY='tideborn-art-style-v1';
export const ART_STYLES=[
  {id:'original',name:'原貌',group:'原貌',mode:0,colors:['#19535c','#719c76','#ded3ad'],description:'回到潮生原本的材质、光照与水色。'},
  {id:'monet',name:'莫奈 · 光雾',group:'绘画',mode:1,colors:['#8faeb7','#b4bd94','#e5c7b5'],description:'碎色短笔、柔化边缘，让海岸融进一层薄光。'},
  {id:'vangogh',name:'梵高 · 旋笔',group:'绘画',mode:2,colors:['#244e89','#e4b944','#73a078'],description:'蓝与金相对，成簇的方向笔触沿着海与山旋转。'},
  {id:'hokusai',name:'北斋 · 木刻',group:'绘画',mode:3,colors:['#213f60','#94b9bb','#e6d7b1'],description:'靛蓝海面、米色纸底与刻线，压成有限的印色。'},
  {id:'nizan',name:'倪瓒 · 淡墨',group:'绘画',mode:4,colors:['#36423a','#a5aaa0','#eee9d8'],description:'水面留白，山石积墨，干笔细痕保留城镇轮廓。'},
  {id:'seurat',name:'修拉 · 点彩',group:'绘画',mode:5,colors:['#4c8caa','#e7bd66','#ad8caa'],description:'用密集的独立色点并置成景，近看是点，远看成光。'},
  {id:'manga',name:'黑白网点',group:'漫画',mode:6,colors:['#222326','#8c8b85','#f5f0e3'],description:'黑白分阶、轮廓墨线与规则网点，像翻开一页连载。'},
  {id:'cel',name:'赛璐璐',group:'漫画',mode:7,colors:['#24699a','#63ae79','#ffd38c'],description:'清晰阴影分界与饱满的平涂色，保留明亮的海岛气息。'},
  {id:'ligne',name:'清线冒险',group:'漫画',mode:8,colors:['#78b8ca','#bbcc8d','#f3d6a1'],description:'均匀细线、明净浅色，让街巷与屋顶像手绘旅行页。'},
  {id:'retro',name:'复古美漫',group:'漫画',mode:9,colors:['#d75749','#277f9b','#e7bc4e'],description:'旧纸、彩色网屏与轻微套色偏移，留下印刷的颗粒。'},
  {id:'noir',name:'黑色漫画',group:'漫画',mode:10,colors:['#101b23','#657273','#e8ddbf'],description:'大块暗部、交叉排线与少量冷色，灯火从黑暗里浮现。'},
];
export function artStyle(id){return ART_STYLES.find(style=>style.id===id)??ART_STYLES[0];}
export function artApplies(id,layer){return artStyle(id).mode!==0&&layer==='terrain';}
export function loadArtStyle(storage){try{return artStyle(storage.getItem(ART_STYLE_KEY)).id;}catch{return 'original';}}

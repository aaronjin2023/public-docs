export const MUSIC_KEY='tideborn-music-v1';
export const MUSIC_STYLES=[
  {id:'ambient',name:'潮声原貌',detail:'稀疏潮音与海风，让群岛在留白中呼吸。'},
  {id:'bach',name:'巴赫 · 织潮',detail:'拨弦键盘，两条声部交错，低音稳步行走。'},
  {id:'mozart',name:'莫扎特 · 晴帆',detail:'明亮键音，分解伴奏与轻盈的问答乐句。'},
  {id:'debussy',name:'德彪西 · 水光',detail:'柔和钟音、宽阔和声与游移的全音色彩。'},
  {id:'satie',name:'萨蒂 · 岛上慢步',detail:'疏朗三拍，低音与和弦之间留出呼吸。'},
  {id:'chopin',name:'肖邦 · 湾岸夜曲',detail:'柔键琶音，略有伸缩的旋律与小调回环。'},
];
export const musicStyle=id=>MUSIC_STYLES.find(s=>s.id===id)??MUSIC_STYLES[0];
export const musicVolume=value=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):.65;
export function loadMusic(storage){
  try{const value=JSON.parse(storage.getItem(MUSIC_KEY));return {style:musicStyle(value?.style).id,volume:musicVolume(value?.volume)};}
  catch{return {style:'ambient',volume:.65};}
}

// Original short scores; these borrow musical devices without quoting a composer's work.
export function scoreBar(id,bar,light='day'){
  const style=musicStyle(id).id,b=bar%8,verse=Math.floor(bar/8)%4;
  const notes=[],shift=light==='night'?-12:0;
  let bpm=72,beats=4;
  const add=(beat,duration,midi,voice='keys',velocity=.13,pan=0)=>notes.push({beat,duration,midi:midi+shift,voice,velocity,pan});
  const harmony=[[48,52,55,59],[45,48,52,55],[53,57,60,64],[55,59,62,65],[52,55,59,62],[57,60,64,67],[50,53,57,60],[55,59,62,65]][b];
  if(style==='ambient'){
    bpm=60;beats=8.5;
    const tones=[0,7,12,16,19,24,19,16,12,7];
    for(let i=0;i<3;i++)add(i*1.6,6,48+tones[(bar*2+i)%10]+(i===1?12:0),'bell',.10,(i-1)*.35);
  }else if(style==='bach'){
    bpm=84;
    const major=[0,2,4,5,7,9,11,12,14,16];
    const motifs=[[0,2,1,3,2,4,3,2],[4,3,5,4,2,3,1,0],[2,4,5,3,4,2,1,3],[5,4,2,3,1,2,4,3]];
    const motif=motifs[(b+verse)%4];
    for(let i=0;i<8;i++)add(i/2,.43,60+major[motif[i]+(b%2)],'pluck',.12,i%2?.2:-.2);
    for(let i=0;i<4;i++){
      add(i,.88,harmony[[0,2,1,2][i]],'pluck',.12,-.35);
      if(i!==1)add(i+.25,.68,harmony[(3-i+verse)%4]+12,'reed',.055,.4);
    }
  }else if(style==='mozart'){
    bpm=94;
    for(let i=0;i<8;i++)add(i*.5,.46,harmony[[0,2,1,2][i%4]],'keys',.085,-.35);
    const motif=[[0,1,2,1],[2,3,2,0],[1,2,3,2],[3,2,1,0]][(b+verse)%4];
    for(let i=0;i<4;i++)add(i,i===3?.65:.8,harmony[motif[i]]+24,'keys',i===0?.17:.135,.3);
    if(b%2===0)add(3.5,.35,harmony[1]+24,'keys',.10,.3);
  }else if(style==='debussy'){
    bpm=50;beats=6;
    const roots=[48,50,53,51,55,53,50,55],root=roots[b];
    const intervals=b%2?[0,4,8,10,14]:[0,4,7,11,14];
    for(let i=0;i<5;i++)add(i*.9,3.3,root+intervals[(i+verse)%5]+12,'felt',.09,(i-2)*.18);
    add(0,5.7,root-12,'felt',.14,-.2);
    add(1.2,2.8,root+24+[2,6,10,4][(b+verse)%4],'bell',.075,.4);
    if(b%2===0)add(4.4,2.8,root+24+[8,4,2,6][verse],'bell',.065,-.4);
  }else if(style==='satie'){
    bpm=58;beats=3;
    add(0,2.7,harmony[0]-12,'felt',.16,-.25);
    for(const at of [1,2])for(const pitch of harmony.slice(1))add(at,.95,pitch+12,'felt',.052,.15);
    if(b%4!==3)add(b%2?.4:0,2.5,harmony[(b+verse)%4]+24,'felt',.11,.3);
  }else if(style==='chopin'){
    bpm=66;beats=3;
    const root=[45,50,52,45,53,50,52,45][b];
    const chord=[root,root+3,root+7,root+10];
    for(let i=0;i<6;i++)add(i*.5,.73,chord[[0,2,1,3,2,1][i]]+(i?12:0),'felt',i?.075:.15,-.3);
    const contour=[[3,2,1,2],[2,3,2,0],[1,2,3,1],[2,1,0,1]][(b+verse)%4];
    const at=[0,.84,1.83,2.48];
    for(let i=0;i<4;i++)add(at[i],i===3?.42:.85,chord[contour[i]]+24,'keys',i===0?.14:.11,.3);
  }
  if(light==='dusk')bpm*=.96;
  return {style,bpm,beats,notes};
}

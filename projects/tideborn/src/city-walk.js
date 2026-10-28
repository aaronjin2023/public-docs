import {CITIES,SEASONS} from './world-data.js';
import {elevation} from './terrain.js';
import {HARBOURS} from './harbour-scene.js';

export const WALKS={
  haven:[['潮钟码头','木板上叠着深浅不同的盐痕。船钟没有规定谁先回家，只规定最后回来的人也要有一个座位。'],['弧街的屋檐','旧潮线弯到这里，屋檐便跟着弯了一次。有人把晾网的绳结留得很松，给下一次涨潮多让一点地方。'],['共用灯塔','三家造船行共用一座塔。塔下的摊棚各有主人，塔顶的光却没有为谁单独转向。']],
  ember:[['黑砂卸货岸','陶器落在木板上的声音，比矿石轻。岸边的人用旧帆把两种货分开，也把同一座山带来的两种生活分开。'],['窑工的回家路','短街沿着山脚绕开陡坡。这里的屋子先有炉火，后来才有矿道；门前那只杯子仍然先为喝水而烧。'],['三座老陶窑','三个窑口并排朝向街道。面包与陶土曾分享同一炉余热；一件器皿烧成以后，守窑的人还会听很久的冷却声。']],
  moss:[['落木小埠','岸上的木头保留着弯曲。修船的人先问它从哪段水道来，再决定把哪一面留给海水。'],['根间岔路','房屋分成几簇，路在它们之间留下弯。认门的人记住的是树根和屋檐，地图上的直线反而最容易让人走错。'],['种子厅的遮廊','檐下有足够的地方让湿衣服慢慢干。借种的人坐在同一条廊下，谈今年要种什么，也谈谁愿意把种子带回来。']],
  spire:[['片岩码头','从船上下来，要先抬头看一段山坡。运粮人和送星表的人走同一条上山路，纸上的远方在这里有了重量。'],['阶街转折','白墙沿高地退成几排。走到这一阶，塔顶暂时被屋檐挡住；再向前一点，它又回来，像一个还没写完的答案。'],['旧瞭望台上的透镜','铜色的观测顶替换了旧炮口。台阶向街道敞开，来校正刻度的人，也会带着今年田里的问题。']],
  reed:[['苇舟粮埠','粮架沿码头分成小格。装船的人知道一座仓可以很满，一张远方的饭桌却仍然空着；两者之间还隔着水路和次序。'],['两岸长街','水道把街分成两边，桥又把两边接回来。住得近的人未必先得到水，住在最远一块田边的人也要能走来议事。'],['高脚粮仓','粮仓把地板抬离湿地。水轮在旁边转，仓门上的刻度却只在真正收进或取出粮食后改变。']],
  wind:[['等风的岸边','系船的绳子比行李留下得更久。离开的人把另一种口音带上海，回来的人仍能认出这块补水的岸。'],['斜向风的街','街道斜着迎风，厚墙把短短的阴影留在门边。补帆的人在这里交换针线，也交换一个不必翻译的停顿。'],['风车与集雾帆','三面帆站在风车背后。最早停在这里的是一位修风车的乐师；后来人把修补工具留下，才把这个补水点叫作家。']],
};
const keys=['shore','lane','heart'];

export function walkStops(city,layout,port){
  const candidates=layout.paths.flat().filter(([x,z])=>elevation(x,z)>2&&Math.hypot(x-city.x,z-city.z)>5);
  candidates.sort((a,b)=>Math.abs(Math.hypot(a[0]-city.x,a[1]-city.z)-9)-Math.abs(Math.hypot(b[0]-city.x,b[1]-city.z)-9));
  const [x,z]=candidates[0];
  const height={haven:4,ember:1.5,moss:2,spire:4,reed:2,wind:3}[city.id];
  const points=[
    {x:port.x+Math.sin(port.angle)*2,y:1.3,z:port.z+Math.cos(port.angle)*2,distance:26,polar:.72,azimuth:port.angle+.68},
    {x,y:elevation(x,z)+1,z,distance:27,polar:.82,azimuth:.68},
    {x:city.x,y:elevation(city.x,city.z)+height,z:city.z,distance:city.id==='spire'?26:23,polar:.9,azimuth:.68},
  ];
  return points.map((p,i)=>({...p,key:keys[i],title:WALKS[city.id][i][0]}));
}

export function walkReading(state,cityId,index){
  const c=state.cities.find(c=>c.id===cityId),meta=CITIES.find(c=>c.id===cityId),place=WALKS[cityId]?.[index];
  if(!c||!place)return null;
  const seasons=c.food/(c.population*.24),amount=n=>n>0&&n<.1?'不足 0.1':n.toLocaleString('zh-CN',{maximumFractionDigits:1});
  let reading;
  if(index===0)reading=state.tick?`本季${c.trade>0?`运入 ${amount(c.trade)} 份粮`:c.trade<0?`运出 ${amount(-c.trade)} 份粮`:'没有岛间调粮'}；粮架对应当前 ${seasons.toFixed(1)} 季用量。港口扩建 ${c.policies.port} 级。`:`首份航单尚未形成。现在的粮仓有 ${seasons.toFixed(1)} 季用量，来自你抵达前的生活。`;
  else if(index===1)reading=`${c.population.toLocaleString('zh-CN')} 位居民生活在${meta.name}。${c.migration>0?`本季净迁入 ${c.migration} 人。`:c.migration<0?`本季净迁出 ${-c.migration} 人。`:'本季净迁居为 0。'}${seasons<1?'粮仓不足一季，街区还在等待收成与下一次调配。':`粮仓约有 ${seasons.toFixed(1)} 季用量；这仍是全城的存量，不是每户相同的分配。`}`;
  else reading={
    haven:`此刻互信 ${(c.trust*100).toFixed(1)}%。灯塔是城市原有的公共建筑；新增港口和居民旧约另有自己的代价。`,
    ember:`累积污染 ${(c.pollution*100).toFixed(1)}%，常规矿炉 ${c.policies.mine} 级。眼前三座老陶窑是城市原有工坊，不计作后来增开的矿炉。`,
    moss:`生态 ${(c.ecology*100).toFixed(1)}%。${c.ecology<.5?'林冠变疏，遮廊旁的空隙变得更明显。':'树冠仍随生态读数生长，种子厅不是一份可以卖掉的林木库存。'}`,
    spire:`公共知识 ${c.knowledge.toFixed(1)}，学堂 ${c.policies.school} 级。观测塔是建城时已有的地方，知识与教学投入在往后的季节里继续积累。`,
    reed:`全城粮仓 ${seasons.toFixed(1)} 季用量，生态 ${(c.ecology*100).toFixed(1)}%。仓中有粮不代表能在同一季送到每一座岛，港口和留粮约定仍在起作用。`,
    wind:`本季气候情景为${{temperate:'常态',dry:'持续少雨',wet:'丰雨年代'}[state.climate]}，蓄水渠 ${c.policies.water} 级。集雾帆与风车是城市的原有生活设施；没有另算一套逐滴集水产量。`,
  }[cityId];
  return {key:keys[index],title:place[0],setting:place[1]+(index===0?HARBOURS[cityId]:''),season:SEASONS[state.tick%4],reading};
}

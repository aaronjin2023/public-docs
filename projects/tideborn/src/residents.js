import {CITIES} from './world-data.js';

// Original fiction. These disagreements apply the library's attention to distribution and lived consequences.
export const PETITIONS=[
  {id:'haven-shore',city:'haven',opens:1,title:'浅湾最后一段岸线',
    voices:[['岑舟 · 制图师','共用渡船若有自己的泊位，没船的人也能准时去邻岛。'],['桑婆 · 渔户','鱼卵只在这段浅湾里过冬。海图上空着的地方，并不空。']],
    options:[
      {id:'ferry',trace:'共用渡口的候船棚与长凳',label:'修共用渡口',cost:'60 铜 · 占用部分浅湾',effects:{wealth:-60,ecology:-.025,trust:.04},rules:{income:1.5,ecologyRate:-.0004},detail:'即时：生态 −2.5、互信 +4 个百分点；此后每季收入 +1.5 铜、生态 −0.04 个百分点。',aftermath:'渡船开始按钟点停靠。岑舟第一次在图上画出公共班次；桑婆把渔网移到更远的海湾。有人少走了一段路，有人每天要多划一段水。'},
      {id:'nursery',trace:'浅湾禁泊木标、浮标与鱼群',label:'留下鱼苗浅湾',cost:'本季让出渡口工程',effects:{ecology:.035,trust:-.015},rules:{income:-.5,ecologyRate:.0005},detail:'即时：生态 +3.5、互信 −1.5 个百分点；此后每季收入 −0.5 铜、生态 +0.05 个百分点。',aftermath:'浅湾插上了禁泊的木标。鱼群有了回旋的水面，跨岛学徒仍在等私人船主的空位。岑舟开始记录每一次没有搭上船的人。'}]},
  {id:'ember-kiln',city:'ember',opens:2,title:'窑火之后的水',
    voices:[['陶砚 · 窑火守望人','灰可以回收。只是要先停下一组炉子，付清改造的钱。'],['季锤 · 年轻炉工','学徒按件领工钱。清水要等，家里的米不能等。']],
    options:[
      {id:'filter',trace:'一深一浅的回灰沉淀池与连渠',label:'改造回灰窑',cost:'90 铜',effects:{wealth:-90,pollution:-.05,knowledge:4},rules:{pollutionRate:-.0025,income:-1},detail:'即时：污染 −5 个百分点、知识 +4；此后每季污染增量 −0.25 个百分点、收入 −1 铜。',aftermath:'回灰槽装好了，陶砚把第一杯澄清的水放在窑口。工时缩短的学徒开始轮班，洗净的河岸没有替他们补回所有工钱。'},
      {id:'orders',trace:'装货吊架与待运铜箱',label:'先完成外海订单',cost:'收到预付 60 铜',effects:{wealth:60,trust:-.025},rules:{income:2,pollutionRate:.001},detail:'即时：收入 60 铜、互信 −2.5 个百分点；此后每季收入 +2 铜、污染增量 +0.1 个百分点。',aftermath:'新订单装满了货船，季锤给家里添了一只米缸。陶砚在河边刻下第二道灰线；它比上一道更远，工坊的收入也更难离开这条河。'}]},
  {id:'moss-seeds',city:'moss',opens:3,title:'最后一篮种子',
    voices:[['禾音 · 种子保管人','有些种子要等许多年才用得上。卖掉之后，丰年也买不回。'],['罗枝 · 教习','孩子不能每年都等明年。卖一片林木，就能留下全年授课的人。']],
    options:[
      {id:'commons',trace:'绳界内的种子苗床',label:'保留种子共有地',cost:'55 铜 · 35 份粮食',effects:{wealth:-55,food:-35,trust:.04},rules:{ecologyRate:.0007},detail:'即时：互信 +4 个百分点；此后每季生态额外恢复 0.07 个百分点。',aftermath:'共有地的绳界重新系好，禾音把种子借给了三户新来的人。罗枝仍在树下上课，雨大的日子，孩子们只好把字写在各自家门口。'},
      {id:'timber',trace:'树桩旁的全年课堂与黑板',label:'用林木换全年课堂',cost:'得到 80 铜 · 砍伐一片林地',effects:{wealth:80,ecology:-.05,knowledge:5},rules:{knowledgeRate:.04},detail:'即时：收入 80 铜、生态 −5 个百分点、知识 +5；此后每季知识积累 +0.04。',aftermath:'罗枝终于留过了静冬，孩子们写出了第一本林名册。禾音在名册里圈起已经倒下的树；他们学会了它们的名字，却再也不能在树下相认。'}]},
  {id:'spire-calendar',city:'spire',opens:4,title:'星表送到谁手里',
    voices:[['闻星 · 历法修订者','把误差和原始观测一起公开，各岛才知道什么时候不能相信我们。'],['石粟 · 山下农户','我只想知道哪一天播种。先把今年过完，再谈百年的星空。']],
    options:[
      {id:'open',trace:'公开星表板与观测环',label:'公开完整观测与误差',cost:'70 铜',effects:{wealth:-70,knowledge:6,trust:.02},rules:{knowledgeRate:.07},detail:'即时：知识 +6、互信 +2 个百分点；此后每季知识积累 +0.07。',aftermath:'各岛送来了自己的水位记录，有人据此指出白塔的一处计算失误。闻星把批评刻在旧刻度旁；山下的粮车依旧要赶在这一季的雨前。'},
      {id:'fields',trace:'农时册挂架与种子试验台',label:'先编今年的农时册',cost:'40 铜 · 获得 120 份当季粮食',effects:{wealth:-40,food:120,trust:.04},rules:{productionMultiplier:.02},detail:'即时：粮食 +120、互信 +4 个百分点；农时协作使此后产量 +2%。',aftermath:'农时册印在耐雨的薄片上，石粟把它挂在田边。第一季的合作收成进了公仓，闻星尚未写完的长周期误差则留在塔顶的抽屉里。'}]},
  {id:'reed-water',city:'reed',opens:5,title:'谁先打开水门',
    voices:[['陆苇 · 水门议事员','低田也是家。留一道活水口，长潮时让河和湿地一起呼吸。'],['田衡 · 粮仓管事','六岛都在等我们的粮。再淹一次，缺粮的人不会只在这里。']],
    options:[
      {id:'levee',trace:'河口连续加固的堤线',label:'加固主粮田的堤线',cost:'80 铜',effects:{wealth:-80,ecology:-.025},rules:{floodResistance:.12},detail:'即时：生态 −2.5 个百分点；高水位时的产量系数由 84% 提至 96%。',aftermath:'新堤挡住了漫过粮田的水。田衡在仓门添上新刻度，陆苇却要绕更远的路去见河口渔户；曾经通到湿地的小口子已经封住。'},
      {id:'floodplain',trace:'堤线保留的分洪口与新生芦苇',label:'为湿地保留分洪口',cost:'50 铜 · 50 份粮食',effects:{wealth:-50,food:-50,ecology:.05},rules:{ecologyRate:.0008},detail:'即时：生态 +5 个百分点；此后每季额外恢复 0.08 个百分点，长潮减产仍保留。',aftermath:'分洪口留在堤线上，苇鹭重新走进浅水。仓里却少了原本可以囤下的一部分粮；田衡开始同邻岛商量互相借粮的年份。'}]},
  {id:'wind-arrivals',city:'wind',opens:6,title:'风停时抵达的人',
    voices:[['弥沙 · 帆匠','三十六个人在海上等了一整夜。桌子可以接长，歌也可以。'],['阿朔 · 集雾网管事','网里每天只有这些水。接住他们以后，谁先少喝一杯？']],
    options:[
      {id:'settle',trace:'新居民共用的长桌与遮风棚',label:'让三十六位海上旅人定居',cost:'30 铜 · 70 份粮食',effects:{wealth:-30,food:-70,population:36,trust:-.015},rules:{income:1,knowledgeRate:.025},detail:'即时：居民 +36、互信 −1.5 个百分点；此后每季收入 +1 铜、知识积累 +0.025。',aftermath:'长桌上出现了新的口音，也多了争论水票的声音。弥沙向新邻居学会一首摇篮曲；阿朔的分水账本第一次写满了第二页。'},
      {id:'provisions',trace:'港边的远航补给棚与粮罐',label:'供给粮食，帮助他们继续远航',cost:'95 份粮食',effects:{food:-95,trust:.04},rules:{productionMultiplier:.025},detail:'即时：互信 +4 个百分点；旅人留下耐旱种植法，此后产量 +2.5%。',aftermath:'旅人留下耐旱豆的种法，带着公仓的粮离开。阿朔保住了今冬的分水份额，弥沙把没有唱完的歌记在帆背，等下一次有船归来。'}]},
  {id:'reed-reserve',city:'reed',opens:48,requires:'reed-water',title:'粮仓的刻度属于谁',
    triggerHint:'十二年后，已回应水门议题；苇原库存至少三季，另有一城不足一季时。',
    trigger:s=>{const c=s.cities.find(c=>c.id==='reed'),other=s.cities.filter(c=>c.id!=='reed').reduce((a,b)=>a.food/a.population<b.food/b.population?a:b);return c.food/(c.population*.24)>=3&&other.food/(other.population*.24)<1?`来信时，苇原粮仓约够 ${(c.food/(c.population*.24)).toFixed(1)} 季，${CITIES.find(c=>c.id===other.id).name}只够 ${(other.food/(other.population*.24)).toFixed(1)} 季。`:'';},
    voices:[['陆苇 · 水门议事员','水门已经有了答案。可同一张海图上，一边是满仓，一边是空碗；运出去多少，也该一起商量。'],['田衡 · 粮仓管事','仓里的余粮是过去几季存下的。少留一道刻度，下一次长潮来时，本地谁来兜底？']],
    options:[
      {id:'share',label:'订立共粮航约',cost:'95 铜 · 更低的本地留粮线',effects:{wealth:-95,trust:.03},rules:{reserveBuffer:-.15,tradeCapacity:35,income:-1},detail:'即时：互信 +3 个百分点；可运出线从约 2.92 季降至 2.29 季库存，本城每季运力 +35 份（长潮时仍折减），维护费每季 1 铜。接收岛运力仍可能限制输送。',aftermath:'陆苇把留粮刻度与可用船位一起公开。粮船仍受两端港口限制，约定没有使所有空碗立刻盛满。田衡把长潮前的最低库存另记一页，提醒议事会：更愿意分享，也意味着要共同承担歉年的风险。'},
      {id:'buffer',label:'先加厚本地留粮线',cost:'60 铜 · 推迟更多对外运粮',effects:{wealth:-60,trust:.04},rules:{reserveBuffer:.18},detail:'即时：互信 +4 个百分点；可运出线从约 2.92 季提高到 3.67 季库存，低于这条线的粮食留给本城。不会凭空增加粮食或扩大运力。',aftermath:'田衡把新的留粮线刻在仓门上。邻岛的船必须等更高的刻度才能装货，本地则多了一段缓冲。陆苇把那些等候的船名记在刻度旁；一座城的安心，在另一座城可能是一顿更晚的饭。'}]},
  {id:'ember-river-debt',city:'ember',opens:48,requires:'ember-kiln',title:'谁付清河岸的账',
    triggerHint:'十二年后，已回应窑火议题；烬山污染达到 12%，或生态低于 60% 时。',
    trigger:s=>{const c=s.cities.find(c=>c.id==='ember');return c.pollution>=.12||c.ecology<.6?`来信时，烬山累积污染 ${(c.pollution*100).toFixed(1)}%，生态 ${(c.ecology*100).toFixed(1)}%。过去的窑火决定没有免去新的代价。`:'';},
    voices:[['陶砚 · 窑火守望人','炉子修过，订单也做过。河岸的旧灰还在。公库吃过这份收入，能不能一起付修复的钱？'],['季锤 · 炉工代表','公库的钱也要修路和供水。让工坊轮休可以少排一些灰，但少下来的工钱会先落在我们家里。']],
    options:[
      {id:'public-repair',label:'由公库分担修复',cost:'180 铜 · 持续养护',effects:{wealth:-180,pollution:-.06,ecology:.025},rules:{pollutionRate:-.001,income:-.6},detail:'即时：污染 −6、生态 +2.5 个百分点；此后每季污染增量 −0.1 个百分点、收入 −0.6 铜。投入公库较多，但不削减原有生产收入。',aftermath:'陶砚和工坊一起清走了第一批旧灰。公库的账少了一大笔，修路的议案又等了一季。季锤仍照常上工，河边也仍有人取样；一次修复没有让往后的排放自动消失。'},
      {id:'shorter-shifts',label:'让工坊轮休减产',cost:'35 铜 · 长期收入减少',effects:{wealth:-35,pollution:-.015,trust:-.04},rules:{pollutionRate:-.003,income:-4,knowledgeRate:.025},detail:'即时：污染 −1.5、互信 −4 个百分点；此后每季污染增量 −0.3 个百分点、收入 −4 铜、知识 +0.025。节省公库支出，代价由生产与工时承担。',aftermath:'新的轮休表挂在窑门，排灰的速度慢了一些。季锤拿出少了的工钱单，要求下一轮议事讨论补偿。陶砚带着轮休的学徒整理水样；他们多了学习的时间，却没有因此少吃一顿饭。'}]},
  {id:'haven-queue',city:'haven',opens:96,requires:'haven-shore',title:'粮单的第一行',
    triggerHint:'二十四年后，已回应浅湾议题；同一季至少两城调配前空仓，其中有城收到粮食、有城没有收到。',
    trigger:s=>{const empty=s.shipments?.ports?.filter(p=>p.food===0)??[],received=id=>(s.shipments?.legs??[]).filter(l=>l.to===id).reduce((n,l)=>n+l.amount,0),served=empty.find(p=>received(p.id)>0),waiting=empty.find(p=>received(p.id)===0);return empty.length>=2&&served&&waiting?`来信时，${empty.map(p=>CITIES.find(c=>c.id===p.id).name).join('、')}调配前同为空仓。${CITIES.find(c=>c.id===served.id).name}收到 ${received(served.id).toFixed(1)} 份，${CITIES.find(c=>c.id===waiting.id).name}没有收到。完全同库存时，旧海图次序决定先后。`:'';},
    voices:[['岑舟 · 制图师','空碗不能靠改名字排到前面。同样空着的时候，能不能让第一行轮到别人？'],['许汀 · 航单登记员','靠泊、装卸和等船的人都按旧次序安排。轮换可以，但每季重写的账要有人付钱，也有人得晚一点等。']],
    options:[
      {id:'rotation',trace:'六城轮签盘与轮换记录架',label:'让同库存的城轮换在前',cost:'120 铜 · 每季登记费 1 铜',effects:{wealth:-120,trust:-.02,knowledge:2},rules:{income:-1},detail:'即时：互信 −2 个百分点、知识 +2；此后望潮湾每季支出 1 铜。下一季从旧序开始，以后每季移动一位；只轮换完全同人均库存的接粮城，名单变化时按当季名单排。更缺粮者仍优先，粮食与两端运力不增加。',aftermath:'岑舟把第一行做成可以移动的木签。有的空碗这次先等到粮，有的港口重新安排了装卸；许汀的登记费仍每季从公库支出。轮换没有扩大一条船的舱，也没有承诺下一次一定轮到同一座城。'},
      {id:'charter',trace:'公开海图城序的六枚固定航牌',label:'保留并公开旧海图次序',cost:'45 铜 · 同库存仍按原序',effects:{wealth:-45,trust:.02},rules:{},detail:'即时：互信 +2 个百分点；没有额外季度支出。接粮仍先看人均库存，完全同值时保留海图城序。靠泊安排可预先确定，排在后面的空仓仍可能连续等不到余粮。',aftermath:'六枚航牌固定在议事桌旁，许汀把次序写得让每个船主都能看见。靠泊时间容易安排了，岑舟仍在最后几行旁留下空白：公开一条规则，并没有让被它耽搁的人少饿一顿。'}]},
];

const successors={haven:['岑遥','岑屿','岑序'],ember:['陶沅','陶青','陶宁'],moss:['禾雨','禾弦','禾初'],spire:['闻岚','闻澄','闻昼'],reed:['陆芽','陆川','陆澍'],wind:['弥潮','弥弦','弥遥']};
export function residentAt(city,tick){
  const years=Math.floor(tick/4),handover=82-city.person.age;
  if(years<handover)return {...city.person,age:city.person.age+years,generation:0};
  const generation=1+Math.floor((years-handover)/36),names=successors[city.id];
  return {...city.person,name:names[(generation-1)%names.length]+(generation>3?`·第${generation+1}代`:''),age:26+(years-handover)%36,generation};
}
export const petitionOpenedAt=(s,p)=>p.trigger?(s.petitionOpenings??[]).find(o=>o.id===p.id)?.tick:p.opens;
export const pendingPetitions=s=>PETITIONS.filter(p=>s.tick>=petitionOpenedAt(s,p)&&!(s.decisions??[]).some(d=>d.id===p.id));
export function civicRules(s,city){
  const rules={income:0,ecologyRate:0,pollutionRate:0,knowledgeRate:0,productionMultiplier:0,floodResistance:0,reserveBuffer:0,tradeCapacity:0};
  for(const decision of s.decisions??[]){
    const p=PETITIONS.find(p=>p.id===decision.id&&p.city===city),option=p?.options.find(o=>o.id===decision.choice);
    if(option)for(const [key,value] of Object.entries(option.rules))rules[key]+=value;
  }
  return rules;
}

export function aftermathFor(decision){
  const petition=PETITIONS.find(p=>p.id===decision.id),option=petition.options.find(o=>o.id===decision.choice),city=CITIES.find(c=>c.id===petition.city),tick=decision.after?.tick??decision.tick+8;
  let text=option.aftermath.replaceAll(city.person.name,residentAt(city,tick).name);
  if(tick>200){const speaker=petition.voices[1][0].split(' · ')[0];text=text.replaceAll(speaker,`${speaker}一家的后辈`);}
  return text;
}


export function outcomeFor(decision){
  const a=decision.before,b=decision.after;if(!a||!b)return null;
  return [
    {label:'居民',before:a.population,after:b.population,unit:'人',digits:0},
    {label:'粮仓',before:a.food/(a.population*.24),after:b.food/(b.population*.24),unit:'季',digits:1},
    {label:'公库',before:a.wealth,after:b.wealth,unit:'铜',digits:0},
    {label:'生态',before:a.ecology*100,after:b.ecology*100,unit:'%',digits:1},
    {label:'污染',before:a.pollution*100,after:b.pollution*100,unit:'%',digits:1},
    {label:'知识',before:a.knowledge,after:b.knowledge,unit:'',digits:1},
    {label:'互信',before:a.trust*100,after:b.trust*100,unit:'%',digits:1},
  ];
}
export function outcomeText(decision){
  const rows=outcomeFor(decision);
  return rows?` 同期账页（决定前 → 回信时）：${rows.map(r=>`${r.label} ${r.before.toFixed(r.digits)} → ${r.after.toFixed(r.digits)} ${r.unit}`).join('；')}。这些变化包含同期气候、建设和其他旧约的作用，不能单独归于这份决定。`:' 当时未留下完整数值账页，原信保留，不追补过去的读数。';
}

import {CITIES} from '../../src/world-data.js';
import {appearanceOf} from '../appearance.js';
const line=(speaker,text,pose='listen')=>({speaker,text,pose});
const locals={
 haven:{who:'修船人阿澜',place:'潮汐钟下的旧船坞',detail:'铜铃响了一下，帆索上的水滴落进船板缝里。'},
 ember:{who:'陶匠石禾',place:'黑釉窑外的凉棚',detail:'刚熄的窑口仍有余温，一只未上釉的杯子晾在窗边。'},
 moss:{who:'织工青萝',place:'染布溪旁的木廊',detail:'湿布在竹竿上晃动，溪水把一片叶子带到廊下。'},
 spire:{who:'记星人闻舟',place:'白塔脚下的刻度台',detail:'镜片把一小块天光映在桌上，刻度纸被石子压住。'},
 reed:{who:'水轮匠芦婶',place:'苇原水轮旁的渡台',detail:'水轮慢慢转过一格，芦苇擦着木栏发出细响。'},
 wind:{who:'集雾人风叔',place:'信风驿站的晒绳场',detail:'集雾网上凝着水珠，一封还没寄出的信压在绳结下。'}
};
export function storyArcFor(p,w,age){
 const f=p.storyFlags??{},city=CITIES.find(c=>c.id===p.city),c=w.cities.find(c=>c.id===p.city);
 if(age>=1&&!f.lantern)return {kind:'lantern',title:'退潮后的一盏灯',reason:`你满一岁后，家人在${city.name}的岸边捡到一盏灯。灯底刻着一个模糊的名字。`,options:[{id:'repair',label:'和家人修好它',detail:'手艺 +2，体力 −1。把修补的经验留下。'},{id:'return',label:'去找灯的主人',detail:'情谊 +3。让这盏灯回到熟悉的手里。'}],fallback:'家人把灯交给渡口保管，未改变人物数值；下一章会记得这次托付。'};
 if(age>=6&&f.lantern&&!f.promise)return {kind:'promise',title:'灯下的第一张约定',reason:f.lantern==='repair'?'那道修过的灯缝仍在。工匠记得你家人的耐心，邀请你挑一件真正想学的事。':f.lantern==='return'?'灯的主人带着谢意回来，请你在作坊与航图室之间选一个位置。':'当年保管灯的渡口送来消息：有两个学习的位置，正等你自己决定。',options:[{id:'craft',label:'留下来学一门手艺',detail:'手艺 +4，体力 −2。下一次远行会记得你的选择。'},{id:'charts',label:'跟着航图认路',detail:'见识 +4，体力 −1。把未知的海岸记下来。'}],fallback:'这次暂不约定去处，人物数值不变；成年时仍会遇到新的选择。'};
 if(age>=16&&f.promise&&!f.crossing)return {kind:'crossing',title:'渡口留下的两个位置',reason:`${city.name}${c.food<c.population*.24?'正在经历粮食紧张，送粮的人需要帮手':'的渡口准备出航，邻里正在筹修码头'}。${f.promise==='craft'?'你在作坊练过的双手派得上用场。':f.promise==='charts'?'你读过的航图第一次有了真实的去处。':'小时候未定下的路，现在可以重新选择。'}`,options:[{id:'escort',label:'随船照料同行的人',detail:'体力 −3，情谊 +4，手艺 +1。不支出积蓄。'},{id:'fund',label:'留下来支持港口工程',detail:'投入最多 5 铜到本城港口；只扣工程实际接收的金额。',cost:5}],fallback:'你没有赶上这次安排，船照常离岸；不自动支出积蓄。'};
 if(age>=40&&f.crossing&&!f.beacon)return {kind:'beacon',title:'把灯光留给后来的人',reason:`又一个孩子停在灯前。${f.crossing==='fund'?'你曾把积蓄交给故乡的港口。':f.crossing==='escort'?'你曾随船去过陌生的岸。':'那次没赶上的船，也成了可以讲起的往事。'}现在，对方想知道你学到了什么。`,options:[{id:'teach',label:'陪他亲手做一次',detail:'情谊 +4，手艺 +2。把经验变成一次陪伴。'},{id:'record',label:'把走过的路写下来',detail:'见识 +5，体力 −2。留下一页可以重读的记录。'}],fallback:'这一晚只坐着听潮。没有数值变化，但这次相遇会写入生平。'};
 return null;
}
export function makeStory(kind,p,w){
 const city=CITIES.find(c=>c.id===p.city),local=locals[p.city],age=Math.max(0,(w.tick-p.bornTick)/4),young=age<6;
 const actor=young?'照料你的家人':p.name;
 const scenes={
 gift:[line('海边的家',`窗被推开，${city.name}的第一阵风吹到襁褓边。`,'arrive'),line('家人','这二十铜，可以为你留着，也可以和大家一起种下故乡的林。','offer'),line('家人','不是哪一种更像好孩子。我们想知道，今天愿意把什么留下。','listen')],
 scarcity:[line(local.who,local.detail,'arrive'),line('家人','粮仓前的队伍绕到了台阶外。篮底还有东西，我们得把日子排得仔细些。','offer'),line(actor,young?'家人把补给单和家门钥匙放在一起，等这一个决定。':'我看了看钱袋。补给能多撑一阵，休养也能留住一些力气。','listen')],
 mentor:[line(local.who,local.detail,'arrive'),line(local.who,`今天想试试${city.craft}，还是去读一页以前看不懂的书？`,'work'),line(actor,'两扇门都开着。我不用在今天决定一生，只需要决定这一步。','read')],
 gathering:[line('家人',`${city.name}的人聚在${local.place}。你靠着熟悉的肩膀，听见远处的潮。`,'arrive'),line(local.who,`有人讲起${city.species}。讲到一半，大家安静下来，听它是否真的在附近。`,'listen'),line('家人','还想再听一会儿，还是该回家了？','offer')],
 lantern:[line('家人','潮水退去，石缝里露出半盏小灯。上面的刻字被盐磨得很浅。','arrive'),line(local.who,'裂缝可以补，名字也许还能问到。先别急着说它是谁的。','offer'),line('家人','你伸出手，碰了碰凉凉的灯把。我们陪你一起作这个决定。','listen')],
 promise:[line(local.who,'旧灯又挂在廊下，补过或托付过它的人，如今都多长了几岁。','light'),line(local.who,'这里有一块木料，也有一张空航图。你想先试哪一样？','offer'),line(actor,'我摸了摸木纹，又望向纸上留白的海。两条路都不会替我走完。','listen')],
 crossing:[line(local.who,`${local.place}响起开船前的招呼。船边留了一个位置，工程簿也还摊着。`,'arrive'),line(local.who,'随船的人需要照料，留下的人还在筹码头。你可以挑一边帮忙。','offer'),line(actor,'我认识的路和人都在这里。眼前的决定，会留在谁的记忆里？','listen')],
 beacon:[line('后来的人','你以前也不知道该怎么选吗？','arrive'),line(actor,'当然。有时我动了手，有时只是错过。后来才知道，海不会等所有人想清楚。','light'),line('后来的人','那今天呢？能带我做一次，或者把故事写给我吗？','offer')]
 };
 return {version:1,kind,city:p.city,place:kind==='gift'?`${city.name}家中的灯下`:local.place,companion:kind==='gift'||young?'家人':local.who,actor:p.name,appearance:appearanceOf(p.appearance,p.city),age,beats:scenes[kind]??[line(actor,local.detail)]};
}
export function storyEnding(e,p,choice,expired,impact){
 const outcomes={
 gift:{keep:['钱袋被仔细系好，放进家里的木匣。将来的某一天，你会自己打开它。','offer'],grove:['家人把赠礼送进共有林的工程账簿。每一份投入都在等下一份加入。','work']},
 scarcity:{supply:['补给被带回桌边。你吃下一点热食，今夜的身体有了更多余力。','offer'],rest:['门轻轻关上。窗外仍有人排队，屋里给你留出一段不赶路的时间。','rest']},
 mentor:{books:['书页上的一句话终于接上了现实里的一个问题。你把页角抚平。','read'],craft:['第一次留下的纹路不很整齐，但双手记住了新的动作。','work']},
 gathering:{listen:['故事讲完了，你记住的还有讲故事时大家相互靠近的样子。','listen'],rest:['家人带你离开人群。潮声跟了一小段路，便留在身后。','rest']},
 lantern:{repair:['灯的裂口被一点点合拢。修补痕迹没有藏起来，那是你们一起做过的证明。','work'],return:['灯回到主人手中。对方认出了磨浅的名字，也记住了你家的门。','offer']},
 promise:{craft:['你在作坊门边挂好外衣。那盏旧灯照着第一块被你磨平的木料。','work'],charts:['纸上多了一条认真画下的海岸。以后每一次认路，都会从这里继续。','read']},
 crossing:{escort:['你伸手扶稳同行的人。船离岸时，熟悉的灯慢慢缩成一点。','offer'],fund:['你把铜钱放到工程簿旁，留下的不是一座凭空出现的码头，而是一笔真实的共建投入。','work']},
 beacon:{teach:['两双手一起碰到灯架。你没有替对方做完，只陪他把最后一个结系牢。','work'],record:['你在纸上留下路线，也留下一些走错过的地方。那盏灯把字照得很清楚。','read']}
 };
 const [text,pose]=expired?[e.fallback,'rest']:outcomes[e.kind]?.[choice]??['这一刻已经写入生平。','listen'];
 const story=e.story??null;if(!story)return null;
 return {...story,beats:[...story.beats,line(expired?'错过的时刻':'选择之后',text,pose)],outcome:text,choice:expired?'expired':choice,built:!!(impact&&impact.afterLevel>impact.beforeLevel)};
}
export function milestoneStory(kind,p,w,text){return {...makeStory('gathering',p,w),kind,place:`${CITIES.find(c=>c.id===p.city).name}家中的灯下`,beats:kind==='birth'?[line('海边的家',`你在${CITIES.find(c=>c.id===p.city).name}降生。潮水照常抵达，家中多了一个名字。`,'arrive'),line('家人','这一生还没有走过的路，我们先陪你走。','offer')]:kind==='inherit'?[line('家谱',text,'read'),line('后来的人','旧的名字留在纸上，新的日子从今天开始。','light')]:[line('生平',text,'rest'),line('家谱','这一生有了终点，岛上留下的事仍会继续。','light')]};}

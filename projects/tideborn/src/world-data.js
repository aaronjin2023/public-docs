export const TITLE = '潮生';
export const SEED = 271026;
export const START_YEAR = 208;
export const SEASONS = ['雨生', '长昼', '归潮', '静冬'];

export const ISLANDS = [
  { id: 'haven', x: -15, z: 8, rx: 33, rz: 27, height: 19, angle: -.4, biome: 'meadow' },
  { id: 'ember', x: -65, z: -39, rx: 24, rz: 29, height: 31, angle: .35, biome: 'volcanic' },
  { id: 'moss', x: -72, z: 43, rx: 29, rz: 20, height: 16, angle: -.3, biome: 'forest' },
  { id: 'spire', x: 31, z: -46, rx: 23, rz: 33, height: 29, angle: -.6, biome: 'alpine' },
  { id: 'reed', x: 47, z: 25, rx: 35, rz: 26, height: 12, angle: .6, biome: 'wetland' },
  { id: 'wind', x: 91, z: -23, rx: 17, rz: 24, height: 21, angle: .3, biome: 'dry' },
  { id: 'bell', x: -3, z: 69, rx: 18, rz: 15, height: 9, angle: -.1, biome: 'ruins' },
];

export const CITIES = [
  {
    id: 'haven', name: '望潮湾', en: 'Tidewatch', x: -13, z: 19, color: '#d9b879',
    population: 1460, fertility: .83, rainfall: .74, ecology: .82, wealth: 510, trust: .76,
    type: '潮汐商港', material: '白灰石墙 / 赤陶屋顶', craft: '潮汐钟与造船',
    food: '盐炙银鳞鱼，青麦薄饼', ritual: '每次归潮，所有船钟依次敲响，最晚归来的人最后落座。',
    motto: '海没有路，直到有人出发。',
    description: '城市沿着旧潮线修筑。低潮时，石阶通向集市；涨潮后，同一段石阶成为码头。这里的人用返航的帆数计日，不用日历。',
    history: '建城于退潮后的第一个春天。三家造船行共用一座灯塔，谁也不拥有它。',
    person: { name: '岑舟', role: '制图师', age: 29, wish: '画出一张不再吞没归人的海图', voice: '我给每条航线留了空白。海总会添上我们没想到的部分。' },
    dilemma: '灯塔可以更高，码头也可以更大。但鱼群正在向湾外退去。',
    species: '银鳞洄游鱼', adaptation: '以潮流而非日照辨认洄游时刻',
  },
  {
    id: 'ember', name: '烬山', en: 'Emberfall', x: -61, z: -24, color: '#c8977c',
    population: 870, fertility: .59, rainfall: .48, ecology: .67, wealth: 420, trust: .69,
    type: '火山工坊', material: '玄武岩基座 / 铜片屋顶', craft: '黑釉陶与潮铜冶炼',
    food: '火山石焗根茎，烟熏海盐', ritual: '新炉点火时，工匠把第一块铜还给山。',
    motto: '山没有熄灭，只是在呼吸。',
    description: '火山的热流从地板下经过。陶匠在同一炉里烧器皿与面包；山口的黑玻璃记录着比城市更古老的季节。',
    history: '第一批居民不是矿工，而是躲避寒潮的织工。炉火先温暖了屋子，后来才照亮矿道。',
    person: { name: '陶砚', role: '窑火守望人', age: 44, wish: '找到不让河流变黑的冶炼方法', voice: '一只杯子可以烧坏。流过三座村庄的水不可以。' },
    dilemma: '矿脉带来财富，也把灰尘带到下游。新窑与净水渠争用同一笔铜。',
    species: '灰羽石燕', adaptation: '在温热岩缝筑巢，以矿区昆虫为食',
  },
  {
    id: 'moss', name: '林汐', en: 'Mosswater', x: -69, z: 47, color: '#98b299',
    population: 680, fertility: .76, rainfall: .95, ecology: .96, wealth: 270, trust: .84,
    type: '林间水乡', material: '落木梁架 / 苔色瓦片', craft: '纤维织物与植物染',
    food: '雨蕈汤，酸果与烤栗', ritual: '每年留下最后一篮种子，给来年未出生的孩子。',
    motto: '林子记得，每一条走过的路。',
    description: '房屋绕开老树，步道在树根之间转弯。这里没有笔直的街道；引路的是水声、叶色和一代代人留下的绳结。',
    history: '曾经的伐木港在一场山洪后改了名字。此后，每伐一株树，需由下游居民先确认水道。',
    person: { name: '禾音', role: '种子保管人', age: 23, wish: '让离岛的孩子仍能认出故乡的树', voice: '种子不属于保管它的人。我们只是暂时替下一场雨收着。' },
    dilemma: '外海商人愿意出高价购买林木。孩子们希望有一所全年开放的学堂。',
    species: '灯腹林蛙', adaptation: '湿季鸣叫，旱季藏于树冠积水',
  },
  {
    id: 'spire', name: '白塔', en: 'Highspire', x: 34, z: -33, color: '#c3cfda',
    population: 930, fertility: .51, rainfall: .61, ecology: .83, wealth: 390, trust: .73,
    type: '高地观星城', material: '白色片岩 / 青灰石板', craft: '透镜与刻度仪',
    food: '雪麦粥，风干羊酪', ritual: '观星人把测错的刻度也刻在塔内，供后来者辨认。',
    motto: '群星远行，误差留下。',
    description: '白塔没有钟声。每到夜里，山腰的镜面把星光递到谷底。居民以两轮月亮的相遇为节日，也以它们的错开安排播种。',
    history: '塔顶原是一处海盗瞭望台。第一位观星人拆掉了炮口，在原位安放一片透镜。',
    person: { name: '闻星', role: '历法修订者', age: 36, wish: '让每个村庄提前知道大潮何时到来', voice: '不是星星走错了。是我们还没把刻度写对。' },
    dilemma: '观测需要长期积累，山下的人却需要今年的粮食。',
    species: '薄翼高山蝶', adaptation: '深色翼脉吸收短暂的高地阳光',
  },
  {
    id: 'reed', name: '苇原', en: 'Reedplain', x: 47, z: 31, color: '#c6c391',
    population: 1810, fertility: 1.08, rainfall: .88, ecology: .89, wealth: 380, trust: .72,
    type: '河口粮仓', material: '夯土台基 / 芦苇长屋', craft: '浮田与水轮',
    food: '苇米饭，河虾与野芹', ritual: '第一场雨来临时，全城打开水门，先灌最远的一块田。',
    motto: '水到哪里，田就到哪里。',
    description: '稻田随河湾展开，村庄像缝在水上的纽扣。丰收时，每条水渠都是运粮路；洪水时，每栋房子都记得自己的高度。',
    history: '旧时田界以家族划分。一次漫长干旱后，人们改用水到达的顺序来分配耕地。',
    person: { name: '陆苇', role: '水门议事员', age: 52, wish: '让最下游的田也能喝到第一口水', voice: '上游的丰收不能叫所有人的丰收。请到河的末端再说一遍。' },
    dilemma: '加高堤坝能保护粮食，却会切断湿地与海的呼吸。',
    species: '长足苇鹭', adaptation: '足趾分开负重，行走于漂浮的芦苇根毯',
  },
  {
    id: 'wind', name: '风栖', en: 'Windrest', x: 89, z: -17, color: '#d4c2a7',
    population: 560, fertility: .47, rainfall: .34, ecology: .71, wealth: 300, trust: .81,
    type: '信风驿站', material: '砂岩厚墙 / 帆布遮廊', craft: '风帆与集雾网',
    food: '鹰嘴豆炖菜，风干无花果', ritual: '远航前把一根线系在风车上，回来的人亲手解开。',
    motto: '风留不住，人可以等。',
    description: '整座城面朝风。屋顶收集雾水，风车把地下的淡水举起。旅人的口音在这里相遇，离开时彼此多带走一个词。',
    history: '地图上原来只有一处补水点。一个在风暴中滞留的乐师修好第一架风车，人们便留了下来。',
    person: { name: '弥沙', role: '帆匠与讲述者', age: 31, wish: '把群岛所有的摇篮曲带到同一张餐桌', voice: '他们说的不是同一种语言，却会在同一个地方换气。' },
    dilemma: '开放港口能带来粮食与故事，也会让小城越来越依赖远方。',
    species: '银叶风草', adaptation: '细小银叶反光，夜间收集雾滴',
  },
];

export const LANDMARKS = [
  { id:'bell', name:'沉钟遗址', x:-3, z:69, title:'海下的第七座城', text:'钟楼立在旧城高处，脚下的港口石阶随潮水隐现。钟已不会响，但岛民仍能从藤壶的高度读出历次潮线。旧石板上写着一条条例：迁居的人仍保有在议会中的座位。', discovery:'你发现了旧城的迁居条款。世界从此多了一种记忆：土地会沉没，归属可以留下。' },
  { id:'fold', name:'叠层断崖', x:-78, z:-44, title:'比王朝更长的句子', text:'倾斜的灰岩上覆着平整的火山灰。你把两枚来自不同岛屿的贝化石并排，纹路恰好相接。岛屿曾经靠得更近，而海还会继续改变它们。', discovery:'你在两座岛的岩层中找到相似化石。群岛的历史，向人类记忆之外延长了一页。' },
  { id:'garden', name:'留白之庭', x:-82, z:38, title:'一座没有围墙的园', text:'从林边的亭子走下几级石阶，小径在望得见远方群岛的地方停下。坐凳朝着海，檐下只留一盏夜灯。竹管把一线水送进石钵。你可以把目光停在水面，也可以望向岸外。', discovery:'你在留白之庭停了一会儿。这里没有资源可开采；安静本身就是这座岛留下的东西。' },
];

export const POLICIES = [
  {id:'water', name:'修蓄水渠', cost:90, effect:'提高旱季产量与蓄水，轻微占用湿地。', detail:'每级耕作系数 +0.12，并增加蓄水；生态每季额外 -0.03 个百分点。', icon:'water', visible:'石砌蓄水池与水槽', max:3},
  {id:'commons', name:'设共有林', cost:75, effect:'林地恢复更快，近期产量略降。', detail:'每级 +0.6 个百分点 / 季生态恢复；产量 -4%。', icon:'leaf', visible:'城边成排的共有果林', max:3},
  {id:'school', name:'开公共学堂', cost:110, effect:'知识与互信逐季增长，需要持续养护。', detail:'每级知识积累 +0.25 / 季；每季维护 2 铜。', icon:'book', visible:'带廊柱的公共学堂', max:3},
  {id:'port', name:'扩建公共港', cost:130, effect:'提高跨岛运粮能力，港区占用海岸。', detail:'常态运粮上限每级 +25 份 / 季（初始 55）；每季生态额外 -0.12 个百分点。', icon:'sail', visible:'岸外的木栈桥与货箱', max:3},
  {id:'mine', name:'增开矿炉', cost:95, effect:'增加铜收入，污染与生态压力上升。', detail:'每级 +9 铜 / 季；污染累积，粮食承载力随之下降。', icon:'fire', visible:'窑炉与高烟囱', max:3},
];

export const METHODS = [
  {name:'魏格纳', field:'地质', path:'geologists/alfred-wegener', idea:'让不同地点的证据互相吻合。', use:'叠层断崖与分离岛屿的同源化石。', kind:'世界设定'},
  {name:'赫顿', field:'地质', path:'geologists/james-hutton', idea:'从可见的过程读出深时。', use:'抬升、侵蚀与沉积共同构成地形层次。', kind:'世界设定'},
  {name:'洪堡', field:'地理', path:'geographers/alexander-von-humboldt', idea:'把海拔、气候、植物和人放在同一张图上。', use:'六种环境改变植被、农业产量与聚落。', kind:'运行规则'},
  {name:'达尔文', field:'生物', path:'biologists/charles-darwin', idea:'差异需要环境与时间的解释。', use:'每座岛的物种都有具体的环境适应。', kind:'物种设定'},
  {name:'卡森', field:'生态', path:'biologists/rachel-carson', idea:'追踪局部干预的整条影响链。', use:'矿炉 → 污染 → 生态 → 粮食 → 迁徙。', kind:'运行规则'},
  {name:'开普勒', field:'天文', path:'astronomers/johannes-kepler', idea:'让模型服从观测，也让误差可见。', use:'双月历法与可计算的潮周期；世界规则明确说明简化。', kind:'历法模型'},
  {name:'伊本·赫勒敦', field:'社会', path:'sociologists/ibn-khaldun', idea:'群体的联系影响城市的兴衰。', use:'互信参与人口流动与城市状态判断。', kind:'运行规则'},
  {name:'罗尔斯', field:'哲学', path:'philosophers/rawls', idea:'总量之外，看看处境最差的人。', use:'同时呈现群岛粮食与最短缺城镇，贸易优先补足缺口。', kind:'运行规则'},
  {name:'老子', field:'思想', path:'thinkers/laozi', idea:'给自然过程留出不被干预的空间。', use:'观察也是一种完整玩法，没有强制任务或胜负榜。', kind:'交互设计'},
  {name:'维特鲁威', field:'建筑', path:'architects/vitruvius', idea:'结构、用途与比例一起决定建筑。', use:'住宅、粮仓、港口和塔楼有不同体量与用途。', kind:'空间设计'},
  {name:'王维', field:'园林', path:'landscape-designers/wang-wei', idea:'路径、远景与留白组成一个地方。', use:'留白之庭、林间步道与可停留的观景视角。', kind:'空间设计'},
  {name:'卡尔维诺', field:'文学', path:'writers/italo-calvino', idea:'用精确的城市差异组织可分支的阅读。', use:'六城具有独立习俗、物产、人物与矛盾。', kind:'叙事结构'},
  {name:'蒙台梭利', field:'教育', path:'educators/maria-montessori', idea:'准备可操作的环境，让人自行发现。', use:'行动前显示代价，行动后让因果与年代记回应。', kind:'交互设计'},
  {name:'德彪西', field:'音乐', path:'composers/claude-debussy', idea:'以音色、五声音阶与留白组织听觉。', use:'可关闭的原创合成声景，随光照和潮水缓慢改变。', kind:'程序音景'},
];

'use strict';
// Public reads run in the browser; there is no server write path.
function createGuanchaoStaticClient(getSnapshot, storage, storageKey) {
  let pending;
  const data = () => pending ||= Promise.resolve().then(getSnapshot).then(value => {
    if(value.schema_version !== 1 || !Array.isArray(value.events)) throw new Error('公开快照格式不兼容');
    return value;
  }).catch(error => {pending = null; throw error;});
  function savedIDs() {
    try {const ids=JSON.parse(storage.getItem(storageKey)||'[]');return new Set(Array.isArray(ids)?ids.filter(id=>typeof id==='string'):[]);}
    catch {return new Set();}
  }
  function graph(snapshot, params) {
    const base=snapshot.research, dimension=params.get('dimension')||'mechanisms', days=params.get('days')||'7';
    if(!Object.hasOwn(base.dimensions,dimension)||!['7','30','all'].includes(days)) throw new Error('无效的切片或时间窗口');
    for(const [key,labels] of [['type',base.types],['status',base.states]]) if(params.get(key)&&!Object.hasOwn(labels,params.get(key))) throw new Error('无效的关联筛选');
    const cutoff=Date.parse(snapshot.status.generated_at)-Number(days)*86400000;
    let nodes=base.nodes.filter(n=>days==='all'||n.evidence.some(e=>e.published_at&&Date.parse(e.published_at)>=cutoff));
    const counts=new Map();for(const n of nodes)for(const value of new Set(n.slices[dimension]||[]))counts.set(value,(counts.get(value)||0)+1);
    if(params.get('slice'))nodes=nodes.filter(n=>(n.slices[dimension]||[]).includes(params.get('slice')));
    const ids=new Set(nodes.map(n=>n.event_id));
    const relations=base.relations.filter(r=>ids.has(r.source)&&ids.has(r.target)&&(!params.get('type')||r.type===params.get('type'))&&(!params.get('status')||r.status===params.get('status')));
    const paths=[];let expansions=0;
    const start=params.get('from'),end=params.get('to');
    if(start&&end) {
      if(start===end||!ids.has(start)||!ids.has(end))throw new Error('请选择当前切片中的两个不同事件');
      const pending=[{nodes:[start],relations:[]}], links=relations.filter(r=>r.status!=='refuted'&&!r.needs_recheck);
      for(let cursor=0;cursor<pending.length&&paths.length<3&&expansions<1000;cursor++) {
        expansions++;
        const path=pending[cursor],current=path.nodes.at(-1);
        if(current===end&&path.relations.length){paths.push({...path,causal:false});continue;}
        if(path.relations.length>=3)continue;
        for(const link of links){const next=link.source===current?link.target:link.target===current&&['analogy','shared_context'].includes(link.type)?link.source:null;if(next&&!path.nodes.includes(next))pending.push({nodes:[...path.nodes,next],relations:[...path.relations,link.id]});}
      }
    }
    return {...base,dimension,nodes,relations,paths,path_search_limited:expansions>=1000,
      slices:[...counts].sort((a,b)=>b[1]-a[1]).map(([value,count])=>({value,count})),
      note:base.note+' 时间窗口以本次快照日期为基准，审核状态由本机发布；此处不能提交审核。'};
  }
  return {async request(path, value) {
    const snapshot=await data(), url=new URL(path,'https://guanchao.invalid'), params=url.searchParams;
    const saved=savedIDs();
    if(value!==undefined) {
      if(url.pathname!=='/api/preferences'||typeof value.saved!=='boolean'||!snapshot.events.some(e=>e.id===value.event_id)||value.feedback) throw new Error('公开版只支持当前浏览器收藏；审核和反馈请在本机操作');
      value.saved?saved.add(value.event_id):saved.delete(value.event_id);
      try {storage.setItem(storageKey,JSON.stringify([...saved]));} catch {throw new Error('浏览器禁止保存收藏，请检查站点存储设置');}
      return {ok:true};
    }
    const eventValue=e=>({...e,saved:saved.has(e.id),feedback:null,research:snapshot.research.nodes.find(n=>n.event_id===e.id)||null});
    if(url.pathname==='/api/status')return snapshot.status;
    if(url.pathname==='/api/research')return graph(snapshot,params);
    if(url.pathname==='/api/events') {
      const view=params.get('view')||'news';if(!['news','opportunity','editorial'].includes(view))throw new Error('无效的阅读视角');
      const counts=Object.fromEntries(snapshot.domains.map(domain=>[domain,snapshot.events.filter(e=>e.category===domain).length]));
      let events=snapshot.events.map(eventValue);
      if(params.get('slice')){const ids=new Set(graph(snapshot,params).nodes.map(n=>n.event_id));events=events.filter(e=>ids.has(e.id));}
      const normalize=text=>String(text).normalize('NFKC').toLowerCase();
      const query=Array.from(normalize(params.get('q')||'')).slice(0,200).join('');
      const searchable=e=>{
        const parts=['title_zh','summary','category','tags','kind','analysis','opportunity','editorial','gap'].flatMap(key=>Array.isArray(e[key])?e[key]:[e[key]||'']);
        parts.push(...(e.facts||[]).map(f=>f.text),...Object.values(e.views||{}).map(v=>v.reason||''));
        for(const a of e.evidence)parts.push(a.title||'',a.source_id||'',snapshot.status.sources.find(s=>s.id===a.source_id)?.name||'');
        return normalize(parts.join(' '));
      };
      events=events.filter(e=>(!params.get('category')||e.category===params.get('category'))&&(params.get('saved')!=='1'||e.saved)&&(params.get('hide_low')!=='1'||e.views?.[view]?.priority!=='low')&&(!query||searchable(e).includes(query)));
      const levels={high:2,medium:1,low:0};events.sort((a,b)=>(levels[b.views?.[view]?.priority]??-1)-(levels[a.views?.[view]?.priority]??-1)||b.updated_at.localeCompare(a.updated_at));
      const page=Math.max(1,Number(params.get('page'))||1),size=Math.min(50,Math.max(1,Number(params.get('size'))||15));
      return {events:events.slice((page-1)*size,page*size),total:events.length,all:snapshot.events.length,counts,saved:snapshot.events.filter(e=>saved.has(e.id)).length,page,size};
    }
    if(url.pathname.startsWith('/api/events/')) {
      const event=snapshot.events.find(e=>e.id===url.pathname.split('/').at(-1));
      if(!event)throw new Error('事件未包含在当前公开快照中');
      return eventValue(event);
    }
    throw new Error('此功能仅在本机版提供');
  }};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createGuanchaoStaticClient};
else {
  window.GuanChaoStatic=createGuanchaoStaticClient(async()=>{
    const path=document.querySelector('meta[name="guanchao-snapshot"]').content;
    const response=await fetch(new URL(path,document.baseURI));
    if(!response.ok)throw new Error('公开快照暂时不可用，请稍后刷新');
    return response.json();
  },{getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)},'guanchao-public-saved:'+location.pathname.replace(/index\.html$/,''));
}

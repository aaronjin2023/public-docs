import ui from './locales/ui.js';
import council from './locales/council.js';
import world from './locales/world.js';
import events from './locales/events.js';
import choices from './locales/choices.js';
import guide from './locales/guide.js';
import walks from './locales/walks.js';

export const LANGUAGE_KEY='tideborn-language-v1';
export const LANGUAGES=[['zh','中文'],['en','English'],['es','Español'],['fr','Français'],['ar','العربية'],['ja','日本語']];
export const catalog=[...ui,...world,...events,...choices,...guide,...walks,...council];
const supported=new Set(LANGUAGES.map(([id])=>id));
export function languageCode(value){const id=String(value??'').toLowerCase().split(/[-_]/)[0];return supported.has(id)?id:null;}
export function loadLanguage(storage,languages=[]){
  try{const saved=languageCode(storage.getItem(LANGUAGE_KEY));if(saved)return saved;}catch{}
  return languages.map(languageCode).find(Boolean)??'zh';
}
const columns={en:1,es:2,fr:3,ar:4,ja:5},exact=new Map(),patterns=[];
const regexEscape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
for(const row of catalog){
  exact.set(row[0],row);
  if(row[0].endsWith('。'))exact.set(row[0].slice(0,-1),row.map(value=>value.replace(/[。.]$/,'')));
  if(/\{\d+\}/.test(row[0])){
    const ids=[];const parts=row[0].split(/(\{\d+\})/g);
    const numericOnly=/^\{0\} (年|位居民|人|铜|份|份粮食|份粮|季用量|季|个百分点|岁|级|条近期记录)$/.test(row[0]);
    const source=parts.map(part=>/^\{\d+\}$/.test(part)?(ids.push(Number(part.slice(1,-1))),numericOnly||row[0]==='{0}. {1}'&&part==='{0}'?'([+−\\-0-9.,\\s→/]+)':'(.+?)'):regexEscape(part)).join('');
    patterns.push({test:new RegExp('^'+source+'$'),prefix:row[0].endsWith('。')?new RegExp('^'+source):null,ids,row});
  }
}
// shortcut: Uncatalogued prose stays in its source language; extend the catalog when adding narrative coverage.
const phrases=[...exact.entries()].filter(([key])=>!key.includes('{')).sort((a,b)=>b[0].length-a[0].length);
patterns.sort((a,b)=>b.row[0].replace(/\{\d+\}/g,'').length-a.row[0].replace(/\{\d+\}/g,'').length);
export function translate(text,language,depth=0){
  if(language==='zh'||!columns[language]||depth>256||!/[\u3400-\u9fff]/.test(text))return text;
  const source=text.trim(),space=text.match(/^(\s*)[\s\S]*?(\s*)$/),entry=exact.get(source);
  let result=entry?.[columns[language]];
  if(result===undefined){
    for(const [key,row] of phrases){if(source.startsWith(key)&&(/[。；]$/.test(key)||/^[。；：，\s↗]/.test(source.slice(key.length)))){const rest=source.slice(key.length),gap=language!=='ja'&&/[。；]$/.test(key)&&rest&&!/^\s/.test(rest)?' ':'';result=row[columns[language]]+gap+translate(rest,language,depth+1);break;}}
  }
  if(result===undefined){
    for(const {test,prefix,ids,row} of patterns){const match=(prefix&&source.match(prefix))??source.match(test);if(!match)continue;const args={};ids.forEach((id,i)=>args[id]=translate(match[i+1],language,depth+1));result=row[columns[language]].replace(/\{(\d+)\}/g,(_,id)=>args[id])+translate(source.slice(match[0].length),language,depth+1);break;}
  }
  if(result===undefined){
    const separator=/[。\n]/.exec(source)??/(；|：|、|，|\s*[—至]\s*|\s*·\s*|\s*→\s*|\s*↗|^“|”$|^「|」$)/.exec(source);
    if(separator){const part=separator[0],mark=({'。':'. ','；':'; ','：':': ','、':', ','，':', ','至':{'en':' to ','es':' a ','fr':' à ','ar':' إلى ','ja':'から'}[language],'“':'“','”':'”','「':'“','」':'”'})[part]??part;const left=source.slice(0,separator.index),right=source.slice(separator.index+part.length),a=translate(left,language,depth+1),b=translate(right,language,depth+1);result=a===left&&b===right?source:a+mark+b;}
    else result=source;
  }
  if(result!==source&&language!=='ja')result=result.replaceAll('。','. ').replaceAll('；','; ').trimEnd();
  return space[1]+result+space[2];
}

export function startLanguageUI(){
  const picker=document.getElementById('language');
  let storage;try{storage=window.localStorage;}catch{}
  let locale=loadLanguage(storage,navigator.languages);
  const originals=new WeakMap(),attributes=new WeakMap();
  const excluded=node=>node.parentElement?.closest('script,style,code,pre,[translate="no"],.dev-timeline,.method-list');
  const attrs=['aria-label','title','placeholder','alt'];
  function apply(node){
    if(node.nodeType===3){
      if(excluded(node))return;
      const previous=originals.get(node),source=previous&&node.data===previous.rendered?previous.source:node.data;
      const rendered=translate(source,locale);originals.set(node,{source,rendered});if(node.data!==rendered)node.data=rendered;
      return;
    }
    if(node.nodeType!==1)return;
    if(node.matches('.dev-timeline,.method-list')){node.lang='zh-CN';node.dir='ltr';return;}
    if(node.matches('script,style,code,pre,[translate="no"]'))return;
    for(const attr of attrs){if(!node.hasAttribute(attr))continue;const value=node.getAttribute(attr),saved=attributes.get(node)??{},previous=saved[attr],source=previous&&value===previous.rendered?previous.source:value,rendered=translate(source,locale);saved[attr]={source,rendered};attributes.set(node,saved);if(value!==rendered)node.setAttribute(attr,rendered);}
    for(const child of node.childNodes)apply(child);
  }
  const options={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrs};
  const observer=new MutationObserver(records=>{
    observer.disconnect();
    const roots=new Set(records.map(record=>record.target));
    for(const root of roots)if(root.isConnected)apply(root);
    observer.observe(document.body,options);
  });
  function setLanguage(value,persist=false){
    locale=languageCode(value)??'zh';observer.disconnect();
    document.documentElement.lang=locale==='zh'?'zh-CN':locale;
    document.documentElement.dir=locale==='ar'?'rtl':'ltr';
    picker.value=locale;document.getElementById('language-name').textContent=LANGUAGES.find(([id])=>id===locale)[1];document.title=locale==='zh'?'潮生 · 在潮水之间，世界生长':'Tideborn · '+translate('在潮水之间，世界生长。',locale);
    apply(document.body);observer.observe(document.body,options);
    if(persist){try{localStorage.setItem(LANGUAGE_KEY,locale);}catch{document.getElementById('language-status').textContent=translate('语言已切换，但浏览器无法记住选择。',locale);}}
  }
  picker.addEventListener('change',()=>{setLanguage(picker.value,true);menu.open=false;summary.focus();});
  const menu=document.getElementById('language-menu'),summary=menu.querySelector('summary');
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){event.stopPropagation();menu.open=false;summary.focus();}});
  document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))menu.open=false;});
  setLanguage(locale);
  return {get language(){return locale;},refresh:()=>setLanguage(locale)};
}

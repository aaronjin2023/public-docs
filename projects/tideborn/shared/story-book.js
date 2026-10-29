import {CITIES} from '../src/world-data.js';
import {elementOf,spiritSVG} from './elements.js';
import {icon} from './icons.js';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createStoryBook({host,read,submit,theatre}){
 let filter='near',signature='',working=false;
 host.innerHTML=`<div class="book-intro"><h3>每一座岛，都有没讲完的事。</h3><p>18条故事线 · 54个连续章节。故乡的两条地方故事，加上六种伙伴故事，等待你的选择。</p><p class="fine">每季主动探访一章；打开后有5分钟回应。幼年由家人代为行动，不占用人生当季安排。错过也会留下记录，后章可以继续。</p></div><div id="book-summary" role="status"></div><label for="book-filter">翻阅故事</label><select id="book-filter"><option value="near">我的故乡与伙伴</option><option value="ready">现在可探访</option><option value="done">已完成与纪念</option><option value="all">六岛全部故事</option></select><div id="book-cards"></div><section id="book-legacy"></section>`;
 const cards=host.querySelector('#book-cards'),summary=host.querySelector('#book-summary'),legacy=host.querySelector('#book-legacy');
 host.querySelector('select').onchange=e=>{filter=e.target.value;signature='';render(read());};
 host.onclick=async e=>{
  const b=e.target.closest('[data-arc]');if(!b||working)return;
  const s=read(),a=s?.storyBook?.find(a=>a.id===b.dataset.arc);if(!a)return;
  if(a.active){theatre.encounter(s.person.encounter);return;}
  working=true;signature='';render(s);
  try{const result=await submit('/api/story',{arcId:a.id,chapterIndex:a.chapterIndex,expectedTick:s.tick});if(result?.ok&&result.data.person?.encounter)theatre.encounter(result.data.person.encounter);}
  finally{working=false;signature='';render(read());}
 };
 function render(s){if(!s)return;const list=s.storyBook??[],key=JSON.stringify([list,s.person?.storyLegacy,filter,working]);if(key===signature)return;signature=key;
  const opened=new Set([...cards.querySelectorAll('details[open]')].map(x=>x.dataset.memory));
  const ready=list.filter(a=>a.available).length,done=list.filter(a=>a.ending).length;
  summary.textContent=s.person?`这一生已完成 ${done} 条 · 此刻可探访 ${ready} 条${s.person.encounter?' · 先回应眼前的际遇':''}`:'可以先翻阅题目；降生后开启故乡与伙伴的故事。';
  const visible=list.filter(a=>filter==='all'||filter==='done'&&a.ending||filter==='ready'&&(a.available||a.active)||filter==='near'&&a.local);
  cards.innerHTML=visible.length?visible.map(a=>`<article class="story-card ${a.ending?'completed':''}"><div class="story-card-label">${a.element?spiritSVG(a.element):icon('compass')}<span>${a.element?`${elementOf(a.element).name} · 伙伴故事`:CITIES.find(c=>c.id===a.city).name+' · 地方故事'}</span><b>${Math.min(a.chapterIndex,3)} / 3</b></div><h3>${safe(a.title)}</h3><p>${safe(a.theme)}</p><p class="fine">${safe(a.who)} · ${safe(a.place)}</p><div class="chapter-track" aria-label="已完成${a.chapterIndex}章，共3章">${[0,1,2].map(n=>`<i class="${n<a.chapterIndex?'done':''}"></i>`).join('')}</div>${a.ending?`<p class="story-keepsake">${icon('leaf')}纪念 · ${safe(a.ending)}</p>`:`<p class="next-chapter">第 ${a.chapterIndex+1} 章 · ${safe(a.chapterTitle)}</p><button data-arc="${a.id}" ${working||!a.available&&!a.active?'disabled':''}>${icon('book')}${a.active?'继续这一幕':a.available?'探访这一章':safe(a.locked)}</button>`}${a.steps.length?`<details data-memory="${a.id}" ${opened.has(a.id)?'open':''}><summary>已走过的路</summary><ol>${a.steps.map(step=>`<li><strong>${safe(step.label)}</strong><p>${safe(step.outcome)}</p></li>`).join('')}</ol></details>`:''}</article>`).join(''):'<p class="quiet-note">这一页暂时没有故事。可切换到故乡与伙伴，查看下一章的条件。</p>';
  const inherited=s.person?.storyLegacy??[];legacy.innerHTML=inherited.length?`<h3>前代留下的回声</h3><p class="fine">留下的是记忆，不是重复领取的奖励。新一代可以选择不同的路。</p>${inherited.map(a=>`<p class="story-keepsake">第 ${a.generation} 代 · ${safe(a.title)}<br>${safe(a.ending)}</p>`).join('')}`:'';
 }
 return {render};
}

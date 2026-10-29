import {elementOf,spiritName,spiritSVG} from './elements.js';
import {formOf} from './evolution-data.js';
export function createEvolutionUI({read,submit}){
  const dialog=document.createElement('dialog');dialog.className='evolution-dialog';dialog.setAttribute('aria-labelledby','evolution-title');document.body.append(dialog);
  let spiritId=null,selected=null,waiting=false,stamp='',opener=null;
  const unit=()=>read()?.spirits?.owned.find(u=>u.id===spiritId);
  const bonus=f=>`元素力 +${f.force} · 体力 +${f.hp} · 攻击 +${f.attack} · 防御 +${f.guard}`;
  function render(){
    if(!dialog.open)return;const u=unit();
    if(!u){dialog.close();return;}
    const signature=JSON.stringify([u,selected,waiting]);if(signature===stamp)return;stamp=signature;
    const scroll=dialog.scrollTop,active=document.activeElement?.dataset?.form,confirm=document.activeElement?.hasAttribute('data-evolve-confirm');
    const current=formOf(u),target=u.tree.find(f=>f.id===selected),e=elementOf(u.element);
    dialog.innerHTML=`<header><div><p class="fine">${e.element}元素 · 编号 ${u.id}</p><h2 id="evolution-title" tabindex="-1">${spiritName(u)}的进阶树</h2></div><button data-close aria-label="关闭进阶树">×</button></header>
    <div class="evolution-root">${spiritSVG(u.element,u.form)}<div><strong>${current?.name??e.name} · Lv.${u.level}</strong><p>元素力 ${u.force} · 体力 ${u.maxHP}<br>攻击 ${u.attack} · 防御 ${u.guard}</p></div></div>
    <p class="fine">原生 → 选择一条路线 → 完成终阶。进阶后不能改道；每人、每只精灵每季最多一次，不消耗其他精灵。等级和形态分别成长。</p>
    <div class="evolution-branches">${[['keeper','守望之路','培养与岛屿共鸣，偏重元素力和防御。'],['runner','远征之路','切磋与元素试炼，偏重攻击。']].map(([path,title,copy])=>`<section><h3>${title}</h3><p class="fine">${copy}</p>${u.tree.filter(f=>f.path===path).map(f=>`<article class="evolution-node ${f.current?'current':''} ${f.reached?'reached':''}">
    <div class="evolution-form">${spiritSVG(u.element,f.id)}<div><small>${f.tier===1?'初阶':'终阶'}${f.current?' · 当前':f.reached?' · 已走过':''}</small><h4>${f.name}</h4></div></div>
    <p>${f.description}</p><p class="evolution-bonus">${bonus(f)}<br><small>相对同等级原生形态的总加成</small></p>
    <ul>${f.checks.map(c=>`<li class="${c.met?'met':''}"><span aria-label="${c.met?'已满足':'未满足'}"><svg class="evolution-check" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">${c.met?'<path d="m3 8 3 3 7-8"/>':'<circle cx="8" cy="8" r="5"/>'}</svg></span><span>${c.label}<b>${c.value} / ${c.target}${c.unit??''}</b></span></li>`).join('')}</ul>
    <button data-form="${f.id}" ${waiting||!f.available?'disabled':''}>${f.available?`选择${f.name} · ${f.cost}铜`:f.reason}</button></article>`).join('')}</section>`).join('')}</div>
    ${target?`<section class="evolution-confirm" aria-live="polite"><h3>进阶为${target.name}</h3><p>本次变化：元素力 +${target.force-(current?.force??0)}，体力 +${target.hp-(current?.hp??0)}，攻击 +${target.attack-(current?.attack??0)}，防御 +${target.guard-(current?.guard??0)}。</p><p>消耗 ${target.cost} 铜。编号与经验不变，选择后不能改道。</p>${!target.available?`<p>${target.reason}</p>`:''}<button class="primary" data-evolve-confirm ${waiting||!target.available?'disabled':''}>${waiting?'正在进阶…':'确认进阶 · '+target.cost+'铜'}</button><button data-cancel ${waiting?'disabled':''}>再想一想</button></section>`:''}
    ${u.evolutions.length?`<details class="evolution-history"><summary>这只精灵走过的路</summary><ol>${u.evolutions.map(h=>`<li>第 ${h.tick} 季 · ${u.tree.find(f=>f.id===h.to).name} · ${h.cost}铜</li>`).join('')}</ol></details>`:''}
    <p class="fine">培养与切磋次数从进阶系统启用后记录。旧经验保留；满级仍可陪伴和切磋来完成试炼。放归、再次结伴和家族传承都保留路线与记录。</p>`;
    dialog.scrollTop=scroll;
    if(confirm)dialog.querySelector('[data-evolve-confirm]')?.focus({preventScroll:true});else if(active)dialog.querySelector(`[data-form="${active}"]`)?.focus({preventScroll:true});
  }
  dialog.addEventListener('close',()=>{selected=null;stamp='';const target=opener?.isConnected?opener:document.querySelector(`[data-tree="${spiritId}"]`)??document.querySelector('[data-panel=spirits]');target?.focus({preventScroll:true});});
  dialog.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-close'))dialog.close();
    else if(b.dataset.form){selected=b.dataset.form;render();dialog.querySelector('[data-evolve-confirm]')?.focus();}
    else if(b.hasAttribute('data-cancel')){const previous=selected;selected=null;render();dialog.querySelector(`[data-form="${previous}"]`)?.focus();}
    else if(b.hasAttribute('data-evolve-confirm')&&!waiting){
      const formId=selected;waiting=true;render();
      try{const result=await submit('/api/spirits',{action:'evolve',spiritId,formId,expectedTick:read().tick});if(result?.ok){selected=null;dialog.scrollTop=0;}}finally{waiting=false;render();dialog.querySelector('#evolution-title')?.focus({preventScroll:true});}
    }
  });
  return {render,open(id){spiritId=id;selected=null;stamp='';opener=document.activeElement;dialog.showModal();render();dialog.scrollTop=0;dialog.querySelector('#evolution-title').focus({preventScroll:true});}};
}

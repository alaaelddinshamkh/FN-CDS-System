/* Mobile launchpad reuses the application's existing routes and account guards. */
(()=>{
const mobile=matchMedia('(max-width:700px)'),root=document.documentElement;
const hub=document.createElement('section');hub.id='mobile-dashboard';hub.setAttribute('aria-label','Main dashboard');
hub.innerHTML='<div class="mobile-welcome"><span class="mobile-eyebrow">FN CLINICAL · WORKSPACE</span><h1>Your care workspace</h1><p>Choose a section to get started.</p></div><div class="mobile-shortcuts"></div><div id="mobile-sections"></div><p class="mobile-footnote">Synthetic training environment</p>';
document.querySelector('#app').before(hub);
const home=document.createElement('button');home.className='btn mobile-home-button';home.textContent='Dashboard';home.setAttribute('aria-label','Back to main dashboard');document.querySelector('.top').prepend(home);
function show(){root.classList.add('mobile-home');draw();window.scrollTo({top:0,behavior:'instant'})}
home.onclick=show;
const originalGo=window.go;window.go=function(...args){if(mobile.matches)root.classList.remove('mobile-home');return originalGo.apply(this,args)};
const brand=document.querySelector('.brand');brand.addEventListener('click',e=>{if(mobile.matches){e.preventDefault();e.stopImmediatePropagation();show()}},true);
const info={ 'Connected demo':'Shared visits and team tasks','Overview':'Patient registry and overview','Assessment to action':'20 scenarios, risk and first-hour drafts','Results & integration':'Results and data exchange','Escalation center':'Review escalation activity','Safety & process':'Safety checks and processes','Clinical quality':'Clinical measures and trends','Financial impact':'Value and financial measures','Alert governance':'Rules and alert management','Audit trail':'Review recorded actions','Scope & evidence':'Scope, sources and evidence'};
function draw(){
 const target=hub.querySelector('#mobile-sections');target.replaceChildren();let grid;
 for(const node of document.querySelector('#nav').children){if(node.classList.contains('nav-group-label')){const h=document.createElement('h2');h.textContent=node.textContent;target.append(h);grid=document.createElement('div');grid.className='mobile-tile-grid';target.append(grid)}else if(node.tagName==='BUTTON'){if(!grid){grid=document.createElement('div');grid.className='mobile-tile-grid';target.append(grid)}const card=document.createElement('button');card.className='mobile-tile';const svg=node.querySelector('svg');if(svg)card.append(svg.cloneNode(true));const title=node.querySelector('span')?.textContent||node.textContent;const strong=document.createElement('strong');strong.textContent=title;card.append(strong);const sub=document.createElement('small');sub.textContent=info[title]||'Open section';card.append(sub);card.onclick=()=>{root.classList.remove('mobile-home');node.click();window.scrollTo({top:0,behavior:'instant'})};grid.append(card)}}
 const shortcuts=hub.querySelector('.mobile-shortcuts');shortcuts.replaceChildren();
 for(const [label,detail,fn]of [['My account','Profile & approvals',()=>window.fnAccount.load()],['Messages','Inbox & notifications',()=>window.fnMessages.open()],['Voice calls','Internet audio',()=>Array.from(document.querySelectorAll('.top button')).find(b=>b.textContent==='Voice calls')?.click()]]){const b=document.createElement('button');b.className='mobile-shortcut';const strong=document.createElement('strong');strong.textContent=label;const small=document.createElement('small');small.textContent=detail;b.append(strong,small);b.onclick=fn;shortcuts.append(b)}
 if(window.fnAccount?.isOwner()){const b=document.createElement('button');b.className='mobile-shortcut';b.innerHTML='<strong>Registration requests</strong><small>Review & approve users</small>';b.onclick=()=>window.fnAccount.admin();shortcuts.append(b)}
}
new MutationObserver(()=>{if(mobile.matches)draw()}).observe(document.querySelector('#nav'),{childList:true});
new MutationObserver(()=>{if(mobile.matches&&root.classList.contains('mobile-home'))draw()}).observe(document.querySelector('.top'),{subtree:true,childList:true,characterData:true});
mobile.addEventListener('change',()=>{if(mobile.matches)show()});if(mobile.matches)show();
})();

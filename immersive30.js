(() => {
'use strict';
const language=document.documentElement.lang||'zh',t=(z,e,j)=>language==='en'?e:language==='ja'?j:z;
const wechat=/MicroMessenger/i.test(navigator.userAgent);
const mobile=()=>matchMedia('(pointer:coarse)').matches||innerWidth<=600||(innerWidth<=1024&&innerHeight<=600);
const landscape=()=>mobile()&&innerWidth>innerHeight;
const dock=document.getElementById('scene-dock');
const full=document.createElement('button');full.id='btn-fullscreen';full.type='button';full.setAttribute('aria-label',t('全屏','Full screen','全画面'));full.title=t('全屏','Full screen','全画面');
full.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg>';document.body.append(full);
let host=document;
try{if(parent!==window&&parent.location.origin===location.origin)host=parent.document;}catch{}
const actualFull=()=>Boolean(host.fullscreenElement||host.webkitFullscreenElement);
let fallback=false;
function syncFull(){const active=actualFull()||fallback;full.setAttribute('aria-pressed',String(active));full.setAttribute('aria-label',active?t('退出全屏','Exit full screen','全画面を終了'):t('全屏','Full screen','全画面'));if(wechat)full.setAttribute('aria-label',active?t('退出沉浸','Exit immersive view','没入モードを終了'):t('沉浸模式','Immersive view','没入モード'));full.title=full.getAttribute('aria-label');document.body.classList.toggle('fullscreen-active',active);}
function toast(s){const n=document.createElement('div');n.className='share-status';n.textContent=s;document.body.append(n);setTimeout(()=>n.remove(),4000);}
full.onclick=async()=>{
 try{
  if(actualFull()){await (host.exitFullscreen?.()||host.webkitExitFullscreen?.());}
  else if(fallback){fallback=false;document.body.classList.remove('immersive-fallback');}
  else{const root=host.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;
   if(request&&!wechat)await request.call(root);
   else{fallback=true;document.body.classList.add('immersive-fallback');toast(t('已开启沉浸模式。微信可从右上角菜单选择在浏览器中打开。','Immersive mode on; this browser does not support page fullscreen.','没入モード：このブラウザは全画面表示に未対応です。'));}
  }
 }catch{fallback=true;document.body.classList.add('immersive-fallback');toast(t('浏览器限制了全屏，已开启沉浸模式。','Browser fullscreen is restricted; immersive mode is on.','ブラウザの制限により、没入モードを開始しました。'));}
 syncFull();wake();
};
host.addEventListener('fullscreenchange',syncFull);host.addEventListener('webkitfullscreenchange',syncFull);
let timer=0,hidden=false,holding=new Set();
const blocked=()=>Boolean(document.querySelector('dialog[open],.nearby-resorts.expanded')||!document.getElementById('feature-panel')?.hidden||dock?.contains(document.activeElement)&&document.activeElement.matches('select'));
function setHidden(v){hidden=v;document.body.classList.toggle('controls-asleep',v);if(dock){dock.inert=v;dock.setAttribute('aria-hidden',String(v));}}
function arm(){clearTimeout(timer);if(landscape())timer=setTimeout(()=>{if(holding.size||blocked()){arm();return;}setHidden(true);},3000);}
function wake(){setHidden(false);arm();}
document.addEventListener('pointerdown',e=>{holding.add(e.pointerId);wake();},{capture:true,passive:true});
document.addEventListener('pointermove',e=>{if(holding.has(e.pointerId))wake();},{capture:true,passive:true});
for(const type of ['pointerup','pointercancel'])document.addEventListener(type,e=>{holding.delete(e.pointerId);arm();},{capture:true,passive:true});
document.addEventListener('wheel',wake,{passive:true});document.addEventListener('keydown',wake);document.addEventListener('click',wake,{passive:true});
document.addEventListener('snowatlas:trail-closed',wake);
function layout(){document.body.classList.toggle('landscape-immersive',landscape());full.hidden=!landscape();wake();syncFull();}
window.addEventListener('resize',layout);window.addEventListener('orientationchange',layout);document.addEventListener('visibilitychange',()=>{holding.clear();if(document.hidden)clearTimeout(timer);else wake();});
const KEY='snowatlas-landscape-hint-v1';let seen=false;try{seen=localStorage.getItem(KEY)==='seen';}catch{}
const ack=()=>{seen=true;try{localStorage.setItem(KEY,'seen');}catch{}};
const hint=document.createElement('dialog');hint.className='operation-guide landscape-hint';hint.setAttribute('aria-labelledby','landscape-hint-title');
const title=document.createElement('h2');title.id='landscape-hint-title';title.textContent=t('横屏看山，更舒服','More room in landscape','横向きで、もっと見やすく');
const p=document.createElement('p');p.textContent=t('横屏后点右上角全屏。轻触地图唤出工具栏，停手 3 秒自动收起。','Rotate, then tap fullscreen at the top right. Touch the map for controls; they fade after 3 seconds.','横向きにして右上の全画面ボタンを。画面に触れるとツールが表示され、3秒後に隠れます。');
const ok=document.createElement('button');ok.className='extra-button';ok.textContent=t('知道了','Got it','わかりました');ok.onclick=()=>hint.close();hint.append(title,p,ok);hint.addEventListener('close',()=>{ack();wake();});document.body.append(hint);
const guide=document.querySelector('.operation-guide:not(.landscape-hint)');
let mounted=false;
function tryHint(){if(seen||!mobile()||innerWidth>innerHeight||!document.querySelector('.scene-extras'))return;
 if(guide?.open){if(!guide.querySelector('.rotate-note')){const note=document.createElement('p');note.className='rotate-note';note.textContent=t('建议横屏：可全屏看山，工具栏会自动收起。','Tip: rotate for fullscreen and auto-hiding controls.','横向きなら全画面とツールの自動非表示が使えます。');guide.insertBefore(note,guide.lastElementChild);guide.addEventListener('close',ack,{once:true});}return;}
 if(!document.querySelector('dialog[open]')&&!hint.open)hint.showModal();
}
const old=window.snowAtlasMountActions;window.snowAtlasMountActions=()=>{old?.();mounted=true;requestAnimationFrame(tryHint);};
layout();if(document.querySelector('.scene-extras'))requestAnimationFrame(tryHint);
})();

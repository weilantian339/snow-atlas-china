(() => {
'use strict';
const allResorts = (window.SNOW_ATLAS_RESORTS || []).slice().sort((a,b) => b.mappedPisteKm-a.mappedPisteKm || a.rank-b.rank);
const $ = (id) => document.getElementById(id);
const t=s=>window.SnowI18n?.t(s)||s;
const displayName=r=>window.SnowI18n?.name(r.id)||r.name;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let country=localStorage.getItem('snow-country')==='JP'?'JP':'CN';
let resorts=allResorts.filter(r=>(r.country||'CN')===country);
let overviewBounds=country==='JP'?[[138.68,36.77],[139.04,37.19]]:[[73,17],[136,54]];
if (!window.maplibregl || !resorts.length) { $('atlas-message').textContent = '地图库或雪场列表未加载，请检查网络和本地文件。'; return; }
// 110m Natural Earth boundaries are design-context only, not approved national surveying data.
const style = {
 version:8, name:'China · Resort Atlas',
 sources:{
  'japan-roads':{type:'geojson',data:'./data/japan-roads.geojson'},
  'south-sea':{type:'geojson',data:'./data/south-sea.geojson'},'provinces':{type:'geojson',data:'./data/provinces.geojson',attribution:'Province outlines: DataV GeoAtlas'},
  'world':{type:'geojson',data:'./data/world.geojson', attribution:'Natural Earth, public domain (simplified overview)'},
  'china':{type:'geojson',data:'./data/china.geojson', attribution:'Natural Earth (overview outline, not authoritative)'}
 },
 layers:[
  {id:'base',type:'background',paint:{'background-color':'#071b2a'}},
  {id:'land',type:'fill',source:'world',paint:{'fill-color':'#244458','fill-opacity':.65}},
  
  {id:'japan-land',type:'fill',source:'world',filter:['==',['get','name'],'Japan'],paint:{'fill-color':'#d8e7e8','fill-opacity':.98}},
  {id:'mainland',type:'fill',source:'china',paint:{'fill-color':'#d8e7e8','fill-opacity':.98}},
  {id:'japan-roads',type:'line',source:'japan-roads',minzoom:8,paint:{'line-color':'#94a5a8','line-width':1,'line-opacity':.38}},
  {id:'province-lines',type:'line',source:'provinces',paint:{'line-color':'#7e9da6','line-opacity':0.24,'line-width':0.65}},
  {id:'south-sea-lines',type:'line',source:'south-sea',paint:{'line-color':'#d8e7e8','line-width':1.8}},{id:'outline',type:'line',source:'china',paint:{'line-color':'#eaf7f8','line-width':1.1,'line-opacity':.95}}
 ]
};
const map = new maplibregl.Map({container:'atlas-map',style,center:country==='JP'?[138.84,36.98]:[104,37],zoom:country==='JP'?9:3.05,minZoom:1.6,maxZoom:13,renderWorldCopies:false,dragRotate:false,pitchWithRotate:false,scrollZoom:true,maxPitch:0,attributionControl:false,antialias:false,pixelRatio:Math.min(devicePixelRatio||1,1.8)});
let lastResort=null;
let isOpen=false;
const anchors=new Map();
const labelLayer=document.createElement('div');
labelLayer.className='resort-label-layer';
$('atlas-map').appendChild(labelLayer);
const leaderSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');leaderSvg.classList.add('resort-elbow');labelLayer.append(leaderSvg);
let framePending=false;
function fitChina(){const small=innerWidth<=600;map.fitBounds(overviewBounds,{padding:{top:small?88:95,right:small?20:45,bottom:small?105:75,left:small?20:45},duration:reduced?0:650,maxZoom:country==='JP'?10:4.05});}
function overlaps(a,b,pad=5){return !(a.x+a.w+pad<b.x||b.x+b.w+pad<a.x||a.y+a.h+pad<b.y||b.y+b.h+pad<a.y);}
const labelNodes=new Map();
const mobileGroups=new Map();
const groups=[
 {id:'northwest',name:'新疆',center:[88.5,46.8],items:resorts.filter(r=>r.region.startsWith('新疆'))},
 {id:'northeast',name:'东北',center:[127,44.5],items:resorts.filter(r=>/^(吉林|黑龙江)/.test(r.region))},
 {id:'beijing',name:'京冀',center:[116.1,40.7],items:resorts.filter(r=>/^(河北|北京)/.test(r.region))},
 {id:'shaanxi',name:'陕西',center:[107.6,34],items:resorts.filter(r=>r.region.startsWith('陕西'))}
];
function renderMobileGroups(){
 const grouped=country==='CN'&&innerWidth<=600&&map.getZoom()<4.5;
 for(const g of groups){if(!g.items.length)continue;
  let b=mobileGroups.get(g.id);
  if(!b){b=document.createElement('button');b.className='region-cluster';b.textContent=t(g.name)+' · '+g.items.length;b.setAttribute('aria-label',t('查看地区')+' '+t(g.name)+' '+g.items.length);b.onclick=()=>{
    const xs=g.items.map(r=>r.center[0]),ys=g.items.map(r=>r.center[1]);
    map.fitBounds([[Math.min(...xs)-.15,Math.min(...ys)-.15],[Math.max(...xs)+.15,Math.max(...ys)+.15]],{padding:{top:100,right:55,bottom:140,left:55},maxZoom:7.8,duration:reduced?0:750});
  };labelLayer.append(b);mobileGroups.set(g.id,b);}
  const p=map.project(g.center);b.hidden=!grouped;b.style.left=p.x+'px';b.style.top=p.y+'px';
 }
 return grouped;
}

let needsLayout=true;
function layoutLabels(){
 if(isOpen)return;
 const w=map.getContainer().clientWidth,h=map.getContainer().clientHeight;
 const grouped=renderMobileGroups();
 if(grouped){for(const n of labelNodes.values()){n.label.style.display='none';n.point.style.display='none';n.path.style.display='none';}needsLayout=true;return;}

 const visible=resorts.map(r=>({r,p:map.project(r.center)})).filter(o=>o.p.x>-60&&o.p.x<w+60&&o.p.y>-60&&o.p.y<h+60);
 for(const r of resorts){
  if(labelNodes.has(r.id))continue;
  const label=document.createElement('button');label.type='button';label.className='pin pin-name resort-label'+(r.id==='wanda'?' is-wanda':'');label.textContent=displayName(r);label.setAttribute('aria-label',t('进入雪场')+' '+displayName(r));label.dataset.i18nSkip='true';label.onclick=()=>openResort(r);
  const point=document.createElement('span');point.className='resort-anchor';
  const svg=leaderSvg;
  const path=document.createElementNS(svg.namespaceURI,'path');svg.appendChild(path);labelLayer.append(point,label);labelNodes.set(r.id,{label,point,svg,path});
 }
 const active=new Set(visible.map(o=>o.r.id));for(const [id,n] of labelNodes){for(const el of [n.label,n.point])el.style.display=active.has(id)?'':'none';n.path.style.display=active.has(id)?'':'none';}
 if(needsLayout){
  const placed=[];
  const minY=innerWidth<=600?130:125,maxY=h-(innerWidth<=600?92:80);
  // Stable geographic order, previous offsets preferred; exhaustive grid avoids overlap.
  for(const {r,p} of visible.sort((a,b)=>b.r.center[1]-a.r.center[1]||a.r.center[0]-b.r.center[0])){
   const n=labelNodes.get(r.id),bw=n.label.offsetWidth,bh=n.label.offsetHeight;
   const candidates=[];const prev=anchors.get(r.id);if(prev)candidates.push(prev);
   for(let radius=0;radius<=Math.max(w,h);radius+=24){for(let angle=0;angle<16;angle++){const t=angle*Math.PI/8;candidates.push([Math.cos(t)*radius,Math.sin(t)*radius-32]);}}
   let best=null,score=Infinity;
   for(const [dx,dy] of candidates){
    const x=Math.max(12,Math.min(w-bw-12,p.x+dx-bw/2)),y=Math.max(minY,Math.min(maxY-bh,p.y+dy-bh/2));const box={x,y,w:bw,h:bh};
    const collisions=placed.filter(b=>overlaps(box,b,5)).length;
    const v=collisions*1e8+Math.hypot(x+bw/2-p.x,y+bh/2-p.y)+(prev?Math.hypot(dx-prev[0],dy-prev[1])*.12:0);
    if(v<score){score=v;best=box;}
   }
   placed.push(best);anchors.set(r.id,[best.x+best.w/2-p.x,best.y+best.h/2-p.y]);
  }
  needsLayout=false;
 }
 for(const {r,p} of visible){const n=labelNodes.get(r.id),[dx,dy]=anchors.get(r.id)||[0,-32];const x=p.x+dx,y=p.y+dy;
  n.label.style.left=x+'px';n.label.style.top=y+'px';n.point.style.left=p.x+'px';n.point.style.top=p.y+'px';
  const edge=x+(p.x<x?-1:1)*n.label.offsetWidth/2;
  n.path.setAttribute('d',`M ${p.x} ${p.y} L ${edge+(p.x<edge?-14:14)} ${y} L ${edge} ${y}`);
 }
 $('zoom-chip').textContent=map.getZoom()<5?'CHINA / OVERVIEW':'REGION / EXPLORE';
}
function renderPins(){
 if(framePending)return;framePending=true;
 requestAnimationFrame(()=>{framePending=false;layoutLabels();});
}
function openResort(resort){
 if(isOpen)return;
 isOpen=true;lastResort=resort;
 map.stop();toggleList(false);
 const frame=$('scene-frame');
 frame.src='./scene.html?id='+encodeURIComponent(resort.id)+'&embedded=1&lang='+encodeURIComponent(localStorage.getItem('snow-language')||document.documentElement.lang)+(location.search.includes('dem=mapterhorn')?'&dem=mapterhorn':'');
 $('resort-overlay').hidden=false;
 $('catalog').hidden=true;
 $('btn-list').setAttribute('aria-expanded','false');
 document.body.classList.add('in-scene');
 history.pushState({snowAtlasResort:resort.id},'',location.href);
 $('btn-back').focus({preventScroll:true});
}
function closeResort(){
 if(!isOpen)return;
 isOpen=false;
 $('resort-overlay').hidden=true;
 $('scene-frame').src='about:blank'; // release WebGL map and DEM tiles
 document.body.classList.remove('in-scene');warm();
 renderPins();
 labelNodes.get(lastResort?.id)?.label.focus({preventScroll:true});
}
window.addEventListener('popstate',()=>{if(isOpen)closeResort();});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('scene-frame').contentWindow)return;
 if(e.data?.type==='snowatlas:close'){if(history.state?.snowAtlasResort)history.back();else closeResort();}
});
$('btn-back').addEventListener('click',()=>{const pushed=Boolean(history.state?.snowAtlasResort);closeResort();if(pushed)history.back();});
$('btn-home').addEventListener('click',fitChina);
function toggleList(force){const open=typeof force==='boolean'?force:$('catalog').hidden;$('catalog').hidden=!open;$('catalog-backdrop').hidden=!open;$('btn-list').setAttribute('aria-expanded',String(open));if(!open)$('btn-list').focus({preventScroll:true});}
$('catalog-backdrop').addEventListener('click',()=>toggleList(false));
$('resort-search').addEventListener('input',e=>{const q=e.target.value.trim().toLocaleLowerCase();let count=0;for(const row of document.querySelectorAll('.catalog-row')){row.hidden=!row.dataset.search.includes(q);if(!row.hidden)count++;}$('catalog-empty').hidden=count>0;});
$('btn-list').addEventListener('click',()=>toggleList());
$('btn-close-list').addEventListener('click',()=>toggleList(false));
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(isOpen){if(history.state?.snowAtlasResort)history.back();else closeResort();}else toggleList(false);}if(e.key.toLowerCase()==='h'&&!isOpen&&!(e.target instanceof HTMLInputElement))fitChina();});
function renderCatalog(){
 $('resort-list').replaceChildren();
for(const r of resorts){
 const row=document.createElement('button');row.type='button';row.className='catalog-row';
 const index=document.createElement('span');index.className='rank-no';index.textContent=String(r.rank).padStart(2,'0');
 const main=document.createElement('span');main.className='row-main';
 const name=document.createElement('div');name.className='row-name';name.textContent=displayName(r);name.dataset.i18nSkip='true';
 const region=document.createElement('div');region.className='row-region';region.textContent=r.region;
 main.append(name,region);
 const km=document.createElement('span');km.className='row-km';km.textContent=r.mappedPisteKm+' km';km.dataset.resort=r.id;
 row.append(index,main,km);
 row.title=t('进入雪场')+' '+displayName(r);row.dataset.search=(r.name+' '+(r.name_ja||'')+' '+(r.name_en||'')+' '+displayName(r)+' '+r.region+' '+r.id).toLocaleLowerCase();
 row.addEventListener('click',()=>{toggleList(false);openResort(r);});
 $('resort-list').append(row);
}
}
renderCatalog();
// Read-only coverage badge in catalogue. Never pass unverified candidates off as certified resort data.
fetch('./data/coverage.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(c=>{
  if(!c)return;
  for(const cell of document.querySelectorAll('.row-km[data-resort]')){
    const e=c[cell.dataset.resort]; if(!e)continue;
    cell.title=e.state==='ready_unverified'
      ? `已载入 OSM 候选线路：雪道 ${e.pistes}，索道 ${e.lifts}（未核验）`
      : '仍需下载或核查GIS线路';
    cell.classList.toggle('has-gis',e.state==='ready_unverified');
  }
}).catch(e=>console.info('[Snow Atlas] Coverage not available:',e.message));
const routeCache=new Map();
window.snowAtlasRoute=function(id){
 if(!allResorts.some(r=>r.id===id))return Promise.reject(Error('Unknown resort'));
 if(!routeCache.has(id))routeCache.set(id,window.snowData('./data/resorts/'+id+'.geojson').catch(e=>{routeCache.delete(id);throw e;}));
 return routeCache.get(id);
};
let pending=[...resorts],done=0,failed=0,workers=0;
function warm(){
 if(document.hidden || isOpen || navigator.connection?.saveData || /(^|-)2g/.test(navigator.connection?.effectiveType||''))return;
 const box=$('warmup'),bar=$('warm-bar'),msg=$('warm-text');
 if(!pending.length)return;
 box.hidden=false;bar.max=resorts.length;
 const update=()=>{bar.value=done;msg.textContent='雪场线路预载 '+done+' / '+resorts.length+(failed?' · '+failed+' 家进入时重试':'');};
 update();
 while(workers<2 && pending.length){workers++;(async()=>{
   while(!isOpen && !document.hidden && pending.length){
     const r=pending.shift();try{await window.snowAtlasRoute(r.id);done++;}catch{failed++;}update();
   }
   workers--;if(!pending.length&&!workers)setTimeout(()=>box.hidden=true,1800);
 })();}
}
document.addEventListener('visibilitychange',warm);
map.on('load',()=>{applyCountry();fitChina();renderPins();setTimeout(warm,500);
 const attribution=document.querySelector('.maplibregl-ctrl-attrib');if(attribution){attribution.removeAttribute('open');attribution.classList.remove('maplibregl-compact-show');}
});
map.on('move',renderPins);
map.on('zoomend',()=>{needsLayout=true;renderPins();});
map.on('moveend',renderPins);
map.on('resize',()=>{needsLayout=true;renderPins();});
document.fonts?.ready.then(()=>{needsLayout=true;renderPins();});
map.on('error',e=>{console.warn('[Snow Atlas] Overview map warning:',e.error?.message||e);});
const select=$('country-select');select.value=country;
function applyCountry(){
 for(const id of ['mainland','province-lines','south-sea-lines','outline'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',country==='CN'?'visible':'none');
 if(map.getLayer('japan-roads'))map.setLayoutProperty('japan-roads','visibility',country==='JP'?'visible':'none');
 $('btn-home').querySelector('span').textContent=country==='JP'?t('区域全览'):t('全国视角');
 $('btn-back').setAttribute('aria-label',t('返回地图'));$('btn-home').setAttribute('aria-label',t(country==='JP'?'区域全览':'全国视角'));$('btn-home').title=t(country==='JP'?'区域全览':'全国视角');
 if(map.getLayer('japan-land'))map.setLayoutProperty('japan-land','visibility',country==='JP'?'visible':'none');
 document.querySelector('.mini-count').textContent=resorts.length;
 document.querySelector('.catalog-eyebrow').textContent='THE RESORTS / '+resorts.length;
}
select.addEventListener('change',()=>{
 country=select.value;localStorage.setItem('snow-country',country);
 resorts=allResorts.filter(r=>(r.country||'CN')===country);
 overviewBounds=country==='JP'?[[138.68,36.77],[139.04,37.19]]:[[73,17],[136,54]];
 for(const n of labelNodes.values())for(const e of [n.label,n.point,n.path])e.remove();
 labelNodes.clear();anchors.clear();needsLayout=true;
 $('resort-search').value='';$('catalog-empty').hidden=true;
 renderCatalog();applyCountry();window.dispatchEvent(new Event('snow-country-change'));pending=[...resorts];done=0;failed=0;fitChina();renderPins();warm();
});
window.__snowAtlasOverview=map;
})();
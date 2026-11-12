(() => {
'use strict';
const resorts = (window.SNOW_ATLAS_RESORTS || []).slice().sort((a,b) => b.mappedPisteKm-a.mappedPisteKm || a.rank-b.rank);
const $ = (id) => document.getElementById(id);
const overviewBounds = [[73, 17], [136, 54]];
if (!window.maplibregl || !resorts.length) { $('atlas-message').textContent = '地图库或雪场列表未加载，请检查网络和本地文件。'; return; }
// 110m Natural Earth boundaries are design-context only, not approved national surveying data.
const style = {
 version:8, name:'China · Resort Atlas',
 sources:{
  'provinces':{type:'geojson',data:'./data/provinces.geojson',attribution:'Province outlines: DataV GeoAtlas'},
  'world':{type:'geojson',data:'./data/world.geojson', attribution:'Natural Earth, public domain (simplified overview)'},
  'china':{type:'geojson',data:'./data/china.geojson', attribution:'Natural Earth (overview outline, not authoritative)'}
 },
 layers:[
  {id:'base',type:'background',paint:{'background-color':'#071b2a'}},
  {id:'land',type:'fill',source:'world',paint:{'fill-color':'#244458','fill-opacity':.65}},
  {id:'country-edges',type:'line',source:'world',paint:{'line-color':'#668394','line-opacity':.3,'line-width':.65}},
  {id:'mainland',type:'fill',source:'china',paint:{'fill-color':'#d8e7e8','fill-opacity':.98}},
  {id:'province-lines',type:'line',source:'provinces',paint:{'line-color':'#7e9da6','line-opacity':0.24,'line-width':0.65}},
  {id:'outline',type:'line',source:'china',paint:{'line-color':'#eaf7f8','line-width':1.1,'line-opacity':.95}}
 ]
};
const map = new maplibregl.Map({container:'atlas-map',style,center:[104,37],zoom:3.05,minZoom:2.55,maxZoom:13,renderWorldCopies:false,dragRotate:false,pitchWithRotate:false,scrollZoom:true,maxPitch:0,antialias:false,pixelRatio:Math.min(devicePixelRatio||1,1.8)});
let lastResort=null;
let isOpen=false;
const anchors=new Map();
const labelLayer=document.createElement('div');
labelLayer.className='resort-label-layer';
$('atlas-map').appendChild(labelLayer);
let framePending=false;
function fitChina(){map.fitBounds(overviewBounds,{padding:{top:112,right:45,bottom:75,left:45},duration:950,maxZoom:4.05});}
function overlaps(a,b,pad=5){return !(a.x+a.w+pad<b.x||b.x+b.w+pad<a.x||a.y+a.h+pad<b.y||b.y+b.h+pad<a.y);}
const labelNodes=new Map();
let needsLayout=true;
function layoutLabels(){
 if(isOpen)return;
 const w=map.getContainer().clientWidth,h=map.getContainer().clientHeight;
 const visible=resorts.map(r=>({r,p:map.project(r.center)})).filter(o=>o.p.x>-60&&o.p.x<w+60&&o.p.y>-60&&o.p.y<h+60);
 for(const r of resorts){
  if(labelNodes.has(r.id))continue;
  const label=document.createElement('button');label.type='button';label.className='pin pin-name resort-label'+(r.id==='wanda'?' is-wanda':'');label.textContent=r.name;label.setAttribute('aria-label','进入三维雪场：'+r.name);label.onclick=()=>openResort(r);
  const point=document.createElement('span');point.className='resort-anchor';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('resort-elbow');
  const path=document.createElementNS(svg.namespaceURI,'path');svg.appendChild(path);labelLayer.append(svg,point,label);labelNodes.set(r.id,{label,point,svg,path});
 }
 const active=new Set(visible.map(o=>o.r.id));for(const [id,n] of labelNodes){for(const el of [n.label,n.point,n.svg])el.style.display=active.has(id)?'':'none';}
 if(needsLayout){
  const placed=[];
  // Stable geographic order, previous offsets preferred; exhaustive grid avoids overlap.
  for(const {r,p} of visible.sort((a,b)=>b.r.center[1]-a.r.center[1]||a.r.center[0]-b.r.center[0])){
   const n=labelNodes.get(r.id),bw=n.label.offsetWidth,bh=n.label.offsetHeight;
   const candidates=[];const prev=anchors.get(r.id);if(prev)candidates.push(prev);
   for(let radius=0;radius<=Math.max(w,h);radius+=24){for(let angle=0;angle<16;angle++){const t=angle*Math.PI/8;candidates.push([Math.cos(t)*radius,Math.sin(t)*radius-32]);}}
   let best=null,score=Infinity;
   for(const [dx,dy] of candidates){
    const x=Math.max(12,Math.min(w-bw-12,p.x+dx-bw/2)),y=Math.max(150,Math.min(h-bh-70,p.y+dy-bh/2));const box={x,y,w:bw,h:bh};
    const collisions=placed.filter(b=>overlaps(box,b,10)).length;
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
 map.stop();
 const frame=$('scene-frame');
 frame.src='./scene.html?id='+encodeURIComponent(resort.id)+(location.search.includes('dem=mapterhorn')?'&dem=mapterhorn':'');
 $('resort-overlay').hidden=false;
 $('catalog').hidden=true;
 $('btn-list').setAttribute('aria-expanded','false');
 document.body.classList.add('in-scene');
 $('btn-back').focus();
}
function closeResort(){
 if(!isOpen)return;
 isOpen=false;
 $('resort-overlay').hidden=true;
 $('scene-frame').src='about:blank'; // release WebGL map and DEM tiles
 document.body.classList.remove('in-scene');warm();
 renderPins();
}
$('btn-back').addEventListener('click',closeResort);
$('btn-home').addEventListener('click',fitChina);
function toggleList(force){const open=typeof force==='boolean'?force:$('catalog').hidden;$('catalog').hidden=!open;$('btn-list').setAttribute('aria-expanded',String(open));}
$('btn-list').addEventListener('click',()=>toggleList());
$('btn-close-list').addEventListener('click',()=>toggleList(false));
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(isOpen)closeResort();else toggleList(false);}if(e.key.toLowerCase()==='h'&&!isOpen&&!(e.target instanceof HTMLInputElement))fitChina();});
for(const r of resorts){
 const row=document.createElement('button');row.type='button';row.className='catalog-row';
 const index=document.createElement('span');index.className='rank-no';index.textContent=String(r.rank).padStart(2,'0');
 const main=document.createElement('span');main.className='row-main';
 const name=document.createElement('div');name.className='row-name';name.textContent=r.name;
 const region=document.createElement('div');region.className='row-region';region.textContent=r.region;
 main.append(name,region);
 const km=document.createElement('span');km.className='row-km';km.textContent=r.mappedPisteKm+' km';km.dataset.resort=r.id;
 row.append(index,main,km);
 row.title='定位 '+r.name;
 row.addEventListener('click',()=>{toggleList(false);map.easeTo({center:r.center,zoom:9.3,duration:1100});});
 $('resort-list').append(row);
}
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
 if(!resorts.some(r=>r.id===id))return Promise.reject(Error('Unknown resort'));
 if(!routeCache.has(id))routeCache.set(id,fetch('./data/resorts/'+id+'.geojson?v=atlas24',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).catch(e=>{routeCache.delete(id);throw e;}));
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
map.on('load',()=>{fitChina();renderPins();setTimeout(warm,500);});
map.on('move',renderPins);
map.on('zoomend',()=>{needsLayout=true;renderPins();});
map.on('moveend',renderPins);
map.on('resize',()=>{needsLayout=true;renderPins();});
map.on('error',e=>{console.warn('[Snow Atlas] Overview map warning:',e.error?.message||e);});
window.__snowAtlasOverview=map;
})();
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
  'world':{type:'geojson',data:'./data/world.geojson', attribution:'Natural Earth, public domain (simplified overview)'},
  'china':{type:'geojson',data:'./data/china.geojson', attribution:'Natural Earth (overview outline, not authoritative)'}
 },
 layers:[
  {id:'base',type:'background',paint:{'background-color':'#071b2a'}},
  {id:'land',type:'fill',source:'world',paint:{'fill-color':'#244458','fill-opacity':.65}},
  {id:'country-edges',type:'line',source:'world',paint:{'line-color':'#668394','line-opacity':.3,'line-width':.65}},
  {id:'mainland',type:'fill',source:'china',paint:{'fill-color':'#d8e7e8','fill-opacity':.98}},
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
function layoutLabels(){
 if(isOpen)return;
 const w=map.getContainer().clientWidth,h=map.getContainer().clientHeight;
 const placed=[];
 labelLayer.replaceChildren();
 const visible=resorts.map(r=>({r,p:map.project(r.center)}))
  .filter(o=>o.p.x>-140&&o.p.x<w+140&&o.p.y>-85&&o.p.y<h+85)
  .sort((a,b)=>a.r.rank-b.r.rank);
 for(const {r,p} of visible){
   const label=document.createElement('button');label.type='button';
   label.className='pin pin-name resort-label'+(r.id==='wanda'?' is-wanda':'');
   label.textContent=r.name;
   label.title='打开'+r.name+'三维地图';
   label.setAttribute('aria-label','进入三维雪场：'+r.name);
   label.addEventListener('click',()=>openResort(r));
   labelLayer.appendChild(label);
   const bw=Math.ceil(label.offsetWidth||r.name.length*13+34),bh=Math.ceil(label.offsetHeight||35);
   // Candidate stagger positions in pixels. Each connector starts at exact resort coordinates.
   const offsets=[[0,-32],[0,32],[82,-19],[-82,-19],[98,26],[-98,26],[0,-69],[0,68],[145,-42],[-145,-42],[148,36],[-148,36],[0,-106],[0,103],[185,0],[-185,0]];
   const prev=anchors.get(r.id);if(prev)offsets.unshift(prev);
   let best=null,score=Infinity;
   for(const [dx,dy] of offsets){
     const box={x:p.x+dx-bw/2,y:p.y+dy-bh/2,w:bw,h:bh};
     const collision=placed.reduce((n,b)=>n+(overlaps(box,b)?1:0),0);
     const out=Math.max(0,20-box.x)+Math.max(0,box.x+bw-(w-20))+Math.max(0,22-box.y)+Math.max(0,box.y+bh-(h-25));
     const header=(box.y<148&&(box.x<375||box.x+bw>w-350))?1:0;
     let value=collision*30000+header*15000+out*300+Math.hypot(dx,dy);
     if(prev&&prev[0]===dx&&prev[1]===dy)value-=12; // reduce jitter during pan
     if(value<score){score=value;best={box,dx,dy};}
   }
   const b=best.box;
   label.style.left=(b.x+b.w/2)+'px';label.style.top=(b.y+b.h/2)+'px';
   placed.push(b);anchors.set(r.id,[best.dx,best.dy]);
   if(Math.hypot(best.dx,best.dy)>42){
     const x1=p.x,y1=p.y,x2=b.x+b.w/2,y2=b.y+b.h/2;
     const leader=document.createElement('div');leader.className='resort-leader';
     leader.style.left=x1+'px';leader.style.top=y1+'px';
     leader.style.width=Math.hypot(x2-x1,y2-y1)+'px';
     leader.style.transform='rotate('+Math.atan2(y2-y1,x2-x1)+'rad)';
     labelLayer.insertBefore(leader,label);
   }
   const point=document.createElement('span');point.className='resort-anchor';
   point.style.left=p.x+'px';point.style.top=p.y+'px';
   labelLayer.insertBefore(point,label);
 }
 const z=map.getZoom();
 $('zoom-chip').textContent=z<5?'CHINA / OVERVIEW':z<7.3?'REGION / EXPLORE':'RESORT / SELECT';
 $('atlas-message').textContent='点击雪场名称进入三维地图 · 全国范围不隐藏雪场名称';
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
 document.body.classList.remove('in-scene');
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
map.on('load',()=>{fitChina();renderPins();});
map.on('move',renderPins);
map.on('moveend',renderPins);
map.on('resize',renderPins);
map.on('error',e=>{console.warn('[Snow Atlas] Overview map warning:',e.error?.message||e);});
window.__snowAtlasOverview=map;
})();
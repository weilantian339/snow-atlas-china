(() => {
const resorts=(window.SNOW_ATLAS_RESORTS||[]).slice().sort((a,b)=>Number((b.country||'CN')===(localStorage.getItem('snow-country')||'CN'))-Number((a.country||'CN')===(localStorage.getItem('snow-country')||'CN')));
const AWS='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';
const seen=new Set(),queue=[];let bytes=0,complete=0;
const slow=()=>navigator.connection?.saveData||/(^|-)2g/.test(navigator.connection?.effectiveType||'');
function tile(p,z){const n=2**z,x=Math.floor((p[0]+180)/360*n),y=Math.floor((1-Math.asinh(Math.tan(p[1]*Math.PI/180))/Math.PI)/2*n);return AWS+z+'/'+x+'/'+y+'.png';}
function add(url,json=false){if(!seen.has(url)){seen.add(url);queue.push({url,json});}}
async function start(){
 if(slow())return;
 // Prime shared scene files first; no new WebGL contexts are created.
 for(const p of ['./data/elevation.json','./data/trail-metrics.json']){try{await window.snowData(p);}catch{}}
 const elevation=await window.snowData('./data/elevation.json').catch(()=>({}));
 for(const r of resorts){
  for(const folder of ['landcover','context'])add('./data/'+folder+'/'+r.id+'.geojson',true);
  add(r.id==='wanda'?'./data/wanda-canopies.geojson':'./data/crowns/'+r.id+'.json',true);
 }
 for(const r of resorts){add(tile(r.center,13));add(tile(elevation[r.id]?.high?.coordinates||r.center,14));}
 for(const r of resorts)for(const p of [r.center,elevation[r.id]?.low?.coordinates,elevation[r.id]?.high?.coordinates].filter(Boolean))for(const z of [12,13,14])add(tile(p,z));
 let active=0;
 function launch(){
  if(document.hidden||slow()||bytes>16*1024*1024)return;
  const inScene=document.body.classList.contains('in-scene');
  const limit=inScene?1:2;
  while(active<limit&&queue.length){const item=queue.shift();active++;
   (async()=>{try{
    if(item.json)await window.snowData(item.url,{priority:'low'});
    else{const r=await fetch(item.url,{cache:'force-cache',priority:'low',mode:'cors',signal:AbortSignal.timeout(10000)});if(r.ok)bytes+=(await r.blob()).size;}
    complete++;document.documentElement.dataset.preloadedResources=String(complete);
   }catch{}finally{active--;setTimeout(launch,inScene?500:80);}})();
  }
 }
 window.addEventListener('snow-country-change',()=>{const ids=resorts.filter(r=>r.country===localStorage.getItem('snow-country')).map(r=>r.id);queue.sort((a,b)=>Number(ids.some(id=>b.url.includes('/'+id+'.')))-Number(ids.some(id=>a.url.includes('/'+id+'.'))));launch();});
 document.addEventListener('visibilitychange',launch);launch();
}
if(document.readyState==='complete')setTimeout(start,1200);else window.addEventListener('load',()=>setTimeout(start,1200),{once:true});
})();

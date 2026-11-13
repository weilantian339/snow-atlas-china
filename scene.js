/* Snow Atlas resort scene. Real DEM + unverified OSM geometry.
   No fabricated piste/lift lines. All imported OSM geometry is UNVERIFIED. */
(() => {
  'use strict';
  const entries = window.SNOW_ATLAS_RESORTS || [];
  const requestedId = new URLSearchParams(window.location.search).get('id') || 'wanda';
  if(entries.length && !entries.some(r=>r.id===requestedId)){location.replace('./index.html');return;}
  const resort = entries.find(r => r.id === requestedId) || entries.find(r => r.id === 'wanda') || {id:'wanda',name:'长白山万达',region:'吉林',center:[127.4938,42.103]};
  document.querySelector('.masthead h1').textContent = resort.name;
  document.querySelector('.subline').textContent = resort.region + ' · CHINA';
  document.title = resort.name + ' · 3D Snow Atlas';
  document.getElementById('map').setAttribute('aria-label',resort.name+'滑雪场三维地形地图');
  document.getElementById('scene-preview').textContent = '真实DEM地形 · 线路来源OSM社区数据，尚未逐条核验';
  const SETTINGS = Object.freeze({
    center: resort.center, // resort overview center; not a surveyed lift/summit coordinate
    zoom: resort.id === 'wanda' ? 12.9 : 12.7, pitch: 58, bearing: -17,
    terrain: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    // This BBOX is a provisional data-discovery envelope; NOT an official resort boundary.
    bbox: [42.085, 127.463, 42.124, 127.528], // south,west,north,east
  });
  const elevationReady=window.snowData('./data/elevation.json').then(d=>d[resort.id]||{}).catch(()=>({}));
  const geometryWarm=window.snowData('./data/resorts/'+resort.id+'.geojson').catch(()=>null);
  const metricsReady=window.snowData('./data/trail-metrics.json').then(d=>d[resort.id]||{}).catch(()=>({}));
  let trailMetrics={};
  let elevationInfo=null,sceneBearing=SETTINGS.bearing;
  const byId = (id) => document.getElementById(id);
  const emptyGeojson = () => ({type: 'FeatureCollection', features: []});
  const statusEl = byId('status-text'), dotEl = byId('status-dot'), countEl = byId('feature-count');
  const coarsePointer = () => window.matchMedia('(pointer: coarse)').matches;
  const mobile = () => window.innerWidth <= 760 || (window.innerHeight <= 520 && window.innerWidth > window.innerHeight) || (coarsePointer() && window.innerHeight <= 600);
  // Keep the full network inside the usable map, including short landscape screens.
  const viewPadding = () => {
    if (!mobile()) return {top:145,bottom:120,left:115,right:115};
    const h=window.innerHeight,short=h<500;
    return {top:Math.min(short?68:100,h*.2),bottom:Math.min(short?88:125,h*.25),left:20,right:20};
  };
  let map;
  function setStatus(message, state = '') {
    statusEl.textContent = message;
    dotEl.className = 'status-dot ' + state;
  }
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  // Test fallback via ?dem=mapterhorn when the AWS endpoint cannot be reached.
  const useMapterhorn = new URLSearchParams(window.location.search).get('dem') === 'mapterhorn';
  const SOURCE = useMapterhorn ? {
    type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json',
    attribution: '<a href="https://mapterhorn.com/attribution" target="_blank" rel="noopener">© Mapterhorn terrain sources</a>'
  } : {
    type: 'raster-dem', tiles: [SETTINGS.terrain], tileSize: 256,
    minzoom: 0, maxzoom: 14, encoding: 'terrarium',
    bounds: [resort.center[0]-15/(111.2*Math.cos(resort.center[1]*Math.PI/180)),resort.center[1]-15/111.2,resort.center[0]+15/(111.2*Math.cos(resort.center[1]*Math.PI/180)),resort.center[1]+15/111.2],
    attribution: 'Terrain data: AWS Open Data elevation-tiles-prod'
  };
  const style = {
    version: 8,
    name: 'Winter Terrain · Soft Alpine v0.9',
    sources: { dem: SOURCE },
    layers: [
      {id: 'winter-base', type: 'background', paint: {'background-color': '#e8eff0'}},
      {id: 'relief', type: 'hillshade', source: 'dem', paint: {
        'hillshade-exaggeration': 0.54,
        'hillshade-shadow-color': '#70858a',
        'hillshade-highlight-color': '#fcffff',
        'hillshade-accent-color': '#adbcb4',
        'hillshade-illumination-direction': 320
      }}
    ],
    sky:{'sky-color':'#b6d4e4','horizon-color':'#edf4f4','fog-color':'#e8eff0','sky-horizon-blend':0.65,'horizon-fog-blend':0.7,'fog-ground-blend':0.12},
    terrain: {source: 'dem', exaggeration: 1}
  };
  try {
    if (!window.maplibregl) throw new Error('MapLibre 地图库未加载。请检查网络/CDN，按 F12 查看 Network 中 maplibre-gl.js 的状态。');
    map = new maplibregl.Map({
      container: 'map', style, center: SETTINGS.center, zoom: SETTINGS.zoom,
      pitch: SETTINGS.pitch, bearing: SETTINGS.bearing,
      minZoom: resort.id === 'wanda' ? 12.9 : 9, maxZoom: 17, minPitch: resort.id === 'wanda' ? 58 : 0, maxPitch: 85,
      attributionControl:false, antialias: false, renderWorldCopies: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, mobile() ? 1.25 : 1.6),
      maxTileCacheZoomLevels: 2,
      maxTileCacheSize: 72,
      dragPan: true, dragRotate: true, pitchWithRotate: true,
      touchZoomRotate: true, scrollZoom: true,
      fadeDuration: 100,
      transformRequest:(url)=>{
        const m=url.match(/terrarium\/(\d+)\/(\d+)\/(\d+)\.png/);
        if(m){
          const z=+m[1],x=+m[2],y=+m[3],n=2**z;
          const lon=(x+.5)/n*360-180,lat=Math.atan(Math.sinh(Math.PI*(1-2*(y+.5)/n)))*180/Math.PI;
          const dx=(lon-resort.center[0])*111.2*Math.cos(resort.center[1]*Math.PI/180),dy=(lat-resort.center[1])*111.2;
          const halfDiagonal=40075*Math.cos(lat*Math.PI/180)/n*.72;
          if(Math.hypot(dx,dy)-halfDiagonal>15)return {url:new URL('./assets/flat-terrain.png',location.href).href};
        }
        return {url};
      },
    });
  } catch (err) {
    setStatus(err.message || String(err), 'warn');
    byId('loading').querySelector('div:last-child').textContent = err.message || String(err);
    return;
  }

  // MapLibre by default: left drag = pan, right drag = rotate / tilt, wheel = anchored zoom.
  if (mobile()) document.querySelector('.hint').textContent='单指平移 · 双指缩放、旋转 · 双指上下滑动倾斜';
  map.getCanvas().addEventListener('contextmenu', (event) => event.preventDefault());
  let dataBounds = null;
  const pisteById = new Map();
  let viewMode='overview',overviewZoom=13;
  const viewButton=byId('btn-view');
  const viewText=byId('view-toggle-text');
  const reset = () => {
    const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:1000;
    if(viewMode==='mountain'&&elevationInfo?.high&&elevationInfo?.low){
      const lo=elevationInfo.low.coordinates,hi=elevationInfo.high.coordinates;
      const center=hi.slice(0,2);
      const bearing=Math.atan2((hi[0]-lo[0])*Math.cos(lo[1]*Math.PI/180),hi[1]-lo[1])*180/Math.PI;
      map.easeTo({center,bearing,pitch:84,zoom:Math.min(16.2,overviewZoom+1.55),padding:{top:30,bottom:30,left:20,right:20},duration});
    }else if(dataBounds)map.fitBounds(dataBounds,{padding:viewPadding(),bearing:sceneBearing,pitch:SETTINGS.pitch,duration,maxZoom:14.2});
    else map.easeTo({center:SETTINGS.center,zoom:SETTINGS.zoom,pitch:viewMode==='mountain'?82:SETTINGS.pitch,bearing:sceneBearing,duration});
    configureOrbit();
    viewButton.setAttribute('aria-pressed',String(viewMode==='mountain'));
    viewText.textContent=viewMode==='mountain'?'山前 · 切全览':'全览 · 切山前';
    viewButton.title=viewMode==='mountain'?'当前为低机位山前视角，点击切换原全览视角':'当前为原全览视角，点击切换低机位山前视角';
  };
  viewButton.addEventListener('click',()=>{viewMode=viewMode==='mountain'?'overview':'mountain';reset();});
  function configureOrbit(){
    const locked=viewMode==='mountain';
    clearOrbit();
    for(const h of [map.dragPan,map.dragRotate,map.touchZoomRotate,map.touchPitch,map.boxZoom,map.doubleClickZoom,map.keyboard]){if(h)locked?h.disable():h.enable();}
    map.scrollZoom.enable({around:'center'});
    document.querySelector('.hint').textContent=locked?(coarsePointer()?'单指绕山旋转 · 双指缩放':'拖动绕雪场中心旋转 · 滚轮缩放 · 俯仰与平移已锁定'):(coarsePointer()?'单指平移 · 双指缩放、旋转':'左键平移 · 右键旋转 / 俯仰 · 滚轮缩放');
    viewButton.setAttribute('aria-pressed',String(locked));
    viewText.textContent=locked?'山前 · 切全览':'全览 · 切山前';
    document.body.dataset.view=locked?'mountain':'overview';
  }
  const orbitPointers=new Map();
  let orbitGesture=null,orbitMoved=false,orbitFrame=0,pendingCamera=null,suppressTapUntil=0,lastPointerType='mouse';
  const canvas=map.getCanvas();
  // CSS touch-action must be set before the first touch, otherwise Safari can cancel
  // the second finger to scroll/zoom the document while the native map handlers are off.
  canvas.style.touchAction='none';
  canvas.parentElement.style.touchAction='none';
  function flushOrbit(){
    if(orbitFrame)cancelAnimationFrame(orbitFrame);
    orbitFrame=0;
    if(pendingCamera){const next=pendingCamera;pendingCamera=null;map.jumpTo(next);}
  }
  function clearOrbit(){
    if(orbitFrame)cancelAnimationFrame(orbitFrame);
    orbitFrame=0;pendingCamera=null;orbitPointers.clear();orbitGesture=null;
  }
  function startOrbit(){
    flushOrbit();
    const ps=[...orbitPointers.values()];
    if(!ps.length){orbitGesture=null;return;}
    const c=map.getCenter();
    orbitGesture={x:ps[0].x,y:ps[0].y,bearing:map.getBearing(),pitch:map.getPitch(),center:[c.lng,c.lat],zoom:map.getZoom(),distance:ps.length===2?Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y):0};
  }
  function queueOrbit(camera){
    pendingCamera=camera;
    if(!orbitFrame)orbitFrame=requestAnimationFrame(()=>{orbitFrame=0;flushOrbit();});
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    lastPointerType=e.pointerType||'mouse';
    if(!orbitPointers.size){orbitMoved=false;suppressTapUntil=0;if(viewMode==='mountain')map.stop();}
    orbitPointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
    if(orbitPointers.size>1)orbitMoved=true;
    startOrbit();
  });
  // Window listeners finish a drag even when a finger/mouse crosses the canvas edge.
  window.addEventListener('pointermove',e=>{
    const pointer=orbitPointers.get(e.pointerId);
    if(!pointer||!orbitGesture)return;
    pointer.x=e.clientX;pointer.y=e.clientY;
    if(Math.hypot(pointer.x-pointer.startX,pointer.y-pointer.startY)>7)orbitMoved=true;
    if(viewMode!=='mountain')return;
    if(e.cancelable)e.preventDefault();
    const ps=[...orbitPointers.values()];
    if(ps.length===2&&orbitGesture.distance>8){
      const distance=Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y);
      queueOrbit({center:orbitGesture.center,pitch:orbitGesture.pitch,bearing:orbitGesture.bearing,zoom:Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),orbitGesture.zoom+Math.log2(Math.max(8,distance)/orbitGesture.distance)))});
    }else if(ps.length===1&&Math.abs(e.clientX-orbitGesture.x)>5){
      queueOrbit({center:orbitGesture.center,pitch:orbitGesture.pitch,bearing:orbitGesture.bearing+(e.clientX-orbitGesture.x)*.22});
    }
  },{passive:false});
  function endOrbit(e){
    if(!orbitPointers.has(e.pointerId))return;
    flushOrbit();orbitPointers.delete(e.pointerId);
    if(e.type==='pointercancel'||orbitMoved)suppressTapUntil=performance.now()+450;
    // Rebase to the remaining finger rather than leaving one-finger rotation stuck.
    startOrbit();
  }
  window.addEventListener('pointerup',endOrbit);
  window.addEventListener('pointercancel',endOrbit);
  window.addEventListener('blur',clearOrbit);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearOrbit();});
  canvas.addEventListener('click',e=>{if(performance.now()<suppressTapUntil||orbitMoved){e.preventDefault();e.stopImmediatePropagation();orbitMoved=false;}},true);
  byId('btn-reset').addEventListener('click', reset);
  byId('btn-north').addEventListener('click', () => map.easeTo({bearing: 0, duration: 700}));
  function closeFeaturePanel(){
    byId('feature-panel').hidden=true;
    if(map.getSource('selected-piste'))map.getSource('selected-piste').setData(emptyGeojson());
    document.dispatchEvent(new CustomEvent('snowatlas:trail-closed'));
  }
  byId('close-panel').addEventListener('click', closeFeaturePanel);
  window.addEventListener('keydown', (event) => {
    if (event.target instanceof Element && event.target.matches('input,select,textarea,[contenteditable="true"]')) return;
    if (event.key.toLowerCase() === 'r') reset();
    if (event.key.toLowerCase() === 'n') map.easeTo({bearing: 0, duration: 700});
    if (event.key === 'Escape') closeFeaturePanel();
  });
  configureOrbit();

  // v0.9: Light tree-canopy treatment uses only real OSM forest/wood polygons.
  // Grain patterns are illustrative; they are not satellite imagery or surveyed tree locations.
  // If no landcover file exists the fallback is a clean snowy relief (no invented forest).
  let vegetationEnabled=true;
  const vegetationButton=byId('btn-vegetation');
  const vegetationButtonText=byId('vegetation-toggle-text');
  let forestCount=0;
  let forestLoaded=false;
  const vegSourceName='mapped-woodland';
  const forestLayerIds=['woodland-underlay','woodland-canopy','wanda-low-canopy'];
  const setForestVisibility=()=>{
    for (const id of forestLayerIds) {
      if(map.getLayer(id)) map.setLayoutProperty(id,'visibility',vegetationEnabled?'visible':'none');
    }
    vegetationButton.setAttribute('aria-pressed',String(vegetationEnabled));
    vegetationButtonText.textContent=!forestLoaded?'植被：缺数据':vegetationEnabled?'植被：开':'植被：关';
    vegetationButton.title=forestLoaded ? (resort.id==='wanda'?'低矮林冠示意：位置依据OSM，3–6米树冠高度为视觉示意，非实测树高或雪道宽度':'公开林地范围和低矮林冠示意，非实测树位或雪道宽度') : '林地数据暂不可用';
  };
  vegetationButton.addEventListener('click',()=>{vegetationEnabled=!vegetationEnabled;setForestVisibility();});
  function framePolygon(center,halfKm){
    const lat=halfKm/111.2,lon=halfKm/(111.2*Math.cos(center[1]*Math.PI/180));
    const [x,y]=center;
    return {type:'FeatureCollection',features:[{type:'Feature',properties:{visual_only:true},geometry:{type:'Polygon',coordinates:[[
      [x-lon,y-lat],[x+lon,y-lat],[x+lon,y+lat],[x-lon,y+lat],[x-lon,y-lat]
    ]]}}]};
  }
  function loadTileTexture(url,name,beforeLayer){
    // Network-independent local PNG, uploaded only once; no extra render loop.
    map.loadImage(url).then(({data})=>{
      if(!map.hasImage(name)) map.addImage(name,data,{pixelRatio:1});
      if(name==='snow-atlas-snow-grain'){
        map.addLayer({id:'snow-surface-grain',type:'fill',source:'snow-surface',minzoom:11,
          paint:{'fill-pattern':name,'fill-opacity':0.27}},'woodland-underlay');
      } else {
        map.addLayer({id:'woodland-canopy',type:'fill',source:vegSourceName,
          paint:{'fill-pattern':name,'fill-opacity':['interpolate',['linear'],['zoom'],10,0.38,13,0.60,16,0.72]}}, beforeLayer);
        setForestVisibility();
      }
    }).catch(err=>console.warn('[Snow Atlas] Optional visual texture not loaded:',name,err));
  }
  function installLandscapeLayers(){
    const osmAttribution='<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors (ODbL)</a>';
    map.addSource('snow-surface',{type:'geojson',data:framePolygon(resort.center,Math.min(18,(resort.searchRadiusKm||5)*2.5))});
    map.addSource(vegSourceName,{type:'geojson',data:emptyGeojson(),attribution:osmAttribution+' · <a href="https://esa-worldcover.org/en/data-access">ESA WorldCover 2021 v200 (CC BY 4.0)</a>'});
    map.addLayer({id:'woodland-underlay',type:'fill',source:vegSourceName,
      paint:{'fill-color':'#819b88','fill-opacity':['interpolate',['linear'],['zoom'],9,0.12,12,0.20,15,0.28]}});
    {map.addSource('wanda-canopies',{type:'geojson',data:resort.id==='wanda'?'./data/wanda-canopies.geojson?v=fast31':emptyGeojson()});
    if(resort.id!=='wanda')window.snowData('./data/crowns/'+resort.id+'.json').then(rows=>{
      const features=rows.map(([x,y,h])=>{const ring=[];for(let i=0;i<6;i++){const a=i*Math.PI/3;ring.push([x+Math.cos(a)*h/(111200*Math.cos(y*Math.PI/180)),y+Math.sin(a)*h/111200]);}ring.push(ring[0]);return {type:'Feature',properties:{height:h},geometry:{type:'Polygon',coordinates:[ring]}};});map.getSource('wanda-canopies').setData({type:'FeatureCollection',features});
    }).catch(()=>{});
    map.addLayer({id:'wanda-low-canopy',type:'fill-extrusion',source:'wanda-canopies',minzoom:12.8,
      paint:{'fill-extrusion-color':'#245240','fill-extrusion-height':['get','height'],'fill-extrusion-base':0,'fill-extrusion-opacity':0.82,'fill-extrusion-vertical-gradient':true}});}
    setForestVisibility();
    // Texture is not 3D tree geometry: far less GPU load than thousands of tree meshes.
    loadTileTexture('./assets/snow-grain.png','snow-atlas-snow-grain','woodland-underlay');
    loadTileTexture('./assets/forest-grain.png','snow-atlas-forest-grain','piste-snow-lane');
  }
  async function loadLandscapeData(){
    const file='./data/landcover/'+encodeURIComponent(resort.id)+'.geojson';
    try {
      const data=await window.snowData(file);
      if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error('Invalid GeoJSON');
      const polygons=data.features.filter(f=>f?.geometry && (f.geometry.type==='Polygon'||f.geometry.type==='MultiPolygon'));
      forestCount=polygons.length;forestLoaded=forestCount>0;
      map.getSource(vegSourceName).setData({type:'FeatureCollection',features:polygons});
      byId('vegetation-status').textContent=forestLoaded ? `林区 ${forestCount} · 林冠位置示意` : '无已测绘林区';
    }catch(err){
      byId('vegetation-status').textContent='林地数据暂不可用';
      console.info('[Snow Atlas] No optional forest mask for '+resort.id+' ('+err.message+')');
    }
    vegetationButton.disabled=!forestLoaded;
    setForestVisibility();
  }
  // MapLibre drapes normal GeoJSON line layers over its raster DEM surface.
  function installLayers() {
    const osmAttribution = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors (ODbL)</a>';
    map.addSource('pistes', {type: 'geojson', data: emptyGeojson(), attribution: osmAttribution});
    map.addSource('lifts', {type: 'geojson', data: emptyGeojson(), attribution: osmAttribution});
    // Scenic snow clearing is VISUAL ONLY (not surveyed piste width); stays below line casing.
    map.addLayer({id:'piste-snow-lane',type:'line',source:'pistes',
      paint:{'line-color':'#f3f9f8','line-width':['interpolate',['linear'],['zoom'],10,3.2,13,10,16,22],
        'line-opacity':0.58,'line-blur':1.2}});
    map.addLayer({id: 'piste-casing', type: 'line', source: 'pistes',
      paint: {'line-color': '#f7fbff', 'line-width': ['interpolate',['linear'],['zoom'],10,3.0,16,9.0], 'line-opacity': 0.93}});
    map.addLayer({id: 'piste-lines', type: 'line', source: 'pistes',
      paint: {
        'line-color': ['match',['get','difficulty'],
          'novice','#22a474','easy','#22a474','intermediate','#278ad0',
          'advanced','#293645','expert','#293645','freeride','#ac7eb1','#869caa'],
        'line-width': ['interpolate',['linear'],['zoom'],10,1.7,13,3.4,16,5.4],
        'line-opacity': 0.95
      }});
    // A continuous scale-aware route remains legible between the elevated spans.
    const joins={'line-join':'round','line-cap':'round'};
    map.addLayer({id:'lift-casing',type:'line',source:'lifts',layout:joins,paint:{'line-color':'#fff1d7','line-width':['interpolate',['linear'],['zoom'],10,4,14,5.5,17,7]}});
    map.addLayer({id:'lift-lines',type:'line',source:'lifts',layout:joins,paint:{'line-color':'#9e5429','line-width':['interpolate',['linear'],['zoom'],10,2,14,3,17,4]}});
    map.addSource('lift-structures',{type:'geojson',data:emptyGeojson()});
    map.addLayer({id:'lift-structures-3d',type:'fill-extrusion',source:'lift-structures',paint:{'fill-extrusion-color':['match',['get','part'],'cable','#8d6841','beam','#818d91','#65767d'],'fill-extrusion-height':['get','top'],'fill-extrusion-base':['get','base'],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}});
    map.addSource('selected-piste',{type:'geojson',data:emptyGeojson()});
    map.addLayer({id:'selected-piste-glow',type:'line',source:'selected-piste',paint:{'line-color':'#fff7bc','line-width':12,'line-opacity':.7,'line-blur':3}});
    map.addLayer({id:'selected-piste-line',type:'line',source:'selected-piste',paint:{'line-color':'#ffb329','line-width':5}});
    map.addLayer({id:'piste-hit-area',type:'line',source:'pistes',paint:{'line-color':'#000','line-width':18,'line-opacity':0.01}});
    map.on('mouseenter','piste-hit-area',()=>map.getCanvas().style.cursor='pointer');
    map.on('mouseleave','piste-hit-area',()=>map.getCanvas().style.cursor='');
    const selectPiste=e=>{
      if(!e.features?.length||orbitMoved||performance.now()<suppressTapUntil)return;
      const hit=e.features[0],feature=pisteById.get(String(hit.properties?.osm_id||hit.id))||hit;
      const p=feature.properties||{},metric=trailMetrics[String(p.osm_id||feature.id)]||{};
      map.getSource('selected-piste').setData({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:feature.geometry}]});
      byId('feature-type').textContent='PISTE · 雪道';byId('feature-name').textContent=p.name||p.ref||'雪道';
      const length=Number.isFinite(metric.lengthMeters)?(metric.lengthMeters>=1000?(metric.lengthMeters/1000).toFixed(2)+' km':metric.lengthMeters+' m'):'暂缺';
      const slope=Number.isFinite(metric.maxSlopeDegrees)?'≈ '+metric.maxSlopeDegrees+'°':'暂缺';
      byId('feature-details').textContent=`线路长度：${length} · 最大坡度：${slope}（DEM每80米采样估算，非官方最大坡度）`;
      byId('feature-panel').hidden=false;
      document.dispatchEvent(new CustomEvent('snowatlas:trail-selected'));
    };
    map.getCanvas().addEventListener('click',event=>{
      if(event.detail>1||performance.now()<suppressTapUntil)return;
      const rect=map.getCanvas().getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
      const radius=lastPointerType==='touch'?14:7;
      const hits=map.queryRenderedFeatures([[x-radius,y-radius],[x+radius,y+radius]],{layers:['piste-hit-area','piste-lines']});
      // A broad touch target should pick the closest line, not whichever tiled
      // feature happens to be drawn last at a crossing or on parallel pistes.
      const candidates=new Map();
      for(const feature of hits){
        const id=String(feature.properties?.osm_id||feature.id);
        if(candidates.has(id))continue;
        const cs=feature.geometry?.coordinates;
        if(feature.geometry?.type!=='LineString'||!cs?.length)continue;
        let distance=Infinity;
        for(let i=1;i<cs.length;i++){
          const a=map.project(cs[i-1]),b=map.project(cs[i]);
          const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy;
          const t=d?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/d)):0;
          distance=Math.min(distance,Math.hypot(x-a.x-t*dx,y-a.y-t*dy));
        }
        candidates.set(id,{feature,distance});
      }
      const nearest=[...candidates.values()].sort((a,b)=>a.distance-b.distance)[0];
      if(nearest)selectPiste({features:[nearest.feature]});
      else if(!byId('feature-panel').hidden)closeFeaturePanel();
    });
  }
  function installLiftStructures(data){
    const features=[];
    const polygon=(x,y,dx,dy,part,base,top)=>{
      const lon=dx/(111200*Math.cos(y*Math.PI/180)),lat=dy/111200;
      features.push({type:'Feature',properties:{part,base,top},geometry:{type:'Polygon',coordinates:[[[x-lon,y-lat],[x+lon,y-lat],[x+lon,y+lat],[x-lon,y+lat],[x-lon,y-lat]]]}});
    };
    const aerial=data.lifts.features.filter(f=>['chair_lift','gondola','mixed_lift','cable_car'].includes(f.properties.aerialway));
    for(const f of aerial){
      const cs=f.geometry.coordinates;let walked=0,next=0;
      for(let i=1;i<cs.length;i++){
        const a=cs[i-1],b=cs[i],sx=111200*Math.cos((a[1]+b[1])*Math.PI/360),dx=(b[0]-a[0])*sx,dy=(b[1]-a[1])*111200,len=Math.hypot(dx,dy);if(!len)continue;
        const ux=dx/len,uy=dy/len;
        while(next<=walked+len){const t=(next-walked)/len,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;polygon(x,y,1.45,1.45,'tower',0,16.6);
          const corners=[[-5,-1],[5,-1],[5,1],[-5,1],[-5,-1]].map(([u,v])=>[x+(-uy*u+ux*v)/sx,y+(ux*u+uy*v)/111200]);
          features.push({type:'Feature',properties:{part:'beam',base:15.4,top:17.2},geometry:{type:'Polygon',coordinates:[corners]}});
          next+=125;}walked+=len;
      }
    }
    map.getSource('lift-structures').setData({type:'FeatureCollection',features});
    try{
      map.addLayer(window.snowAtlasCables(map,aerial,resort.center));
      const air=['in',['get','aerialway'],['literal',['chair_lift','gondola','mixed_lift','cable_car']]];
      for(const id of ['lift-lines','lift-casing'])map.setPaintProperty(id,'line-opacity',['interpolate',['linear'],['zoom'],12,1,15,['case',air,0.12,0.86]]);
    }catch(error){console.warn('Using continuous lift route fallback',error);}
  }

  function installNearby(){
    const rad=x=>x*Math.PI/180;
    const distance=(a,b)=>{const dy=rad(b[1]-a[1]),dx=rad(b[0]-a[0]);return 12742*Math.asin(Math.min(1,Math.sqrt(Math.sin(dy/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dx/2)**2)));};
    const neighbors=entries.filter(r=>r.id!==resort.id).map(r=>({...r,km:distance(resort.center,r.center)})).filter(r=>r.km<=20).sort((a,b)=>a.km-b.km);
    if(!neighbors.length)return;
    const features=neighbors.map(r=>{const lat=.012,lon=lat/Math.cos(rad(r.center[1])),[x,y]=r.center;return {type:'Feature',properties:{id:r.id},geometry:{type:'LineString',coordinates:[[x-lon,y-lat],[x+lon,y-lat],[x+lon,y+lat],[x-lon,y+lat],[x-lon,y-lat]]}};});
    map.addSource('nearby-resorts',{type:'geojson',data:{type:'FeatureCollection',features}});
    map.addLayer({id:'nearby-resort-frames',type:'line',source:'nearby-resorts',paint:{'line-color':'#557c96','line-width':2,'line-dasharray':[3,3],'line-opacity':.8}});
    const box=document.createElement('aside');box.className='nearby-resorts';const toggle=document.createElement('button');toggle.className='nearby-toggle';toggle.textContent='附近雪场 '+neighbors.length;toggle.setAttribute('aria-expanded','false');toggle.onclick=()=>{const open=box.classList.toggle('expanded');toggle.setAttribute('aria-expanded',String(open));};box.appendChild(toggle);
    const title=document.createElement('div');title.textContent='20 km 内附近雪场 · 直线距离';box.appendChild(title);
    for(const r of neighbors){
      const button=document.createElement('button');button.textContent=r.name+' · '+r.km.toFixed(1)+' km ↗';button.onclick=()=>location.href='./scene.html?id='+encodeURIComponent(r.id);box.appendChild(button);
      const label=document.createElement('button');label.className='nearby-map-label';label.textContent=r.name+' · '+r.km.toFixed(1)+' km';label.onclick=button.onclick;
      new maplibregl.Marker({element:label}).setLngLat(r.center).addTo(map);
    }
    const note=document.createElement('small');note.textContent='虚线为位置示意，非雪场边界；不表示雪道互通';box.appendChild(note);document.body.appendChild(box);
  }

  function overpassQuery() {
    const box = SETTINGS.bbox.join(',');
    // Ways with explicit geometries, avoiding node dependencies.
    return `[out:json][timeout:30];(way["piste:type"="downhill"](${box});way["aerialway"~"gondola|chair_lift|mixed_lift|cable_car|drag_lift|t-bar|j-bar|platter|rope_tow|magic_carpet"](${box}););out body geom;`;
  }
  function osmToGeoJSON(payload) {
    if (!payload || !Array.isArray(payload.elements)) throw Error('OSM接口返回内容不是有效数据。');
    const pistes = emptyGeojson(), lifts = emptyGeojson();
    const seen = new Set();
    for (const el of payload.elements) {
      if (el.type !== 'way' || seen.has(el.id) || !Array.isArray(el.geometry) || el.geometry.length < 2) continue;
      seen.add(el.id);
      const tags = el.tags || {};
      const lift = Boolean(tags.aerialway && tags.aerialway !== 'station');
      const piste = tags['piste:type'] === 'downhill';
      if (!lift && !piste) continue;
      const coords = el.geometry
        .filter(point => Number.isFinite(point.lon) && Number.isFinite(point.lat))
        .map(point => [point.lon, point.lat]);
      if (coords.length < 2) continue;
      // Polygon pistes are preserved as a line outline in the first GIS exploration version.
      const feature = {type:'Feature', id: el.id, properties: {
        name: tags['name:zh'] || tags.name || tags['piste:name'] || '',
        difficulty: tags['piste:difficulty'] || '', aerialway: tags.aerialway || '',
        osm_id: el.id, provenance: 'OSM community geometry — unverified'
      }, geometry: {type:'LineString',coordinates:coords}};
      (lift ? lifts : pistes).features.push(feature);
    }
    return {pistes, lifts};
  }
  async function fetchOverpass() {
    const q = overpassQuery();
    const hosts = ['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter'];
    let last = '网络连接失败';
    for (const host of hosts) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 22000);
      try {
        const response = await fetch(host,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q),signal:controller.signal});
        if (!response.ok) throw Error('HTTP '+response.status);
        return osmToGeoJSON(await response.json());
      } catch(err) { last = `${host.split('/')[2]}：${err.message}`; }
      finally {clearTimeout(timer);}
      await sleep(250);
    }
    throw Error(last);
  }
  async function loadLocalGIS() {
    // Maintainers can periodically import reviewed OSM/official data as static local GeoJSON.
    if(window.parent!==window && document.referrer.startsWith(location.origin+'/') && window.parent.snowAtlasRoute){
      const payload=await window.parent.snowAtlasRoute(resort.id);return splitRoutes(payload);
    }
    return splitRoutes(await window.snowData('./data/resorts/'+resort.id+'.geojson'));
  }
  function splitRoutes(payload){
    if (payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) throw Error('本地GeoJSON格式错误');
    const pistes = emptyGeojson(), lifts = emptyGeojson();
    for (const feature of payload.features) {
      if (!feature || feature.geometry?.type !== 'LineString') continue;
      if (feature.properties?.kind === 'lift') lifts.features.push(feature);
      if (feature.properties?.kind === 'piste') pistes.features.push(feature);
    }
    return {pistes,lifts};
  }

  // Lightweight HTML markers display CJK labels without additional font downloads.
  // A single explicit toggle shows ALL loaded objects even when zoomed out.
  // Features without source names are explicitly marked '未命名 + OSM ID';
  // those labels are NOT invented official piste or lift names.
  window.snowAtlasFilterNames=v=>{window.snowAtlasRunFilter=v;updateNameVisibility();};
  let nameMarkers = [];
  let labelData = null;
  let allNamesVisible = false;
  const labelsButton = byId('btn-labels');
  const labelsButtonText = byId('label-toggle-text');
  function updateNameVisibility() {
    const boxes=[],compact=mobile()||innerWidth<=1024;
    for (const item of nameMarkers) {
      const el=item.marker.getElement(),v=window.snowAtlasRunFilter||'all';
      const visible=item.kind!=='piste'||v==='all'||(v==='easy'?['novice','easy']:v==='advanced'?['advanced','expert','freeride']:[v]).includes(item.difficulty);
      el.style.display=allNamesVisible&&visible?'':'none';
      if(!allNamesVisible||!visible||!compact)continue;
      const p=map.project(item.at),w=el.offsetWidth,h=el.offsetHeight,box={x:p.x-w/2,y:p.y-h/2,w,h};
      if(box.x+w<0||box.y+h<0||box.x>innerWidth||box.y>innerHeight||boxes.some(b=>!(box.x+box.w+4<b.x||b.x+b.w+4<box.x||box.y+box.h+4<b.y||b.y+b.h+4<box.y))){el.style.display='none';continue;}
      boxes.push(box);
    }
  }
  map.on('moveend',updateNameVisibility);map.on('resize',updateNameVisibility);
  labelsButton.addEventListener('click', () => {
    allNamesVisible = !allNamesVisible;
    if(allNamesVisible && labelData && !nameMarkers.length) installNameMarkers(labelData);
    labelsButton.setAttribute('aria-pressed', String(allNamesVisible));
    labelsButtonText.textContent = allNamesVisible ? '隐藏名称 / 海拔' : '名称 / 海拔';
    labelsButton.title = allNamesVisible ? '隐藏所有雪道和索道文字' : '显示已有名称及已测绘雪道的DEM近似高低点海拔；无名称线路不标注';
    updateNameVisibility();
    updateElevationVisibility();
  });
  function midpointOnLine(coords) {
    if (!coords || coords.length < 2) return null;
    const lengths = []; let total = 0;
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i-1], b = coords[i];
      const dx = (b[0]-a[0])*Math.cos((a[1]+b[1])*Math.PI/360), dy = b[1]-a[1];
      const len = Math.hypot(dx,dy);
      lengths.push(len); total += len;
    }
    if (!total) return coords[Math.floor(coords.length/2)];
    let walked = 0;
    for (let i=0; i<lengths.length; i++) {
      if (walked+lengths[i]>=total/2) {
        const t=(total/2-walked)/lengths[i];
        return [coords[i][0]+(coords[i+1][0]-coords[i][0])*t, coords[i][1]+(coords[i+1][1]-coords[i][1])*t];
      }
      walked += lengths[i];
    }
    return coords[coords.length-1];
  }
  function installNameMarkers(data) {
    for (const item of nameMarkers) item.marker.remove();
    nameMarkers = [];
    for (const [kind, features] of [['piste',data.pistes.features],['lift',data.lifts.features]]) {
      for (const f of features) {
        const p = f.properties || {};
        const name = String(p.name_zh || p.name || p.name_py || p.ref || '').trim();
        const at = midpointOnLine(f.geometry?.coordinates);
        if (!at || !name || /未命名|没有.*信息|暂无.*信息|unknown|unnamed/i.test(name)) continue;
        const el = document.createElement('span');
        el.className = 'geo-label ' + (kind === 'lift' ? 'geo-label-lift' : 'geo-label-piste');
        if (!name) el.classList.add('geo-label-unnamed');
        el.textContent = name;
        el.title = (kind === 'lift' ? '索道' : '雪道') + ' · OSM数据，尚未核对官方名称和线位';
        const marker = new maplibregl.Marker({element:el,anchor:'center',offset:[0,0]})
          .setLngLat(at).addTo(map);
        nameMarkers.push({marker,kind,at,difficulty:p.difficulty,unnamed:!name});
      }
    }
    updateNameVisibility();
  }

  let elevationMarkers=[];
  function updateElevationVisibility(){for(const marker of elevationMarkers)marker.getElement().style.display=allNamesVisible?'':'none';}
  function installElevationMarkers(){
    for(const marker of elevationMarkers)marker.remove();elevationMarkers=[];
    if(!elevationInfo?.high||!elevationInfo?.low)return;
    for(const [key,title] of [['high','▲ 雪道最高'],['low','▼ 雪道最低']]){
      const info=elevationInfo[key],el=document.createElement('span');el.className='elevation-marker elevation-'+key;
      el.textContent=title+' ≈ '+info.meters+' 米';el.title='已测绘雪道顶点的DEM采样极值，约20–30米地面分辨率；非官方雪场最高/最低点';
      elevationMarkers.push(new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat(info.coordinates).addTo(map));
    }
    updateElevationVisibility();
  }

  function computeBounds(data){
    const coords=[...data.pistes.features,...data.lifts.features].flatMap(f=>f.geometry?.coordinates||[]);
    const valid=coords.filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]));
    if(valid.length<2)return null;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of valid){minX=Math.min(minX,p[0]);minY=Math.min(minY,p[1]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1]);}
    return [[minX,minY],[maxX,maxY]];
  }
  async function loadGeometry() {
    let data=null;
    try{data=await loadLocalGIS();}
    catch(err){console.warn('[Snow Atlas] GIS file error',err);}
    if(!data){
      setStatus('该雪场公开线路数据暂缺，正在补充核查', 'warn');
      countEl.textContent='真实地形已启用 · 线路待下载';
      byId('btn-labels').disabled=true;
      byId('label-toggle-text').textContent='线路待下载';
      return;
    }
    const n=data.pistes.features.length,m=data.lifts.features.length;
    if(n+m===0){
      setStatus('该区域当前未查得公开OSM线路，雪道及索道需进一步实地/官方核查', 'warn');
      countEl.textContent='已检索 · 0条可显示线路';
      byId('btn-labels').disabled=true;
      byId('label-toggle-text').textContent='暂无名称';
      return;
    }
    map.getSource('pistes').setData(data.pistes);
    map.getSource('lifts').setData(data.lifts);
    pisteById.clear();
    for(const feature of data.pistes.features)pisteById.set(String(feature.properties?.osm_id||feature.id),feature);
    trailMetrics=await metricsReady;
    installLiftStructures(data);
    elevationInfo=await elevationReady;
    if(Number.isFinite(elevationInfo.bearing))sceneBearing=elevationInfo.bearing;
    installElevationMarkers();
    labelData=data; // HTML labels are created lazily only when explicitly requested.
    if(allNamesVisible&&!nameMarkers.length)installNameMarkers(data);
    dataBounds=computeBounds(data);
    performance.mark('snowatlas-routes-visible');document.documentElement.dataset.routesReadyMs=String(Math.round(performance.now()));
    if(dataBounds){
      const latSpan=dataBounds[1][1]-dataBounds[0][1];
      const lonSpan=dataBounds[1][0]-dataBounds[0][0];
      if(latSpan>0.001&&lonSpan>0.001){
        const camera=map.cameraForBounds(dataBounds,{padding:viewPadding(),bearing:sceneBearing,maxZoom:14.2});
        if(camera) {
          // The complete-resort overview is the furthest permitted view.
          overviewZoom=Math.max(resort.id==='wanda'?12.9:12,camera.zoom);
          map.setMinZoom(overviewZoom);
        }
        const cameraValues=(new URLSearchParams(location.search).get('camera')||'').split(',').map(Number);
        if(cameraValues.length===5&&cameraValues.every(Number.isFinite)&&Math.abs(cameraValues[0]-resort.center[0])<.5&&Math.abs(cameraValues[1]-resort.center[1])<.5){
          viewMode=new URLSearchParams(location.search).get('mode')==='overview'?'overview':'mountain';configureOrbit();
          map.jumpTo({center:cameraValues.slice(0,2),zoom:Math.max(overviewZoom,Math.min(17,cameraValues[2])),bearing:cameraValues[3],pitch:Math.max(0,Math.min(85,cameraValues[4]))});
        }else reset();
      }
    }
    window.snowAtlasSceneFeatures(map,resort,()=>viewMode);
    const namedCount=[...data.pistes.features,...data.lifts.features].filter(f=>String(f.properties?.name_zh||f.properties?.name||f.properties?.ref||'').trim()).length;
    countEl.textContent=`雪道 ${n} · 索道 ${m} · 有名称 ${namedCount}/${n+m}`;
    setStatus('已加载公开OSM线路 · 地理位置及名称尚未官方核验','ok');
    byId('scene-preview').textContent=`真实DEM地形 · OSM候选线路${n+m}条（待核验）`;
  }

  let mapLoaded = false;
  let terrainReady = false;
  map.on('sourcedata', (ev) => {
    if (ev.sourceId === 'dem' && ev.isSourceLoaded) terrainReady = true;
  });
  map.on('error', ({error}) => console.warn('[Snow Atlas] Map tile/source warning:', error?.message || error));
  map.once('style.load', () => {
    mapLoaded = true;
    installLandscapeLayers();
    installLayers();
    installNearby();
    {
      window.snowData('./data/context/'+encodeURIComponent(resort.id)+'.geojson').then(data=>{
        map.addSource('resort-context',{type:'geojson',data,attribution:'© OpenStreetMap contributors (ODbL)'});
        const roadFilter=['all',['==',['get','kind'],'road'],['!',['in',['get','highway'],['literal',['proposed','construction']]]]];
        map.addLayer({id:'local-road-edge',type:'line',source:'resort-context',filter:roadFilter,paint:{'line-color':'#a4afa9','line-width':['interpolate',['linear'],['zoom'],12,1.5,16,7],'line-opacity':0.65}},'piste-snow-lane');
        map.addLayer({id:'local-roads',type:'line',source:'resort-context',filter:roadFilter,paint:{'line-color':'#faf7ee','line-width':['interpolate',['linear'],['zoom'],12,0.7,16,4.5]}},'piste-snow-lane');
        map.addLayer({id:'local-buildings',type:'fill',minzoom:13.5,source:'resort-context',filter:['==',['get','kind'],'building'],paint:{'fill-color':'#b5a99a','fill-opacity':0.9,'fill-outline-color':'#827b72'}},'piste-snow-lane');
      }).catch(err=>console.warn('Nearby OSM context unavailable',err));
    }
    loadLandscapeData();
    byId('loading').classList.add('hidden');
    setStatus('真实高程地形已启用 · 正在检查线路数据…');
    loadGeometry();
  });
  setTimeout(() => {
    if (!mapLoaded) {
      byId('loading').classList.add('hidden');
      setStatus('地图初始化超时：网络可能无法访问高程数据或地图引擎', 'warn');
      console.warn('[Snow Atlas] Initialization timeout. Try ?dem=mapterhorn or check Edge F12 Network.');
    } else if (!terrainReady) {
      console.warn('[Snow Atlas] DEM tiles may be unreachable. 3D terrain requires network access.');
    }
  }, 16000);
  window.__snowAtlasMap = map; // for local debugging in Edge DevTools
})();





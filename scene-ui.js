(() => {
  'use strict';
  const lang=new URLSearchParams(location.search).get('lang')||localStorage.getItem('snow-language')||'zh';
  const text=(zh,en,ja)=>lang==='en'?en:lang==='ja'?ja:zh;
  const embedded=new URLSearchParams(location.search).get('embedded')==='1'||window.parent!==window;
  document.body.classList.toggle('is-embedded',embedded);
  const svg=path=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+path+'</svg>';
  const icons={
    view:svg('<path d="m3 18 5-8 4 5 3-9 6 12Z"/><path d="m7 11 2 2 2-1"/>'),
    trees:svg('<path d="m8 3-5 8h3l-4 6h12l-4-6h3Z"/><path d="M8 17v4m10-16-4 7h2l-3 5h9l-3-5h2Z"/><path d="M18 17v4"/>'),
    names:svg('<path d="M3 18 8 5l5 13M5 13h6m4-3h6m-3-3v11m-3 0h6"/>'),
    options:svg('<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>')
  };
  const home=document.createElement('a');home.className='scene-home';home.href='./index.html?lang='+encodeURIComponent(lang);home.setAttribute('aria-label',text('返回地图','Back to map','地図へ戻る'));home.innerHTML=svg('<path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');document.body.append(home);
  const dock=document.createElement('div');dock.className='scene-dock';dock.id='scene-dock';dock.setAttribute('aria-label',text('地图工具','Map tools','地図ツール'));
  const tools=document.querySelector('.tools');dock.append(tools);document.body.append(dock);
  const sheet=document.createElement('dialog');sheet.id='scene-options';sheet.className='scene-sheet';sheet.setAttribute('aria-labelledby','scene-options-title');
  const heading=document.createElement('div');heading.className='sheet-heading';const title=document.createElement('h2');title.id='scene-options-title';title.textContent=text('地图选项','Map options','地図の設定');
  const close=document.createElement('button');close.type='button';close.className='sheet-close';close.textContent='×';close.setAttribute('aria-label',text('关闭地图选项','Close map options','設定を閉じる'));close.onclick=()=>sheet.close();heading.append(title,close);sheet.append(heading);
  const actions=document.createElement('div');actions.className='sheet-actions';for(const id of ['btn-reset','btn-north']){const button=document.getElementById(id);actions.append(button);button.addEventListener('click',()=>sheet.close());}sheet.append(actions);
  for(const selector of ['.legend','.data-status','.hint']){const element=document.querySelector(selector);if(element)sheet.append(element);}document.body.append(sheet);
  const options=document.createElement('button');options.id='btn-map-info';options.type='button';options.setAttribute('aria-controls',sheet.id);options.setAttribute('aria-expanded','false');options.setAttribute('aria-label',text('地图选项、图例与数据','Map options, legend and data','地図設定・凡例・データ'));tools.append(options);
  function closeNearby(){const nearby=document.querySelector('.nearby-resorts');nearby?.classList.remove('expanded');nearby?.querySelector('.nearby-toggle')?.setAttribute('aria-expanded','false');}
  options.onclick=()=>{if(sheet.open)sheet.close();else{closeNearby();sheet.showModal();options.setAttribute('aria-expanded','true');}};
  sheet.addEventListener('close',()=>options.setAttribute('aria-expanded','false'));
  sheet.addEventListener('click',event=>{if(event.target!==sheet)return;const box=sheet.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)sheet.close();});
  function decorate(button,icon,label){
    for(const node of [...button.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();
    const graphic=document.createElement('span');graphic.className='control-icon';graphic.innerHTML=icon;const caption=document.createElement('span');caption.className='control-short';caption.textContent=label;button.prepend(graphic);button.append(caption);return caption;
  }
  const view=document.getElementById('btn-view');const viewCaption=decorate(view,icons.view,text('山前','Mountain','山麓'));
  decorate(document.getElementById('btn-vegetation'),icons.trees,text('植被','Trees','樹木'));
  decorate(document.getElementById('btn-labels'),icons.names,text('名称','Names','名称'));
  decorate(options,icons.options,text('选项','Options','設定'));
  function updateCaptions(){const mountain=view.getAttribute('aria-pressed')==='true';const value=mountain?text('山前','Mountain','山麓'):text('全览','Overview','全景');if(viewCaption.textContent!==value)viewCaption.textContent=value;view.setAttribute('aria-label',mountain?text('山前视角，切换全览','Mountain view, switch to overview','山麓視点、全景へ切り替え'):text('全览视角，切换山前','Overview, switch to mountain view','全景、山麓視点へ切り替え'));}
  new MutationObserver(updateCaptions).observe(view,{attributes:true,attributeFilter:['aria-pressed']});updateCaptions();
  const panel=document.getElementById('feature-panel');panel.setAttribute('role','region');panel.setAttribute('aria-label',text('雪道详情','Run details','コース詳細'));document.getElementById('close-panel').setAttribute('aria-label',text('关闭雪道详情','Close run details','コース詳細を閉じる'));
  let start=null;
  panel.addEventListener('pointerdown',event=>{if(event.target.closest('button')||event.clientY>panel.getBoundingClientRect().top+65)return;start={x:event.clientX,y:event.clientY};});
  panel.addEventListener('pointerup',event=>{if(start&&event.clientY-start.y>55&&Math.abs(event.clientX-start.x)<65)document.getElementById('close-panel').click();start=null;});
  panel.addEventListener('pointercancel',()=>start=null);
  document.addEventListener('snowatlas:trail-selected',()=>{if(sheet.open)sheet.close();closeNearby();});
  document.addEventListener('click',event=>{if(event.target.closest('.nearby-toggle')&&sheet.open)sheet.close();},true);
  const resortTitle=document.querySelector('.masthead h1');
  const updateTitle=()=>{resortTitle.title=resortTitle.textContent;resortTitle.setAttribute('aria-label',resortTitle.textContent);};
  updateTitle();new MutationObserver(updateTitle).observe(resortTitle,{childList:true,subtree:true,characterData:true});
  const compactAttribution=()=>{const attribution=document.querySelector('.maplibregl-ctrl-attrib');if(attribution){attribution.removeAttribute('open');attribution.classList.remove('maplibregl-compact-show');return true;}return false;};
  window.snowAtlasCompactAttribution=compactAttribution;
  if(!compactAttribution()){const observer=new MutationObserver(()=>{if(compactAttribution())observer.disconnect();});observer.observe(document.getElementById('map'),{childList:true,subtree:true});}

  const guide=document.createElement('dialog');guide.className='operation-guide';guide.setAttribute('aria-labelledby','operation-guide-title');
  const guideTitle=document.createElement('h2');guideTitle.id='operation-guide-title';guideTitle.textContent=text('看山，也看雪道','Explore the mountain','山とコースを見渡す');
  const guideLines=[
    text(matchMedia('(pointer: coarse)').matches?'山前：单指绕山，双指缩放。全览：自由移动与旋转。':'山前：拖动绕山，滚轮缩放。全览：自由平移与旋转。','Mountain: drag to orbit, pinch or scroll to zoom. Overview: move freely.','山麓：ドラッグで回転、ピンチで拡大。全景：自由に移動。'),
    text('底栏切视角、植被、名称；筛选雪道难度。','Use the bottom bar for views, trees, labels and run difficulty.','下のバーで視点・樹木・名称・難度を切り替え。'),
    text('点雪道看长度与坡度，分享可保留当前视角。','Tap a run for length and gradient. Share saves this view.','コースをタップで距離と斜度。共有で今の視点を保存。')
  ];
  const guideBody=document.createElement('div');for(const line of guideLines){const p=document.createElement('p');p.textContent=line;guideBody.append(p);}
  const dismiss=document.createElement('button');dismiss.className='extra-button';dismiss.textContent=text('开始看山','Explore','地図を見る');
  let guideSeen=false;try{guideSeen=localStorage.getItem('snowatlas-guide-v1')==='seen';}catch{}
  function acknowledgeGuide(){guideSeen=true;try{localStorage.setItem('snowatlas-guide-v1','seen');}catch{}}
  dismiss.onclick=()=>guide.close();guide.addEventListener('close',acknowledgeGuide);
  guide.append(guideTitle,guideBody,dismiss);document.body.append(guide);
  const help=document.createElement('button');help.className='guide-reopen';help.textContent=text('操作说明','Quick guide','操作ガイド');help.onclick=()=>{sheet.close();guide.showModal();};sheet.append(help);
  const entry=(window.SNOW_ATLAS_RESORTS||[]).find(r=>r.id===new URLSearchParams(location.search).get('id'));
  if(entry?.country==='JP'&&entry.officialUrl){const a=document.createElement('a');a.className='guide-reopen';a.href=entry.officialUrl;a.target='_blank';a.rel='noopener';a.textContent=text('官网 · 查看最新雪道图与营业信息','Official site · trail map & operations','公式サイト・コースマップと営業情報');sheet.append(a);}
  const credits=document.createElement('p');credits.className='data-attribution';credits.innerHTML='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors (ODbL)</a> · AWS Terrain · ESA WorldCover 2021 · MapLibre';sheet.append(credits);
  let guideScheduled=false;
  const mount=()=>{const extras=document.querySelector('.scene-extras');if(extras&&extras.parentElement!==dock)dock.append(extras);
    if(extras&&!guideSeen&&!guideScheduled){guideScheduled=true;requestAnimationFrame(()=>{if(!guideSeen&&!guide.open)guide.showModal();});}
  };
  mount();window.snowAtlasMountActions=mount;
})();

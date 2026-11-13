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
  const home=document.createElement('a');home.className='scene-home';home.href='./index.html?lang='+encodeURIComponent(lang);home.setAttribute('aria-label',text('返回中国地图','Back to China map','中国地図へ戻る'));home.innerHTML=svg('<path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>');document.body.append(home);
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
  const mount=()=>{const extras=document.querySelector('.scene-extras');if(extras&&extras.parentElement!==dock)dock.append(extras);};
  mount();window.snowAtlasMountActions=mount;
})();

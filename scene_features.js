window.snowAtlasSceneFeatures=function(map,resort,mode){
 const lang=localStorage.getItem('snow-language')||'zh',txt=(z,e,j)=>lang==='en'?e:lang==='ja'?j:z;
 const box=document.createElement('div');box.className='scene-extras';
 const filter=document.createElement('select');filter.className='extra-select';filter.setAttribute('aria-label',txt('雪道难度筛选','Filter runs','コース難度'));
 for(const [v,t] of [['all',txt('全部雪道','All runs','全コース')],['easy',txt('仅初级','Easy only','初級のみ')],['intermediate',txt('仅中级','Intermediate only','中級のみ')],['advanced',txt('仅高级','Advanced only','上級のみ')],['none',txt('隐藏雪道','Hide runs','コース非表示')]]){const o=document.createElement('option');o.value=v;o.text=t;filter.append(o);}
 const apply=()=>{const v=filter.value;filter.dataset.filtered=String(v!=='all');const f=v==='all'?null:v==='none'?['==',['get','kind'],'__hidden__']:['in',['get','difficulty'],['literal',v==='easy'?['novice','easy']:v==='advanced'?['advanced','expert','freeride']:['intermediate']]];
 for(const id of ['piste-snow-lane','piste-casing','piste-lines','piste-hit-area'])if(map.getLayer(id))map.setFilter(id,f);
 if(map.getSource('selected-piste'))map.getSource('selected-piste').setData({type:'FeatureCollection',features:[]});
 document.getElementById('feature-panel').hidden=true;
 // The name markers expose source difficulty via a separate scene hook.
 window.snowAtlasFilterNames?.(v);
 };
 const initial=new URLSearchParams(location.search).get('runs');if([...filter.options].some(o=>o.value===initial))filter.value=initial;filter.onchange=apply;apply();
 const share=document.createElement('button');share.className='extra-button';share.type='button';share.setAttribute('aria-label',txt('分享当前视角','Share current view','現在の視点を共有'));const shareIcon=document.createElementNS('http://www.w3.org/2000/svg','svg');shareIcon.setAttribute('viewBox','0 0 24 24');shareIcon.setAttribute('aria-hidden','true');shareIcon.innerHTML='<path d="M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7"/>';const shareLabel=document.createElement('span');shareLabel.textContent=txt('分享视角','Share view','視点を共有');share.append(shareIcon,shareLabel);
 share.onclick=async()=>{if(share.disabled)return;share.disabled=true;const c=map.getCenter(),u=new URL('scene.html',location.href);u.searchParams.set('id',resort.id);u.searchParams.set('lang',lang);u.searchParams.set('camera',[c.lng.toFixed(6),c.lat.toFixed(6),map.getZoom().toFixed(3),map.getBearing().toFixed(2),map.getPitch().toFixed(2)].join(','));u.searchParams.set('mode',mode());u.searchParams.set('runs',filter.value);
 try{if(navigator.share)await navigator.share({title:resort.name,url:u.href});else{await navigator.clipboard.writeText(u.href);notice(txt('链接已复制','Link copied','リンクをコピーしました'));}}
 catch(e){if(e.name!=='AbortError'){const input=document.createElement('input');input.value=u.href;input.className='share-status';input.readOnly=true;document.body.append(input);input.select();input.onclick=()=>input.select();setTimeout(()=>input.remove(),30000);}}finally{share.disabled=false;}};
 function notice(s){const n=document.createElement('div');n.className='share-status';n.textContent=s;document.body.append(n);setTimeout(()=>n.remove(),2400);}
 box.append(filter,share);(document.getElementById('scene-dock')||document.body).append(box);window.snowAtlasMountActions?.();window.snowAtlasCompactAttribution?.();
};

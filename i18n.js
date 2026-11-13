(()=>{
const lang=new URLSearchParams(location.search).get('lang')||localStorage.getItem('snow-language')||'zh';
document.documentElement.lang=lang;localStorage.setItem('snow-language',lang);
const dict={
'中国滑雪地图':['China Ski Atlas','中国スキーマップ'],'雪场名单':['Resorts','スキー場一覧'],'全国视角':['China','全国表示'],'返回中国地图':['Back to China','中国地図に戻る'],'附近雪场':['Nearby resorts','周辺のスキー場'],
'山前 · 切全览':['Mountain · Overview','山麓 · 全景へ'],'全览 · 切山前':['Overview · Mountain','全景 · 山麓へ'],'植被：开':['Trees: on','樹木：表示'],'植被：关':['Trees: off','樹木：非表示'],'名称 / 海拔':['Names / elevation','名称 / 標高'],'隐藏名称 / 海拔':['Hide names / elevation','名称 / 標高を隠す'],'复位视角':['Reset view','視点を戻す'],'正北':['North','北向き'],'初级':['Easy','初級'],'中级':['Intermediate','中級'],'高级':['Advanced','上級'],'索道 / 魔毯':['Lifts / carpets','リフト / ベルト'],'未分级':['Unrated','未分類'],'雪道':['Run','コース'],'长度':['Length','距離'],'最大坡度':['Max gradient','最大斜度'],'社区坐标 · 待官方核对':['Community data · unverified','コミュニティ情報・未検証'],'20 km 内附近雪场 · 直线距离':['Resorts within 20 km · straight-line','20 km以内のスキー場・直線距離'],'虚线为位置示意，非雪场边界；不表示雪道互通':['Approximate location; routes may not connect','位置の目安です。コースの接続を示しません'],'拖动绕雪场中心旋转 · 滚轮缩放 · 俯仰与平移已锁定':['Drag to orbit · Pinch to zoom','ドラッグで回転・ピンチで拡大縮小'],'已加载公开OSM线路 · 地理位置及名称尚未官方核验':['OSM routes loaded · names and locations unverified','OSMコース読込済み・名称と位置は未検証'],'雪场线路预载':['Preloading routes','コースを先読み'],'林冠位置示意':['Illustrative trees','樹木位置のイメージ'],'林区':['Woodland','森林'],'有名称':['Named','名称あり'],'索道':['Lift','リフト'],'真实DEM地形':['Elevation terrain','標高地形'],'OSM候选线路':['OSM routes','OSMコース'],'待核验':['Unverified','未検証'],'米':['m','m']};
const names=['Jikepulin','Beidahu','Songhua Lake','Xueruyi','Wanlong','Koktokay','Yunding','Wanfeng Tonghua','Jiangjunshan','Fulong','Jinshanling','Aoshan','Thaiwoo','Changbaishan Wanda','Yabuli','Silk Road','Beijing Nanshan','Huaibei International','Cuiyunshan Galaxy','Yuyang International','Miaoxiangshan','Jundushan','National Alpine Skiing Centre','Shijinglong'];
const ids=['jikepulin','beidahu','songhuahu','xueruyi','wanlong','koktokay','yunding','wanfeng','jiangjunshan','fulong','jinshanling','aoshan','thaiwoo','wanda','yabuli','silkroad','nanshan','huaibei','galaxy','yuyang','miaoxiangshan','jundushan','alpine','shijinglong'];
for(const r of window.SNOW_ATLAS_RESORTS||[]){const i=ids.indexOf(r.id);if(i>=0)dict[r.name]=[names[i],r.name];}
Object.assign(dict,{'新疆':['Xinjiang','新疆'],'东北':['Northeast','東北'],'京冀':['Beijing / Hebei','北京・河北'],'陕西':['Shaanxi','陝西'],'查看地区':['Explore region','エリアを見る'],
 '进入雪场':['Open resort','スキー場を開く'],'搜索雪场':['Search resorts','スキー場を検索'],'没有匹配的雪场':['No matching resorts','該当するスキー場はありません'],
 '地图设置':['Map settings','地図設定'],'图例与数据':['Legend & data','凡例とデータ'],'地图选项':['Map options','地図オプション'],
 '关闭':['Close','閉じる'],'返回':['Back','戻る'],'全览':['Overview','全景'],'山前':['Mountain','山麓'],'名称':['Names','名称'],'植被':['Trees','樹木'],'分享':['Share','共有'],'筛选':['Filter','絞り込み'],
 '全部雪道':['All runs','全コース'],'仅初级':['Easy only','初級のみ'],'仅中级':['Intermediate only','中級のみ'],'仅高级':['Advanced only','上級のみ'],'隐藏雪道':['Hide runs','コース非表示'],
 '分享视角':['Share view','視点を共有'],'按OSM已测绘雪道长度，非官方排名':['Mapped length · community data','OSMコース延長・参考情報']
});
const namesById={};
for(const r of window.SNOW_ATLAS_RESORTS||[])namesById[r.id]=lang==='zh'?r.name:dict[r.name]?.[lang==='ja'?1:0]||r.name;
const keys=Object.keys(dict).sort((a,b)=>b.length-a.length);
const escaped=keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
const pattern=new RegExp(escaped.join('|'),'g');
function translate(t){return lang==='zh'?t:t.replace(pattern,k=>dict[k][lang==='ja'?1:0]);}
window.SnowI18n={t:translate,name:id=>namesById[id],lang};
function scan(root){
 if(root.nodeType===3){const p=root.parentElement;if(p&&!p.closest('[data-i18n-skip],script,style,#language-select')){const v=translate(root.nodeValue);if(v!==root.nodeValue)root.nodeValue=v;}return;}
 if(root.nodeType!==1)return;
 if(root.closest('[data-i18n-skip],script,style,#language-select'))return;
 for(const el of [root,...root.querySelectorAll('[aria-label],[title],[placeholder]')]){
  if(el.closest('[data-i18n-skip],#language-select'))continue;
  for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a);if(v){const next=translate(v);if(next!==v)el.setAttribute(a,next);}}
 }
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())scan(n);
}
const select=document.createElement('select');select.id='language-select';select.setAttribute('aria-label','Language / 语言 / 言語');
for(const [v,t] of [['zh','中文'],['en','English'],['ja','日本語']]){const o=document.createElement('option');o.value=v;o.text=t;select.append(o);}select.value=lang;select.onchange=()=>{localStorage.setItem('snow-language',select.value);const u=new URL(location.href);u.searchParams.set('lang',select.value);
 const map=window.__snowAtlasMap;
 if(map){const c=map.getCenter();u.searchParams.set('camera',[c.lng,c.lat,map.getZoom(),map.getBearing(),map.getPitch()].join(','));u.searchParams.set('mode',document.body.dataset.view||'mountain');const f=document.querySelector('.extra-select');if(f)u.searchParams.set('runs',f.value);}
 location.href=u.href;};document.body.append(select);
const css=document.createElement('style');css.textContent='#language-select{position:fixed;right:18px;top:82px;z-index:30;border:1px solid #b6c7c9;background:#f4f6f0;color:#244454;border-radius:5px;padding:6px;font:12px system-ui}body:not(.in-scene) .header-controls{margin-right:0}@media(max-width:600px){#language-select{top:78px;right:10px;font-size:11px;padding:4px}}';document.head.append(css);
scan(document.body);
const pending=new Set();let scheduled=false;
new MutationObserver(records=>{for(const r of records){if(r.type==='characterData')pending.add(r.target);else for(const n of r.addedNodes)pending.add(n);}if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;for(const n of pending)if(n.isConnected)scan(n);pending.clear();});}).observe(document.body,{childList:true,subtree:true,characterData:true});
})();

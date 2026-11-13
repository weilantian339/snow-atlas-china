(() => {
const VERSION='fast31',pending=new Map();
function canonical(path){const u=new URL(path,location.href);u.searchParams.set('v',VERSION);return u.href;}
window.snowData=function(path,options={}){
 try{if(parent!==window&&parent.location.origin===location.origin&&parent.snowData)return parent.snowData(path,options);}catch{}
 const key=canonical(path);
 if(!pending.has(key))pending.set(key,fetch(key,{cache:'force-cache',priority:options.priority||'auto'}).then(r=>{if(!r.ok)throw Error(r.status+' '+path);return r.json();}).catch(e=>{pending.delete(key);throw e;}));
 return pending.get(key);
};
window.snowDataVersion=VERSION;
if('serviceWorker' in navigator&&isSecureContext)navigator.serviceWorker.register('./sw31.js',{scope:'./'}).then(()=>{document.documentElement.dataset.offlineCache='ready';}).catch(e=>console.info('Optional persistent cache unavailable',e.message));
})();

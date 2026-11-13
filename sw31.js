const CACHE='snow-atlas-fast31';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('snow-atlas-fast')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
let writes=0;
self.addEventListener('fetch',event=>{
 const request=event.request,u=new URL(request.url);
 const root=new URL(self.registration.scope);
 const local=u.origin===root.origin&&u.pathname.startsWith(root.pathname+'data/');
 const terrain=u.origin==='https://s3.amazonaws.com'&&u.pathname.startsWith('/elevation-tiles-prod/terrarium/');
 if(request.method!=='GET'||(!local&&!terrain))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),hit=await cache.match(request);
  if(hit)return hit;
  const response=await fetch(request);
  if(response.ok){try{await cache.put(request,response.clone());if(++writes%20===0){const keys=await cache.keys();for(const key of keys.slice(0,Math.max(0,keys.length-512)))await cache.delete(key);}}catch{}}
  return response;
 })());
});

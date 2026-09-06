const CACHE_STATIC = "ttb-static-v10";
const CACHE_TEXT = "ttb-text-v10";
const PRECACHE = ["./","./index.html","./manifest.webmanifest","./assets/index.js","./assets/routes.js","./assets/styles.css"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE_STATIC).then((c)=>c.addAll(PRECACHE)).then(()=>self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((k)=>k!==CACHE_STATIC&&k!==CACHE_TEXT).map((k)=>caches.delete(k)))).then(()=>self.clients.claim())));
function isTextJson(url){try{return /\/text\/[^/]+\.json$/i.test(new URL(url).pathname)}catch{return false}}
self.addEventListener("fetch",(event)=>{
  const req=event.request; if(req.method!=="GET") return;
  if(isTextJson(req.url)){
    event.respondWith(fetch(req).then((res)=>{if(res&&res.ok){const c=res.clone();caches.open(CACHE_TEXT).then(cache=>cache.put(req,c))}return res}).catch(()=>caches.match(req).then(c=>c||Response.error())));
    return;
  }
  const isNav=req.mode==="navigate";
  const dest=req.destination;
  if(isNav||dest==="script"||dest==="style"||dest==="manifest"||req.url.includes("/assets/")){
    event.respondWith(fetch(req).then((res)=>{if(res&&res.ok){const c=res.clone();caches.open(CACHE_STATIC).then(cache=>cache.put(req,c))}return res}).catch(()=>caches.match(req).then(c=>c||(isNav?caches.match("./index.html"):Response.error()))));
  }
});

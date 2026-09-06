/* The Time Travelers Bible — service worker v5 */
const CACHE_STATIC = "ttb-static-v5";
const CACHE_TEXT = "ttb-text-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest?v=5",
  "./ttb-mark-64.png",
  "./ttb-mark-180.png",
  "./ttb-mark-192.png",
  "./ttb-mark-512.png",
  "./assets/index.js",
  "./assets/routes.js",
  "./assets/styles.css",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_STATIC && k !== CACHE_TEXT).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
function isTextJson(url) {
  try { return /\/text\/[^/]+\.json$/i.test(new URL(url).pathname); } catch { return false; }
}
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = req.url;
  if (isTextJson(url)) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_TEXT).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || Response.error()))
    );
    return;
  }
  const dest = req.destination;
  const isNav = req.mode === "navigate";
  const isAsset = ["script","style","image","font","manifest"].includes(dest) || url.includes("/assets/") || url.includes("ttb-mark-");
  if (isNav || isAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req).then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_STATIC).then((c) => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
  }
});

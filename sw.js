/* The Time Travelers Bible — service worker (GitHub Pages /the-scroll/) */
const CACHE_STATIC = "ttb-static-v3";
const CACHE_TEXT = "ttb-text-v3";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./ttb-mark2-192.png",
  "./ttb-mark2-512.png",
  "./ttb-apple-touch-icon.png",
  "./assets/index.js",
  "./assets/routes.js",
  "./assets/styles.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_TEXT)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isTextJson(url) {
  try {
    const u = new URL(url);
    return /\/text\/[^/]+\.json$/i.test(u.pathname);
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = req.url;

  // Scripture JSON: network-first, fall back to cache
  if (isTextJson(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_TEXT).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || Response.error()))
    );
    return;
  }

  // Same-origin navigation / static: cache-first, then network
  const dest = req.destination;
  const isNav = req.mode === "navigate";
  const isAsset =
    dest === "script" ||
    dest === "style" ||
    dest === "image" ||
    dest === "font" ||
    dest === "manifest" ||
    url.includes("/assets/");

  if (isNav || isAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_STATIC).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => {
          if (isNav) return caches.match("./index.html");
          return Response.error();
        });
      })
    );
  }
});

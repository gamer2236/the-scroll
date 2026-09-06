/* The Time Traveler Bible — service worker */
const CACHE_STATIC = "ttb-static-v5";
const CACHE_TEXT = "ttb-text-v5";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./ttb-mark2-192.png",
  "./ttb-mark2-512.png",
  "./ttb-apple-touch-icon.png",
  "./assets/index.js",
  "./assets/routes-v5.js",
  "./assets/styles-v5.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_STATIC && k !== CACHE_TEXT).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TTB_CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.skipWaiting())
    );
  }
});

function isTextJson(url) {
  try {
    return /\/text\/[^/]+\.json$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = req.url;

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

  const dest = req.destination;
  const isNav = req.mode === "navigate";
  const isShell =
    isNav ||
    dest === "script" ||
    dest === "style" ||
    dest === "manifest" ||
    url.includes("/assets/") ||
    url.includes("sw.js");

  // Network-first for app shell so updates land; cache as fallback (offline)
  if (isShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_STATIC).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => {
            if (cached) return cached;
            if (isNav) return caches.match("./index.html");
            return Response.error();
          })
        )
    );
  }
});

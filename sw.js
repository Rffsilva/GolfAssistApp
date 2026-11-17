// Offline support: app shell is network-first (so new deploys show up), map tiles are cache-first.
const VERSION = "bm-v3";
const SHELL = ["./", "index.html", "style.css", "app.js", "data/course.js", "data/geo.js",
  "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png",
  "vendor/leaflet/leaflet.css", "vendor/leaflet/leaflet.js"];
const TILE_CACHE = "bm-tiles";
const MAX_TILES = 2500;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== TILE_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.hostname.includes("arcgisonline.com")) {
    e.respondWith(caches.open(TILE_CACHE).then(async (c) => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok || res.type === "opaque") {
        c.put(e.request, res.clone());
        c.keys().then((k) => { if (k.length > MAX_TILES) k.slice(0, k.length - MAX_TILES).forEach((r) => c.delete(r)); });
      }
      return res;
    }));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then((res) => {
      if (res.ok) caches.open(VERSION).then((c) => c.put(e.request, res.clone()));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true })));
  }
});

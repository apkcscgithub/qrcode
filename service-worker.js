const CACHE_NAME = "qr-carton-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./generate.html",
  "./scan.html",
  "./manifest.json",
  "./css/style.css",
  "./js/login.js",
  "./js/generateGS1.js",
  "./js/dataEntry.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

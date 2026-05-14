// Cache name is injected by CI (sed replaces __BUILD_ID__ with the git commit SHA).
// Changing the name on each deploy is how cache-busting works: the old cache stays
// untouched while the new one is being built, then the old one gets deleted in activate.
var CACHE_NAME = "vicy-cache-__BUILD_ID__";

// Explicit list of assets to pre-cache on install. Only these are served offline.
// Relative paths (./foo) resolve relative to the SW file location, which is /vicy/sw.js,
// so they correctly resolve to /vicy/foo even on a GitHub Pages subpath.
var urlsToCache = [
  "./",
  "./manifest.json",
  "./favicon.ico",
  "./sw.js",
  "./vigenere.js",
  "./style.min.css",
  "./assets/logo-192.png",
  "./assets/logo-512.png",
  "https://fonts.googleapis.com/css?family=Open+Sans",
];

// LIFECYCLE: INSTALL
// Fired when a new SW version is downloaded. Pre-fetches and caches all listed assets.
// event.waitUntil() keeps the SW in the installing state until the promise resolves —
// if caching fails, the install fails and the SW is discarded.
// skipWaiting() skips the normal waiting phase (where the new SW would wait for all
// tabs running the old SW to close) and moves straight to activate.
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// LIFECYCLE: ACTIVATE
// Fired after install, once the SW is in control. Two things happen here:
// 1. Old caches are deleted — any cache not matching the current CACHE_NAME is a
//    leftover from a previous deploy and can be safely removed.
// 2. clients.claim() makes this SW take control of all already-open pages immediately.
//    Without it, pages opened before this SW activated would not be controlled by it
//    until they reload — they'd still be using the old SW (or no SW at all).
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// LIFECYCLE: FETCH
// Intercepts every network request made by the page. Strategy here is cache-first:
// serve from cache if available, fall through to the network if not.
// Only responses with status 200 and type "basic" (same-origin) or "cors"
// (cross-origin with CORS headers, e.g. Google Fonts) are considered valid.
// Opaque responses (no-cors cross-origin, status 0) are passed through as-is
// but not cached, since we can't inspect them.
self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      }

      return fetch(event.request).then(function (response) {
        if (
          !response ||
          response.status !== 200 ||
          (response.type !== "basic" && response.type !== "cors")
        ) {
          return response;
        }

        // Intentionally not caching runtime requests — only the explicitly listed
        // assets above are cached. Dynamic caching is commented out below as reference.
        //var responseToCache = response.clone();
        //caches.open(CACHE_NAME).then(function(cache) {
        //cache.put(event.request, responseToCache);
        //});

        return response;
      });
    })
  );
});

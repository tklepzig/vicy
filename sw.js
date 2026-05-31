// Cache name is injected by CI (sed replaces __BUILD_ID__ with the git commit SHA).
// Changing the name on each deploy is how cache-busting works: the old cache stays
// untouched while the new one is being built, then the old one gets deleted in activate.
var CACHE_NAME = "vicy-cache-__BUILD_ID__";

// Explicit list of assets to pre-cache on install. Only these are served offline.
// Relative paths (./foo) resolve relative to the SW file location, which is /vicy/sw.js,
// so they correctly resolve to /vicy/foo even on a GitHub Pages subpath.
var urlsToCache = [
  "./",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./sw.js",
  "./ui.js",
  "./vigenere.js",
  "./style.min.css",
  "./assets/logo-192.png",
  "./assets/logo-512.png",
  "./assets/logo-192-maskable.png",
  "./assets/logo-512-maskable.png",
  "./assets/fonts/open-sans-latin.woff2",
  "./assets/fonts/source-code-pro-latin.woff2",
];

// Precache each URL individually with allSettled rather than cache.addAll.
// addAll is atomic: one 404 or network blip rejects the whole batch, the install
// promise rejects, and the SW never activates — a silent total offline failure.
// Per-URL add lets us cache everything reachable, activate regardless, and let
// the readiness check (below) report exactly which assets are missing.
function precache() {
  return caches.open(CACHE_NAME).then(function (cache) {
    return Promise.allSettled(
      urlsToCache.map(function (url) {
        return cache.add(url);
      }),
    );
  });
}

// LIFECYCLE: INSTALL
// Fired when a new SW version is downloaded. Pre-fetches and caches all listed
// assets. precache() never rejects (allSettled), so activation always proceeds
// even if some assets failed — deliberate, so the worker survives to report the
// gap instead of failing silently like a rejected addAll would.
// skipWaiting() skips the normal waiting phase (where the new SW would wait for
// all tabs running the old SW to close) and moves straight to activate.
self.addEventListener("install", function (event) {
  event.waitUntil(precache());
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
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function (name) {
              return name !== CACHE_NAME;
            })
            .map(function (name) {
              return caches.delete(name);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

// LIFECYCLE: FETCH
// Intercepts every request. Cache-first for everything: serve from cache if
// present, else go to the network (we only ever cache the precached assets, so
// the network response is passed through, not stored). Navigation requests get
// an extra fallback to the cached shell so the app still boots offline.
self.addEventListener("fetch", function (event) {
  var request = event.request;

  // Navigation requests (launching the PWA, reloads) get special handling: if the
  // exact URL isn't cached — e.g. Android appends ?source=pwa to start_url, which
  // wouldn't byte-match the cached "./" — fall back to the cached shell so the app
  // still boots offline instead of showing the browser's offline page. Vicy caches
  // "./" (not "./index.html"), so that's the fallback target.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(function (response) {
        return (
          response ||
          fetch(request).catch(function () {
            return caches.match("./");
          })
        );
      }),
    );
    return;
  }

  // Cache-first for everything else: serve from cache if present, else network.
  event.respondWith(
    caches.match(request).then(function (response) {
      return response || fetch(request);
    }),
  );
});

// Readiness check (source of truth for the "Offline ready" indicator). The page
// asks via a MessageChannel; we check the LIVE cache against urlsToCache and reply
// { ready, missing }. Checking the live cache (not an in-memory flag) keeps the
// answer honest across a fresh worker wake-up and even after the browser evicts
// cache entries under storage pressure.
function checkOfflineReady() {
  return caches.open(CACHE_NAME).then(function (cache) {
    return Promise.all(
      urlsToCache.map(function (url) {
        return cache.match(url, { ignoreSearch: true }).then(function (match) {
          return match ? null : url;
        });
      }),
    ).then(function (results) {
      var missing = results.filter(Boolean);
      return { ready: missing.length === 0, missing: missing };
    });
  });
}

self.addEventListener("message", function (event) {
  if (!event.data || event.data.type !== "CHECK_OFFLINE_READY") return;
  var port = event.ports[0];
  if (!port) return;
  event.waitUntil(
    checkOfflineReady().then(function (result) {
      port.postMessage(result);
    }),
  );
});

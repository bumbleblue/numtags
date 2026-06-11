// numtags service worker — offline app shell + runtime asset cache (spec §5, §7.1).
// Navigations are network-first (fresh app when online, cached shell offline);
// same-origin assets are stale-while-revalidate. The catalog snapshot is bundled
// into the JS, so cached assets = offline catalog.
const CACHE_NAME = 'numtags-v3'; // bumped: /settings removed from the shell
const SHELL = ['/', '/import', '/notation', '/about', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin (e.g. the OMR/catalog service)

  if (request.mode === 'navigate') {
    // Network-first: fresh HTML when online; cached page, then shell, offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match('/'))
        )
    );
    return;
  }

  // Assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((hit) => {
      const refresh = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});

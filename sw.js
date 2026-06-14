const CACHE_NAME = 'fotoscout-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first for data.json, cache first for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // data.json: always fetch from network, bypass cache entirely
  if (url.pathname.endsWith('data.json')) {
    event.respondWith(
      fetch(event.request.url + (event.request.url.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
        cache: 'no-store'
      })
      .catch(() => caches.match(event.request))
    );
    return;
  }

  // Photos: cache on first load
  if (url.pathname.includes('/photos/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // HTML: network first (so refresh button always gets latest)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

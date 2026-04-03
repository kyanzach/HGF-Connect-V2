// THE WORD — Service Worker (offline shell cache)
const CACHE_NAME = 'theword-v1';
const SHELL_ASSETS = [
  '/thewordtool.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API calls: network-only (server scripts need real-time data)
  if (url.pathname.startsWith('/api/')) return;

  // Everything else: network-first, cache fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful HTML/icon responses
        if (res.ok && (url.pathname.endsWith('.html') || url.pathname.startsWith('/icons/'))) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// HGF Connect — Service Worker v2.5.1
// Strategy: network-first for navigation, cache-first for assets, offline fallback for everything
const CACHE_NAME = 'hgf-connect-v2.5.1';

const PRECACHE = [
  '/',
  '/offline.html',
  '/icons/icon-192.png',
  '/manifest.json',
];

// Guaranteed offline fallback — NEVER returns null (Safari PWA crashes on null response)
async function offlineFallback() {
  const cached = await caches.match('/offline.html');
  if (cached) return cached;
  // Emergency inline response if offline.html itself isn't cached yet
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>HGF Connect — Offline</title></head>
    <body style="font-family:-apple-system,sans-serif;text-align:center;padding:3rem;background:#0f2d3d;color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column">
    <div style="font-size:3rem;margin-bottom:1rem">📡</div>
    <h2 style="margin-bottom:0.5rem">You're Offline</h2>
    <p style="opacity:0.7;margin-bottom:1.5rem">Check your connection and try again.</p>
    <button onclick="location.reload()" style="background:#4EB1CB;color:white;border:none;border-radius:999px;padding:0.75rem 2rem;font-size:1rem;font-weight:700;cursor:pointer">Retry</button>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

// ── Install: pre-cache essentials ──────────────────────────────────────────────
self.addEventListener('install', (e) => {
  self.skipWaiting(); // take over immediately — don't wait for existing clients to close
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(PRECACHE))
      .then(() => console.log('[SW] Pre-cached', PRECACHE.length, 'files'))
  );
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Message: handle SKIP_WAITING from UpdateToast ──────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    // Notify all clients that we updated
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED' }));
    });
  }
});

// ── Fetch: routing strategies ─────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Never intercept non-http (chrome-extension, etc.)
  if (!request.url.startsWith('http')) return;

  // Never cache API calls — always fresh
  if (request.url.includes('/api/')) return;

  // Never cache Next.js internals or hot-reload
  if (request.url.includes('/_next/webpack-hmr')) return;

  // Strategy 1: NAVIGATION → network-first, fall to offline.html
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((r) => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return r;
        })
        .catch(async () => {
          const exact = await caches.match(request);
          if (exact) return exact;
          const root = await caches.match('/');
          if (root) return root;
          return offlineFallback();
        })
    );
    return;
  }

  // Strategy 2: Hashed Next.js JS/CSS chunks → cache-first (they're content-addressed)
  if (request.url.includes('/_next/static/')) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((r) => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return r;
        });
      })
    );
    return;
  }

  // Strategy 3: Images → stale-while-revalidate
  if (/\.(png|jpg|jpeg|svg|gif|ico|webp)(\?.*)?$/.test(request.url)) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request)
          .then((r) => {
            if (r.ok) {
              const clone = r.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return r;
          })
          .catch(() => cached);
        return cached || fresh;
      })
    );
    return;
  }

  // Strategy 4: Everything else → network-first, cache fallback, never undefined
  e.respondWith(
    fetch(request)
      .catch(async () => {
        const c = await caches.match(request);
        return c || offlineFallback();
      })
  );
});

/**
 * public/sw.js
 * Service Worker — cache strategi untuk PWA offline support.
 * Cache static assets, network-first untuk API calls.
 */

const CACHE_NAME = 'link-tracker-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/js/api.js',
  '/js/ui.js',
  '/js/screens.js',
  '/js/admin.js',
  '/js/main.js',
  '/manifest.json',
  '/icon.svg',
  'https://cdn.tailwindcss.com'
];

// ── Install: cache semua static assets ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http')))
    )
  );
  self.skipWaiting();
});

// ── Activate: hapus cache lama ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: strategi cache ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls → Network First (data harus fresh)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — tidak ada koneksi' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Static assets → Cache First
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(res => {
      if (res.ok && request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
      }
      return res;
    }))
  );
});

// ── Push notifications (opsional) ───────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Link Tracker', {
      body: data.body || 'Ada update baru!',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'link-tracker-notif',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});

/*
 * Service worker for Spacer PWA. Caches static assets for offline play.
 * Game state lives in localStorage, which is unaffected by SW caching.
 *
 * Strategy:
 *   cache-first for static assets (images, CSS)
 *   network-first for HTML and application JS (picks up updates when online)
 *
 * All URLs are relative so this works regardless of the base path
 * (e.g. served from /spacer/ on GitHub Pages or / locally).
 */

const CACHE_VERSION = 'spacer-v2';

/* App shell files to pre-cache on install. Vendor JS and CSS are bundled
 * by Vite into the hashed assets/ files, so we cache the index page (which
 * references them) and key images. The bundled JS/CSS gets cached at runtime
 * via the network-first fetch handler. */
const PRECACHE_URLS = [
  './',
  './css/index.css',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/compass.png',
  './img/home.png',
  './img/market.png',
  './img/summary.png',
];

function isStaticAsset(url) {
  const path = new URL(url).pathname;
  return path.includes('/css/')
      || path.includes('/img/')
      || path.includes('/assets/');
}

/* Pre-cache the app shell on install, then activate immediately. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* Purge old caches on activation, then claim all clients so the new SW
 * takes effect without requiring a page reload. */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  if (isStaticAsset(request.url)) {
    /* Cache-first: fast offline access for assets that rarely change */
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
  } else {
    /* Network-first: prefer fresh content, fall back to cache offline */
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

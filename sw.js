'use strict';
/* =====================================================================
   Het Spoor — Service Worker (v0.19.0, Fase I)
   100% offline-first precache with explicit cache versioning and
   user-controlled update activation (SKIP_WAITING via update banner).
   ===================================================================== */
const SW_VERSION = 'v0.19.0';
const CACHE_PREFIX = 'het-spoor-';
const CACHE_NAME = CACHE_PREFIX + SW_VERSION;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './content.js',
  './lib.js',
  './engine.js',
  './views.js',
  './ui.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'GET_VERSION') {
    const payload = { type: 'VERSION', version: SW_VERSION, cache: CACHE_NAME };
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(payload);
    } else if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage(payload);
    }
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never serve sw.js from the precache so the browser can always check for updates.
  if (url.pathname.endsWith('/sw.js') || url.pathname === '/sw.js') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        if (cached) return cached;
        return fetch(req).catch(() => caches.match('./'));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp && resp.ok && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return resp;
      });
    })
  );
});

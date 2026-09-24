/* Turnstone service worker — offline-first app shell.
   Version bump this constant to invalidate all caches on the next load. */
'use strict';

const VERSION = 'turnstone-v0.9.4';

/* Same-origin paths are relative to this file (served from the app root). */
const PRECACHE = [
  './',
  'app.html',
  'index.html',   /* sales page — precached so offline visits land somewhere useful */
  'versions.html', /* versions & downloads — the bookmarklet installs from here */
  'versions.js',
  'sample-links.csv',
  'sample-links.tsv',
  'sample-links.json',
  'sample-links.html',
  'sample-links.xml',
  'sample-links.xlsx',
  'icon-192.png',
  'icon-512.png',
  'assets/logo.svg',
  'assets/logo-light.svg',
  'assets/logo-dark.svg',
  /* Vendored libraries — same-origin, no CDN dependency at boot. */
  'vendor/papaparse.min.js',
  'vendor/xlsx.full.min.js',
];

self.addEventListener('install', (event) => {
  console.log('[Turnstone SW] installing', VERSION);
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(PRECACHE.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: 'reload', credentials: 'omit' }));
        console.log('[Turnstone SW] precached:', url);
      } catch (e) {
        /* A missing optional asset (e.g. sandboxed preview) must not break install. */
        console.warn('[Turnstone SW] precache miss (ok):', url, e.message);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
    await self.clients.claim();
    console.log('[Turnstone SW] active:', VERSION, '— old caches purged');
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  /* Navigations: network-first with cache fallback → the app opens offline. */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok && !fresh.redirected) {
          /* Cache the shell under its clean path so any ?file=… deep link
             can fall back to the same offline copy. */
          caches.open(VERSION).then((c) => c.put('./', fresh.clone())).catch(() => {});
        }
        return fresh;
      } catch (e) {
        const cached = (await caches.match(req, { ignoreSearch: true })) || (await caches.match('./'));
        if (cached) {
          console.log('[Turnstone SW] serving shell from cache (offline):', url.pathname);
          return cached;
        }
        return new Response('<h1>Offline</h1><p>Turnstone is unreachable and no cached copy exists in this browser yet.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  /* Same-origin assets (samples, icons): stale-while-revalidate. */
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone())).catch(() => {});
        return res;
      }).catch(() => undefined);
      if (cached) { event.waitUntil?.(network); return cached; }
      const res = await network;
      return res || new Response('offline', { status: 503 });
    })());
    return;
  }

});

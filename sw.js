/* Turnstone service worker — offline-first app shell.
   Version bump this constant to invalidate all caches on the next load. */
'use strict';

const VERSION = 'turnstone-v0.14.0';

/* Same-origin paths are relative to this file (served from the app root). */
const PRECACHE = [
  './',
  'app.html',
  'index.html',   /* sales page — precached so offline visits land somewhere useful */
  /* Guide pages: the chooser, one page per edition, and the chrome they share. */
  'versions.html',
  'web-app.html',
  'standalone.html',
  'bookmarklet.html',
  'extension.html',
  /* The workspace-link page, and the agent-facing files beside it: an offline user
     should be able to read how to build a link, and an agent that is handed the
     site URL should find llms.txt without a network. */
  'workspace-link.html',
  'llms.txt',
  'index.html.md',
  'workspace-link.html.md',
  'site.css',
  'site.js',
  'bookmarklet.js',
  'assets/sizes.json',  /* recorded artifact sizes — keeps the guide pages honest offline too */
  'sample-links.csv',
  'sample-links.tsv',
  'sample-links.json',
  'sample-links.html',
  'sample-links.xml',
  'sample-links.xlsx',
  'sample-links.docx',
  'sample-links.md',          /* the same queue as a task list… */
  'sample-links-table.md',    /* …and as a pipe table */
  'sample-links-email.csv',   /* …as an address list… */
  'sample-links-phone.csv',   /* …and as a call list */
  /* The workflow family: the lists this kind of work actually arrives as. Four of
     them are queue exports with no link anywhere, which is what the portal template
     exists for — an offline user should be able to open those too. */
  'sample-portal-tickets.csv',
  'sample-portal-triage.tsv',
  'sample-invoice-approvals.xlsx',
  'sample-vendor-onboarding.csv',
  'sample-compliance-renewals.csv',
  'sample-meeting-actions.md',
  'sample-inbox-digest.eml',   /* the same list as a table in an email body… */
  'sample-queue-email.eml',    /* …and as a sheet attached to one */
  'sample-saved-queue.mht',    /* a page kept from a portal with no export */
  'icon-192.png',
  'icon-512.png',
  'assets/logo.svg',
  'assets/logo-light.svg',
  'assets/logo-dark.svg',
  /* Vendored libraries — same-origin, no CDN dependency at boot. */
  'vendor/papaparse.min.js',
  'vendor/xlsx.full.min.js',
  /* The two embedded layers: addresses and numbers open a composer or a provider
     picker. Precached so that works offline, like everything else here. */
  'vendor/maillayer.js',
  'vendor/phonelayer.js',
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

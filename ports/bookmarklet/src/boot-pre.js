/* ---------------------------------------------------------------------------
 * Bookmarklet boot, part 1 — runs BEFORE the app code is evaluated.
 *
 * Why this order: app.html binds its whole element map (`const els = {…}`) at
 * script-evaluation time, so every element it looks up must already exist. This
 * layer creates the overlay first, then the app code runs against it.
 *
 * Why a shadow root: a bookmarklet runs inside the host page and the page's own
 * CSS would shred the app's layout. A shadow root isolates both directions, and
 * a **constructed stylesheet** (`new CSSStyleSheet()` + adoptedStyleSheets)
 * sidesteps `style-src`, which blocks an injected `<style>` on a strict-CSP page.
 *
 * Nothing here becomes a global on the host page: the vendored libraries are
 * evaluated against a shadow object (`Object.create(window)`), so a page already
 * shipping its own SheetJS or PapaParse keeps its own copies.
 * ------------------------------------------------------------------------- */

var TS_BMK = __TS_BMK__;                       // { variant, libs, css, markup, … } injected by build.js
var TS_HOST_ID = 'turnstone-bookmarklet-root';

var ROOT = null;                               // the app's element root — all its queries scope here
var THEME_ROOT = null;                         // element carrying data-theme
var TS_HOST = null, TS_SHADOW = null, TS_APP = null;

if (document.getElementById(TS_HOST_ID)) {
  throw new Error('Turnstone is already running on this page — close it first (✕ in the top bar).');
}

/* --- Host shell: a 26px bar (carry state / close) + the app viewport ------- */
TS_HOST = document.createElement('div');
TS_HOST.id = TS_HOST_ID;
TS_HOST.setAttribute('data-turnstone-variant', TS_BMK.variant);
TS_HOST.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;margin:0;padding:0;' +
  'background:#0f1115;color:#e6e9ef;font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
  'display:flex;flex-direction:column;overflow:hidden';
document.documentElement.appendChild(TS_HOST);

TS_SHADOW = TS_HOST.attachShadow({ mode: 'open' });
TS_SHADOW.innerHTML =
  '<div id="ts-bar">' +
    '<span class="ts-brand">Turnstone</span>' +
    '<span class="ts-variant"></span>' +
    '<span class="ts-spacer"></span>' +
    '<button type="button" id="ts-copy" title="Copy this queue as JSON — paste it back later with Restore">Copy state</button>' +
    '<button type="button" id="ts-restore" title="Paste a state JSON copied earlier and keep going">Restore state</button>' +
    '<button type="button" id="ts-close" title="Close Turnstone and return to the page">✕ Close</button>' +
  '</div>' +
  '<div id="ts-app">' + TS_BMK.markup + '</div>';

ROOT = TS_SHADOW.getElementById('ts-app');
TS_APP = ROOT;
THEME_ROOT = TS_HOST;

/* Styles that go into the shadow root: constructed sheet when available (CSP-proof),
   a plain <style> otherwise. Used for both the bar and the app's own stylesheet. */
function tsAdoptCss(text) {
  try {
    if (typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in ShadowRoot.prototype) {
      var sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      TS_SHADOW.adoptedStyleSheets = TS_SHADOW.adoptedStyleSheets.concat(sheet);
      return 'constructed';
    }
  } catch (e) { console.warn('[Turnstone] constructed stylesheet unavailable', e); }
  var el = document.createElement('style');
  el.textContent = text;
  TS_SHADOW.appendChild(el);
  return 'inline';
}

/* Chrome the app knows nothing about — styled from here so the app's stylesheet
   stays byte-for-byte what app.html ships. */
var TS_CSS_HOW = tsAdoptCss(
  '#ts-bar{display:flex;align-items:center;gap:8px;flex:0 0 26px;height:26px;padding:0 8px;' +
  'background:#171a21;color:#8b93a5;border-bottom:1px solid #262b36;font-size:11.5px}' +
  '#ts-bar button{font:inherit;font-size:11px;color:#e6e9ef;background:#1d212b;border:1px solid #262b36;' +
  'border-radius:5px;padding:1px 7px;cursor:pointer}' +
  '#ts-bar button:hover{border-color:#5a82e0}' +
  '.ts-brand{font-weight:600;color:#e6e9ef}' +
  '.ts-variant{font-size:10.5px;letter-spacing:.3px;text-transform:uppercase}' +
  '.ts-spacer{flex:1 1 auto}'
);
/* The app's own stylesheet, shadow-scoped. */
tsAdoptCss(TS_BMK.css);

/* --- Theme: the app's tokens now select on :host([data-theme=…]) ----------- */
(function themeBoot() {
  var theme = 'dark';
  try {
    var saved = localStorage.getItem('turnstone-theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
    else if (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) theme = 'light';
  } catch (e) { /* storage blocked: dark is the app's own default */ }
  TS_HOST.dataset.theme = theme;
})();

/* --- Session-only storage -------------------------------------------------
 * Locked scope: a bookmarklet tab may run on a throwaway origin, so storage must
 * never be assumed to stick. IndexedDB is shadowed with an in-memory stand-in so
 * the app's snapshot code keeps working for the tab's lifetime — and the user's
 * queue is never written into the host site's database. localStorage stays real
 * (every access in the app is already guarded) because that is what remembers
 * theme, open mode and column presets: small, namespaced keys. */
var indexedDB = (function memIndexedDb() {
  var stores = {};
  function request() { return { result: undefined, onsuccess: null, onerror: null }; }
  function soon(fn) { setTimeout(fn, 0); }
  function makeStore(name) {
    if (!Object.prototype.hasOwnProperty.call(stores, name)) stores[name] = new Map();
    var map = stores[name];
    return {
      put: function (value) {
        var req = request();
        soon(function () { map.set(value.key, value); req.result = value.key; if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      get: function (key) {
        var req = request();
        soon(function () { req.result = map.get(key); if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      getAll: function () {
        var req = request();
        soon(function () { req.result = Array.from(map.values()); if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      delete: function (key) {
        var req = request();
        soon(function () { map.delete(key); if (req.onsuccess) req.onsuccess(); });
        return req;
      },
      clear: function () {
        var req = request();
        soon(function () { map.clear(); if (req.onsuccess) req.onsuccess(); });
        return req;
      },
    };
  }
  return {
    open: function (name) {
      var req = request();
      soon(function () {
        req.result = {
          name: name,
          objectStoreNames: { contains: function (n) { return Object.prototype.hasOwnProperty.call(stores, n); } },
          createObjectStore: function (n) { makeStore(n); return {}; },
          transaction: function (n) {
            var os = makeStore(n);
            var tx = { objectStore: function () { return os; }, oncomplete: null, onerror: null, error: null };
            soon(function () { if (tx.oncomplete) tx.oncomplete(); });   // writes above are queued first
            return tx;
          },
        };
        if (req.onupgradeneeded) req.onupgradeneeded();
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
  };
})();

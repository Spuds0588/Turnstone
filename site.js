/* Turnstone — site helper for the guide pages.
 *
 * Every size and version these pages quote is read from the artifact itself, so a
 * rebuilt standalone or a re-cut bookmarklet payload cannot leave a page claiming a
 * number that is no longer true. The HTML carries the current value as fallback
 * text, so the page still reads correctly with no JavaScript at all — this only ever
 * corrects it.
 *
 *   <span data-size-of="turnstone-standalone.html" data-size-fallback="1.09 MB">1.09 MB</span>
 *   <span data-version-of="ports/extension/dist/build.json">v0.1.0</span>
 *
 * Sizes come from `assets/sizes.json`, which each build script writes as it produces
 * its artifact. The tempting alternative — a HEAD request's Content-Length — is
 * wrong on any CDN that content-encodes: GitHub Pages gzips these files and reports
 * the compressed length, which read the bookmarklet's 141 KB core payload as 42 KB.
 * A script cannot ask for identity encoding either, since `Accept-Encoding` is a
 * forbidden header name in fetch, and downloading each file to measure it would cost
 * ~2.3 MB on a page whose whole job is to help someone decide.
 */
(function () {
  'use strict';

  function format(n) {
    if (!n) return null;
    return n >= 1048576 ? (n / 1048576).toFixed(2) + ' MB' : Math.round(n / 1024) + ' KB';
  }

  function each(selector, fn) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
  }

  function fallback(el, text) {
    var f = el.getAttribute(text);
    if (f) el.textContent = f;
  }

  /* One fetch for every size on the page, shared by however many spans want one. */
  var sizesRequest = null;
  function sizes() {
    if (!sizesRequest) {
      sizesRequest = fetch('assets/sizes.json')
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        })
        .catch(function () { return null; });
    }
    return sizesRequest;
  }

  each('[data-size-of]', function (el) {
    var key = el.getAttribute('data-size-of');
    sizes()
      .then(function (map) {
        var n = map && map[key];
        if (!n) throw new Error('not recorded');
        el.textContent = format(n) || el.textContent;
      })
      .catch(function () { fallback(el, 'data-size-fallback'); });
  });

  each('[data-version-of]', function (el) {
    fetch(el.getAttribute('data-version-of'))
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (m) {
        el.textContent = 'v' + m.version;
        var note = el.getAttribute('data-version-note');
        if (note) el.title = note;
      })
      .catch(function () { fallback(el, 'data-version-fallback'); });
  });

  each('[data-count-of]', function (el) {
    fetch(el.getAttribute('data-count-of'))
      .then(function (r) { return r.json(); })
      .then(function (m) { el.textContent = m.files; })
      .catch(function () { fallback(el, 'data-count-fallback'); });
  });

})();

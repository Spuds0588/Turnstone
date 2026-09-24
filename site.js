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
 * Sizes come from a HEAD request: Content-Length is a CORS-safelisted response
 * header, so it is readable same-origin without downloading the file — which matters
 * when the file in question is a 1.1 MB single-page build.
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

  each('[data-size-of]', function (el) {
    fetch(el.getAttribute('data-size-of'), { method: 'HEAD' })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        var len = r.headers.get('content-length');
        if (!len) throw new Error('no content-length');
        return Number(len);
      })
      .then(function (n) { el.textContent = format(n) || el.textContent; })
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

  /* A build's installed size is a number inside its build.json, not the size of the
     JSON — reading it with data-size-of would report a few hundred bytes. */
  each('[data-total-of]', function (el) {
    fetch(el.getAttribute('data-total-of'))
      .then(function (r) { return r.json(); })
      .then(function (m) { el.textContent = format(m.bytes) || 'unknown'; })
      .catch(function () { fallback(el, 'data-total-fallback'); });
  });
})();

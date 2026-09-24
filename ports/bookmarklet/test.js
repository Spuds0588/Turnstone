/* Turnstone bookmarklet — harness script (external so the strict-CSP test page can
   reuse it under `script-src 'self'`). */
(function () {
  var VARIANTS = ['csv', 'core', 'full'];
  var list = document.getElementById('links');
  var status = document.getElementById('status');
  var loaded = 0;

  /* Strict-CSP probe: `script-src 'self'` blocks inline scripts and in-page
     javascript: links, but allows a same-origin script file — so this exercises
     the payload's mount path under that CSP with no exemption at all. */
  var probe = document.getElementById('run-probe');
  if (probe) {
    probe.addEventListener('click', function () {
      if (document.getElementById('turnstone-bookmarklet-root')) { status.textContent = 'Already mounted.'; return; }
      status.textContent = 'Injecting the core payload as a same-origin script…';
      var s = document.createElement('script');
      s.src = 'dist/csp-probe.js';
      s.onload = function () { status.textContent = 'Injected — watch for CSP violations in the console.'; };
      s.onerror = function () { status.textContent = 'dist/csp-probe.js is missing — run node ports/bookmarklet/build.js'; };
      document.body.appendChild(s);
    });
  }

  VARIANTS.forEach(function (name) {
    fetch('dist/turnstone-bookmarklet-' + name + '.txt')
      .then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
        return r.text();
      })
      .then(function (payload) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.className = 'install';
        a.href = payload.trim();
        a.textContent = 'Turnstone ' + name;
        var note = document.createElement('span');
        note.className = 'state';
        note.textContent = ' — ' + (payload.length / 1024).toFixed(0) + ' KB';
        li.appendChild(a);
        li.appendChild(note);
        list.appendChild(li);
        if (++loaded === VARIANTS.length) {
          list.querySelector('li.state') && list.querySelector('li.state').remove();
          status.textContent = 'Payloads loaded — click one to run it, or drag it to the bookmarks bar.';
        }
      })
      .catch(function (e) {
        var li = document.createElement('li');
        li.className = 'state';
        li.textContent = name + ': could not load dist/turnstone-bookmarklet-' + name + '.txt (' + e.message + ') — run node ports/bookmarklet/build.js';
        list.appendChild(li);
        status.textContent = 'Some payloads are missing — build them first.';
      });
  });
})();

/* Turnstone — versions & downloads page.
 *
 * The bookmarklet variants can only be installed by dragging an anchor whose href IS
 * the payload, so the anchors are built here from the real dist/ files rather than
 * hand-copied into the page: the sizes and the links can never drift from the build,
 * and this page stays a few KB instead of inlining ~1.4 MB of script.
 */
(function () {
  var VARIANTS = [
    {
      id: 'csv',
      label: 'Turnstone csv',
      carries: 'App + a 2 KB RFC-4180 reader — <strong>no libraries</strong>',
      best: 'Locked-down and air-gapped machines. A link list that is CSV, TSV, JSON, HTML or XML.',
    },
    {
      id: 'core',
      label: 'Turnstone core',
      carries: 'The above + a dependency-free XLSX reader — <strong>no libraries</strong>',
      best: 'The same machines, but when the list arrives as <code>.xlsx</code>. Recommended.',
    },
    {
      id: 'full',
      label: 'Turnstone full',
      carries: 'Vendored PapaParse + SheetJS',
      best: 'You need <code>.xls</code> / <code>.xlsb</code> / <code>.ods</code>, or to export a real <code>.xlsx</code>. Large — see the note below.',
    },
  ];

  var rows = document.getElementById('bm-rows');
  var status = document.getElementById('bm-status');
  if (!rows) return;

  /* Built here rather than written into the HTML: the size column comes from the
     payload itself, so it reports the truth after every rebuild. */
  rows.textContent = '';
  var arrived = 0, failed = 0;

  VARIANTS.forEach(function (variant) {
    var tr = document.createElement('tr');

    var cellLink = document.createElement('td');
    var link = document.createElement('a');
    link.className = 'install pending';
    link.textContent = variant.label;
    link.title = 'Fetching payload…';
    cellLink.appendChild(link);

    var cellCarries = document.createElement('td');
    cellCarries.innerHTML = variant.carries;

    var cellSize = document.createElement('td');
    cellSize.textContent = '…';

    var cellBest = document.createElement('td');
    cellBest.innerHTML = variant.best;

    tr.appendChild(cellLink);
    tr.appendChild(cellCarries);
    tr.appendChild(cellSize);
    tr.appendChild(cellBest);
    rows.appendChild(tr);

    fetch('ports/bookmarklet/dist/turnstone-bookmarklet-' + variant.id + '.txt')
      .then(function (r) {
        if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
        return r.text();
      })
      .then(function (payload) {
        payload = payload.trim();
        /* UTF-8 byte count, not string length: the payloads carry non-ASCII (ticks,
           dashes, and SheetJS's codepage table), so `length` under-reports the file
           size — by ~240 KB on the `full` variant. Bytes match the dist/ file and
           the sizes quoted in the docs. */
        var kiloBytes = new TextEncoder().encode(payload).length / 1024;
        // A JS-created anchor is just as draggable as a hand-written one.
        link.href = payload;
        link.className = 'install';
        link.title = 'Drag this onto your bookmarks bar';
        cellSize.textContent = (kiloBytes >= 1024 ? (kiloBytes / 1024).toFixed(2) + ' MB' : kiloBytes.toFixed(0) + ' KB');
        arrived++;
        settle();
      })
      .catch(function (e) {
        link.className = 'install pending';
        link.removeAttribute('href');
        link.textContent = variant.label + ' (unavailable)';
        link.title = String(e.message);
        cellSize.textContent = '—';
        failed++;
        settle();
      });
  });

  function settle() {
    if (arrived + failed < VARIANTS.length) return;
    if (!failed) {
      status.textContent = 'Ready — drag a link onto your bookmarks bar (step 2 above).';
      return;
    }
    status.innerHTML = 'Could not load ' + failed + ' payload(s) from this page. Open ' +
      '<a href="ports/bookmarklet/dist/install.html">the bookmarklet install page</a> instead, ' +
      'or build them with <code>node ports/bookmarklet/build.js</code>.';
  }
})();

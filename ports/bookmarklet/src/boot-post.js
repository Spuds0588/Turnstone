/* ---------------------------------------------------------------------------
 * Bookmarklet boot, part 2 — runs AFTER the app code, wired to the bar.
 *
 * Everything below may call app functions (toast/loadMatrix/state) because by
 * now they exist. This is also where the locked-scope "carry a queue across
 * sessions" pair lives: storage is session-only by design (see boot-pre), so
 * Copy state / Restore state is the supported way to move a queue between tabs.
 * ------------------------------------------------------------------------- */

(function tsWireBar() {
  var bar = TS_SHADOW.getElementById('ts-bar');
  var label = TS_BMK.variant + (TS_BMK.libs.length ? ' · ' + TS_BMK.libs.join(' + ') : ' · no libraries');
  bar.querySelector('.ts-variant').textContent = label;

  log(`Turnstone bookmarklet mounted — variant "${TS_BMK.variant}", libs [${TS_BMK.libs.join(', ') || 'none'}], ` +
      `styles ${TS_CSS_HOW}, XLSX read=${HAS_XLSX} write=${HAS_XLSX_WRITE}, IndexedDB=memory-only`);

  /* --- Close: the overlay is the only thing we added to the page ---------- */
  TS_SHADOW.getElementById('ts-close').addEventListener('click', function () {
    log('Closing overlay — removing the host element');
    TS_HOST.remove();
    toast('Turnstone closed');
  });

  /* --- Copy state: a self-contained JSON snapshot of the queue ------------ */
  function snapshot() {
    return {
      turnstone: 'bookmarklet-state/1',
      name: state.name,
      ext: state.ext,
      sheetName: state.sheetName,
      data: state.data,
      status: state.status,
      notes: state.notes,
      savedAt: new Date().toISOString(),
    };
  }

  TS_SHADOW.getElementById('ts-copy').addEventListener('click', async function () {
    if (!cardCount()) { toast('Nothing to copy — load a list first', 'error'); return; }
    var json = JSON.stringify(snapshot());
    await copyText(json, 'queue state');
    log(`Copied queue state (${json.length} chars, ${cardCount()} cards)`);
    toast(`Copied ${cardCount()} card${cardCount() === 1 ? '' : 's'} as JSON (${(json.length / 1024).toFixed(1)} KB)`);
  });

  /* --- Restore state: paste it back, statuses and notes included ---------- */
  function openRestorePanel() {
    var existing = TS_SHADOW.getElementById('ts-restore-panel');
    if (existing) { existing.remove(); return; }
    var panel = document.createElement('div');
    panel.id = 'ts-restore-panel';
    panel.style.cssText = 'position:absolute;top:34px;right:8px;z-index:5;width:min(560px,92vw);' +
      'background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:10px;' +
      'padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.45)';
    panel.innerHTML =
      '<div style="font-size:12.5px;font-weight:600;margin-bottom:4px">Restore a copied queue</div>' +
      '<div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">Paste a state JSON from <em>Copy state</em>. ' +
      'Statuses and notes come back with it.</div>' +
      '<textarea id="ts-restore-text" spellcheck="false" placeholder=\'{"turnstone":"bookmarklet-state/1", …}\' ' +
      'style="width:100%;height:110px;background:var(--bg);color:var(--text);border:1px solid var(--border);' +
      'border-radius:6px;padding:7px;font:11.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">' +
      '<button type="button" class="btn" id="ts-restore-cancel">Cancel</button>' +
      '<button type="button" class="btn" id="ts-restore-apply">Restore</button>' +
      '</div>';
    TS_SHADOW.appendChild(panel);
    var text = panel.querySelector('#ts-restore-text');
    text.focus();
    panel.querySelector('#ts-restore-cancel').addEventListener('click', function () { panel.remove(); });
    panel.querySelector('#ts-restore-apply').addEventListener('click', function () {
      var raw = text.value.trim();
      if (!raw) { toast('Paste a copied state first', 'error'); return; }
      var parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) { toast(`That is not valid JSON: ${e.message}`, 'error'); return; }
      if (!Array.isArray(parsed.data) || !parsed.data.length) { toast('That JSON has no queue data', 'error'); return; }
      var rows = parsed.data.length - (analyzeMatrix(parsed.data).hasHeader ? 1 : 0);
      if (Array.isArray(parsed.status) && parsed.status.length !== rows) {
        warn(`State status length ${parsed.status.length} ≠ ${rows} rows — statuses will be ignored`);
        parsed.status = null; parsed.notes = null;
      }
      log(`Restoring queue state: ${parsed.data.length} rows from "${parsed.name || 'pasted state'}"`);
      loadMatrix(parsed.data, {
        name: parsed.name || 'restored-state.csv',
        ext: parsed.ext || 'csv',
        mode: 'fallback',
        sheetName: parsed.sheetName,
        status: parsed.status,
        notes: parsed.notes,
      });
      panel.remove();
    });
  }
  TS_SHADOW.getElementById('ts-restore').addEventListener('click', openRestorePanel);

  /* --- First-run hint + capability notice --------------------------------- */
  if (!HAS_XLSX) {
    toast('Turnstone (no libraries) is running — CSV, TSV, JSON, HTML and XML lists only', 'success');
  } else if (!HAS_XLSX_WRITE) {
    toast('Turnstone is running — workbooks open read-only, edits export as CSV', 'success');
  } else {
    toast('Turnstone is running in this page — drop a CSV/XLSX list anywhere', 'success');
  }
})();

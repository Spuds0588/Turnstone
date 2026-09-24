/* ------------------------- Side-panel extension bridge --------------------
 *
 * The panel is an ordinary extension page, so it talks to the browser's own tab
 * API directly — no message relay, no iframes. Two things change versus the web
 * app, and both are deliberate (see ports/extension/README.md):
 *
 *   1. Links always open as REAL BROWSER TABS. The panel is a narrow strip and
 *      cannot host a page, so the queue drives the browser instead of containing
 *      it. Selecting a card whose link is already open switches to that tab
 *      rather than reloading it, which is the same "focus, never duplicate"
 *      behaviour the web app's iframe tab bar has.
 *
 *   2. Right-click → "Add link to Turnstone" appends a row to the open queue.
 *
 * Everything is guarded on `chrome` existing, so this same generated file still
 * runs when opened over http (as the build harness does) — it just falls back to
 * a plain window, having no tabs to reach.
 */

const EXT = (typeof chrome !== 'undefined' && chrome.runtime && chrome.tabs && chrome.tabs.create) ? chrome : null;
const rowTabs = Object.create(null);          // rowIndex → browser tab id

function sendToWorker(msg) {
  if (!EXT) return;
  try { chrome.runtime.sendMessage(msg, () => void chrome.runtime.lastError); }
  catch (e) { warn('Extension worker unreachable', e); }
}

/** Open a card's link in a real browser tab, or switch to the tab it already has. */
function openBrowserTab(url, rowId) {
  if (!EXT) { window.open(url, '_blank', 'noopener'); return; }
  const known = rowTabs[rowId];
  if (known != null) {
    chrome.tabs.get(known, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        delete rowTabs[rowId];
        log(`Tab ${known} for row ${rowId} is gone — opening a fresh one`);
        openBrowserTab(url, rowId);
        return;
      }
      chrome.tabs.update(known, { active: true });
      log(`Switched to open tab ${known} for row ${rowId} (no reload)`);
    });
    return;
  }
  chrome.tabs.create({ url, active: true }, (tab) => {
    if (!tab) { warn(`chrome.tabs.create failed for ${url}`); return; }
    rowTabs[rowId] = tab.id;
    log(`Opened browser tab ${tab.id} for row ${rowId}: ${url}`);
  });
}

/* A closed tab must stop counting as "this row is already open", or the next
   card selection would try to focus a tab that no longer exists. */
if (EXT) {
  chrome.tabs.onRemoved.addListener((id) => {
    for (const k of Object.keys(rowTabs)) if (rowTabs[k] === id) delete rowTabs[k];
  });
}

/** Right-click → "Add link to Turnstone": append a row, or start a queue with it. */
function appendLinkRow(url, label) {
  if (!state.mode) {
    log(`No queue open — starting one from the context menu: ${url}`);
    loadMatrix([['Name', 'URL'], [label || url, url]],
      { name: 'Turnstone queue', ext: 'csv', mode: 'fallback' });
    toast(`Started a queue with ${label || url}`, 'success');
    return;
  }
  const width = Math.max(2, state.data.reduce((m, r) => Math.max(m, r.length), 0));
  const row = new Array(width).fill('');
  row[state.urlCol] = url;
  if (state.nameCol >= 0 && state.nameCol !== state.urlCol) row[state.nameCol] = label || url;
  const k = cardCount();                       // one past the last data row
  state.data.push(row);
  state.status[k] = 'incomplete';
  state.notes[k] = '';
  log(`Appended row ${k} from the context menu: ${url}`);
  renderCards();
  markDirty();
  toast(`Added to the queue: ${label || url}`, 'success');
}

/* Live adds arrive by message; anything queued while the panel was shut waits in
   chrome.storage. The listener is registered BEFORE the stash is read, so an add
   landing mid-load cannot fall between the two paths. */
if (EXT) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'add-link' && msg.url) appendLinkRow(msg.url);
  });
  chrome.storage.local.get('pendingLink', (res) => {
    const url = res && res.pendingLink;
    if (!url) return;
    chrome.storage.local.remove('pendingLink');
    log('Picked up a link that was queued while the panel was closed');
    appendLinkRow(url);
  });
}

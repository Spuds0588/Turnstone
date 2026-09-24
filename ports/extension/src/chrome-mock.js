/* Mock of the extension APIs the panel touches, for ports/extension/dist/panel-test.html.
 *
 * The panel bridge (src/panel-bridge.js) is the one part of this port that cannot be
 * exercised by simply opening the page: tabs, the badge, the downloads export and
 * context-menu adds only exist inside an extension. This stands those APIs up so the
 * generated panel can be driven over http and the calls asserted.
 *
 * It is a test double, not a shim: nothing here makes the panel work outside Chrome,
 * it only records what the panel asked for. Loading panel-test.html in a real
 * extension would replace this with the browser's own `chrome`.
 *
 * Every call lands in window.__ext for assertions; ?pending=<url> makes the storage
 * lookup behave as if a link had been queued while the panel was shut.
 */
(function () {
  const pendingFromQuery = new URLSearchParams(location.search).get('pending');

  const rec = {
    messages: [],        // runtime.sendMessage payloads (e.g. the badge)
    tabs: [],            // tabs the panel created
    tabUpdates: [],      // tabs the panel activated instead of creating
    closedTabIds: [],    // tabs the panel saw close
    badges: [],          // chrome.action.setBadgeText values
    downloads: [],       // chrome.downloads.download options
    stored: null,        // chrome.storage.local.set payloads
    storageRemoved: [],  // keys cleared from the stash
    listeners: [],       // runtime.onMessage listeners
    nextTabId: 1,
  };
  window.__ext = rec;

  /* chrome.runtime.lastError must be set for the duration of the callback and then
     cleared — that is the contract the panel's error handling relies on. */
  function fail(msg, cb) {
    chrome.runtime.lastError = { message: msg };
    try { cb(); } finally { chrome.runtime.lastError = null; }
  }

  const chrome = {
    runtime: {
      lastError: null,
      sendMessage(msg, cb) { rec.messages.push(msg); if (cb) cb(); },
      onMessage: { addListener(fn) { rec.listeners.push(fn); } },
    },
    tabs: {
      create(opts, cb) {
        const tab = { id: rec.nextTabId++, url: opts.url, active: !!opts.active, windowId: 1 };
        rec.tabs.push(tab);
        if (cb) cb(tab);
        return tab;
      },
      get(id, cb) {
        const tab = rec.tabs.find((t) => t.id === id) || null;
        if (!tab) { fail('No tab with id: ' + id, () => cb(null)); return; }
        cb(tab);
      },
      update(id, props, cb) {
        const tab = rec.tabs.find((t) => t.id === id) || null;
        if (!tab) { fail('No tab with id: ' + id, () => cb && cb(null)); return; }
        Object.assign(tab, props);
        rec.tabUpdates.push({ id, props });
        if (cb) cb(tab);
      },
      onRemoved: {
        addListener(fn) {
          rec.closeTab = (id) => {
            rec.tabs = rec.tabs.filter((t) => t.id !== id);
            rec.closedTabIds.push(id);
            fn(id, { windowId: 1, isWindowClosing: false });
          };
        },
      },
    },
    storage: {
      local: {
        get(key, cb) { cb(pendingFromQuery ? { pendingLink: pendingFromQuery } : {}); },
        set(obj, cb) { rec.stored = obj; if (cb) cb(); },
        remove(key, cb) { rec.storageRemoved.push(key); if (cb) cb(); },
      },
    },
    downloads: {
      download(opts, cb) { rec.downloads.push(opts); if (cb) cb(1); },
    },
    action: {
      setBadgeText(opts) { rec.badges.push(opts.text); },
      setBadgeBackgroundColor() {},
    },
  };

  /** Simulate the service worker delivering a right-click "Add link to Turnstone". */
  rec.emitAddLink = (url) => rec.listeners.forEach((fn) => fn({ type: 'add-link', url }));
  rec.hasPending = !!pendingFromQuery;

  window.chrome = chrome;
})();

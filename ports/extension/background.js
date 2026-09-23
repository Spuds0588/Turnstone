/* Turnstone Chrome extension — MV3 service worker scaffold.
   Scope (locked, see ports/extension/README.md): the side panel is the whole UX;
   this worker only wires platform surfaces. No iframe workflow exists in this port. */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Turnstone ext] installed');

  /* Right-click any link → add it to the Turnstone queue. */
  chrome.contextMenus.create({
    id: 'turnstone-add-link',
    title: 'Add link to Turnstone',
    contexts: ['link'],
  });

  /* Let the toolbar click open the side panel. */
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.error('[Turnstone ext] setPanelBehavior failed:', e));
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'turnstone-add-link' && info.linkUrl) {
    /* TODO: relay to sidepanel via storage/message; the panel appends a card. */
    console.log('[Turnstone ext] queue link:', info.linkUrl);
    chrome.runtime.sendMessage({ type: 'turnstone-add-link', url: info.linkUrl }).catch(() => {
      /* Panel closed — stash for next open. */
      chrome.storage.local.set({ pendingLink: info.linkUrl });
    });
  }
});

/* Message surface the side panel uses (implement handlers when the port is built):
   - {type:'open-tab', url}         → chrome.tabs.create({ url, active: true })
   - {type:'focus-tab', tabId}      → chrome.tabs.update(tabId, { active: true })
   - {type:'download', blobSeed}    → chrome.downloads.download(...)
   The panel itself renders cards, statuses, presets and sorting — mirroring the web app.
*/
chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg?.type === 'open-tab' && msg.url) {
    chrome.tabs.create({ url: msg.url, active: true }, (tab) => respond({ tabId: tab.id }));
    return true; // async respond
  }
  if (msg?.type === 'focus-tab' && Number.isInteger(msg.tabId)) {
    chrome.tabs.update(msg.tabId, { active: true }, () => respond({ ok: !chrome.runtime.lastError }));
    return true;
  }
  return false;
});

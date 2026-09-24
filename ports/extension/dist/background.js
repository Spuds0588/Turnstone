/* Turnstone Chrome extension — MV3 service worker.
 *
 * The side panel is the whole UX (see ports/extension/README.md); this worker exists
 * only to wire up platform surfaces the panel cannot reach on its own:
 *
 *   contextMenus  right-click a link (or page) → "Add link to Turnstone"
 *   sidePanel     toolbar click opens the panel; a context-menu add opens it too
 *   action badge  tasks still to do, visible with the panel shut
 *   storage       a link queued while the panel was closed, handed over on next open
 *
 * Tab opening and downloads are done directly by the panel — an extension page has
 * full API access, so there is no reason to relay them through here.
 */

const BADGE_COLOR = '#3b66d0';
const MENU_ID = 'turnstone-add-link';
const PENDING_KEY = 'pendingLink';

chrome.runtime.onInstalled.addListener(() => {
  /* removeAll first: onInstalled fires again on update, and a duplicate id throws. */
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Add link to Turnstone',
      contexts: ['link', 'page'],
    });
  });
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.error('[Turnstone] setPanelBehavior failed:', e));
  console.log('[Turnstone] ready — click the toolbar icon for the queue panel');
});

/* Right-click → queue the link, opening the panel if it is not already up. */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  /* linkUrl for a right-click on a link, pageUrl for anywhere else on the page. */
  const url = info.linkUrl || info.pageUrl || (tab && tab.url);
  if (!url) return;

  if (tab && tab.windowId != null) {
    try { await chrome.sidePanel.open({ windowId: tab.windowId }); }
    catch (e) { console.warn('[Turnstone] could not open the panel:', e); }
  }

  /* Deliver live if the panel is listening; otherwise stash for the next open.
     The panel registers its listener before reading the stash, so an add that
     lands mid-load is picked up by exactly one of the two paths. */
  try {
    await chrome.runtime.sendMessage({ type: 'add-link', url });
  } catch (e) {
    await chrome.storage.local.set({ [PENDING_KEY]: url });
    console.log('[Turnstone] panel closed — stashed a link for next open');
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (msg && msg.type === 'badge') {
    const n = Math.max(0, Number(msg.remaining) || 0);
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    chrome.action.setBadgeText({ text: n === 0 ? '' : (n > 99 ? '99+' : String(n)) });
    respond({ ok: true });
    return true;
  }
  return false;
});

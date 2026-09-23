# Turnstone Chrome Extension — port scaffold

**Status: scaffolded, not built.** The locked scope lives in the root [`todo.md`](../../todo.md)
(*Future state → Chrome extension version*); the conversation history holds the design
discussion. Read before changing the contract below.

## What it is

A Manifest V3 extension whose **entire UX is Chrome's Side Panel** — the task-card sidebar
only. **There is no iframe workflow in this port at all.**

## The core interaction

- Links always open as **real browser tabs** (`chrome.tabs.create`).
- **Selecting a card switches the active browser tab** to that card's page
  (`chrome.tabs.update` / `highlight`) — the queue drives the browser instead of hosting pages.

## What mirrors the web version

SheetJS parsing, columns & presets, ✓ Complete / ↺ Incomplete, Show completed, sorting,
auto-open & auto-advance (where "open" means switching to the tab), exports via
`chrome.downloads`, statuses/presets in `chrome.storage` (which persists per browser,
unlike the bookmarklet), and right-click "Add link to Turnstone". A badge shows the
remaining-task count. The open-mode menu item collapses to tab-only since that's the only mode.

## Layout

```
extension/
  manifest.json    # MV3 scaffold — sidePanel, tabs, storage, downloads, contextMenus
  background.js    # Service worker scaffold — context menu + open/focus-tab message surface
  sidepanel.html   # Panel shell scaffold (placeholder UI)
  sidepanel.js     # Panel logic placeholder — the port build fills this in
  icons/           # TODO: 16/48/128 PNGs derived from the web app's gem icons
```

## Build notes

- Side Panel API requires Chrome 114+ (`minimum_chrome_version` is set).
- Reuse the DOM-free `core.js` extracted from `app.html` for parsing/presets/persistence —
  see [`ports/README.md`](../README.md).
- Icon set can be generated from the existing `icon-192.png`/`icon-512.png` assets.

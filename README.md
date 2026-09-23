# Turnstone

A zero-server, browser-based workspace that transforms a CSV/XLSX list of URLs into a modern task queue: open each link in tabbed panes, track status and notes per task, and write everything back to the file — all client-side, no backend, no signup.

**▶ Sales page & screenshots: <https://spuds0588.github.io/Turnstone/>**

**▶ Launch the app: <https://spuds0588.github.io/Turnstone/app.html>**

**▶ See it work instantly** — this link pre-loads the demo task list straight from this repo via the `?file=` parameter:

> <https://spuds0588.github.io/Turnstone/app.html?file=https%3A%2F%2Fspuds0588.github.io%2FTurnstone%2Fsample-links.csv>

Prefer to watch a task open itself? Same file as XLSX with `&open=1`, which auto-opens the first task in a workspace tab:

> <https://spuds0588.github.io/Turnstone/app.html?url=https%3A%2F%2Fspuds0588.github.io%2FTurnstone%2Fsample-links.xlsx&open=1>

**Single file:** the entire app lives in `app.html` (plus PapaParse + SheetJS from CDN). The repo root is deployed via GitHub Pages straight from `main`; the root page is the product sales page, and `app.html` is the application.

## Loading a list

| Method | How |
| --- | --- |
| **Local file** | **Open File…** — Chromium users get silent write-back via the File System Access API; elsewhere it falls back to `<input type=file>` + browser-storage snapshots. |
| **Remote URL** | Paste any public CSV/XLSX URL in the welcome panel (host must allow CORS). GitHub `raw.` links work great. |
| **`?file=` deep link** | `app.html?file=<encoded url>` (alias: `?url=`). Format is detected from content (ZIP magic bytes), not just the extension. Add `&open=1` to auto-open the first task in a workspace tab. The example links above use this repo's own `sample-links.csv` / `sample-links.xlsx` as the remote source. |
| **Recent files** | The welcome panel lists your 5 most recent files — remote URLs re-fetch with one click. |
| **Demo / test data** | **Load demo list**, or the bundled `sample-links.csv` / `sample-links.xlsx` via the test buttons. |

The 🔗 **Link** menu item copies a shareable `?file=` deep link that reopens the exact same dataset — statuses ride along via browser storage on the same machine.

## Working the list

- **Pick your experience** — the first time you load a file, Turnstone asks how to open links: **Tabs (iframes)** inside the app, a **new browser tab**, or a **popup window**. Change it anytime from the ☰ menu — many sites refuse to be iframed, so tab-handoff modes keep queues of those usable.
- **Click to open — no Open button.** Clicking anywhere on a card's title opens its link (in your chosen mode) and expands the card. The ↗ icon always forces a real browser tab.
- **One-click completion** — a ✓ **Complete** button per card; completed cards are hidden by default (toggle **Show completed**), and a completed card shows a subtle **↺ Incomplete** to flip it back. Automation options in the ☰ menu: **open the link as soon as a card is selected**, and **auto-open the next task when you complete one** — turning the list into a hands-free queue.
- **Sorting** — sort cards by any column (ascending/descending, numeric-aware); file order restores instantly.
- **Right sidebar** — searchable task cards with notes and per-card ↗ escape hatches. The ☰ menu (top of the sidebar) holds everything else: open/close, share link, open mode, automation, columns & presets, exports, install, and theme.
- **Copy buttons** — every value (name, URL, notes, and each extra column) has a ⧉ button sitting right after the text; hover a card to reveal them (always visible on touch screens).
- **Cards stay compact** — beyond the fixed name/URL/status/notes, only the **first 3 data columns** show by default; expanding reveals the rest.
- **Column presets (⚙ Columns)** — reorder (drag), show/hide, and **save the layout as a preset keyed to the file's header**. Any CSV/XLSX loaded later whose header matches that exact column order (case/whitespace-insensitive) **auto-applies the preset** — order and hidden columns included.
- **Saving** — Chromium: silent write-back to the picked file. Everywhere else: automatic IndexedDB snapshots + Export CSV/XLSX, and a `beforeunload` guard when there are unexported changes. Files that already carry `Status`/`Notes` columns reopen with their progress intact.

## Theming

Light/dark out of the box: follows your OS preference live, remembers your explicit choice, no flash on load.

## Install it as an app (PWA)

Visit the live site in Chrome/Edge (or any Chromium browser) and use **☰ → ⤓ Install app** — or your browser's *Install app* menu entry. The installed app:

- opens in its own window, outside the browser chrome
- **works fully offline** (service worker precaches the app shell, parser libraries, icons, and the sample files)
- keeps your recent-file list, statuses, and notes in local storage on that device

No app store, no backend, no build step — installing just pins the same single-file app to your machine. (Installability and offline mode require HTTPS or localhost, i.e. the live site or a local server; opening `app.html` straight from disk skips the service worker gracefully.)

Implementation note: the web-app manifest is generated at runtime from icons embedded in `app.html` as data URIs, so the PWA adds only one real file to the repo — `sw.js`.

## Repository layout

```
index.html          # sales/landing page (SEO + AEO optimized) — the Pages root
app.html            # the application itself (single-file SPA)
sw.js               # service worker — offline shell; bump VERSION to invalidate caches
icon-192/512.png    # PWA + favicon icons
sample-links.csv    # demo queue (CSV) used by the deep-link examples
sample-links.xlsx   # demo queue (XLSX, multi-sheet)
ports/              # future editions of Turnstone (see ports/README.md)
  bookmarklet/      #   composes the app live in a new tab; CSV-only fallback if CDNs are blocked
  extension/        #   Chrome MV3 side panel; no iframes — selecting a card switches the active tab
  tauri/            #   native desktop shell; full web experience incl. iframes, no CORS wall
agents.md           # AI-developer rules (mirrors PRD §4)
PRD-Turnstone.md    # master product document
todo.md             # task tracker + future-state plans
history.md          # build log
testing-notes.md    # test files and the manual production test plan
```

## Roadmap: other versions & ports

The web app is the canonical core; these ports (scaffolded under [`ports/`](ports/README.md)) share its logic rather than forking it:

- **Bookmarklet** — composes the whole Turnstone app live in a new tab from a paste-safe (<~8 KB) payload: parsing, cards, link modes, exports, and write-back where the browser allows. Session-only memory by design, and a **CSV-only fallback mode** with a built-in parser when SheetJS can't load — locked-down, no-external-scripts environments are a first-class case, with the UI clearly noting the degraded mode.
- **Chrome extension (MV3)** — the queue lives in Chrome's **Side Panel** with no iframe workflow at all: links open as real browser tabs, and **selecting a card switches the active tab** to that page. Statuses/presets persist in `chrome.storage`; exports via `chrome.downloads`; right-click any link to queue it.
- **Tauri desktop app** — the **full web experience including the tabbed iframe workspace**, with the CORS / `X-Frame-Options` wall gone: sites that refuse iframing on the web load natively. Silent filesystem write-back on every OS, system tray, auto-update, tiny bundle.
- Shared prerequisite (planned): extract the DOM-free core — parsing, matrix analysis, presets, persistence — from `app.html` into a `core.js` all ports consume.
- Further future state (see [`todo.md`](todo.md)): embedded **phone / SMS / mail hand-off layers**, bypassing CORS natively, Google Drive / OneDrive sync.

## Docs

- `PRD-Turnstone.md` — master document (§4 = agent rules, mirrored in `agents.md`)
- `todo.md` — task tracker + future-state plans
- `history.md` — build log (v0.1 MVP → v0.7 sales page + ports scaffolding)
- `testing-notes.md` — test files and the manual production test plan
- `ports/README.md` — how the ports relate and what's scaffolded

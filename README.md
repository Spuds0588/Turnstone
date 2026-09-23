# Turnstone

A zero-server, browser-based SPA that transforms a CSV/XLSX list of URLs into a high-speed workspace: open each link in tabbed iframes, track status and notes per task, and write everything back to the file — all client-side, no backend.

**▶ Try it live: <https://spuds0588.github.io/Turnstone/>**

**▶ See it work instantly** — this link pre-loads the demo task list straight from this repo via the `?file=` parameter:

> <https://spuds0588.github.io/Turnstone/?file=https%3A%2F%2Fspuds0588.github.io%2FTurnstone%2Fsample-links.csv>

Prefer to watch a task open itself? Same file as XLSX with `&open=1`, which auto-opens the first task in a workspace tab:

> <https://spuds0588.github.io/Turnstone/?url=https%3A%2F%2Fspuds0588.github.io%2FTurnstone%2Fsample-links.xlsx&open=1>

**Single file:** everything lives in `index.html` (plus PapaParse + SheetJS from CDN). Open it, or serve it from any static host — this site is deployed via GitHub Pages straight from `main`.

## Loading a list

| Method | How |
| --- | --- |
| **Local file** | **Open File…** — Chromium users get silent write-back via the File System Access API; elsewhere it falls back to `<input type=file>` + browser-storage snapshots. |
| **Remote URL** | Paste any public CSV/XLSX URL in the welcome panel (host must allow CORS). GitHub `raw.` links work great. |
| **`?file=` deep link** | `index.html?file=<encoded url>` (alias: `?url=`). Format is detected from content (ZIP magic bytes), not just the extension. Add `&open=1` to auto-open the first task in a workspace tab. See the example links above — they use this repo's own `sample-links.csv` / `sample-links.xlsx` as the remote source. |
| **Recent files** | The welcome panel lists your 5 most recent files — remote URLs re-fetch with one click. |
| **Demo / test data** | **Load demo list**, or the bundled `sample-links.csv` / `sample-links.xlsx` via the test buttons. |

The 🔗 **Link** button (topbar, when a remote file is open) copies a shareable `?file=` link that reopens the exact same dataset — statuses ride along via browser storage on the same machine.

## Working the list

- **Right sidebar** — searchable task cards with status dropdowns, notes, copy buttons, and per-card ↗ escape hatches for sites that refuse to be iframed.
- **Left workspace** — tabbed iframes that keep their state when you switch tabs. One ↗ on every tab too.
- **Saving** — Chromium: silent write-back to the picked file. Everywhere else: automatic IndexedDB snapshots + Export CSV/XLSX, and a `beforeunload` guard when there are unexported changes. Files that already carry `Status`/`Notes` columns reopen with their progress intact.

## Theming

Light/dark out of the box: follows your OS preference live, remembers your explicit choice, no flash on load.

## Docs

- `PRD-Turnstone.md` — master document (§4 = agent rules, mirrored in `agents.md`)
- `todo.md` — task tracker
- `history.md` — build log (v0.1 MVP → v0.3 URL-param hardening)
- `testing-notes.md` — test files and the manual production test plan

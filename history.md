# history.md — Project Turnstone Build Log

## 2026-09-24 — v0.9.0: more input formats (TSV, JSON, HTML tables, XML, spreadsheets)

**Request:** add more input-format support — TSV, JSON arrays, HTML tables, XML maybe, "potentially PDFs with tables or lists" — and call out other common formats people get work in with.

### The design bet: one matrix, many formats
Every supported input now collapses into the same value the CSV path always produced — a 2D array of strings. So the pipeline below the parse stage (`analyzeMatrix` → `loadMatrix` → `renderCards` → write-back) is untouched and format-agnostic, and adding a format is one `FORMAT_INFO` row plus one parser that returns rows.

New pieces in `app.html`: `FORMAT_INFO` (label + `writable` per format), `detectFormat()` (precedence: **magic bytes → content sniff → extension → Content-Type**, with the reason logged), and `parseDetected()` (dispatch). `loadFromFileObject` and `loadFromUrl` both now run through them, which also removed the duplicated parse branch the two loaders used to keep.

### Formats added
- **Delimited text** — one parser for CSV/TSV/semicolon/pipe, with PapaParse auto-detecting the delimiter (European `;` exports, Excel "Unicode Text"). A one-URL-per-line `.txt` becomes a one-column list.
- **JSON** — array of objects (union of keys → columns), array of arrays, a wrapping object like `{"items":[…]}` unwrapped automatically, an object map (keys kept as `_key`), and NDJSON/JSON Lines recovery when `JSON.parse` fails.
- **HTML tables** — the largest top-level `<table>` wins, `rowspan`/`colspan` expanded into a real grid, nested layout tables ignored. Parsed with `DOMParser` into an **inert** document, so page scripts never run and nothing is fetched. A *local* pick with no table falls back to its `<a href>` list (saved bookmarks pages); remote URLs do not, which is what keeps a 200-HTML error page from being silently imported.
- **XML** — finds the repeated record element and maps child elements *and* attributes to columns: RSS/Atom feeds, sitemaps, OPML subscription lists and generic `<record>` lists all become link queues. The picker is container-aware, which matters — in an RSS feed `<link>` occurs more often than `<item>`, and a naive count would tabulate the wrong element.
- **Excel/ODF workbooks** — SheetJS's own type detection now covers `.xls` (OLE2 magic), `.xlsm`, `.xlsb` and `.ods` beside `.xlsx`, at no extra dependency cost.
- **PDF** — detected via `%PDF` magic and refused with a clear message instead of being mangled. See the deferred note in `todo.md`.

### Write-back became format-aware
CSV, TSV and XLSX write silently back into the original file (TSV keeps its tab delimiter; the export filename strip now handles any extension). **Everything else is a one-way import**: the file handle is dropped, the load lands in fallback mode, and a toast says edits live in browser storage until exported. Two reasons, both correctness: rewriting a `.xls`/`.xlsm` container with XLSX bytes would drop macros and mislabel the file, and a JSON/HTML/XML source can't absorb Status/Notes columns without changing its shape.

### Files
- `app.html` — format layer, parsers, both loaders, format-aware write-back, and widened UI copy (`accept=`, `FS_PICK_OPTS`, welcome panel "Choose file…", empty states, PWA description).
- `sample-links.tsv` / `.json` / `.html` / `.xml` — new fixtures mirroring the CSV exactly, so every importer can be checked against the same target: 10 cards, 4 columns, 7 visible / 3 complete. The HTML fixture deliberately carries a nav link list above the table, and the XML one is feed-shaped.
- `sw.js` → `v0.9.0` (precaches the new fixtures).
- `README.md` — new "Supported input formats" section with the write-back rule spelled out; repo-layout tree updated (and the stale "plus PapaParse + SheetJS from CDN" line fixed).

### Verification (all in-browser against a local server)
- All four text fixtures via `?file=`: one correct `Format detection:` line each, then `urlCol=1, nameCol=0, statusCol=2, notesCol=3` → 10 cards / 7 visible / 3 complete — identical to the CSV.
- CSV and XLSX regressions pass unchanged.
- Workbook sweep: real xlsx/ods/BIFF8-xls/xlsb/xlsm files generated and read back through the detector — correct format, 3 rows, correct sample row, only xlsx `writable`.
- Parser sweep: JSON in five shapes, XML in four (including Atom `href` attributes and OPML), HTML with `rowspan`, nested tables and a link-only page, semicolon CSV, one-URL-per-line text, malformed JSON/XML, and the strict no-table error.
- Local-pick paths exercised through real `File` objects: correct `ext`, fallback mode, handle dropped for import-only formats, status/notes seeded from the file's own columns.
- `.fods` dropped from the extension map after SheetJS's flat-ODS reader threw `'table:table-cell' is not a valid selector` in browsers.

### Standalone single-file build, shipped as a beta
`assets/build-standalone.js` turns `app.html` into `turnstone-standalone.html` (~1.08 MB): the app shell, PapaParse, SheetJS and both logo SVGs in one document for `file://`, USB sticks, internal shares and air-gapped machines. Because the app already makes zero third-party requests, "building" is purely inlining — and the script treats that as a contract: it fails loudly if a `vendor/` or `assets/` reference would survive, and asserts the inlined library entry points really are present. It also flips a single-line `STANDALONE_BUILD` flag that suppresses service-worker registration, so a copied file doesn't 404 against a `sw.js` that was never next to it. A visible `beta · standalone` chip and a build stamp (timestamp + commit sha) ride along in the artifact.

Verified by serving a directory containing **only** the standalone file: the app booted with no external requests, no console errors, and the inlined SheetJS parsed `sample-links.xlsx` into the same 10 cards / 7 visible / 3 complete as the hosted app. Opening it is covered by docs; the File System Access API, clipboard and PWA code paths all degrade to their documented fallbacks on `file://`. The CSV-only variant remains open (it needs genuine degradation logic, not a missing script tag).

### Streamlined start experience (drag area + click to choose)
The welcome panel now leads with a **drop zone** instead of a `Choose file…` button: a dashed target reading "Drop a file here, or click to choose", listing the supported formats and stating that parsing happens on-device. It carries `role="button"` + `tabindex`, so Enter/Space open the picker too. Everything else moved behind it in order of likelihood — paste a link-list URL, then one compact "try it with sample data" row (the two test-data paragraphs collapsed into a single line).

The drop handlers sit on `document` rather than on the zone, for two reasons: a file dropped anywhere loads, and — the more important one — a drop outside the zone can no longer make the browser navigate away from the app to the dropped file. Every handler gates on `dataTransfer.types.includes('Files')`, so the settings panel's column-reorder drag keeps working untouched.

Dropped files and write-back: Chromium exposes a `getAsFileSystemHandle()` per dropped item, so the code resolves one and uses it only when it is *already* writable — deliberately no permission dialog on drop. Otherwise the load lands in fallback mode with the usual browser-storage persistence, export and `beforeunload` guard, and the reason is logged.

Verified with synthetic `DragEvent`s in the browser: a `text/plain` drag is neither prevented nor highlighted, a `Files` drag is prevented and highlights the zone, a dropped `.tsv` produced 2 cards (1 complete, round-tripped from its Status column) and hid the welcome panel, a dropped `.json` replaced the open queue with correct columns and notes, and click + Enter both reach `openLocalFile()`. `sw.js` → `v0.9.1`.

### Sales page
`index.html`'s copy, FAQ answers and JSON-LD feature list said "CSV or XLSX" and now name the wider set; the long-standing claim that you can drag a file onto the app was left intact at the time (flagged as unimplemented) and is **now true** — see the streamlined start experience below.

## 2026-09-24 — v0.8.0: vendored dependencies + zero data call-outs, sales-page hero fix

**Requests:** (1) vendor SheetJS and any other dependencies so nothing loads from a CDN — the tool must work in highly secure environments; (2) then add headers that prevent data call-outs, as long as that doesn't break iframe mode; (3) fix the sales-page logo placement and shorten the hero heading; (4) add bundled single-file `.html` builds for `file://` / internal hosting to the roadmap.

### Vendored dependencies (`vendor/`)
- `vendor/papaparse.min.js` (5.4.1) and `vendor/xlsx.full.min.js` (0.20.3) — the exact upstream builds, fetched from the very URLs the page used to reference, syntax-checked and served from the repo root.
- `app.html`'s script tags now point at `vendor/…`; both CDN `<script>` tags are gone. Verified in-browser: a full CSV load produced **only same-origin requests** (shell, logo SVGs, both vendor scripts, the data file) — no jsdelivr, no sheetjs.com.
- `sw.js` → `v0.8.0`: precaches `vendor/papaparse.min.js` + `vendor/xlsx.full.min.js` instead of the CDN URLs, and the cache-first CDN branch is deleted (nothing requests those hosts any more).

### Data-call-out lockdown (CSP + referrer policy)
- GitHub Pages can't set HTTP response headers, so the policy ships as `<meta http-equiv="Content-Security-Policy">`.
- `app.html`: `default-src 'self' file:`; `script-src`/`style-src` `'self' 'unsafe-inline' file:` (the app *is* an inline-script single file); `img-src 'self' data: blob: file:`; `manifest-src 'self' blob: file:` (the PWA manifest is a runtime Blob URL); `worker-src 'self' blob: file:`; `connect-src 'self' https: blob: file:`; `object-src`, `base-uri`, `form-action` `'none'`. `file:` is listed throughout so copies opened from disk keep working.
- **`frame-src https: http: file:` is deliberately left open** — the iframe workspace has to frame the sites in the queue. Verified live under the policy: tabs mode + a card click produced `GET https://example.com/ → 200 (Document)`, the workspace tab opened normally, and **no CSP violation was logged**. That was the acceptance test for "don't break iframe mode."
- `connect-src` keeps `https:` because the **user-initiated `?file=` / share-link remote load is a supported feature** — it's the product's single outbound path. Everything else outbound is closed: `ws:`/`wss:` (a classic exfiltration channel), `http:`, and `data:`. With `form-action 'none'` and `object-src 'none'`, the classic data-call-out routes are shut. `referrer: no-referrer` on both pages stops deep-link URLs leaking via `Referer` to framed or fetched sites.
- Sales page (`index.html`) is stricter: `default-src 'none'` plus only `script-src`/`style-src 'unsafe-inline'` (its inline legacy redirect) and `img-src 'self' data:`. Console stayed completely empty — no violations.
- Regression-tested under the policy: CSV load (PapaParse), XLSX load (`Parsing XLSX binary (17881 bytes) with SheetJS` → 11 rows → 10 cards), CSV blob download + XLSX write via SheetJS (15,914 b), the PWA manifest blob, session persistence to IndexedDB, and the legacy `?file=` redirect from the sales page. **Zero CSP violations anywhere.**

### Sales page: hero logo + headline
- The hero had `padding: 0` and the logo's `getBoundingClientRect().top` was `0` — the stone was jammed against (and visually clipped by) the top edge. Added `padding: 3.6rem 0 3.2rem` to `.hero`; the logo now sits 58px down with real breathing room.
- Removed the duplicate 13px logo inside the eyebrow pill — two marks stacked read as a mistake. The pill is now text-only.
- Headline shortened from "Your link spreadsheet, worked like a workspace." to **"Your spreadsheet, now a modern workspace."**

### Roadmap
- `todo.md` + README roadmap: **bundled single-file `.html` builds** (`turnstone-standalone.html`) for `file://` and internal/air-gapped hosting — a build step inlining the shell, vendored libraries, and icons into one document, plus an optional CSV-only variant. Since the app now makes no external requests, that build is genuinely self-contained.
- Also fixed a stale filename in the porting prerequisite (`index.html` → `app.html`).

## 2026-09-23 — v0.7.1: New logo (engraved stone) + web-MCP future state

**Request:** the product logo is a circular grey stone with a dark-grey checkmark engraved into it — compose it as SVG, break it out into asset files, keep easy light/dark variants. Also add web MCP setup to the future-state plans (agents set up the workspace for users, or take over on request).

### Logo system (`assets/`)
- `logo.svg` (master), `logo-light.svg` (brighter stone for white surfaces), `logo-dark.svg` (rimmed stone for dark surfaces) — the engraving is a second, +2px-offset copy of the check under the main one, reading as the groove's shadow lip. Theme swap is a plain CSS rule keyed off the app's existing `data-theme` attribute.
- `build-icons.js`: zero-dependency rasterizer + PNG encoder that regenerates all rasters from the master geometry (`node assets/build-icons.js` → `assets/icon-192/512.png`, `icon-maskable-512.png` at 80% safe zone, plus root-level copies the SW precaches). PNGs verified structurally (chunks, zlib stream, RGBA8) and via ASCII render showing the engraved check.
- Consumed everywhere: `app.html` favicon + apple-touch-icon data URIs now the new icon (old gem retired); welcome-screen branding shows the real logo with light/dark variants; the inline PWA manifest gains the 512px and maskable icons; sales page hero shows the logo and its favicon path was fixed (`assets/icon-192.png`); SW precaches the SVGs and bumps to `v0.7.1`.

### Future state: web MCP server (`todo.md`)
- Agent tools (`load_queue`, `set_open_mode`, `get_state`/`set_status`/`set_notes`, `complete_row`/`advance`, `export`, `screenshot`), a "set up for my user" flow (load file, apply preset, pick mode, hand over a ready workspace / deep link) and a "take over for me" flow (agent works the queue through the same write-back engine), transport options (Streamable HTTP vs local stdio+CDP companion), and the shared `core.js` constraint.

Also: README repo-layout tree + roadmap updated for the new assets and the MCP item.

---

## 2026-09-23 — v0.7: Sales page + ports scaffolding

**Request:** scaffold the bookmarklet / extension / Tauri ports; make `index.html` an SEO/AEO sales page following the SupportLayer/Hushwing pattern (biggest selling point: a modern streamlined workspace with **no expensive backend** — spreadsheet users get an instantly upgraded experience); move the actual app to a linked `app.html`; README notes future-state plans. **No animated background.**

### Restructure
- `index.html` → `app.html` (git mv). SW precache now lists `app.html` + the new sales page, `VERSION` bumped to `v0.7.0`; manifest `start_url` annotated (still `location.pathname`, so the installed PWA keeps launching the app and deep links keep working).
- New `index.html` = the sales page. Follows the SupportLayer pattern (eyebrow → hero h1/subtitle → CTA pair → product visual → feature boxes → workflow → FAQ → footer with cross-project links), in Turnstone's own palette. **Static** radial-gradient background, explicitly no animation.

### Sales page (SEO + AEO)
- Meta description/canonical/OG/Twitter; `SoftwareApplication` JSON-LD (free offer, featureList) and `FAQPage` JSON-LD whose answers mirror the visible FAQ details — answer-engine-ready.
- Keyword-targeted copy: link queue manager, CSV task tracker, spreadsheet workflow, zero backend, client-side. The pitch: keep the spreadsheet you already have, get a modern split-pane workspace — no backend to buy, no seat licenses, nothing to sign up for.
- Pure-CSS product mock of the real app (tab bar + framed page on the left, task cards with ✓ Complete / DONE chips on the right) instead of a screenshot.
- FAQ includes the honest iframe-headers answer (browser rule, not a bug; switch open mode; native version removes it) and links the roadmap.
- Deep-link compatibility: visitors hitting the root with `?file=`/`?url=` (old bookmarks/shared links) are forwarded to `app.html` preserving all params.

### Ports scaffolding (`ports/`)
- `ports/README.md` — map + status of all ports; shared `core.js` prerequisite.
- `bookmarklet/` — README with the locked scope (session-only memory, CSV-only fallback with built-in RFC-4180 parser when SheetJS can't load, <~8KB budget) + planned `build.js`/`src/`/`dist/` layout.
- `extension/` — MV3 `manifest.json` (sidePanel/tabs/storage/downloads/contextMenus), `background.js` service-worker scaffold (context menu + open-tab/focus-tab message surface), `sidepanel.html/js` stubs.
- `tauri/` — Tauri 2 `tauri.conf.json` scaffold (`frontendDist` → repo root so the canonical app is the frontend, tray + bundle icons) + README (CORS wall disappears; silent write-back; tray; auto-update).

### README
- Rewritten: app links point at `app.html`, root is described as the sales page, repo-layout tree added, and a **Roadmap** section summarizes the ports + future state (comms hand-off layers, native CORS bypass, cloud sync).

Not yet done: live Pages verification of the new root/`app.html` split (right after this push), and the ports' actual builds (items logged in `todo.md` v0.7).

---

## 2026-09-23 — Bookmarklet scope: CSV-only fallback when SheetJS can't load

**Request:** the bookmarklet must work in even the most secure environments — if SheetJS fails to load, fall back to CSV-only for that session and make the UI say so.

### Added to the bookmarklet scope in `todo.md`
- The payload embeds its own tiny RFC-4180 CSV parser (quotes, embedded commas/newlines), so a failed CDN injection never means a broken app.
- On SheetJS load failure/timeout (blocked network, strict CSP, no external scripts): **CSV-only session** — CSV loading, cards, link modes, and CSV export keep working; XLSX loading is disabled with a visible badge ("CSV-only — SheetJS unavailable") and a toast if the user tries an .xlsx file; XLSX export hides itself.
- Failure is always visible and explained — never silent or broken. This makes the no-external-scripts case (the strictest lockdown) a fully supported first-class mode.
- Budget unchanged (< ~8KB minified) with the fallback parser included.

No code changes in this step — scope documentation only.

---

## 2026-09-23 — Port plans revised: extension is sidebar-only + tab switching; Tauri keeps iframes

**Request:** update the Chrome-extension and Tauri plans per feedback.

### Changes recorded in `todo.md`
- **Chrome extension** — now explicitly **sidebar-only UX**: render just the task-card sidebar via Chrome's Side Panel API and **skip the entire iframe workflow**. Links open as real browser tabs (`chrome.tabs.create`), and selecting a card **switches the active tab** to that page (`chrome.tabs.update`). Everything else mirrors the web version (parsing, columns/presets, complete/undo, show-completed, sort, auto-open/auto-advance where "open" means tab-switch, downloads export, chrome.storage persistence). Open-mode menu collapses to tab mode.
- **Tauri app** — matches the web version's full experience **including the tabbed-iframe workspace**; the feedback confirms the iframe CORS/X-Frame-Options issue disappears in the Tauri shell, so sites that refuse iframing on the web work natively there. Filesystem write-back without permission prompts, tray, auto-update unchanged.
- Web app stays the canonical core (DOM-free `core.js` prerequisite unchanged).

No code changes in this step — planning only.

---

## 2026-09-23 — Bookmarklet scope: composes the app live, session-only memory

**Request:** define the bookmarklet's scope — it composes the Turnstone app live in a new tab; keep what's possible given that session/localStorage won't stick, but the core items remain: CSV/XLSX parsing via SheetJS, card rendering, ideally file write-back, export, and iframe/new-tab/window link modes.

### Recorded in `todo.md`
- **Composition model:** bookmarklet injects CSS + builds the full app DOM in a new tab — no hosted file, any origin.
- **Kept core:** SheetJS parsing (covers CSV and XLSX, so PapaParse is optional), card rendering with complete/undo and show-completed, the three link-opening modes, and CSV/XLSX export downloads.
- **Write-back:** included via the File System Access API where available (pick file once per session, silent write-back while the tab lives); export is the fallback elsewhere.
- **Explicit non-assumption:** storage does NOT persist — state is session-only in JS, with an in-page "Copy state / paste-restore" pair as the manual carry-across-sessions mechanism.
- **Practical constraints noted:** SheetJS CDN injected dynamically at runtime (the one network dependency); payload budget < ~8KB minified so it survives paste into bookmark fields.

No code changes in this step — scope documentation only.

---

## 2026-09-23 — Future state: ports (bookmarklet, Chrome extension, Tauri)

**Request:** add other versions/ports of Turnstone to future state — a bookmarklet version, a Chrome extension version, and a Tauri application version.

### Recorded in `todo.md`
- **Bookmarklet** — capture the current page's links (or a pasted list) into a Turnstone queue; options: fully self-contained inline UI vs. seeding the hosted app via URL hash; sync status back via localStorage/postMessage.
- **Chrome extension (MV3)** — side-panel queue over the active tab, native iframe/XFO bypass, downloads API for exports, context-menu link capture, badge count, chrome.storage sync; shares the web app's core code.
- **Tauri app** — native desktop shell with a Rust backend: unrestricted filesystem write-back (every OS, no permission prompts), no CORS limits, system tray, global hotkey capture, auto-update; small binary vs Electron.
- **Shared prerequisite noted** — extract a DOM-free `core.js` (parse/analyze/presets/persistence) so all ports reuse one canonical codebase; this also un-blocks the Deferred/V2 iframe-bypass item, which the extension and Tauri ports make feasible.

No code changes in this step — planning only.

---

## 2026-09-23 — Queue UX: click-to-open, one-click complete, auto-open/auto-advance, sorting (v0.6)

**Request:** no Open button — clicking a card opens its link; optional auto-open on card selection; optional auto-open-next-on-complete; complete dropdown becomes a single button; completed cards hidden by default with a reveal option plus a subtle per-card undo; sort cards by any column asc/desc.

### Delivered
- **Click = open** — the Open ▶ button is gone; clicking a card's title opens its link (per selected mode) and expands the card. The card-URL link and ↗ still force real browser tabs.
- **✓ Complete / ↺ Incomplete** — the status dropdown is now a single button: green ✓ Complete on open cards; completed cards get a subtle dashed ↺ Incomplete to flip back. Cards dim slightly when done.
- **Completed hidden by default** — a **Show completed** checkbox (replaces "Hide completed", inverted semantics); the filter line shows `N shown · M hidden` while filtered.
- **Automation options** (☰ menu, persisted): **Open link when card is selected** (opening happens on title click which also expands), and **Auto-open next after completing** — completing a card opens the next incomplete card's link (file order, wrapping), with a 🎉 "queue finished" toast on the last one.
- **Sorting** — a Sort row in the sidebar: column dropdown (file order default; fixed roles marked `*`) + asc/desc toggle. Numeric-aware ordering, case-insensitive strings; persists per file until reset.

### Verified in sandbox
- Test CSV: 7 visible (3 completed hidden), filter info `7 shown · 3 hidden`; Show completed → 10 with 3 undo buttons; undo flips status and re-hides.
- Title click opens iframe tab + expands (no Open button anywhere); Complete hides the card; auto-advance opens next incomplete; toggles persist in localStorage and check/uncheck in the menu.
- Sorting by Name asc/desc and by Status groups completes first when ascending; file order resets cleanly; demo + test regressions pass.

---

## 2026-09-23 — Open modes + hamburger UI (v0.5)

**Request:** iframed tabs are one mode among several, not the default for everyone — users pick tabs / new browser tab / popup windows when they first load a file, changeable live in settings. Drop the branding topbar (brand the launch screen instead) and move its UI into a hamburger menu at the top of the sidebar for maximum vertical space. Also add phone/SMS/mail hand-off layers to future state.

### Delivered
- **Open modes** — `tabs` (iframes, the old behavior), `newtab` (real browser tab), `newwin` (popup window, `noopener`); stored in localStorage, applied everywhere links open (card title click, Open ▶ button, `?open=1` deep link) via a single `openUrlFor()`. Popup-blocked toast in `newwin`.
- **First-run picker** — on the first file load, a modal asks how to work through links (3 options with hints + "Decide later (tabs by default)"); choice persisted and never shown again. Re-openable anytime via ☰ → "Which should I pick?".
- **Live switching** — ☰ menu lists all three modes with a ✓ on the active one; switching takes effect immediately (tabbar shows/hides itself outside tabs mode; empty-state hint only renders in tabs mode).
- **Topbar removed** — branding moved to the welcome screen (◆ Turnstone + tagline); all topbar actions relocated:
  - Sidebar header: ☰ button + current file name with mode/ext + save dot (● unsaved / ✓ saved hh:mm).
  - ☰ menu: Open file…, Restore last file, Close current file, Copy share link, — Opening links (3 modes + help), Columns & presets…, Export CSV/XLSX, Install app, Light/Dark toggle. Outside-click and Esc close; item availability matches state (export disabled without a file, link disabled without a source URL, restore hidden until one exists).
- **Future state added to todo.md** — phonelayer embedded (`tel:` hand-off to the OS/PWA dialer) and maillayer embedded (`mailto:`/`sms:` hand-off + templates), each respecting the open-mode concept.

### Verified in sandbox
- Topbar gone; welcome branded; sidebar header shows file · mode · ext and save state; menu open/close (button, outside click, Esc) works.
- Mode items check correctly; switching tabs→newtab→newwin persists across calls; card click honors the mode (tab opened in tabs mode; `window.open` to example.com in newtab mode; popup-blocked toast in newwin); `?open=1` path routed through `openUrlFor`.
- First-run picker: shows on first load, disappears after picking (newwin chosen), never again afterwards; "Decide later" leaves tabs default.
- Menu regressions: export/theme/columns/close all function from the menu; export disabled without file; restore item appears only when a recents record exists.
- Demo + test CSV/XLSX regressions pass; title click expands card + opens per mode.

---

## 2026-09-23 — Card layout tweaks: inline copies, column collapse/expand, layout presets (v0.4.1)

**Request:** (1) copy icons always sit just right of the value they copy and show on hover; (2) cards show only the first 3 data columns by default, and clicking a card opens the URL *and* expands it to show the rest; (3) a settings gear to choose which columns show, in what order, saved as presets that auto-apply when other files load with the same headers in the same order.

### Delivered
- **Inline hover copies** — every value row (name, URL, notes, each extra column) ends with its own ⧉ button (`data-copy-col="row:col"`), revealed on card hover (`opacity` transition), always visible on touch devices (`hover: none`) and flashed ✓ on copy.
- **Compact cards + expand** — fixed card features (name/URL/status/notes) stay put; data columns render as labeled rows showing only the first 3. A ▼ +N toggle expands/contracts a single card; **clicking the card title opens the URL in a workspace tab and expands the card** in one action. Empty cells render no row.
- **⚙ Columns panel** — lists every column (URL/name/status/notes pinned as fixed card features; extras draggable + checkbox-toggled), Apply/Delete per preset, Reset to file order. Presets are saved in `localStorage` keyed by a header signature (trimmed/lowercased header row joined with `¦`), and `loadMatrix` auto-applies a matching preset on any file load (order + hidden set, tolerant of extra/missing columns). Empty cells stay rowless; column order also drives search (full-row match) and export is unchanged.

### Verified in sandbox
- 6-column synthetic file: collapsed = 3 data rows (fixed cols excluded), toggle expands to 4 with correct labels; title click opens the iframe tab AND sets `ex`.
- Settings: 8 rows for an 8-col file (4 fixed), hide via checkbox shrinks cards, drag reorder + reset work, preset save/apply/delete with live toast.
- Preset auto-apply: reload with identical header applies the saved order/hidden automatically; a file with a changed column name does NOT match (fresh order). Demo + test CSV/XLSX regressions pass (10 cards, 3 seeded, no extra-column UI when there are none).
- Hover reveal confirmed (transition-aware read: opacity 1 on hover/`.ok`; idle 0; touch always-on via media query).

---

## 2026-09-23 — PWA: installable + offline (v0.4)

**Request:** make Turnstone installable as a PWA (manifest + service worker, still single-file friendly) so it works offline and can be installed from the browser.

### Delivered
- **Icons** — `icon-192.png` (2.2 KB) and `icon-512.png` (8 KB), generated programmatically in Node (hand-built PNG encoder: CRC-checked chunks, deflate): rounded tile in the app's accent gradient with the white Turnstone gem, transparent outside the rounded corners, safe for masking. Both also embedded in `index.html` as data URIs (favicon + apple-touch-icon).
- **Inline web-app manifest** — built at runtime from the embedded icon data URI and injected as a Blob URL: no `manifest.json` file needed; `name`, `short_name`, `display: standalone`, `start_url: location.pathname` (deep links keep working from the installed app), `scope`, dark `theme_color`/`background_color`.
- **`sw.js`** — versioned cache (`turnstone-v0.4.0`): precaches the shell, both CDN libraries (PapaParse, SheetJS), icons, and the sample files (each miss tolerated so sandboxed previews can't break install); stale-while-revalidate for same-origin assets; cache-first for CDN (immutable versioned URLs); network-first navigations with cache fallback so the app **opens offline**, deep links included (`ignoreSearch` + clean-path fallback); old caches purged on activate.
- **⤓ Install button** in the topbar, shown only when the browser fires `beforeinstallprompt`; hidden after install or dismissal; `appinstalled` welcome toast.
- **Graceful degradation** — SW registration only on https/localhost; skipped (with a log line) on `file://`.

### Verified
- Manifest JSON parses from the Blob URL with correct fields and a data-URI icon.
- In the sandbox preview (no sibling files served): SW registration fails soft with a warning — no unhandled errors, app fully functional.
- README gained an Install section + `sw.js` docs entry.

### Verified in production (post-push `87c5068`)
- Pages rebuilt; `sw.js`, `icon-192.png`, `icon-512.png` all HTTP 200.
- SW registered and **activated** on the live site (`turnstone-v0.4.0`, scope `/Turnstone/`); page controlled.
- Cache inspection: all 8 precache entries present (shell, both CDN libs, icons, both samples); cache matches serve the shell for deep-link paths (`ignoreSearch`) and the CDN libs.
- App fully functional under the SW: sample CSV loads 10 cards with 3 seeded statuses while controlled.
- Note: the ⤓ Install button needs a real (non-embedded) browser session — `beforeinstallprompt` doesn't fire in the automation browser; on regular Chrome/Edge the button appears once the SW is active.

---

## 2026-09-23 — Production deployment + README demo links (v0.3.1)

**Request:** make sure everything is pushed and working in prod, and update the README to link the web app plus an example deep link that pre-loads a demo file.

### Delivered
- **Enabled GitHub Pages** for the repo (`main` branch, root) → **https://spuds0588.github.io/Turnstone/** — the natural prod home for a zero-server static app.
- **README** now opens with the live-app link and two copy-pasteable example deep links: the CSV one (`?file=` pre-loading `sample-links.csv` from the repo itself) and an XLSX one with `&open=1` that auto-opens the first task.

### Verified in production
- Pages build completed; app root, `index.html`, `sample-links.csv`, and `sample-links.xlsx` all HTTP 200.
- `access-control-allow-origin: *` confirmed on the sample files, so the app can fetch its own samples cross-origin.
- Live E2E in a real browser against the Pages URL: CSV via `?file=` → 10 cards, 3 seeded statuses, chip + Link button working (clipboard copy confirmed); XLSX via `?url=&open=1` → sheet `Links`, 10 cards, first task auto-opened in a workspace tab.
- README pushed (`18dcd16`), verified live on `raw.githubusercontent.com` (3 live-link + 5 demo-param mentions); repo in sync with `origin/main`.

---

## 2026-09-23 — URL-parameter loading + workflow polish (v0.3)

**Request:** load spreadsheets via URL parameter, add scope-appropriate features, build → test → push → verify (E2E against the pushed GitHub URLs).

### Delivered
- **Hardened remote loading** — format detection now sniffs content first (XLSX = ZIP magic `PK\x03\x04`), falling back to URL extension then Content-Type; never trusts extension alone. Added `?url=` alias, scheme/shape validation (rejects non-URLs before wasting a fetch, rejects `ftp:`/self-links), soft-404 guard (an HTML error page served as HTTP 200 fails loudly instead of parsing garbage), and a CORS-specific hint on network failures.
- **Shareable deep links** — 🔗 Link button (topbar, enabled whenever the loaded file came from a fetchable URL) copies `?file=<encoded url>`; remote loads remember the source URL in the session snapshot and recents list, so remote files re-open with one click and previously-entered statuses/notes restore automatically.
- **Topbar file chip** — current file name always visible; ✕ on the chip (or clicking the logo) closes the file and returns to the welcome panel.
- **Multi-sheet XLSX picker** — workbooks with >1 sheet ask which worksheet to load (first preselected, Cancel aborts cleanly).
- **`?open=1` flag** — deep links can auto-open the first task in a workspace tab.
- **Enter submits** the welcome-panel URL input.
- **Live OS theme following** — flipping the OS light/dark preference updates the app instantly when the user hasn't picked explicitly (previously required a reload).
- **README** rewritten with all loading methods and params.

### Verified in preview
- Test CSV + XLSX flows (10 cards, 3 statuses + notes seeded, sheet `Links`); demo unchanged.
- Failure paths: bare words → rejected pre-fetch with clear toast; `ftp://` → rejected; CORS-blocked host (google.com) → "Failed to fetch" + CORS hint; load button re-enables after every failure.
- Multi-sheet picker: 2-sheet workbook built in-page → dialog lists both sheets → picking "Beta" parses Beta's rows; `wbHasMultipleSheets` correct.
- Close-file via chip ✕ restores the welcome panel and resets all chrome; share-link copies the correct `?file=` URL to the clipboard.
- Theme: OS flip → instant `Theme → light` follow with no user preference stored.
- Bugs caught by testing and fixed: `$('logo')` selector typo that threw during wiring (console sweep caught it); SheetJS `bookSheets:true` returns `{SheetNames:[…]}`, not an array — both `wbHasMultipleSheets` and the picker crashed on real workbooks before the fix.

### E2E (post-push, executed)
After `git push origin main` (commit `2577eef`), loaded the app from the preview server with deep links pointing at the **live raw GitHub URLs** of the pushed files:
- `?file=<raw sample-links.csv>` → fetched 200 over the internet, sniffed as CSV, 10 cards, chip `sample-links.csv`, 3 statuses seeded, 🔗 Link button enabled and copied the shareable URL.
- `?url=<raw sample-links.xlsx>&open=1` → raw serves `application/octet-stream` with no usable extension hint — the ZIP magic-byte sniff identified it (`Format detection: magic=true … → xlsx`); 10 cards from sheet `Links`, 3 seeded, and `open=1` auto-opened the first task (Apple Newsroom) in a workspace tab.
- Console clean: full `[Turnstone]` audit trail, zero JS errors across both E2E runs.

---

## 2026-09-22 — Test files, themes & round-trip seeding (v0.2)

**Request:** bundle production-shaped CSV/XLSX test files, verify everything works, and add proper light/dark modes.

### Delivered
- **`sample-links.csv`** — 10 production-shaped rows (`Name,URL,Status,Notes`) with quoted comma-embedded names, quoted notes containing embedded double-quotes, and 3 pre-filled `complete` statuses.
- **`sample-links.xlsx`** — identical data as a genuine XLSX binary, generated with SheetJS 0.20.3 (the same library the app uses); sheet `Links`. Node round-trip verified (11 rows, special chars intact).
- **Light/dark theme system** — all colors moved to semantic CSS custom properties with two palettes; `<html data-theme>` flips them. Toggle button (☀️/🌙) in the topbar; choice persisted in `localStorage`; fresh visitors default to `prefers-color-scheme` (boot script runs pre-paint to avoid theme flash); `color-scheme` property set so native form controls match.
- **Round-trip seeding** — `loadMatrix` now seeds each card's Status/Notes from the file's own Status/Notes columns when present (`complete|completed|done|yes|true|1|x` → complete). Files saved by Turnstone reopen with their progress intact.
- **Test buttons** — "Load test CSV" / "Load test XLSX" in the welcome panel (see `testing-notes.md` for why they use a bundled dataset in the preview sandbox).

### Verified in preview
- CSV dataset: 10 cards, "Comma, Inc. Blog" and embedded-quote notes intact, 3 statuses + all notes seeded from file columns.
- XLSX path: workbook built with SheetJS, parsed back through the app's real `parseXlsxBuf`, identical results.
- Export matrix: `buildExportMatrix()` returns 11×4 with header preserved and statuses/notes merged into columns 3/4 (no duplicate-column growth on repeated saves).
- Theme: toggle flips every token instantly (dark `#0f1115` ↔ light `#f4f6fa` backgrounds verified), persistence across reloads, and light-OS default when no override exists. Both themes screenshot-verified for contrast/readability.
- Console: full `[Turnstone]` audit trail, zero JS errors across all flows.

### Known preview limitation
The sandboxed preview server serves only `index.html` (sibling files 404), so `?file=sample-links.csv` and real fetch-based loading 404 there. In production (file opened from disk, or any static host serving sibling files) the native picker, `?file=` param, and remote fetch work as designed — see `testing-notes.md` for the manual test plan.

---

## 2026-09-22 — MVP build (v0.1)

**Source:** `PRD-Turnstone.md` (Project Turnstone Master Document).
**Approved deviation:** sidebar moved from the PRD's left-hand position to the **right side** of the screen; tabbed iframe workspace occupies the left. Documented in `agents.md` and `todo.md`.

### Delivered
- **`agents.md`** — AI developer rules transplanted from PRD §4, plus the right-sidebar deviation note so future agents don't "fix" it back.
- **`todo.md`** — All Phase 1–4 developer tasks checked off (Tasks 1.1–4.4); V2 items (CORS bypass, Drive/OneDrive sync) remain deferred.
- **`index.html`** — the entire MVP, single file, zero build step.

### Implementation notes
- **Phase 1 (parsing):** PapaParse 5.4.1 + SheetJS 0.20.3 via CDN. Both `showOpenFilePicker` (Chromium) and `<input type=file>` fallback. `?file=` URL param fetches remote files (CORS required). Heuristic header/URL/name/status/notes column detection normalizes everything to a 2D array.
- **Phase 2 (UI):** CSS Grid split pane — **workspace left (1fr), sidebar right (340px)** per the approved change. Task cards carry `data-row-index`, Status dropdown, Notes textarea, and ⧉ copy icons on name/URL/notes. Search filters with `<mark>` highlighting; "Hide completed" toggle; footer counters.
- **Phase 3 (workspace):** Top tab bar; `openInIframe(url, rowId)` reuses tabs per row+URL; switching toggles pane visibility so iframes never reload; every card and tab has a ↗ `target="_blank"` escape hatch for X-Frame-Options-hostile sites.
- **Phase 4 (persistence):** Debounced auto-save (1.2s FS / 0.7s fallback). Chromium: silent write-back via `FileSystemFileHandle.createWritable()`, Status/Notes merged into existing columns (or appended). `FileSystemFileHandle` stored in IndexedDB with `queryPermission`/`requestPermission` on restore, plus a Recent Files list. Fallback: full session snapshots to IndexedDB; CSV/XLSX export via Blob; strict `beforeunload` guard while `isDirty`; visibility-change flush as a safety net.
- **Rule 6 honored:** descriptive `console.log` on every major action, state change, read, write, and error (`[Turnstone]` prefix).

### Verification
- Demo dataset loads and renders 5 task cards in the right sidebar.
- Cards open in left-side iframe tabs; tab switching preserves iframe state; ↗ opens real browser tabs.
- Status/Notes edits trigger auto-save; save indicator reflects dirty/saved states; exports produce valid CSV/XLSX blobs.

*(v0.2 notes above — this section intentionally kept as the original v0.1 record.)*

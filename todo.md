# todo.md — Project Turnstone Task Tracker

Status legend: `[ ]` todo · `[x]` done · `[~]` partially done / deferred

## v0.9 More input formats (TSV, JSON, HTML tables, XML, spreadsheets)
- [x] **Format layer** in `app.html`: a single `FORMAT_INFO` table (label + `writable`), one `detectFormat()` entry point, and one `parseDetected()`. Precedence is **magic bytes → content sniff → extension → `Content-Type`**, so a mislabelled file still lands correctly; every decision is logged (`Format detection: content sniff → json (ext=json, …)`).
- [x] **Every parser emits the same 2D string matrix**, so `analyzeMatrix` → `loadMatrix` → `renderCards` are untouched and format-agnostic. Adding a format = one table row + one parser.
- [x] **Delimited text** — one parser for CSV/TSV/semicolon/pipe; PapaParse auto-detects the delimiter, so European `;` exports work, and a one-URL-per-line `.txt` becomes a one-column list.
- [x] **JSON** — arrays of objects (union of keys → columns), arrays of arrays, a wrapping object (`{"items":[…]}` unwrapped automatically), object maps (keys kept as `_key`), and JSON Lines / NDJSON recovery when `JSON.parse` fails.
- [x] **HTML tables** — largest top-level `<table>` wins, `rowspan`/`colspan` expanded into a grid, nested layout tables ignored. Parsed with `DOMParser` into an **inert** document (no scripts, no fetches). A *local* pick with no table falls back to its `<a href>` list (saved bookmarks pages); remote URLs deliberately do **not** get that fallback, which is what keeps a 200-HTML error page from being imported as a queue.
- [x] **XML** — picks the repeated record element (container-aware: `<item>` in an RSS feed, not its more numerous `<link>` children), then maps child elements **and attributes** to columns. RSS/Atom, sitemaps, OPML and generic `<record>` lists all become link queues; malformed XML fails loudly.
- [x] **Excel/ODF workbooks** — SheetJS's own type detection now covers `.xls` (OLE2 magic), `.xlsm`, `.xlsb` and `.ods` alongside `.xlsx`, at no extra cost. Verified by generating real BIFF8/XLSB/XLSM/ODS files and reading them back through the detector (3 rows each, correct sample row). `.fods` is deliberately **not** mapped: SheetJS's flat-ODS reader throws `'table:table-cell' is not a valid selector` in browsers.
- [x] **Write-back is format-aware.** CSV/TSV/XLSX save silently in place (TSV keeps its tab delimiter); JSON/HTML/XML/PDF and the legacy/macro/ODF workbooks are **one-way imports** — `state.fileHandle` is dropped, the load lands in fallback mode, and a toast says so. Rationale: writing XLSX bytes under a `.xls`/`.xlsm` name would drop macros and mislabel the file, and the others can't round-trip Status/Notes without changing shape.
- [x] **PDF is detected and refused, not mangled** — `%PDF` magic bytes → clear message ("PDF is not supported yet — export the list to CSV/XLSX first"). See the deferred item below.
- [x] UI copy: `accept=` on the file input, `FS_PICK_OPTS` types, welcome panel, empty states, and the PWA description all widened.
- [x] **Streamlined start experience** — the welcome panel now leads with a **drop zone** (`#dropzone`, `role="button"` + `tabindex`) that reads "Drop a file here, or click to choose", names the accepted formats, and is the click/press target for the file picker (the old "Choose file…" button is gone). The rest of the panel was re-ordered behind it: drop → paste a URL → one compact "try it with sample data" row, with the two test-data paragraphs collapsed into one line.
  - **A drop anywhere loads the file.** Handlers live on `document`, not just the zone, which also fixes a genuine hazard: dropping a file outside the zone used to make the browser navigate away from the app to the dropped file. Drops now land as a queue even with one already open.
  - **In-page drags are untouched:** every handler gates on `dataTransfer.types.includes('Files')`, so the settings panel's column-reorder drag still belongs to the settings panel.
  - **Dropped files and write-back:** Chromium exposes a `getAsFileSystemHandle()` per dropped item, so the code resolves one and uses it *only when already writable* (`queryPermission({mode:'readwrite'}) === 'granted'`) — no surprise permission prompt appears on a drop. Otherwise the load lands in fallback mode with the usual IndexedDB persistence, export and `beforeunload` guard, and the reason is logged.
  - **Verified in-browser** with synthetic `DragEvent`s: a `text/plain` drag is neither prevented nor highlighted; a `Files` drag is prevented and highlights the zone; a dropped `.tsv` loaded 2 cards (1 complete, round-tripped from its own Status column) and hid the welcome panel; a dropped `.json` replaced the open queue with correct columns and notes; the highlight clears on drop; and both click and Enter on the zone call `openLocalFile()` (the fallback `<input type=file>` path is exercised because synthetic events carry no user activation).
- [x] Four new fixtures (`sample-links.tsv` / `.json` / `.html` / `.xml`) mirror the CSV exactly — each must land 10 cards, 4 columns, 7 visible / 3 complete — and are precached by `sw.js` **v0.9.0**.
- [x] **Verified in-browser** on the local server: all four text formats via `?file=` (each logged the expected detection reason and produced `urlCol=1, nameCol=0, statusCol=2, notesCol=3` → 10 cards / 7 visible / 3 complete), CSV + XLSX regressions, workbook-container sweep (xlsx/ods/xls/xlsb/xlsm), PDF refusal, and local-pick paths through a real `File` object (JSON/HTML/CSV/XLSX → correct `ext`, fallback mode, handle dropped for import-only formats). A parser sweep covered JSON-in-5-shapes, XML-in-4-shapes (incl. Atom `href` attributes and OPML), HTML `rowspan`/nested tables/link-only pages, and the strict/no-table error path.
- [ ] **PDF link extraction (deferred, needs a decision).** A PDF parser means vendoring pdf.js (~1 MB + its own worker) — it would roughly double the vendored payload, add a worker to the CSP surface (already allowed via `worker-src 'self' blob:`), and complicate the planned `turnstone-standalone.html` bundle. Text extraction from PDFs is also lossy for tables, so quality would be uneven. Options: (a) leave it out and tell users to export to CSV/XLSX; (b) ship an **opt-in** lazy-loaded pdf.js build only when a `.pdf` is dropped; (c) parse only the *text layer* for URLs via a tiny custom extractor (no lib) — workable for link lists, hopeless for tables.

### Next formats worth adding (candidates, not started)
- [ ] **Clipboard paste** — the single highest-value input path: Excel/Google Sheets put tab-separated data on the clipboard, so a `paste` handler on the welcome panel reuses the new TSV parser verbatim. No file dialog at all.
- [ ] **Markdown** — `- [ ] https://…` task lists and `| a | b |` tables are how a lot of dev/PM work is actually kept.
- [ ] **Word/Google Docs tables** — `.docx` is a ZIP containing `word/document.xml`; browsers now expose `DecompressionStream('deflate-raw')`, so this is doable without a new dependency, but it is real ZIP work.
- [ ] **Other SheetJS-readable shapes** — `.dbf`, `.prn`, `.dif`, `.sylk`, SpreadsheetML 2003 (`.xml` from Excel) — mostly a table entry each.
- [ ] **YAML / TOML lists** and **`.url` / `.webloc` / Netscape bookmarks** (the last is covered today by the HTML link fallback).

## v0.8 Offline/air-gapped hardening (vendored deps + zero data call-outs)
- [x] **Vendored the CDN dependencies** — PapaParse 5.4.1 + SheetJS 0.20.3 downloaded into `vendor/` (exact upstream builds, same-origin); `app.html` script tags repointed, both CDN `<script>` tags removed. Verified in-browser: zero cross-origin requests at runtime.
- [x] **Data-call-out lockdown** — GitHub Pages can't set HTTP headers, so the policy ships as meta CSP + `referrer: no-referrer`. App: scripts/styles/images/manifest/workers self-only (+ `data:`/`blob:` embedded icons, `file:` for disk copies), `connect-src 'self' https: blob: file:`, `object-src`/`base-uri`/`form-action` `'none'`. **`frame-src https: http: file:` stays open so iframe workspace mode is unaffected** (verified: framed site loaded 200 with no violation). Sales page is stricter: `default-src 'none'` + only its inline redirect script.
- [x] `sw.js` → `v0.8.0`: precaches `vendor/` instead of the CDN URLs; CDN cache-first branch deleted.
- [x] Regression-tested under the policy: CSV + XLSX parsing from the vendored libs, iframe mode, CSV blob download + XLSX write, PWA manifest blob, session persistence, legacy `?file=` redirect — zero CSP violations anywhere.
- [x] Sales page hero fix: logo no longer flush/clipped at the top edge (`.hero` padding), duplicate mini-logo removed from the eyebrow, headline shortened to "Your spreadsheet, now a modern workspace."
- [x] Verified live on Pages (commit `03d5ff8`): `vendor/papaparse.min.js` (19,469 b) + `vendor/xlsx.full.min.js` (951,904 b) serve 200, served `app.html` has the CSP meta, both `vendor/` script tags, a `referrer` meta and **zero CDN references**, `sw.js` reports `turnstone-v0.8.0`, and the live app parses the sample CSV into 7 visible cards. Prod iframe mode re-tested end-to-end: picker → card click → `tab-1: Demo Domain → https://example.com/` returned `200 (Document)` with **no CSP violation**, so the lockdown leaves iframe workspace mode intact.
- [x] `vendor/README.md`: upstream versions, sha256 integrity hashes, and the exact re-download/upgrade procedure (bump the SW version + re-run the same-origin network check after any change).

## v0.7 Sales page + ports scaffolding
- [x] `index.html` became `app.html`; SW precache + version (v0.7.0) and manifest start_url updated.
- [x] New SEO/AEO sales page at `index.html` (root): hero, CSS product mock, features, 3-step workflow, FAQ mirroring FAQPage schema, SoftwareApplication JSON-LD, static background (no animation). Links to `app.html`; legacy `?file=`/`?url=` deep links auto-forward to the app.
- [x] Ports scaffolded under `ports/`: bookmarklet (README + build.js plan), extension (MV3 manifest + background.js + sidepanel stubs), tauri (tauri.conf.json + README); `ports/README.md` maps them all.
- [x] README rewritten: `app.html` links, repo layout, ports + roadmap section.
- [ ] Verify sales page + app + ports live on Pages after push.
- [ ] Bookmarklet: build `ports/bookmarklet/build.js` + payload source per locked scope.
- [ ] Extension: real side-panel queue UI on the background message surface.
- [ ] Tauri: `cargo tauri init` shell + Rust `fs_write`/`fetch_any` commands.

## v0.6 Queue UX
- [x] No Open button — clicking a card opens its link (per open mode) and expands it.
- [x] Single ✓ Complete button replaces the status dropdown; completed cards get a subtle ↺ Incomplete undo.
- [x] Completed cards hidden by default; "Show completed" checkbox reveals them (filter line shows hidden count).
- [x] Automation toggles in ☰ menu (persisted): open link on card selection; auto-open next incomplete after completing (wraps, 🎉 on finish).
- [x] Sort cards by any column, ascending/descending (numeric-aware); file-order default.
- [x] Sandbox-verified: hide/reveal, undo, auto-advance, sort asc/desc/by-status, regressions.

## v0.5 Open modes + hamburger UI
- [x] Open modes: tabs (iframes) / new browser tab / popup window — persisted, applied everywhere links open, popup-blocked toast.
- [x] First-run mode picker on first file load (3 options + decide later); re-openable from ☰ → "Which should I pick?".
- [x] Live mode switching from the ☰ menu (✓ marker, tabbar hides outside tabs mode).
- [x] Topbar removed: branding moved to welcome screen; sidebar hamburger header (☰ + file name + save state) and dropdown menu hold all actions.
- [x] Menu state correctness (disabled/hidden items) + sandbox verification of all flows.
- [x] Future state recorded: phonelayer + maillayer embedded hand-off (phone/SMS/email to web handlers).

## v0.4.1 Card layout tweaks
- [x] Inline ⧉ copy buttons right after each displayed value (name/URL/notes/extra columns), hover-revealed, always-on for touch, ✓ feedback on copy.
- [x] Cards show only the first 3 data columns by default; per-card ▼/▲ toggle; clicking a card opens its URL AND expands it.
- [x] ⚙ Columns settings panel: drag-reorder, show/hide, reset-to-file-order, preset save/apply/delete (localStorage).
- [x] Header-signature presets auto-apply on file load when the header row matches exactly (order + hidden columns).
- [x] Sandbox-verified across synthetic files, demo, test CSV/XLSX; SW cache version bumped.

## v0.4 PWA (installable + offline)
- [x] App icons (192/512) generated programmatically and embedded as data URIs (favicon + apple-touch-icon).
- [x] Inline web-app manifest built at runtime (Blob URL) — standalone display, deep-link `start_url`, dark theme colors; no `manifest.json` file.
- [x] `sw.js`: versioned precache (shell + CDN libs + icons + samples), SWR for same-origin, cache-first for CDN, offline navigation fallback (deep links covered), old-cache purge.
- [x] ⤓ Install button driven by `beforeinstallprompt`/`appinstalled`.
- [x] SW registration guarded to https/localhost; fails soft everywhere else.
- [x] README Install section; sandbox sanity tests pass; live Pages verification post-push.

## v0.3.1 Production deployment
- [x] GitHub Pages enabled (main/root) → https://spuds0588.github.io/Turnstone/ — build verified, all assets 200, CORS `*` on sample files.
- [x] Prod E2E in a real browser: CSV via `?file=` and XLSX via `?url=&open=1`, both loading from the Pages site itself; Link-button clipboard copy confirmed.
- [x] README: live-app link + two example deep links (CSV `?file=`, XLSX `?url=&open=1`); verified live on GitHub.

## v0.3 URL-parameter loading + workflow polish
- [x] Hardened `loadFromUrl`: format detected from content (ZIP magic bytes) with URL-extension and Content-Type fallbacks; `?url=` alias for `?file=`; URL validation (scheme, non-URL input, self-link); loud failure on HTML error pages served as HTTP 200; CORS-specific error hint.
- [x] Shareable deep links: 🔗 Link button copies a `?file=` URL for the loaded remote file; source URL kept in session snapshot and recents (remote files re-open with one click, statuses restored).
- [x] Topbar file chip: current file name + ✕ to close the workspace and return to the welcome panel (logo does the same).
- [x] Multi-sheet XLSX: picker dialog when a workbook has >1 sheet (first sheet preselected, cancel aborts).
- [x] `?open=1` deep-link flag: auto-opens the first task in a workspace tab.
- [x] Enter key submits the URL input.
- [x] Live OS theme following: switching the OS light/dark preference updates the app instantly when the user has no explicit choice.
- [x] Welcome panel documents the params; README expanded with usage.
- [x] Preview-verified: demo/test CSV/XLSX loads, all failure paths (invalid URL, ftp, CORS block, soft-404 HTML), multi-sheet picker, close-file, share-link copy, OS theme follow; two latent bugs found and fixed (bad `$('#logo')` selector; SheetJS `bookSheets` returning `{SheetNames}` instead of an array).

## v0.2 Hardening (post-MVP)
- [x] Production-shaped test files: `sample-links.csv` + `sample-links.xlsx` (quoted commas/quotes, pre-filled Status/Notes).
- [x] Light/dark theme system: CSS-variable palettes, topbar toggle, `localStorage` persistence, `prefers-color-scheme` default, pre-paint boot to avoid flash.
- [x] Round-trip seeding: cards initialize Status/Notes from the loaded file's own columns.
- [x] One-click "Load test CSV / XLSX" buttons (bundled dataset; sandbox limitation documented in `testing-notes.md`).
- [x] Verified CSV + XLSX parse, export matrix integrity, theme switching/persistence in the live preview.

## Phase 1: Core Setup, Parsing, & URL Params
- [x] Task 1.1: Initialize boilerplate with PapaParse and SheetJS.
- [x] Task 1.2: Implement `window.showOpenFilePicker` (Chromium) and `<input type="file">` (Fallback).
- [x] Task 1.3: Implement logic to parse `?file=` from URL parameters and `fetch()` the remote file.
- [x] Task 1.4: Normalize parsed data into a standard 2D JavaScript Array.

## Phase 2: Split-Pane UI & Task Cards
- [x] Task 2.1: Build Layout (Left Workspace 70vw, Right Sidebar 30vw — **approved deviation**).
- [x] Task 2.2: Render Task Cards with Status dropdown, Notes textarea, and Copy-to-Clipboard icons.
- [x] Task 2.3: Implement Search Bar (filter + highlight) and "Hide Completed" toggle.

## Phase 3: Tabbed Iframe Workspace
- [x] Task 3.1: Build the top Tab bar in the left workspace.
- [x] Task 3.2: Implement `openInIframe(url, rowId)` to create a new tab and iframe.
- [x] Task 3.3: Handle tab switching logic (hide/show active iframes without reloading them).
- [x] Task 3.4: Add "Open in New Tab" fallback mechanism for sites that block iframes.

## Phase 4: Write-Back Engine & Persistence
- [x] Task 4.1: Implement Debounced Auto-Save to the active `fileHandle`.
- [x] Task 4.2: Implement IndexedDB storage of `FileSystemFileHandle` ("Recent Files" + auto-load prompt).
- [x] Task 4.3: Implement Fallback Data Engine (IndexedDB persistence, export CSV/XLSX via Blob).
- [x] Task 4.4: Add `beforeunload` guard in Fallback mode (`isDirty`).

## Deferred / V2
- [ ] Bypass Iframe CORS / `X-Frame-Options` headers natively (Chrome Extension / Electron only — impossible in web SPA).
- [ ] Persistent local file access without re-authorization prompts.
- [ ] Google Drive / OneDrive sync.

## Future state: other versions & ports of Turnstone
- [ ] **Bookmarklet version** — a one-click bookmarklet that **composes the whole Turnstone app live in a new tab** (injecting CSS + building the DOM from the bookmarklet payload — no hosted file needed, works on any origin).
  - Scope for the composed app: **core features stay** — CSV/XLSX parsing via SheetJS (paste file contents / drag-drop a file into the composed page; PapaParse optional, SheetJS covers both formats), **card rendering** (title, link, columns, ✓ Complete / ↺ Incomplete, Show completed), **link opening in iframe / new-tab / popup modes**, and **exports** (CSV/XLSX Blob downloads).
  - **File write-back is included where the browser allows it**: if File System Access API is available, let the user pick the file once per session and write back silently while the tab lives; otherwise rely on export. (Opening from a bookmarklet-composed page still grants FS API in Chromium.)
  - **No persistence between sessions** — `localStorage`/`sessionStorage`/IndexedDB are partitioned per-origin and bookmarklet tabs may run on a throwaway origin (e.g. `about:blank`/selected origin), so assume **session-only memory**: state lives in JS for the tab's lifetime, plus an in-page "Copy state" button (and paste-restore) so a user can manually carry a queue across sessions. Do not silently rely on storage sticking.
  - Load libraries dynamically: inject the SheetJS CDN script into the composed document at runtime (single network dependency, then everything is local).
  - **SheetJS-load failure fallback (locked-down environments are a first-class case):** if the CDN injection fails or times out (blocked network, strict CSP, no external script policy), degrade gracefully to **CSV-only mode for that session** — the bookmarklet payload carries its own tiny built-in CSV parser (RFC-4180: quotes, embedded commas/newlines), so CSV loading, cards, link modes, and CSV export all still work. XLSX loading is disabled with a clear UI notice (e.g. a mode badge "CSV-only — SheetJS unavailable" on the welcome panel + a toast when the user tries an .xlsx file), and XLSX export hides itself. Never leave the app broken or silent: the failure is visible, explained, and everything except the binary format keeps working. (This matches the tool's intent to work in the most secure environments.)
  - Size budget: keep the bookmarklet payload small (UI templates, logic, and the fallback CSV parser only, no embedded libs); target < ~8KB minified so it stays paste-safe in bookmark fields.
- [ ] **Chrome extension version** — Manifest V3, **sidebar-only UX**: renders just the task-card sidebar via Chrome's Side Panel API — **no iframe workflow at all**. Links always open as real browser tabs (`chrome.tabs.create`); selecting a card focuses/switches the active tab to that card's page (`chrome.tabs.update` + `highlight`), so the queue drives the browser. The rest mirrors the web version: SheetJS parsing, columns/presets, ✓ Complete / ↺ Incomplete, Show completed, sort, auto-open & auto-advance (opening = switching to the tab), exports via `chrome.downloads`, statuses/presets in `chrome.storage` (persists per browser), context-menu "add link to Turnstone", badge with remaining count. The open-mode menu item collapses to just tab mode.
- [ ] **Tauri application version** — native desktop app (tiny bundle vs Electron) that **matches the web version's full experience**, including the tabbed-iframe workspace — with the key difference that the iframe CORS/X-Frame-Options problem **disappears**: the Tauri webview shell can permissively load any frame (and fetch any URL via the Rust side), so sites that block iframing on the web work inside the app. True filesystem read/write without permission prompts (silent write-back on every OS), system tray queue, auto-update. Keep the web app as the canonical core so all ports share one codebase (extract `core.js`: parse/analyze/presets/persistence DOM-free); the only Tauri-specific layer is the shell config + any Rust-side fetch/write commands.
- [x] **Bundled single-file build (`turnstone-standalone.html`) — shipped as a beta.** `assets/build-standalone.js` inlines the app shell, both vendored libraries and the logo SVGs into one ~1.08 MB document, then asserts that **no `assets/` or `vendor/` reference survives** and that the inlined content is actually present — so the build fails loudly rather than shipping a half-offline file. It also flips a one-line `STANDALONE_BUILD` flag in `app.html` that skips service-worker registration (there is no `sw.js` beside a copied file, so registering would 404). Verified by serving a directory containing **only** that one file: the app booted with zero external requests and no console errors; the inlined SheetJS parsed `sample-links.xlsx` into the usual 10 cards / 7 visible / 3 complete. Rebuild with `node assets/build-standalone.js` (`--check` fails if the artifact is stale). Build provenance (timestamp + commit sha) is stamped into a comment at the top of the file. Still open: the **CSV-only variant** (no binary parser) for environments that can't ship SheetJS at all — it needs real degradation logic (hide XLSX export, disable the workbook path, show a mode notice), not just an omitted script tag.
- [~] **Bundled single-file builds — original scope** (context for the item above): a true one-document distributable, on top of the other ports: a build step inlines the app shell, the vendored libraries (PapaParse + SheetJS), and the logo/icons as data URIs into a single `.html` file. Target uses: **`file://` protocol** (double-click, no server), USB-stick distribution, internal wiki / share-drive hosting, and air-gapped or locked-down machines where nothing can be installed. Because the app now makes **zero external requests**, this build is genuinely self-contained: no server, no CDN, no repo checkout. Notes: service-worker/PWA features degrade gracefully on `file://` (no SW scope → the app already logs this and skips registration, so no install prompt); write-back should steer to export/download in this mode since File System Access API availability varies on `file://`; ship a **vendored build by default** and an optional **CSV-only variant** (no binary parser) for the most restrictive environments. Also worth doing: a `--minify`/single-file build script in `assets/` or `build/`, and a README section showing both the hosted and standalone paths.
- [ ] Porting prerequisite: refactor `app.html` so parsing, matrix analysis, preset logic, and state persistence live in a DOM-free `core.js` shared by the web app, extension, and Tauri shells.

## Future state: web MCP server (agent setup & takeover)
- [ ] Ship a Turnstone **web MCP server** so AI agents can set the workspace up **for** their users and take over on request:
  - Tools: `load_queue` (URL/local path → parse + open workspace), `set_open_mode`, `get_state` / `set_status` / `set_notes` (per-row), `complete_row` / `advance` (drive the auto-advance queue), `export` (CSV/XLSX), and `screenshot` for verifying setup.
  - "Set up for my user" flow: agent loads the user's file, applies/creates the right column preset, picks the open mode, and hands over a ready workspace (optionally via a `?file=` deep link the user just clicks).
  - "Take over for me" flow: agent works the queue — opens links, flips statuses, writes notes — with all changes flowing through the same write-back engine (FS API / export) as manual use.
  - Transport options to evaluate: Streamable HTTP MCP server (works with hosted agents, needs localhost/loopback for browser control) vs a small local companion process speaking stdio MCP + CDP to the user's own browser.
  - Same core constraint as every port: build on the DOM-free `core.js` extraction so the agent tools and the web UI can never drift apart.

## Future state: embedded comms hand-off (phone / SMS / mail)
- [ ] **Phonelayer embedded** — detect `tel:` links on cards and hand off to the appropriate web handler (installed PWA dialer / OS handler via `tel:` + Web Share API where available), with a card action button and per-mode setting in the ☰ menu.
- [ ] **Maillayer embedded** — same for `mailto:` (and `sms:`): card action buttons + menu settings to route email/SMS through the user's preferred web handler (default mail client, `mailto:`, `sms:` deep links); queue templates using other columns (e.g. personalized subject/body from Name/Notes).
- [ ] Both layers should respect the open-mode concept: hand off in a new tab, popup, or embedded iframe where the handler allows it, and log hand-offs like link opens.

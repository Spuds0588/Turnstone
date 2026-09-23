# todo.md — Project Turnstone Task Tracker

Status legend: `[ ]` todo · `[x]` done · `[~]` partially done / deferred

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
- [ ] **Bookmarklet version** — a one-click bookmarklet that captures the current page's links (or a pasted list) into a Turnstone queue in a popup/side panel. Single-file constraint: inline the minimal card-list UI and state in the bookmarklet body, or open the hosted app with links pre-seeded via a compact URL hash. Status sync back to the queue via `localStorage`/`postMessage`.
- [ ] **Chrome extension version** — Manifest V3 extension that unlocks the things a web SPA can't do: a side-panel queue over the active tab, native iframe/X-Frame-Options bypass via `chrome.tabs`/`webRequest`, `chrome.downloads` for exports, context-menu "add link to Turnstone", badge with remaining-task count, and `chrome.storage` sync for presets/statuses. Reuses the same core parsing/layout code as the web app.
- [ ] **Tauri application version** — native desktop app (tiny bundle vs Electron) with a Rust backend: true filesystem read/write without permission prompts (real silent write-back on every OS), no CORS at all (fetch + iframe any URL, `tauri` shell can disable web security per-webview), system tray queue, global hotkey to capture the frontmost browser's URL, auto-update. Keep the web app as the canonical core so all three ports share one codebase (extract `core.js`: parse/analyze/presets/persistence DOM-free).
- [ ] Porting prerequisite: refactor `index.html` so parsing, matrix analysis, preset logic, and state persistence live in a DOM-free `core.js` shared by the web app, extension, and Tauri shells.

## Future state: embedded comms hand-off (phone / SMS / mail)
- [ ] **Phonelayer embedded** — detect `tel:` links on cards and hand off to the appropriate web handler (installed PWA dialer / OS handler via `tel:` + Web Share API where available), with a card action button and per-mode setting in the ☰ menu.
- [ ] **Maillayer embedded** — same for `mailto:` (and `sms:`): card action buttons + menu settings to route email/SMS through the user's preferred web handler (default mail client, `mailto:`, `sms:` deep links); queue templates using other columns (e.g. personalized subject/body from Name/Notes).
- [ ] Both layers should respect the open-mode concept: hand off in a new tab, popup, or embedded iframe where the handler allows it, and log hand-offs like link opens.

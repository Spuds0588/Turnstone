# todo.md — Project Turnstone Task Tracker

Status legend: `[ ]` todo · `[x]` done · `[~]` partially done / deferred

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

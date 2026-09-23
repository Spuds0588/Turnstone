# history.md — Project Turnstone Build Log

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

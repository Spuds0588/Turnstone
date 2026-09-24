# Turnstone — Test & Verification Notes

## Test files
Two production-shaped sample files live in the repo root, designed to exercise every parser edge:

- **`sample-links.csv`** — 10 tasks, `Name,URL,Status,Notes` header. Includes:
  - quoted name with embedded commas (`"Comma, Inc. Blog"`)
  - quoted note with commas and embedded double-quotes (`"Note with, commas, and ""quotes"""`)
  - pre-filled Status column (3 × `complete`) and Notes — verifies round-trip seeding
- **`sample-links.xlsx`** — identical data, genuine XLSX binary generated with SheetJS 0.20.3 (the same library the app uses), sheet name `Links`. Verified round-trip in Node: 11 rows, embedded commas/quotes intact.

## One-click loading
The welcome panel now has **Load test CSV** / **Load test XLSX** buttons.

## Why the buttons fetch() instead of using File pickers
The PRD's primary flows (native picker / `?file=` URL) can't run inside the sandboxed preview browser: the native file picker has no display to open against, and the preview server serves only `index.html` (404 for everything else). So for preview runs, a test button fetches file contents via `fetch(text/xlsx)` — in real production use (opening `index.html` from disk or any static host that serves sibling files), the native picker and `?file=` param work as designed.

## Manual production test plan (real browser, files served or picked)
1. Serve the repo: `npx serve .` (or just open `index.html` from disk in Chrome/Edge).
2. `Open File…` → pick `sample-links.csv` → expect 10 cards; 3 pre-seeded complete; "Comma, Inc. Blog" intact; notes seeded.
3. Switch status, type a note → save indicator flips `● unsaved changes` → `✓ saved to file` (Chromium writes back silently).
4. Reopen the file → statuses/notes persist (written back into the file's own columns).
4b. **Resume round-trip:** complete a few cards and type notes → **Export CSV** → open `app.html` fresh and drop/pick that exported file back in → expect the same counts (`N tasks | M done | M left`), the notes back in their textareas, completed cards still hidden, and the toast `Loaded N tasks from …-turnstone.csv — resumed M complete · K notes`. Repeat with **Export XLSX**. Then rename the completed column to `Completed` (or `Done`, `Finished`, `Checked`) and reload: the progress must survive under any of those names — and a `Priority`/`Size` column with `yes`/`x`-style values must **not** be mistaken for status.
5. `Load test XLSX` → same 10 tasks from the binary workbook.
6. Toggle theme → UI flips instantly; reload → choice remembered; fresh profile → follows OS preference.
7. **URL parameter (v0.3):** `index.html?file=<encoded raw.githubusercontent.com/.../sample-links.csv>` → fetches, sniffs format, 10 cards with chip showing `sample-links.csv`. Same for the `.xlsx` (raw serves it as `application/octet-stream` — magic-byte sniffing handles it). Add `&open=1` → first task auto-opens in a tab.
8. **Failure paths:** `?file=https://www.google.com/` → CORS-hint toast; `?file=<any 404>` → HTTP-error toast; paste `not a url` → rejected without a fetch; an HTML page served as HTTP 200 → "returned a web page, not a CSV/XLSX" toast.

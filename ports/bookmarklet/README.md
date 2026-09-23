# Turnstone Bookmarklet — port scaffold

**Status: scaffolded, not built.** The locked scope lives in the root [`todo.md`](../../todo.md)
(*Future state → Bookmarklet version*) and the build log in [`history.md`](../../history.md);
read both before writing code — the constraints below are settled decisions, not suggestions.

## What it is

A one-click bookmarklet that **composes the entire Turnstone app live in a new tab**:
it injects CSS and builds the DOM from the payload itself — no hosted file needed, works on
any origin. The bookmark field gets a `javascript:` one-liner that expands into the app.

## Locked-in scope

- **Core features stay:** CSV/XLSX parsing via SheetJS, card rendering (title, link,
  columns, ✓ Complete / ↺ Incomplete, Show completed), link opening in iframe / new-tab /
  popup modes, CSV/XLSX export via Blob downloads.
- **File write-back where allowed:** if the File System Access API is available, pick the
  file once per session and write back silently while the tab lives; otherwise export.
- **Session-only memory:** `localStorage`/IndexedDB can't be relied on from a
  bookmarklet-composed tab (throwaway/partitioned origin). State lives in JS for the tab's
  lifetime, with an in-page "Copy state / paste-restore" pair to carry a queue across
  sessions. Nothing silently assumes storage stuck.
- **CSV-only fallback (locked-down environments are a first-class case):** if the SheetJS
  CDN injection fails or times out (blocked network, strict CSP, no external scripts), the
  session degrades to CSV-only — the payload carries its own tiny RFC-4180 parser, so CSV
  loading, cards, link modes, and CSV export keep working. XLSX loading is disabled with a
  visible "CSV-only — SheetJS unavailable" badge + toast, and XLSX export hides itself.
  Never broken, never silent.
- **Size budget:** < ~8 KB minified (UI templates + logic + fallback parser only, no
  embedded libraries) so it stays paste-safe in bookmark fields.

## Layout

```
bookmarklet/
  build.js        # TODO: Node builder — reads app source, emits the minified
                  # javascript: one-liner into dist/turnstone-bookmarklet.js
  src/            # TODO: payload source (DOM templates, styles, embedded CSV parser)
  dist/           # TODO: build output — the paste-ready bookmarklet string
  test.html       # TODO: manual harness — installs the bookmarklet via a draggable link
```

## Build idea

`node build.js` concatenates/minifies `src/`, wraps it in an IIFE, prefixes `javascript:`,
and writes `dist/turnstone-bookmarklet.js` plus a copy-paste `<a href>` snippet for the
README. The SheetJS CDN script is injected at runtime (the single network dependency);
everything else travels inside the payload.

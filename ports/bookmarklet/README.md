# Turnstone Bookmarklet

**Status: built and verified** (2026-09-24). One click on any page gives you the whole
Turnstone workspace there — cards, statuses, notes, link modes, exports — with **no hosted
file, no network request and no libraries required**.

```bash
node ports/bookmarklet/build.js          # → dist/ payloads + install page
```

Open `ports/bookmarklet/dist/install.html` (or `ports/bookmarklet/test.html` while
developing) and drag a link onto your bookmarks bar. On the live site the install page is at
<https://spuds0588.github.io/Turnstone/ports/bookmarklet/dist/install.html>.

## Three decisions that changed from the original scope — and why

The earlier scaffold assumed a `javascript:` payload that **composes the app in a new tab**,
injects **SheetJS from a CDN**, stays under **~8 KB**, and falls back to CSV-only when the CDN
fails. Three of those four turned out to be wrong, and the evidence is in this repo:

1. **A new tab cannot host the app.** A document a bookmarklet creates inherits the page's
   Content-Security-Policy (`about:blank`, `srcdoc`, `blob:` and same-origin frames all
   inherit the policy container), so its inline scripts are refused outright. Measured on a
   page declaring `script-src 'self'`: injecting an inline `<script>` into the page **and**
   into a same-origin `about:blank` iframe both produced *"Refused to execute inline script
   … violates script-src 'self'"*. That is precisely the strict-CSP environment this port
   exists for, so the overlay is built **in the current page** instead — from the payload's
   own code, which a bookmarklet's activation exempts from page CSP (that exemption is why
   bookmarklets work on GitHub at all).
2. **No CDN, no dependency.** The libraries are either inlined from `vendor/` or replaced by
   dependency-free stand-ins (below). Nothing is fetched at runtime, so a blocked network, a
   strict `connect-src`, an air-gapped machine or a dead CDN cannot degrade the tool.
3. **The size budget is met by splitting, not by starving one payload.** The parsers are the
   only thing that makes a payload big, so variants differ only in what they carry:

| Variant | Payload | Carries | Formats |
| --- | --- | --- | --- |
| `csv` | ~142 KB | app + a 2 KB RFC-4180 reader | CSV, TSV, JSON, HTML, XML |
| `core` | ~152 KB | app + a read-only XLSX reader | the above **+ XLSX / XLS / ODS reading** |
| `full` | ~1.09 MB | app + vendored PapaParse + SheetJS | every format, plus **XLSX export and write-back** |

The old "< ~8 KB" target is not reachable while keeping the real app: the app shell alone is
~139 KB, and the promise was always "the whole Turnstone app, not a cut-down clone". What is
reachable — and what the variants now deliver — is *no libraries at all in two of three*, with
the third available when someone wants workbook writing and can accept the size.

## How the overlay works

```
javascript: (function () {                       ← the bookmark's URL, %0A-encoded
  <app.html's stylesheet, patched :root → :host>
  <shadow host> → <shadow root> → bar + <app.html's markup>
  <app.html's script, patched: $() scoped to the root>
})()
```

- **Shadow DOM** isolates the app's CSS from the page's (in both directions).
- **Constructed stylesheets** (`new CSSStyleSheet()` + `adoptedStyleSheets`) replace the
  app's `<style>` tag, which `style-src` would otherwise block. Verified: under
  `script-src 'self'; style-src 'self'` the overlay adopts 2 constructed sheets and injects
  **0** `<style>` elements, with the layout measured intact (`#app` grid, 340px sidebar).
- **No scripts are injected into the page** — no `<script>`, no `eval`, no `new Function`, no
  `document.write` (asserted by the build and greppable in `dist/csp-probe.js`).
- **The host page's globals are untouched.** The vendored libraries are evaluated against
  shadow objects (`Object.create(window)`, plus `define`/`module`/`exports` shadowed so their
  UMD wrappers take the browser path), and the loader restores nothing because it changed
  nothing. Verified the hard way: with the page's own `window.XLSX`/`window.Papa` stubbed to
  fakes, both survived untouched (`read()` still returned the page's own value) while
  Turnstone parsed a real workbook with its own inlined copies.
- **Session-only storage, and the UI says so.** `indexedDB` is shadowed with an in-memory
  stand-in, so the app's snapshot code works for the tab's lifetime and the user's queue is
  never written into the host site's database. The sidebar chip reads *"this tab only — export
  to keep"*, and the bar carries **Copy state / Restore state** — a JSON snapshot (data +
  status + notes) that restores through the same `loadMatrix` round-trip the app uses for
  re-imported files. `localStorage` stays real, because that is what remembers theme, open
  mode and column presets (small, namespaced keys).
- **No host-page side effects that outlive the overlay.** The `beforeunload` guard and the PWA
  install/manifest machinery are removed in this build (they belong to a real origin, not to a
  page we were launched from), and the drag handlers are attached to the overlay instead of
  `document`, so they disappear with it. `✕ Close` removes the host element and the page is
  exactly as it was.

## Dependency-free parsers

Both stand-ins implement *only* the API surface `app.html` consumes, so app.html needs no
special-casing beyond capability flags:

- **`src/papa-shim.js`** (~2 KB) — RFC-4180 reader/writer: quoted fields, doubled quotes,
  embedded commas and newlines, CRLF, BOM, and delimiter sniffing (`,` `\t` `;` `|`).
- **`src/xlsx-shim.js`** — a read-only XLSX reader with **no library behind it**: it walks the
  ZIP central directory, inflates each member with the browser's own
  `DecompressionStream('deflate-raw')`, and reads `workbook.xml` / `sharedStrings.xml` /
  `worksheets/*.xml` with `DOMParser`. Verified against the repo's real `sample-links.xlsx`
  fixture (10 tasks / 3 done / 7 left, identical to CSV). `.xls`, `.xlsb` and `.ods` get a
  readable refusal pointing at the `full` variant.

## App-side capability flags this port added to `app.html`

Shared with the (still unbuilt) standalone CSV-only variant — this was the "real degradation
logic" that item was blocked on:

- `HAS_XLSX` / `HAS_XLSX_WRITE` — reading and *rebuilding* a workbook are separate
  capabilities. Without the writer, XLSX export hides itself and workbooks become one-way
  imports (`canWrite()`), instead of the app promising a write-back it cannot deliver.
- `SESSION_ONLY` — flips the storage wording everywhere it is promised ("browser storage" →
  "this tab only").
- Visible degradation: a welcome-panel notice (*"CSV-only build"* / *"Read-only workbooks"*),
  a trimmed format list, the Test-XLSX button hidden, and a clear refusal toast if a workbook
  is dropped on a build that cannot read it.

## Known limitations

- **Inline `style="…"` attributes are dropped under a strict `style-src`.** The app carries 15
  of them (2 in markup, 13 inside `innerHTML` dialog templates). On a page with `style-src
  'self'` the CSP console reports them and those bits of dialog chrome lose their padding —
  every feature still works, it just looks slightly plain. Moving them to classes is the fix.
- **Remote `?file=`/URL loading** is the app's one `fetch`, so a page whose `connect-src` is
  closed will refuse it; the app already reports that as a fetch/CORS failure. Dropping a local
  file is unaffected.
- **A bookmarklet's own code is exempt from page CSP; an in-page `javascript:` link is not.**
  That is why `test-csp.html` has an explicit *"inject the payload as a same-origin script"*
  button (allowed by `script-src 'self'`) instead of relying on its links — the links there are
  inert by design, and installing the bookmark is what exercises the real path.
- **`%0A` encoding**: payload newlines are percent-encoded so a bookmark field never sees a raw
  line break. Anything that rewrites the URL (some bookmark managers) could break it — reinstall
  from `dist/install.html` if a payload misbehaves.

## Layout

```
ports/bookmarklet/
  build.js            Node builder (no dependencies): extracts app.html, applies asserted
                      patches, wraps variants, percent-encodes the one-liners
  src/boot-pre.js     overlay host + shadow root + stylesheets + theme + memory-only IndexedDB
  src/boot-post.js    bar wiring: variant label, Copy state / Restore state, close
  src/papa-shim.js    dependency-free PapaParse API stand-in
  src/xlsx-shim.js    dependency-free read-only XLSX reader
  test.html|test.js   manual harness (install links + a checklist)
  test-csp.html       same harness under `script-src 'self'`
  dist/               build output — commit these: install.html is served from Pages
```

`build.js` **patches `app.html` rather than forking it**, and every edit is asserted (count
checked) so an upstream change fails the build instead of shipping a broken overlay:
`$()` scoped to `ROOT`, `:root` → `:host` in the stylesheet, theme on the shadow host, overlays
appended to the root, drag handlers moved off `document`, SW/PWA/`beforeunload` removed, the
host page's `?file=` ignored, and `SESSION_ONLY`/`STANDALONE_BUILD` flipped.

## Verification (in-browser, 2026-09-24)

- `core`: mounted from the harness link; demo list → 5 cards; ✓ Complete → `5 tasks | 1 done |
  4 left`; notes type; CSV drop → 10 tasks / 3 done / 7 left with the round-trip resume toast;
  menu + settings render **inside** the shadow root (nothing leaks into the page body);
  Copy state → *"Copied 10 cards as JSON (1.2 KB)"*; Restore state rejects junk and restores a
  real snapshot with statuses **and** notes intact (`['carried note','second note']`,
  `[true,false]`); ✕ Close removes the host and leaves the page as found.
- `csv`: the degradation path — visible *"CSV-only build"* notice, format list trimmed,
  workbook drop refused with an actionable message, CSV still fully working.
- `full`: real SheetJS parses the XLSX fixture *and* exports it (`Exported sample-links.xlsx`),
  with `window.XLSX`/`window.Papa`/`window.cptable` undefined on the page throughout.
- **Under `script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'`** (payload
  injected as a same-origin script, i.e. with no CSP exemption): mounted, 2 constructed sheets
  and 0 `<style>` elements, XLSX drop → 10 tasks / 3 done / 7 left, complete + notes working.
  The only CSP console output is the inline-`style`-attribute limitation above.
- Hosted `app.html` regression pass after the capability changes: XLSX load, Test-XLSX
  (write + async read), multi-sheet inspection, and the capability notice staying hidden.

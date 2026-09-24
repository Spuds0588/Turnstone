# Turnstone

A zero-server, browser-based workspace that transforms a list of URLs — CSV, TSV, XLSX, JSON, HTML tables, XML feeds — into a modern task queue: open each link in tabbed panes, track status and notes per task, and write everything back to the file — all client-side, no backend, no signup.

**▶ Sales page & screenshots: <https://spuds0588.github.io/Turnstone/>**

**▶ Launch the app: <https://spuds0588.github.io/Turnstone/app.html>**

**▶ Every version and download: <https://spuds0588.github.io/Turnstone/versions.html>** — the hosted app, the offline single-file build, and the three bookmarklet variants (drag one onto your bookmarks bar), with each edition's formats, limits, and which one to pick.

**▶ See it work instantly** — this link pre-loads the demo task list straight from this repo via the `?file=` parameter:

> <https://spuds0588.github.io/Turnstone/app.html?file=https%3A%2F%2Fspuds0588.github.io%2FTurnstone%2Fsample-links.csv>

Prefer to watch a task open itself? Same file as XLSX with `&open=1`, which auto-opens the first task in a workspace tab:

> <https://spuds0588.github.io/Turnstone/app.html?url=https%3A%2F%2Fspuds0588.github.io%2FTurnstone%2Fsample-links.xlsx&open=1>

**Single file:** the entire app lives in `app.html` (with PapaParse + SheetJS vendored under `vendor/` — no CDN at runtime). The repo root is deployed via GitHub Pages straight from `main`; the root page is the product sales page, and `app.html` is the application.

## Supported input formats

Anything that reduces to a table of rows works — the format is detected from the file's own content first (magic bytes, then sniffing), and the extension / `Content-Type` only break ties.

| Format | Extensions | Notes |
| --- | --- | --- |
| **Delimited text** | `.csv` `.txt` `.tsv` `.tab` | Comma, tab, semicolon, or pipe — the delimiter is auto-detected, so European `;` exports and Excel "Unicode Text" both just work. A plain one-URL-per-line `.txt` is a one-column list. |
| **Excel / ODF workbooks** | `.xlsx` `.xlsm` `.xls` `.xlsb` `.ods` | Read via SheetJS. Multi-sheet workbooks ask which worksheet holds the list. |
| **JSON** | `.json` `.jsonl` `.ndjson` | Arrays of objects (keys become columns), arrays of arrays, a wrapping object like `{"items":[…]}` (unwrapped automatically), an object map, or one object per line (JSON Lines). |
| **HTML tables** | `.html` `.htm` | Picks the largest `<table>` on the page and honours `rowspan`/`colspan`. Parsed in an inert document — no scripts run, nothing is fetched. A *local* pick with no table falls back to harvesting its `<a href>` links (saved bookmarks pages). |
| **XML** | `.xml` `.rss` `.atom` `.opml` | Finds the repeated record element (`<item>`, `<entry>`, `<url>`, `<outline>`, …) and turns each into a row — RSS/Atom feeds, sitemaps and OPML subscription lists become link queues. Element names become columns; url-ish attributes (`href`, `xmlUrl`) are picked up. |
| **PDF** | `.pdf` | *Not supported yet* — detected and reported with a clear message rather than silently mangled. Export the list to CSV/XLSX first. |

**Write-back is format-aware.** CSV, TSV and XLSX save silently back into the original file (Chromium, File System Access API). JSON, HTML, XML, PDF, and the legacy/macro/ODF workbooks are **one-way imports**: their edits live in browser storage until you Export CSV/XLSX. That's deliberate — rewriting a `.xls`/`.xlsm` container with XLSX bytes would drop macros and mislabel the file, and a JSON/HTML/XML source can't round-trip status and notes without changing its shape.

## Loading a list

| Method | How |
| --- | --- |
| **Drop a file** | Drag it onto the app — the whole window is the target, not just the dashed zone — and it is read and parsed there. Dropping also works with a queue already open, and the browser can never navigate away to a dropped file. |
| **Pick a file** | Click the drop zone (or **☰ → Open file…**). Chromium users get silent write-back via the File System Access API; elsewhere it falls back to `<input type=file>` + browser-storage snapshots. A dropped file normally falls back to browser storage, since a drop carries only a read handle — use the picker when you want live write-back. |
| **Remote URL** | Paste any public link-list URL in the welcome panel (host must allow CORS). GitHub `raw.` links work great. |
| **`?file=` deep link** | `app.html?file=<encoded url>` (alias: `?url=`). Format is detected from the file's content, not just the extension. Add `&open=1` to auto-open the first task in a workspace tab. The example links above use this repo's own `sample-links.csv` / `sample-links.xlsx` as the remote source. |
| **Recent files** | The welcome panel lists your 5 most recent files — remote URLs re-fetch with one click. |
| **Demo / test data** | **Load demo list**, or the bundled `sample-links.*` fixtures via the test buttons and the deep links. |

The 🔗 **Link** menu item copies a shareable `?file=` deep link that reopens the exact same dataset — statuses ride along via browser storage on the same machine.

## Working the list

- **Pick your experience** — the first time you load a file, Turnstone asks how to open links: **Tabs (iframes)** inside the app, a **new browser tab**, or a **popup window**. Change it anytime from the ☰ menu — many sites refuse to be iframed, so tab-handoff modes keep queues of those usable.
- **Click to open — no Open button.** Clicking anywhere on a card's title opens its link (in your chosen mode) and expands the card. The ↗ icon always forces a real browser tab.
- **One-click completion** — a ✓ **Complete** button per card; completed cards are hidden by default (toggle **Show completed**), and a completed card shows a subtle **↺ Incomplete** to flip it back. Automation options in the ☰ menu: **open the link as soon as a card is selected**, and **auto-open the next task when you complete one** — turning the list into a hands-free queue.
- **Sorting** — sort cards by any column (ascending/descending, numeric-aware); file order restores instantly.
- **Right sidebar** — searchable task cards with notes and per-card ↗ escape hatches. The ☰ menu (top of the sidebar) holds everything else: open/close, share link, open mode, automation, columns & presets, exports, install, and theme.
- **Copy buttons** — every value (name, URL, notes, and each extra column) has a ⧉ button sitting right after the text; hover a card to reveal them (always visible on touch screens).
- **Cards stay compact** — beyond the fixed name/URL/status/notes, only the **first 3 data columns** show by default; expanding reveals the rest.
- **Column presets (⚙ Columns)** — reorder (drag), show/hide, and **save the layout as a preset keyed to the file's header**. Any list loaded later whose header matches that exact column order (case/whitespace-insensitive) **auto-applies the preset** — order and hidden columns included.
- **Saving** — Chromium: silent write-back to the picked file. Everywhere else: automatic IndexedDB snapshots + Export CSV/XLSX, and a `beforeunload` guard when there are unexported changes.
- **Resume where you left off** — re-importing a file you exported or updated puts its **completed** and **notes** columns straight back into the cards, so the queue continues exactly where it stopped. The completed column is recognised by its name (`Status`, `Completed`, `Done`, `Finished`, `Checked`, `Reviewed`, `Processed`, …) as well as by its values (`complete`, `done`, `yes`, `y`, `true`, `1`, `x`, `✓`, `✔`, or a completion date); the notes column likewise (`Notes`, `Comment`, `Remark`, `Memo`). Completed cards stay hidden by default, so the first thing you see is the work that is left, and the load toast reports what came back: `Loaded 10 tasks from queue-turnstone.csv — resumed 5 complete · 5 notes`.

## Theming

Light/dark out of the box: follows your OS preference live, remembers your explicit choice, no flash on load.

## Install it as an app (PWA)

Visit the live site in Chrome/Edge (or any Chromium browser) and use **☰ → ⤓ Install app** — or your browser's *Install app* menu entry. The installed app:

- opens in its own window, outside the browser chrome
- **works fully offline** (service worker precaches the app shell, parser libraries, icons, and the sample files)
- keeps your recent-file list, statuses, and notes in local storage on that device

No app store, no backend, no build step — installing just pins the same single-file app to your machine. (Installability and offline mode require HTTPS or localhost, i.e. the live site or a local server; opening `app.html` straight from disk skips the service worker gracefully.)

Implementation note: the web-app manifest is generated at runtime from icons embedded in `app.html` as data URIs, so the PWA adds only one real file to the repo — `sw.js`.

## Standalone single-file build (beta)

`turnstone-standalone.html` is the whole app in one ~1.08 MB document — the shell, PapaParse, SheetJS and the logo art, all inlined. Download it, double-click it, done: no server, no checkout, no install, no network. It is the build for **USB sticks, internal shares, and air-gapped or locked-down machines**, and for anyone who would rather keep a single file than trust a URL.

- **Build it:** `node assets/build-standalone.js` (add `--check` to fail when the artifact has gone stale relative to `app.html`, `--out <path>` to write elsewhere).
- **What it inlines:** both `vendor/` libraries and both logo SVGs. Icons were already data URIs inside `app.html`.
- **Mislabelled builds cannot ship:** the script asserts that no `assets/` or `vendor/` reference survives *and* that `Papa.parse`, `sheet_to_json` and the inlined SVG data URIs are actually present.
- **Provenance** (build time + source commit) is stamped into a comment at the top of the file.
- **Beta caveats:** service-worker registration is switched off (there is no `sw.js` beside a copied file, and offline already works because everything is local), so there is no PWA install prompt. Remote `?file=` URLs are unreliable from `file://` origins — that path is CORS-constrained by the browser, not by Turnstone — while **local files, all input formats, cards, link modes, exports and browser-storage persistence work exactly as in the hosted app**. Windows to open a picked file depend on the File System Access API; where it is unavailable the app falls back to `<input type=file>` and browser storage. A **CSV-only variant** (no binary parser, for environments that cannot ship SheetJS at all) is not built yet — it needs real degradation logic, not just an omitted script tag.
- **Serve it if you like:** it also works unchanged from any plain web server or GitHub Pages, e.g. <https://spuds0588.github.io/Turnstone/turnstone-standalone.html>.

## Hardened deployment: zero data call-outs

Turnstone is built to run where external scripts and outbound requests are unacceptable (locked-down corporate machines, air-gapped networks, strict-CSP environments):

- **Every dependency is vendored.** `vendor/papaparse.min.js` and `vendor/xlsx.full.min.js` are the exact upstream builds, served from this repo. The app makes **no third-party requests at all** — verified in-browser, where a full queue load produced only same-origin requests (shell, logos, the two vendor scripts, the data file).
- **A Content-Security-Policy ships inside the HTML** (`<meta http-equiv>` — GitHub Pages can't set response headers). For the app: scripts, styles, images, workers, and the manifest come only from this origin (plus `data:`/`blob:` for the embedded icons, and `file:` so copies opened from disk keep working). `object-src`, `base-uri`, and `form-action` are `'none'`.
- **`connect-src` allows same-origin plus `https:`** — deliberately: the **user-initiated `?file=` / share-link remote load is the single outbound path the product has**. Websocket (`ws:`/`wss:`) requests, a classic exfiltration channel, are blocked, and so are `http:` and `data:` fetches.
- **`frame-src` stays open on purpose** so the iframe workspace can display the sites in your queue. Embedded pages are governed by their own policies, not this one, so **iframe mode is unaffected** — verified live: framing a real site returned `200 (Document)` with no CSP violation.
- **`referrer: no-referrer`** on both pages, so deep-link URLs (which can carry file URLs and identifiers) never leak through `Referer` headers to framed or fetched sites.
- **The sales page is stricter still:** `default-src 'none'`, with only its own inline redirect and same-origin images permitted. It loads no external scripts, styles, fonts, or frames and cannot phone home.

Because nothing external is left to fetch, a plain `file://` copy of the app (or a copy on an internal share) works offline. Registry-style install isn't required for any of this.

## Repository layout

```
index.html          # sales/landing page (SEO + AEO optimized) — the Pages root
app.html            # the application itself (single-file SPA)
sw.js               # service worker — offline shell; bump VERSION to invalidate caches
assets/             # logo system — SVG source of truth + generated PNG icons
  logo.svg          #   master: circular grey stone, engraved dark checkmark
  logo-light.svg    #   light-theme variant / logo-dark.svg: dark-theme variant
  build-icons.js    #   regenerates all PNGs from the master (node assets/build-icons.js)
  build-standalone.js  #  regenerates turnstone-standalone.html (node assets/build-standalone.js)
icon-192/512.png    # PWA icons (generated — do not hand-edit)
sample-links.csv    # demo queue (CSV) used by the deep-link examples
sample-links.xlsx   # demo queue (XLSX)
sample-links.tsv    # the same queue in every other supported shape — handy for
sample-links.json   #   checking that each importer lands 10 cards with the same
sample-links.html   #   columns (name/URL/status/notes) and 3 already complete
sample-links.xml
turnstone-standalone.html  # BETA single-file build — the whole app in one document (generated)
versions.html       # versions & downloads page (bookmarklet drag-install links, edition picker)
versions.js         #   the script behind it — fetches the bookmarklet payloads so links/sizes can't drift
vendor/             # vendored libraries — no CDN at runtime (PapaParse, SheetJS)
ports/              # other editions of Turnstone (see ports/README.md)
  bookmarklet/      #   built: composes the app in an overlay on any page — no libs, no network
  extension/        #   built: Chrome MV3 side panel; no iframes — card selection switches real tabs
  tauri/            #   native desktop shell; full web experience incl. iframes, no CORS wall
agents.md           # AI-developer rules (mirrors PRD §4)
PRD-Turnstone.md    # master product document
todo.md             # task tracker + future-state plans
history.md          # build log
testing-notes.md    # test files and the manual production test plan
ports/README.md     # how the ports relate, how they are built and what each one costs
```

## Roadmap: other versions & ports

The web app is the canonical core; these ports (built under [`ports/`](ports/README.md)) are **generated from it** rather than forking it — each one is a build script that patches `app.html`'s seams and asserts every anchor, so a port cannot silently drift from the app:

- **Bookmarklet — built.** One click on any page composes the whole app there, in a shadow-DOM overlay: parsing, cards, statuses/notes, link modes, exports. **No hosted file, no network and no libraries** — three variants split by parser weight (`csv` ~142 KB, `core` ~152 KB with a dependency-free XLSX reader, `full` ~1.09 MB with vendored PapaParse + SheetJS for workbook writing). Works on strict-CSP pages without injecting a single script into the page, leaves the host page's globals and storage alone, and is session-only by design with **Copy state / Restore state** to carry a queue. Install by dragging from the [**versions & downloads page**](https://spuds0588.github.io/Turnstone/versions.html) (or [`ports/bookmarklet/dist/install.html`](ports/bookmarklet/dist/install.html)); see [`ports/bookmarklet/README.md`](ports/bookmarklet/README.md).
- **Chrome extension (MV3) — built.** The queue lives in Chrome's **Side Panel** with no iframe workflow at all: links open as real browser tabs, and **selecting a card switches to that card's tab** rather than reloading it (a closed tab is forgotten, so the next click opens a fresh one). The toolbar **badge** carries the remaining count, **right-click any link → “Add link to Turnstone”** appends it to the open queue (or starts one, or waits in `chrome.storage` if the panel is shut), exports go through `chrome.downloads`, and queue/presets/open file persist per browser in IndexedDB. `ports/extension/dist/` loads unpacked (Chromium 114+); regenerate with `node ports/extension/build.js`, which fails rather than emit a panel that has drifted from `app.html`. Verified under the extension page CSP with no inline script, and — for the tab/badge/download/context-menu behaviour that only exists inside an extension — against a mock of the extension APIs. See [`ports/extension/README.md`](ports/extension/README.md) and the [versions page](https://spuds0588.github.io/Turnstone/versions.html).
- **Tauri desktop app** — the **full web experience including the tabbed iframe workspace**, with the CORS / `X-Frame-Options` wall gone: sites that refuse iframing on the web load natively. Silent filesystem write-back on every OS, system tray, auto-update, tiny bundle.
- **Bundled single-file HTML** — `turnstone-standalone.html` (**beta, built**): one document holding the whole app (shell + vendored libraries + logo art inlined) for `file://` use, USB sticks, internal shares, and machines where nothing can be installed. No server, no CDN, no checkout — since the app already makes zero external requests, this build is genuinely self-contained. Regenerate with `node assets/build-standalone.js`; the script fails loudly if a `vendor/` or `assets/` reference survives. A CSV-only variant (no binary parser) is still to come.
- Shared prerequisite (revised): a DOM-free `core.js` was the original plan — parsing, matrix analysis, presets, persistence extracted from `app.html` for every port to consume. Two ports later, the **generator** approach has won instead: each port's `build.js` extracts and patches `app.html` directly and asserts every anchor, which keeps the port provably in step with the app and costs one script instead of a refactor of the app's core. No `core.js` until a port needs one; the reasoning is in [`ports/README.md`](ports/README.md).
- Further future state (see [`todo.md`](todo.md)): a **web MCP server** so AI agents can set up the workspace for their users (load the queue, apply presets, pick the open mode) or take over and work it on request — plus embedded **phone / SMS / mail hand-off layers**, native CORS bypass, and Google Drive / OneDrive sync.

## Docs

- `PRD-Turnstone.md` — master document (§4 = agent rules, mirrored in `agents.md`)
- `todo.md` — task tracker + future-state plans
- `history.md` — build log (v0.1 MVP → v0.8 vendored dependencies + data-call-out lockdown)
- `testing-notes.md` — test files and the manual production test plan
- `ports/README.md` — how the ports relate, how each is generated, and how it is verified

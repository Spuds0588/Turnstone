# Turnstone

A zero-server, browser-based workspace that transforms a list of URLs — CSV, TSV, XLSX, DOCX, Markdown, JSON, HTML tables, XML feeds — into a modern task queue: open each link in tabbed panes, track status and notes per task, and write everything back to the file — all client-side, no backend, no signup.

**▶ Sales page & screenshots: <https://spuds0588.github.io/Turnstone/>**

**▶ Launch the app: <https://spuds0588.github.io/Turnstone/app.html>**

**▶ Not sure which edition you want? <https://spuds0588.github.io/Turnstone/versions.html>** — one screen that maps each situation (locked-down machine, air-gapped network, browser that cannot write to your file, a site you cannot leave, Firefox) to the edition that handles it. The short version: **start with the [web app](https://spuds0588.github.io/Turnstone/web-app.html)**; the other three exist for when it does not fit — the [standalone build](https://spuds0588.github.io/Turnstone/standalone.html) (one file, no network), the [bookmarklet](https://spuds0588.github.io/Turnstone/bookmarklet.html) (no install at all), and the [Chrome extension](https://spuds0588.github.io/Turnstone/extension.html) (a side panel that drives real browser tabs).

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
| **Word documents** | `.docx` | Read with **no library at all**: a `.docx` is a ZIP, so Turnstone walks the container with the browser's own `DecompressionStream` and reads `word/document.xml`. The first table becomes the matrix (cell text is its runs joined, so a value Word split across two runs still arrives whole); a document with no table falls back to one row per paragraph, split on tabs. Detected from the container's own member list, so a Word file renamed `.xlsx` still opens as Word. Legacy `.doc` (Word 97-2003) is recognised and refused with a reason. |
| **Markdown** | `.md` `.markdown` `.mdown` `.mkd` | Read with no library (markdown is text). Three shapes: **GitHub-style task lists** (`- [ ] Task — https://… — note`), **pipe tables**, and **lists of links**. A task list is already a four-column table, so the checkbox becomes the card's status, the text before the link becomes its name and the text after it becomes the note — the matrix comes out shaped exactly like the CSV fixture's. Fenced code blocks are ignored, prose links outside a list are ignored, and `mailto:`/`tel:`/`sms:` targets keep just their value so the layer handoff still works. One-way import: a `.md` file is a document, so Turnstone reads it and never rewrites it. |
| **Email** | `.eml` `.mht` `.mhtml` | A queue very often arrives as a forward, and it arrives in two shapes, both handled. **A table in the body**: the MIME container is walked properly — nested `multipart/alternative` inside `multipart/mixed`, folded headers, `base64`, `quoted-printable`, and the declared charset decoded rather than assumed — and the HTML part is preferred over the plain-text copy of itself. **The sheet attached**: a part whose filename is a format we can read is handed to the ordinary detector, so a forwarded `approvals.csv` opens as a CSV and a forwarded workbook as a workbook. `.mht`/`.mhtml` are the same container, which is what a browser's *Save page as → Web Archive* produces — the only thing you get from a portal that has no export button. Prose is refused with a reason rather than read as a list: a plain-text body has to be rectangular to count. |
| **Pasted table** | *clipboard* | Copy rows out of a portal, a mail client or a spreadsheet and press <kbd>Ctrl</kbd>+<kbd>V</kbd> anywhere in Turnstone. The clipboard's `text/html` is used when it holds a real table (it keeps multi-line cells), and its tab-separated `text/plain` otherwise. Nothing loads without a confirmation showing what was understood. See *Loading a list*. |
| **PDF** | `.pdf` | *Not supported yet* — detected and reported with a clear message rather than silently mangled. Export the list to CSV/XLSX first. |

**Lists with no links at all are a supported input, not a broken one.** A large share of real admin queues carries no URL: the rows are ticket numbers, invoice IDs, case references or vendor names, the work happens inside one system, and each row is a *key* into it. Turnstone recognizes that shape (no cell in the file is link-shaped) and offers to **compose the link from the row**: name the portal address once, use `{Column}` anywhere that row's values belong, and every card gets its own URL. See *Portal lists*.

**Write-back is format-aware.** CSV, TSV and XLSX save silently back into the original file (Chromium, File System Access API). JSON, HTML, XML, PDF, DOCX, Markdown, and the legacy/macro/ODF workbooks are **one-way imports**: their edits live in browser storage until you Export CSV/XLSX. That's deliberate — rewriting a `.xls`/`.xlsm` container with XLSX bytes would drop macros and mislabel the file, a JSON/HTML/XML source can't round-trip status and notes without changing its shape, and a Word document has no cell to put a status in. Markdown is the interesting refusal: its task lists *could* round-trip status and notes losslessly, but the file is a document — rewriting it means reflowing prose, normalising bullets and choosing line endings — so it is read and never written. Doing it properly would take a line-level surgical edit that rewrites only the task lines and leaves every other byte alone.

## Desktop-only

Turnstone is **built for desktop**, and says so instead of pretending. A phone or tablet — a coarse, non-hovering primary pointer — gets a dismissible notice ("Turnstone is a desktop app") naming the pointer it found and the size of the window, with a *Continue anyway* escape hatch for a deliberately tiny screen. The reason is not the layout: file picking, drag-and-drop, in-place save-back and the multi-column workspace all assume a real pointer and a real window, so a phone would get a workspace that silently does not work. **Touch laptops keep a fine primary pointer and pass**, the extension's side panel is a desktop window and passes, and a merely narrow desktop window passes too — the layout is designed to work narrow.

## Loading a list

| Method | How |
| --- | --- |
| **Drop a file** | Drag it onto the app — the whole window is the target, not just the dashed zone — and it is read and parsed there. Dropping also works with a queue already open, and the browser can never navigate away to a dropped file. |
| **Pick a file** | Click the drop zone (or **☰ → Open file…**). Chromium users get silent write-back via the File System Access API; elsewhere it falls back to `<input type=file>` + browser-storage snapshots. A dropped file normally falls back to browser storage, since a drop carries only a read handle — use the picker when you want live write-back. |
| **Remote URL** | Paste any public link-list URL in the welcome panel (host must allow CORS). GitHub `raw.` links work great. |
| **`?file=` deep link** | `app.html?file=<encoded url>` (alias: `?url=`). Format is detected from the file's content, not just the extension. Add `&open=1` to auto-open the first task in a workspace tab. The example links above use this repo's own `sample-links.csv` / `sample-links.xlsx` as the remote source. |
| **Recent files** | The welcome panel lists your 5 most recent files — remote URLs re-fetch with one click. |
| **Paste a table** | Copy rows anywhere — a portal list view, a mail client, Excel/Sheets, a PDF viewer — and press <kbd>Ctrl</kbd>+<kbd>V</kbd> (<kbd>⌘V</kbd>) anywhere in the app. A confirmation shows the rows it understood and how many there are before anything is replaced; the copy path prefers the clipboard's real HTML table when there is one, because that keeps multi-line cells intact. Pasting into a text field stays typing, and so does pasting a paragraph. **☰ → Paste a list…** reads the clipboard directly where the browser permits it and tells you to press Ctrl+V where it does not. |
| **`?link=` portal template** | For a queue whose rows are keys rather than addresses: `app.html?file=queue.csv&link=https://portal.example.com/incident/{Ticket ID}`. The template is also remembered for that column layout, so the next load needs no parameter. |
| **A workspace link** | `app.html#zdata=…&sum=…` — the list itself, inside the URL. Nothing is fetched, so it opens from a link you were sent, an agent built, or your own ☰ → *Copy share link*. See *Workspace links* below. |
| **Demo / test data** | **Load demo list**, or the bundled `sample-links.*` fixtures via the test buttons and the deep links. The `sample-portal-*`, `sample-invoice-approvals.xlsx`, `sample-vendor-onboarding.csv`, `sample-compliance-renewals.csv`, `sample-meeting-actions.md` and `sample-*email.eml` fixtures are the real-world counterparts — see *Real-world examples* below. |

The 🔗 **Link** menu item copies a shareable `?file=` deep link that reopens the exact same dataset — statuses ride along via browser storage on the same machine.

## Portal lists — work that lives behind one URL

Most queue exports from a real system contain **no link at all**. The rows are `INC0041821`, `INV-88231`, or a vendor name; the portal is the same page every time; the key to a row is a column value, not an address. Turnstone detects that shape — *not one cell in the file is link-shaped* — and offers the thing that is actually missing:

- **A portal address, typed once.** `{Ticket}` is replaced with that row's value and percent-encoded, which is what a path segment or a query value needs. `{Column|raw}` splices a value verbatim for the rare template that rebuilds a path the value already spells out, and `{0}` addresses a column by position so a headerless queue still works. A template with **no placeholders at all** is the literal "all the work is in one portal" case: every card gets the same address, and the card is labelled with the portal host rather than repeating a long URL ten times.
- **Where you set it.** A prompt offered the first time a link-free list is loaded (declinable, and the decline is remembered), the **Portal link template** field in **☰ → Columns & presets…**, or `?link=` in the URL so a portal queue can be shared as one link. The field lists the file's own columns as clickable chips and previews the first card's composed URL live, so a template never has to be guessed at. It is remembered per header signature — the same keying as column presets and column flags — so next month's export of the same report composes its links again without being asked.
- **How it behaves.** A composed link is a page, so it behaves like one everywhere: a real browser tab, the ↗ glyph, `target="_blank"`, `?open=1`, auto-advance. A row that also carries its own URL still uses it if the template cannot compose one for that row.
- **One safety gate.** `applyUrlTemplate` returns a URL only when the result is `http(s)`, so no template can ever produce a `javascript:` or `data:` link. An empty value in a *path* produces no link at all — `/incident/` is a link to the wrong page — while an empty value in a *query* is harmless and keeps the link.

The canonical example is [`sample-portal-tickets.csv`](sample-portal-tickets.csv): ten service-desk rows whose only handle is the ticket number. `https://portal.example.com/incident/{Ticket}` turns it into a working queue.

## Workspace links — a whole list inside a URL

The one container with no file behind it. A workspace link carries the rows, the statuses and the notes in the URL itself, so one link opens a ready-to-work queue: no attachment, no shared drive, no upload, and nothing to host.

- **The list goes in the fragment.** Everything after `#` is never sent to a server, so the host — and everything between you and it — sees a request for `app.html` and nothing else. A list of client names or invoice numbers handed over this way stays in the browser, which is the whole reason the payload is not in the query string. It also escapes the request-line limit a query string is subject to: nginx's default 8 KB header buffer answers anything longer with a `414`, before any of our code runs.
- **Two encodings, for two callers.** `#data=` is the list as percent-encoded text — readable, debuggable, and the only one a person or a language model can write by hand. `#zdata=` is the same text raw-deflated and base64url-encoded, four to six times smaller, which is the difference between a link that survives a chat client and one that gets trimmed. `buildInlineLink` picks whichever is genuinely shorter, because on ten rows the deflate header costs more than it saves.
- **`?data=` is read as well**, for a tool that can only append a query string rather than set a fragment.
- **Every link we build carries a checksum** (`&sum=<length>.<fnv1a>`, both base 36). This is not ceremony: a deflate stream cut at a *block boundary* inflates without error, so a truncated link can decode to a shorter list that looks entirely normal. No other failure mode here behaves that way, and a silently short queue is the worst thing this app could hand someone — so a link whose checksum disagrees is refused, and says so.
- **Sizes.** A typical queue lands in a few hundred characters; a 4,000-row export still fits in about a fiftieth of its original size. Past 100 KB the link is built with a warning that chat and mail clients trim links this long; past 2 MB of list it is refused, because a URL is not a file. Building needs `CompressionStream` and opening needs `DecompressionStream` — both native, no dependency — and a browser without the former falls back to the readable encoding rather than failing.
- **Where you make one.** **☰ → Build a share link…** is a panel: paste or edit a list, watch it report what it read (format, rows, columns, whether a portal template will be needed), get the columns as chips, and copy the result. It starts from the list you have open. **☰ → Copy share link** is the one-click path, and a list with no address of its own — a local pick, a drop, a paste — now gets a link that carries it, with the ticks and notes entered so far, instead of the menu item being unavailable.

### For agents

The format is ordinary string work — raw-deflate, base64url, add a checksum — with no API, key or service involved, which means an agent that has just found or generated a list can hand over a link that opens as a workspace. `llms.txt` carries the specification, and [`workspace-link.html`](workspace-link.html) has worked recipes in Node, Python and the browser, plus the reasoning behind each choice.

One limit belongs here too, because it decides how a list has to travel: a **browser side panel cannot be driven by an agent**. Working the extension's panel would take its own Chrome with the extension loaded and a panel open — which a coding agent in a sandbox, in a headless browser, or on another machine does not have. Every edition reads a workspace link (the extension's arrives as a **paste** — its first screen or **☰ → Open a workspace link…** — because a side panel has no address bar), and every edition opens a data file, so the hand-off works everywhere; what an agent cannot do is work the queue for you. The versions page spells this out as a table. Nothing here is a Turnstone limitation — it is what a side panel is.

```js
// Node — standard library only
const zlib = require('zlib');
const b = Buffer.from(list, 'utf8');
let h = 0x811c9dc5; for (const x of b) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; }
const url = 'https://spuds0588.github.io/Turnstone/app.html'
  + '#zdata=' + zlib.deflateRawSync(b).toString('base64url')
  + '&sum=' + `${b.length.toString(36)}.${(h >>> 0).toString(36)}`;
```

Add `&link=https://portal.example.com/incident/{Ticket}` when the rows are keys into a portal rather than links of their own, and `&name=` to label the workspace. Opening the link needs no further setup.

## Working the list

- **Pick your experience** — the first time you load a file, Turnstone asks how to open links: **Tabs (iframes)** inside the app, a **new browser tab**, or a **popup window**. Change it anytime from the ☰ menu — many sites refuse to be iframed, so tab-handoff modes keep queues of those usable.
- **Click to open — no Open button.** Clicking a card's title expands it and opens its link in your chosen mode. The *open* half is an automation (**Open the link when a card is selected**, on by default), so somebody who would rather read a row's columns without a tab appearing can switch it off. The ↗ icon always forces a real browser tab either way.
- **One-click completion** — a ✓ **Complete** button per card; completed cards are hidden by default (toggle **Show completed**), and a completed card shows a subtle **↺ Incomplete** to flip it back. Three automations sit in the ☰ menu as **switches**, each with a sentence under it: **close the tab a task opened, once it is complete** (on by default), **open the link when a card is selected** (on by default), and **open the next task after completing one**. Together they make a hands-free queue; switched off, they make a reading view.
- **…except where the tab is not the row's.** A list with no links of its own — every row a key into one portal — gets the tab-closing switch **disabled with the reason**, because there the open tab *is* the system you are working in, and closing it on every tick would pull you out of it.
- **Sorting** — sort cards by any column (ascending/descending, numeric-aware); file order restores instantly.
- **Right sidebar** — searchable task cards with notes and per-card ↗ escape hatches. The ☰ menu — a **panel over the whole app**, not a dropdown, opened from the top of the sidebar — holds everything else: open/close, share link, open mode, the three automation switches, portal template, columns & presets, exports, install, and theme. Escape closes it and returns you to the button; the backdrop is clickable.
- **Copy buttons** — every value (name, URL, notes, and each extra column) has a ⧉ button sitting right after the text; hover a card to reveal them (always visible on touch screens).
- **Cards stay compact** — beyond the fixed name/URL/status/notes, only the **first 3 data columns** show by default; expanding reveals the rest.
- **Columns are yours to arrange (⚙ Columns)** — one row per column with a drag handle, a show/hide box, an editable name, and two dropdowns. Drag to reorder, untick to take a column off the cards, and **type over the name to rename it** — the name *is* the file's header cell, so the rename is carried into what you export, and everything remembered for that header (flags, editors, presets, the portal template's `{Column}` names) moves with it rather than being stranded. **Save the layout as a preset keyed to the file's header** and any list loaded later whose header matches that exact column order (case/whitespace-insensitive) **auto-applies it** — order, hidden columns, flags and editors included.
- **Cells you can edit (⚙ Columns → the second dropdown)** — read-only by default, because most columns are somebody else's data the queue only has to show. Give a column a control where you *do* update it: **Text**, **Long text**, **Dropdown**, or **Buttons**. A dropdown's or a button row's choices start from the column's own values (most common first, one click) and are yours to edit after that. Whatever you type is written into that row's cell — the same matrix a ✓ completion writes into — so it leaves with the file on export, is searchable at once, and needs no second store. Role columns (URL/name/status/notes) are marked *card feature* and already have a control of their own.
- **The link column is chosen from the values, not the headers.** Turnstone scores every column by what its cells actually *look like* — a URL, an `@address` or a phone number all count, weighted so a real link beats an address and an address beats a bare number — and picks the winner. A column called `Page`, `Resource` or nothing at all still lands correctly, and a notes column stuffed with pasted links can never outbid the real one (status/notes columns are skipped outright). The header text is used only to break an exact tie. If it ever guesses wrong, **⚙ Columns → the first dropdown on that column → URL** pins it, and the flag is remembered **per file** (keyed to the header row) and carried inside column presets. Address and phone columns are not lost either: any cell that is an email or a number is clickable on its own card row.
- **Email addresses and phone numbers are first-class links.** Turnstone embeds two zero-dependency libraries in `vendor/` — **MailLayer** (`mailto:` → a Gmail/Outlook/Yahoo composer popup) and **PhoneLayer** (`tel:`/`sms:` → a 40-provider picker: WhatsApp, Teams, Zoom Phone, RingCentral, Google Voice, Signal, Telegram, … or the OS handler). A list can therefore be a queue of *people* as easily as a queue of pages, and the layers follow the app's own theme. On phones both defer to the native OS handler, and in a build that ships without them the links still work — they just open the system mail app or dialler. Desktop is the target platform; see **Desktop-only** below.
- **Saving** — Chromium: silent write-back to the picked file. Everywhere else: automatic IndexedDB snapshots + Export CSV/XLSX, and a `beforeunload` guard when there are unexported changes.
- **Resume where you left off** — re-importing a file you exported or updated puts its **completed** and **notes** columns straight back into the cards, so the queue continues exactly where it stopped. The completed column is recognised by its name (`Status`, `Completed`, `Done`, `Finished`, `Checked`, `Reviewed`, `Processed`, …) as well as by its values (`complete`, `done`, `yes`, `y`, `true`, `1`, `x`, `✓`, `✔`, or a completion date); the notes column likewise (`Notes`, `Comment`, `Remark`, `Memo`). Completed cards stay hidden by default, so the first thing you see is the work that is left, and the load toast reports what came back: `Loaded 10 tasks from queue-turnstone.csv — resumed 5 complete · 5 notes`.

## Real-world examples

The `sample-links.*` family is one list in eleven encodings — it answers *"does format X parse?"*. These answer the different question, *"does this work on a real queue?"*, and they are the shapes that recur across admin and back-office work. **Every fixture in this repo comes from one definition**, emitted by `node assets/make-fixtures.js`: the canonical queue is declared once and rendered into all eleven containers, and the workflow lists below are declared beside it. A fixture and what the tests expect of it therefore cannot drift apart — which is not a hypothetical: the xlsx, and both contact-list CSVs, had each quietly lost the Hacker News note every other container carried, and hand-kept files are how that happens.

| Fixture | The list | What it is for |
| --- | --- | --- |
| `sample-portal-tickets.csv` | Service-desk queue: `Ticket, Summary, Priority, Assignee, State` | No link anywhere — the portal case. The **title** column is `Summary` in the middle, not `Ticket` in front, and `State` is `Resolved`/`Closed`/`In Progress`/`Awaiting vendor`. |
| `sample-portal-triage.tsv` | The same work kept by hand, tab-separated, with an age column | Statuses people actually type; a numeric column that must not be mistaken for anything. |
| `sample-invoice-approvals.xlsx` | Accounts payable: `Invoice #, Vendor, Amount, Approver, Status, Due` | Money as **real numbers** — `12480.75` has seven digits and used to read as a phone number, which was enough on its own to stop the sheet being recognized as link-free. |
| `sample-vendor-onboarding.csv` | Vendor tracker with a **Portal Link** column *and* a contact column | A column of ten links has to outrank a column of ten addresses, or a vendor sheet's real link column is lost to its contact list. `Stage` is the status. |
| `sample-compliance-renewals.csv` | Renewals register: dates, owners, `Renewed`/`Booked`/`Verified` | Expiry dates are the point — a date must never be read as a value, an address or a number. |
| `sample-meeting-actions.md` | A Markdown action log with owners and target dates | The most common list of all. A task line keeps its owner and date intact inside the card title; the checkbox becomes the status. |
| `sample-inbox-digest.eml` | The canonical queue as a **quoted-printable HTML table in an email body** | That the message body is read, and that the HTML part wins over the plain-text copy of itself. |
| `sample-queue-email.eml` | A prose forward (*"the queue is attached"*) with a **base64 `approvals.csv` attached** | That the payload is found: the attachment is handed to the ordinary CSV reader. |
| `sample-saved-queue.mht` | A page kept from a portal that has no export button | `.mht` is the same MIME container, so one parser reads both. |

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

`turnstone-standalone.html` is the whole app in one ~1.22 MB document — the shell, PapaParse, SheetJS and the logo art, all inlined. Download it, double-click it, done: no server, no checkout, no install, no network. It is the build for **USB sticks, internal shares, and air-gapped or locked-down machines**, and for anyone who would rather keep a single file than trust a URL.

- **Build it:** `node assets/build-standalone.js` (add `--check` to fail when the artifact has gone stale relative to `app.html`, `--out <path>` to write elsewhere).
- **What it inlines:** both `vendor/` libraries and both logo SVGs. Icons were already data URIs inside `app.html`.
- **Mislabelled builds cannot ship:** the script asserts that no `assets/` or `vendor/` reference survives *and* that `Papa.parse`, `sheet_to_json` and the inlined SVG data URIs are actually present.
- **Provenance** (build time + source commit) is stamped into a comment at the top of the file.
- **Beta caveats:** service-worker registration is switched off (there is no `sw.js` beside a copied file, and offline already works because everything is local), so there is no PWA install prompt. Remote `?file=` URLs are unreliable from `file://` origins — that path is CORS-constrained by the browser, not by Turnstone — while **local files, all input formats, cards, link modes, exports and browser-storage persistence work exactly as in the hosted app**. Windows to open a picked file depend on the File System Access API; where it is unavailable the app falls back to `<input type=file>` and browser storage. A **CSV-only variant** (no binary parser, for environments that cannot ship SheetJS at all) is not built yet — it needs real degradation logic, not just an omitted script tag.
- **Serve it if you like:** it also works unchanged from any plain web server or GitHub Pages, e.g. <https://spuds0588.github.io/Turnstone/turnstone-standalone.html>.

## Hardened deployment: zero data call-outs

Turnstone is built to run where external scripts and outbound requests are unacceptable (locked-down corporate machines, air-gapped networks, strict-CSP environments):

- **Every dependency is vendored.** `vendor/papaparse.min.js`, `vendor/xlsx.full.min.js`, `vendor/maillayer.js` and `vendor/phonelayer.js` are the exact upstream builds (the last two are ours), served from this repo. The app makes **no third-party requests while you work** — verified in-browser, where a full queue load produced only same-origin requests (shell, logos, the vendor scripts, the data file). The one documented exception is cosmetic and blocked by the app's own policy: MailLayer's provider picker decorates its Gmail/Outlook buttons with icons from `upload.wikimedia.org`, and `img-src 'self'` refuses them, so those two buttons show their text label without the logo. Nothing is fetched; the picker works.
- **DOCX costs nothing to ship.** Because Word files are unpacked with the browser's own `DecompressionStream`, a build with no SheetJS still reads them — including the zero-library `core` bookmarklet. Where a browser lacks that API the format is refused by name ("this browser cannot unpack DOCX") instead of failing on the first drop, and the welcome panel says so up front.
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
  make-fixtures.js     #  regenerates EVERY sample fixture (node assets/make-fixtures.js)
                       #    `--check` fails if the working tree has drifted; `--list` writes nothing
  build-site.js        #  writes sitemap.xml + robots.txt from the pages on disk, and then checks
                       #    every agent-facing link: canonicals, markdown twins, llms.txt, og:image.
                       #    Also that each page's structured data says what the page says, and that
                       #    index.html stays inside its 1,000-word prose budget. (`--check` for CI;
                       #    test/run.js imports these same checks rather than restating them.)
  build-og-image.js    #  regenerates assets/og-image.png from the logo (node assets/build-og-image.js)
  lib/minizip.js       #  the hand-written ZIP writer the fixture generator uses
icon-192/512.png    # PWA icons (generated — do not hand-edit)
sample-links.csv    # demo queue (CSV) used by the deep-link examples
sample-links.xlsx   # demo queue (XLSX)
sample-links.tsv    # the same queue in every other supported shape — handy for
sample-links.json   #   checking that each importer lands 10 cards with the same
sample-links.html   #   columns (name/URL/status/notes) and 3 already complete
sample-links.xml
sample-links.docx   # the same queue as a real Word table (generated — see assets/make-fixtures.js)
sample-links.md     # the same queue as a GitHub-style task list
sample-links-table.md  # …and as a pipe table (the two markdown shapes differ)
sample-links-email.csv # the same queue as an address list — the link column IS the address
sample-links-phone.csv # …and as a call list — the link column IS the number
sample-portal-*.csv/tsv  # queues with NO link at all — rows worked inside one portal
sample-invoice-approvals.xlsx / sample-vendor-onboarding.csv /
sample-compliance-renewals.csv / sample-meeting-actions.md
                     #   the real-world workflow family (see assets/make-fixtures.js)
sample-inbox-digest.eml / sample-queue-email.eml / sample-saved-queue.mht
                     #   a queue as an email body, as an attachment, and as a saved page
test/               # the three suites every edition is checked against (see test/README.md)
turnstone-standalone.html  # BETA single-file build — the whole app in one document (generated)
llms.txt            # the agent entry point: what Turnstone is, and the workspace-link format
index.html.md       # Markdown twins of the two pages an agent is most likely to want —
workspace-link.html.md  #   served beside the HTML, advertised with rel="alternate"
sitemap.xml         # generated (see assets/build-site.js)
robots.txt          # generated; names the AI crawlers explicitly rather than leaving them to *
assets/og-image.png # generated 1200×630 social card, for when a link is pasted into a chat app
versions.html       # "which version?" — pick an edition by what you are up against
web-app.html        # one page per edition, reachable from versions.html:
standalone.html     #   the offline single-file build
bookmarklet.html    #   the bookmarklet (three drag-install variants)
extension.html      #   the Chrome MV3 side panel
workspace-link.html #   the list-in-a-URL format, with the real builder embedded to try
site.css            #   shared chrome for the guide pages (index.html keeps its own: strict CSP);
                    #     the top bar is deliberately three items — Home, All versions, Launch app —
                    #     because the editions are reached through versions.html (and every footer)
site.js             #   fills in real sizes/versions read off the artifacts, so no page can quote a stale number
bookmarklet.js      #   builds the drag-to-install anchors from ports/bookmarklet/dist/
vendor/             # vendored libraries — no CDN at runtime (PapaParse, SheetJS)
ports/              # other editions of Turnstone (see ports/README.md)
  bookmarklet/      #   built: composes the app in an overlay on any page — no libs, no network
  extension/        #   built: Chrome MV3 side panel; no iframes — card selection switches real tabs
  tauri/            #   native desktop shell; full web experience incl. iframes, no CORS wall
agents.md           # AI-developer rules — the live copy, deliberately not mirrored anywhere
.gitignore          # planning documents (PRD-*.md) and tool scratch stay local, not published
todo.md             # task tracker + future-state plans
history.md          # build log
testing-notes.md    # what each edition is verified against, and the manual production test plan
test/README.md      # how to run the three suites, and what "production" means per edition
ports/README.md     # how the ports relate, how they are built and what each one costs
```

## Roadmap: other versions & ports

The web app is the canonical core; these ports (built under [`ports/`](ports/README.md)) are **generated from it** rather than forking it — each one is a build script that patches `app.html`'s seams and asserts every anchor, so a port cannot silently drift from the app:

- **Bookmarklet — built.** One click on any page composes the whole app there, in a shadow-DOM overlay: parsing, cards, statuses/notes, link modes, exports. **No hosted file, no network and no libraries** — three variants split by parser weight (`csv` ~260 KB, `core` ~270 KB with dependency-free XLSX, DOCX and Markdown readers, `full` ~1.18 MB with vendored PapaParse + SheetJS for workbook writing). Works on strict-CSP pages without injecting a single script into the page, leaves the host page's globals and storage alone, and is session-only by design with **Copy state / Restore state** to carry a queue. The embedded MailLayer/PhoneLayer pair is deliberately **not** in the bookmarklet: those layers build their modals in the *host* page's DOM, which is not ours to decorate, so there an address opens the system mail app and a number the system dialler — and the welcome panel says so. Install by dragging from the [**versions & downloads page**](https://spuds0588.github.io/Turnstone/versions.html) (or [`ports/bookmarklet/dist/install.html`](ports/bookmarklet/dist/install.html)); see [`ports/bookmarklet/README.md`](ports/bookmarklet/README.md).
- **Chrome extension (MV3) — built.** The queue lives in Chrome's **Side Panel** with no iframe workflow at all: links open as real browser tabs, and **selecting a card switches to that card's tab** rather than reloading it (a closed tab is forgotten, so the next click opens a fresh one). The toolbar **badge** carries the remaining count, **right-click any link → “Add link to Turnstone”** appends it to the open queue (or starts one, or waits in `chrome.storage` if the panel is shut), exports go through `chrome.downloads`, and queue/presets/open file persist per browser in IndexedDB. `ports/extension/dist/` loads unpacked (Chromium 114+); regenerate with `node ports/extension/build.js`, which fails rather than emit a panel that has drifted from `app.html`. Verified under the extension page CSP with no inline script, and — for the tab/badge/download/context-menu behaviour that only exists inside an extension — against a mock of the extension APIs. See [`ports/extension/README.md`](ports/extension/README.md) and the [versions page](https://spuds0588.github.io/Turnstone/versions.html).
- **Tauri desktop app** — the **full web experience including the tabbed iframe workspace**, with the CORS / `X-Frame-Options` wall gone: sites that refuse iframing on the web load natively. Silent filesystem write-back on every OS, system tray, auto-update, tiny bundle.
- **Bundled single-file HTML** — `turnstone-standalone.html` (**beta, built**): one document holding the whole app (shell + vendored libraries + logo art inlined) for `file://` use, USB sticks, internal shares, and machines where nothing can be installed. No server, no CDN, no checkout — since the app already makes zero external requests, this build is genuinely self-contained. Regenerate with `node assets/build-standalone.js`; the script fails loudly if a `vendor/` or `assets/` reference survives. A CSV-only variant (no binary parser) is still to come.
- Shared prerequisite (revised): a DOM-free `core.js` was the original plan — parsing, matrix analysis, presets, persistence extracted from `app.html` for every port to consume. Two ports later, the **generator** approach has won instead: each port's `build.js` extracts and patches `app.html` directly and asserts every anchor, which keeps the port provably in step with the app and costs one script instead of a refactor of the app's core. No `core.js` until a port needs one; the reasoning is in [`ports/README.md`](ports/README.md).
- Further future state (see [`todo.md`](todo.md)): a **web MCP server** so AI agents can set up the workspace for their users (load the queue, apply presets, pick the open mode) or take over and work it on request — plus native CORS bypass and Google Drive / OneDrive sync. **OCR and a small local model were assessed in v0.13 and deliberately not added**: both are WebAssembly, and this app's own CSP refuses WebAssembly (`Refused to compile or instantiate WebAssembly module because 'unsafe-eval' is not an allowed source of script`), so either would cost the directive that makes the "no remote code, no eval" claim credible — for inputs that are rare here and that the paste path already handles exactly. The full reasoning is in [`todo.md`](todo.md). (The embedded **phone / SMS / mail hand-off layers** landed in v0.11 as MailLayer + PhoneLayer — see *Supported input formats* and `vendor/README.md`.)

## Docs

- **Planning documents are deliberately not published.** The original V1 specification and any successor live on disk and are ignored by [`.gitignore`](.gitignore); what this repository publishes about itself is the four files below, which is where the reasoning actually lives
- `todo.md` — task tracker + future-state plans
- `history.md` — build log, newest first: every decision *and* every reversal, with the measurements
  that forced them
- `testing-notes.md` — what each edition is verified against, and the manual production test plan
- [`test/`](test/README.md) — the three suites: `node test/run.js` and the two browser sweeps
- `agents.md` — the rules an agent editing this codebase is expected to follow
- `llms.txt` — the site as one file, for agents: what Turnstone is and the workspace-link format
- `ports/README.md` — how the ports relate, how each is generated, and how it is verified

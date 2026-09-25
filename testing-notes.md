# Turnstone — Test & Verification Notes

How this project is verified, what each edition is checked against, and the manual pass to run
when a change can only be judged by eye. The suites themselves are documented in
[`test/README.md`](test/README.md); this file is the map, and the manual plan at the bottom.

## The fixture family

Eleven files in the repo root carry **the same ten tasks, four columns and three completed
rows**, each in one of the supported containers. That shared target is the point: a format is
only "supported" when it lands a queue indistinguishable from the CSV's.

```
10 tasks · 4 columns · urlCol=1 nameCol=0 statusCol=2 notesCol=3 · 3 complete · 7 visible
```

| File | Shape | What it specifically exercises |
| --- | --- | --- |
| `sample-links.csv` | CSV | quoted name with embedded commas (`"Comma, Inc. Blog"`), a quoted note with commas **and** escaped double-quotes, pre-filled Status/Notes |
| `sample-links.tsv` | TSV | the same rows, tab-delimited |
| `sample-links.json` | JSON | array of objects, so the columns come from **keys**, not a header row |
| `sample-links.xml` | XML | repeated elements with per-item `<status>`/`<notes>` |
| `sample-links.html` | HTML | a real `<table>`, so the matrix comes through `DOMParser` |
| `sample-links.xlsx` | XLSX | a real workbook (DEFLATE + CRC32, no SheetJS involved in writing it), sheet `Links`, 11×4 |
| `sample-links.docx` | DOCX | a real Word table in a hand-written ZIP; one URL is split across two `<w:t>` runs. Byte-reproducible from the shared definition |
| `sample-links.md` | Markdown | GitHub-style task list: the checkbox becomes the status, the text around the link the name and the note. Fenced code and prose links outside the list must be ignored |
| `sample-links-table.md` | Markdown | a pipe table, the other markdown shape — a different code path in the same parser |
| `sample-links-email.csv` | CSV | the link column holds **addresses**, so the card link has to resolve to `mailto:` and hand the click to MailLayer |
| `sample-links-phone.csv` | CSV | the link column holds **numbers** in six formats, so the card link has to resolve to `tel:` and hand the click to PhoneLayer |

### The workflow family — the lists this work actually arrives as

The eleven files above are one list in eleven encodings: they answer *does format X parse?*. The
next nine answer *does this work on a real queue?*, which is a different question and the one
that found the bugs. Every fixture named on this page comes from one definition, emitted by
`node assets/make-fixtures.js` — the canonical queue is declared once and rendered into all eleven
containers, so a container cannot drift from the others.

| File | Shape | What it specifically exercises |
| --- | --- | --- |
| `sample-portal-tickets.csv` | CSV, **no link at all** | a service-desk export. `Summary` is the title column and comes *second*, after a `Ticket` identifier; `State` holds `Resolved`/`Closed`/`In Progress`/`Awaiting vendor`, so "handled" depends on terminal-state words a system chose, not on a tick |
| `sample-portal-triage.tsv` | TSV, **no link at all** | the same work kept by hand: different title word (`Request`), a `Queue` column, lower-case `In progress`, and an `Age (days)` numeric column |
| `sample-invoice-approvals.xlsx` | XLSX, **no link at all** | real numbers in an `Amount` column next to a `Due` date — `12480.75` is 7 digits and used to read as a phone number, which alone stopped the sheet being recognized as link-free |
| `sample-vendor-onboarding.csv` | CSV **with** links | a `Onboarding Link` column *and* a `Contact` column of addresses: ten links must outrank ten addresses. Status is `Stage` (`Approved`, `Contract sent`, `KYC in review`, `Rejected`) |
| `sample-compliance-renewals.csv` | CSV with links | expiry dates as the thing the work hangs off; a date must never read as a value, a link or a number |
| `sample-meeting-actions.md` | Markdown | an action log with owners and target dates — the owner and the date stay intact inside the card title, the checkbox becomes the status |
| `sample-inbox-digest.eml` | multipart/alternative, **quoted-printable** | the canonical queue as a HTML table in a body, with a degraded plain-text copy beside it that the parser must prefer the HTML over |
| `sample-queue-email.eml` | multipart/mixed, prose body | the real payload is a **base64 `approvals.csv` attachment**; the attachment has to be handed to the ordinary CSV reader, and the prose body must not be read as a list |
| `sample-saved-queue.mht` | multipart/related | a page kept from a system with no export button — the same MIME container as `.eml` |

Five of these also land the **shared target** exactly (10 tasks / 3 handled / 7 visible): the two
portal queues, both emails and the `.mht`. The other four assert their own shapes instead.

**The inconsistency this family used to carry is gone, and how it went is worth knowing.**
`sample-links.xlsx` predated the other containers and its Hacker News note was missing the
`— use ↗` they all carried — and the generator that now emits every fixture from one definition
found a *second* instance nobody had noticed: `sample-links-email.csv` and
`sample-links-phone.csv`, the two files written most recently. That is the argument in one
example. Drift is not a risk of hand-kept files, it is what they do, and it shows up first in
the newest ones. `node assets/make-fixtures.js --check` now fails if the tree and the definition
disagree.

## The three suites

| Suite | Needs | Verifies |
| --- | --- | --- |
| `node test/run.js` | Node only | the format layer sliced out of the real `app.html`: every `FORMAT_INFO` row and alias, the shared target for every DOM-free fixture, generated `xls`/`xlsm`/`xlsb`/`ods`, the DOCX container (ZIP walk + inflate), **the workflow family's column roles**, **portal template composition** (encoding, `|raw`, positions, the empty-path rule, the `http(s)`-only gate), **email MIME** (boundary walking, folded headers, base64, quoted-printable, charsets, attachment recursion, prose refusal), **workspace-link encoding** (base64url, raw deflate, the checksum, the size guards, every fixture carried in a URL and returned byte-for-byte, and the truncation sweep that proves no cut of a compressed link loads a different list quietly), the sniffer's "must not steal" cases including the email ones, both markdown shapes and traps, the value predicates, link-column scoring, the refusals — plus the vendored-library hashes, that each port ships identical bytes, that no artifact loads from a CDN, and **the site itself**: crawl files, canonicals, structured data, markdown twins and every link in `llms.txt` — plus that every marked-up answer appears **on the page**, every question the page asks is **in the markup**, and the landing page is inside its **1,000-word prose budget** |
| `test/fixtures.html` | a browser + the repo served | every fixture through the **real app in an iframe**, asserting the app's own rendered counters and cards; the workflow queues for their own shapes; **portal lists** driven through the real prompt, chips and preview, including that the choice is remembered and a decline is not forgotten; **email bodies and `.mht`** (which need `DOMParser`); **paste**, through a real `ClipboardEvent`; **the ☰ menu and its three automation switches**, each asserted through what it *does* — a card click that opens nothing with auto-open off, a completed row's tab closing while another row's stays, auto-advance closing one tab and opening the next, and a portal list getting the switch **disabled with the reason** (11 checks, the panel editions taking the branch where a real browser tab is not the panel's to close); **the column panel** — a row per column, the four card features marked and their editor dropdowns off, position numbers counting the two columns a card actually orders, **Dropdown** seeding its choices from the column's own values (most common first), an edit landing in the row so that `buildExportMatrix()` carries it, **Buttons** rendering the same choices as pills with the row's value pressed, a **long text** cell that takes a real edit without the card being rebuilt under the caret, a **rename** reaching the card, the sort list and the header cell an export writes *and* re-keying the flags/editors/preset stored under the old signature, a hidden column leaving the data alone, a drag reordering the cards, and **Reset columns** deleting what was stored rather than merely forgetting it (10 checks); **workspace links** — a compressed payload and a plain one, a portal template beside them, a bad checksum and a truncated payload both refused without dead-ending, the `?data=` query form, and a second link delivered by changing the fragment of an already-open page; then both embedded layers: that a mailto:/tel: card link opens MailLayer's / PhoneLayer's picker and that the click was intercepted |
| `test/bookmarklet.html` | a browser + the repo served | all three payload variants on a page they do not own: which formats each reads, that a workbook in the `csv` variant is refused *by name*, that the host page's own `XLSX`/`Papa` survive, that closing restores the page byte-for-byte, and that a second run refuses |

Run all three before calling any change to the format layer, the layers, or the builds done.

## What each edition is verified against

`app.html` is the source; every other edition is generated from it, so the question is never
"does the app work" but "does *this artifact* still work where a user gets it".

| Edition | Verified as | Notes |
| --- | --- | --- |
| Web app (`app.html`) | served from the repo root | the canonical sweep; also booted under its own `Content-Security-Policy` meta |
| `turnstone-standalone.html` | **alone in an empty directory**, served | proves genuinely offline: zero resource requests, no service-worker registration (`sw.js` 404s there and the log says it was skipped), every fixture + both layers working |
| Extension (`ports/extension/dist/`) | `panel-test.html` (mock chrome APIs) and `panel-csp.html` (extension CSP restated as a meta tag) | plus the real install check in `ports/extension/README.md` |
| Bookmarklet (`ports/bookmarklet/dist/`) | the decoded `javascript:` payload, `eval`ed into an empty same-origin page | three variants, each against exactly the formats its capability notice claims |

## Manual pass (things a script cannot judge)

1. Serve the repo: `python3 -m http.server 8151 --bind 127.0.0.1 --directory .`, then open
   `app.html`.
2. **Look at it.** A card should read as a card: name, link, status button, one line per data
   column. Both themes, and a 380 px window (the extension's side-panel width) — the layout is
   built to work narrow and the mobile gate must *not* fire for a narrow desktop window.
3. Drop each fixture onto the window; expect ten cards, three hidden as complete, and the toast
   naming the file and what was resumed.
4. Click an address and a number (in `sample-links-email.csv` / `sample-links-phone.csv`) and
   confirm the pickers look right in **both** themes — the `tel:` anchors carry PhoneLayer's
   per-trigger theme and accent. Expect MailLayer's Gmail/Outlook buttons to show **text only**:
   its icons come from `upload.wikimedia.org` and `img-src 'self'` refuses them. That is the
   intended trade, not a bug — do not widen the policy for it.
5. `Open File…` a CSV in Chromium, change a status and a note, confirm the indicator goes
   `● unsaved changes` → `✓ saved to file`, then reopen the file and confirm the round-trip.
6. Export CSV and XLSX, drop each back in, and confirm the same counts and a
   `resumed N complete · M notes` toast.
7. `Load test XLSX` (web app), and in every edition load a workbook in a build that ships no
   workbook reader — the refusal must name the reason rather than render an empty queue.
8. Check the network log stays **entirely same-origin** on boot and after a file load.
9. Load `sample-portal-tickets.csv` and read the prompt that appears: its chips should list the
   file's own columns, and typing `https://portal.example.com/incident/{Ticket}` should show the
   first card's URL before you apply it. Apply it, then reload — the links should come back with
   nothing asked. Then decline the prompt on a fresh profile and confirm it stays quiet.
10. Load `sample-inbox-digest.eml` and `sample-queue-email.eml`; the second should say it took the
    list from an attachment. Then copy a table out of a portal and paste it — a confirmation
    should appear with a preview, and pasting a *sentence* should leave the queue alone.
11. In fallback mode (drop a file rather than picking one), change something, wait a second, and
    **reload**. There must be no "unexported changes" confirm: a snapshot save makes the list
    saved, and a guard that fires on saved work is one people learn to click through. A build
    with no durable storage (the bookmarklet) must still warn.

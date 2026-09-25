# `test/` — the three suites

Turnstone has no test framework, no `package.json` and no dependencies, and it does not want
them. What it has instead is three scripts that run against **the real artifacts** rather than
against a copy, because this project's characteristic failure is not a broken function — it is
an *anchor moving under a generator*, or a build that quietly stops shipping something.

| Suite | Runs in | Covers |
| --- | --- | --- |
| `node test/run.js` | Node, no browser | the format layer, the DOCX container, email MIME, portal templates, the vendored libraries, the samples |
| `test/fixtures.html` | a browser, served | every supported format end to end in a chosen edition, the real-world workflow queues, portal lists, email, paste, plus both embedded layers |
| `test/bookmarklet.html` | a browser, served | all three bookmarklet variants, mounted into a page they do not own |

```bash
node test/run.js                # everything, ~1 s
node test/run.js markdown       # one section (substring match)
node test/run.js fixtures docx  # (one filter only — run it twice for two)

# the browser sweeps need the repo served same-origin, so dist/ and the fixtures resolve
python3 -m http.server 8151 --bind 127.0.0.1 --directory .
# then:  http://127.0.0.1:8151/test/fixtures.html
#        http://127.0.0.1:8151/test/bookmarklet.html
```

Both browser pages write a one-line verdict into `#status`, set `document.title` to
`PASS`/`FAIL`, and leave every result in `window.__results` — so they are as readable from a
`preview_evaluate` call as they are by eye.

## What "production" means, per edition

The one thing the browser sweeps cannot do for the web app is prove the *shipped* files work
from the shipped location. So each edition is swept as the artifact a user actually gets, and
which artifact that is is a query parameter — the same page, pointed somewhere else.

| Edition | Under test | Invocation |
| --- | --- | --- |
| Web app | `app.html`, the canonical source | `test/fixtures.html` (defaults) |
| Standalone | `turnstone-standalone.html` **alone in a directory** | copy `test/fixtures.html`, the standalone and every `sample-links.*` into an empty folder, serve *that* folder, open `fixtures.html?app=turnstone-standalone.html&fixtures=./` |
| Extension | `ports/extension/dist/panel-test.html` (chrome-API mock) and `panel-csp.html` (the real extension CSP) | `?app=../../ports/extension/dist/panel-test.html&fixtures=../` — then the same with `panel-csp.html`, which sweeps every format *and* both layer pickers under `script-src 'self'; object-src 'self'` |
| Bookmarklet | `ports/bookmarklet/dist/turnstone-bookmarklet-{csv,core,full}.txt`, decoded and `eval`ed | `test/bookmarklet.html` |
| Any edition without the layers | the same sweep, told so | add `&expectLayers=0` |

Two details are worth knowing before you trust a result:

- **The standalone must be swept from a bare directory, not from the repo.** Serving the repo
  root and opening `turnstone-standalone.html?` proves nothing about the offline build: every
  `vendor/` file it would have needed is sitting right there. Serve an empty folder containing
  only the standalone, `test/fixtures.html` and the fixtures, and confirm `sw.js` is a 404
  while the page still reports `Service worker skipped (standalone single-file build)`. Also
  serve it with `--directory`, never by `cd`ing first — a backgrounded server inherits the
  shell's cwd, which silently turns a bare-directory test back into a repo test.
- **A fixture is read in the realm that will parse it.** SheetJS decides "is this a ZIP?" with
  `instanceof ArrayBuffer`, which is false for an ArrayBuffer that crossed a frame boundary, so
  a workbook fetched in the harness and handed into the app's frame reads as 33 rows of
  `PK…` binary text — same bytes, same hash, wrong answer. Both sweeps fetch inside the frame
  they are testing, and `test/bookmarklet.html` builds its `File` objects there too. If you add
  a check, keep it that way.

## The target every fixture hits

One shape, asserted in all three suites, so a fixture cannot quietly become a different test:

```
10 tasks · 4 columns in CSV order · urlCol=1 nameCol=0 statusCol=2 notesCol=3 · 3 complete · 7 visible
```

Eleven fixtures land it today: CSV, TSV, JSON, XML, HTML, XLSX, DOCX, both Markdown shapes, and
the two contact lists whose link column is an address or a number rather than a page. The node
suite additionally generates `xls`/`xlsm`/`xlsb`/`ods` workbooks on the fly, so those containers
are covered without four more binaries in the repo root.

**Five more fixtures land the same target from a different question**, and they are worth
distinguishing because the checks on them are different in kind. `sample-portal-tickets.csv`,
`sample-portal-triage.tsv`, `sample-inbox-digest.eml`, `sample-queue-email.eml` and
`sample-saved-queue.mht` each carry ten rows of which three are handled, so the target still
applies — but what is asserted around it is that the queue is *recognized*: that the title
column is `Summary` in the middle rather than `Ticket` in front, that `State` is the status
column, and that a file with no link anywhere is understood as a portal list rather than a list
with a broken link column. The other workflow fixtures (`sample-invoice-approvals.xlsx`,
`sample-vendor-onboarding.csv`, `sample-compliance-renewals.csv`, `sample-meeting-actions.md`)
assert their own shapes for the same reason. Every fixture in the repo — these and the eleven
containers of the canonical queue — is generated from one definition by `node assets/make-fixtures.js`,
which is also why none of them can quietly lose a cell the way the xlsx and both contact-list CSVs
had. `node assets/make-fixtures.js --check` fails if the tree has drifted from that definition;
run it after touching a fixture by hand, or better, don't touch one by hand. The suite never asserts
fixture *bytes*, only their detection and the shared target, so a regenerated fixture is a
non-event for it.

## What each suite covers that the others cannot

| Section | In | Why not elsewhere |
| --- | --- | --- |
| Portal templates — substitution, encoding, `|raw`, positions, the `http(s)`-only gate | Node | pure string composition, no DOM |
| Email MIME — boundary walking, folding, base64, quoted-printable, charsets, attachment recursion | Node | no `DOMParser` needed for any of it |
| Email **HTML bodies** and `.mht` pages | browser | they go through `parseHtmlText` |
| The portal prompt, chips, live preview, remembering, declining | browser | it is interface, driven through the real fields |
| Paste — the confirmation, the `text/html` preference, and the pastes that must be refused | browser | it needs a real `ClipboardEvent` and `DataTransfer` |
| Workspace-link **encoding** — base64url, raw deflate, the checksum, the size guards, every fixture carried in a URL and returned byte-for-byte | Node | no DOM, and a truncation sweep over 19 cut points is exactly the kind of thing no human should run by hand |
| Workspace **links arriving** — the boot path, a portal template beside the payload, a bad checksum and a truncated payload, `?data=`, and a second link delivered by a fragment change | browser | it is a *navigation*, and the fragment case is the one that does not reload the page |
| The site — sitemap, robots, canonicals, structured data, markdown twins, `og:image`, and every link in `llms.txt` | Node | these are filesystem facts, and `assets/build-site.js` is imported rather than re‑implemented |
| Structured data **against the page it is on** — every marked-up answer appears on the page, every question the page asks is in the markup, every `HowTo` step says what the page says | Node | nothing renders JSON-LD, so prose and markup drifting apart is invisible in a browser and complete to a machine; the same script that writes the crawl files owns the check |
| The landing page's **prose budget** (1,000 words, no negotiation) | Node | a sales page grows one honest sentence at a time; the number is the only thing that ever pushed back |
| That the pages which explain agents say the true thing — an extension panel takes a file and cannot be driven | Node | a documented limitation that quietly disappears from a page is a regression no browser shows you |

Two note-worthy properties of the workspace-link tests. The payloads in the browser sweep are
built by **the harness**, not by the app, so the encoder and the decoder are independent
implementations — a round trip through one implementation only ever proves it agrees with
itself. And the Node suite attacks the format: a 4,000-row list is compressed and then cut at
nineteen points, asserting that not one cut yields a *different* list quietly. Anything less
would leave the one failure mode that looks entirely normal uncovered.

`test/run.js` also guards the things a format test cannot see: that every `FORMAT_INFO` entry
and every extension/content-type alias still resolves, that the write-back rule holds (CSV/TSV/
XLSX writable, every other format one-way), that the four vendored libraries still hash to what
`vendor/README.md` claims, that each port ships the same bytes, and that no artifact has grown
a CDN reference.

## What is deliberately not tested here

- **`node test/run.js` cannot reach HTML, XML or DOCX→matrix**: all three go through
  `DOMParser`. Those live in the browser sweep, and the split is on purpose rather than a gap.
- **Write-back to a real file handle.** The File System Access API needs a user gesture and a
  permission prompt; `readSessionMetaFor` / export round-trips are covered instead.
- **OCR and image input.** There is no OCR in any edition, by decision: it would need WebAssembly and this app's CSP refuses WebAssembly (the error is recorded in `history.md` and the reasoning in `todo.md`). A screenshot pasted in is therefore not list-shaped and is refused like any other prose — the browser sweep asserts that a paragraph paste opens no confirmation and leaves the loaded list untouched, which is the same code path an image takes.
- **Character-set decoding of high bytes, in Node.** Node's `windows-1252` decoder returns U+0092 where a browser returns U+2019 — the byte Outlook uses for a curly quote. The Node suite asserts the byte survives the round trip and never becomes a replacement character; the browser sweep asserts the character. Do not "fix" one of them to match the other.
- **A real `chrome://extensions` install.** The panel is swept through `panel-test.html`, which
  replaces the chrome APIs with a recording mock, and through `panel-csp.html`, which restates
  the extension's CSP as a meta tag because the browser applies the real one as a response
  header that no static server can produce. Both pass the full format sweep.

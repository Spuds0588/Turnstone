# history.md — Project Turnstone Build Log

## 2026-09-25 — The landing page says three things, and only three

**Request:** the hero and the sales pitch were too much; the message is a **“dumb” list in, a smart workspace out**, **no account**, and **all local**.

### The homepage had five arguments competing with one sentence

The hero's own statement of the product had drifted into a description of the *mechanism* — "cards with statuses and notes on one side, the pages on the other" — which is true, is in the screenshot directly below it, and is not the reason anyone reads on. The headline is now the transformation itself (`A “dumb” list in. / A smart workspace out.`), and the two facts that decide whether somebody tries it moved into the badge above it: **no account · nothing uploaded**. The subtitle carries only what is left — where the list comes from (a spreadsheet, a CSV, **or a link your agent hands you**), what it becomes, and where the ticks go — measured at two lines at 1280px rather than three.

Two things were deleted rather than reworded. The paragraph under the buttons offered "**Find your version** in a screen" — the same link, one line after the button that says it — so the button stayed and the sentence became the one thing it added: *or open a sample queue and watch it work.* And the lead value card restated the headline word for word; it is now **Whatever the list looks like**, which is the part the headline does not say.

The five cards were cut to one idea each, and the three the request named now lead: *No account, nobody to ask* (**🔒**), *All local — nothing is uploaded* (**💾**, and the card says the load-bearing sentence plainly: there is no server to upload to), and *Or let an agent hand you the list*. "It fits the tools you already use" survived as *The tools you already have* — it is a different claim from the rest (webmail and the web phone rather than a desktop app) and it is the one an admin actually notices in the first five minutes. Every card's body is now one or two sentences; the section went from ~190 words of card copy to ~120.

**Result: 979 → 915 words of visible prose, against a budget of 1,000** that fails the build rather than offering a number to raise. The trimming is the point, not a side effect — three sessions of adding features to this page had each added a paragraph, and the budget is the only thing that notices.

`index.html.md` — the twin an agent reads — was rewritten to match, because a Markdown file that describes a different homepage is worse than no Markdown file: `llms.txt` sends agents there for "what Turnstone is". The title tags were left as they are on purpose ("Turn any link spreadsheet into a streamlined workspace"): they are searched, not read as pitch, and "spreadsheet" and "link" are the terms people type.

Verified: `build-site.js` (link graph, structured-data parity, prose budget), four `--check`s and **432 Node assertions** green; 1280px and 375px both measured for horizontal overflow, which is how the last phone-width defect on this page was found.

## 2026-09-25 — The panel gets a door for a link, and the field nobody had wired

**Request, in two parts:** take the master/product document out of the repository and ignore it (it is planning material, not product); then keep going.

### 1. Planning documents are not published

The V1 specification is now `git rm --cached` — out of tracking, still on disk where planning happens — and a new `.gitignore` covers it plus any successor (`PRD-*.md`, `planning/`, `notes/`) and tool scratch (`.freebuff/`, editor directories, `.DS_Store`). The file says all of that above the rules, and deliberately does **not** grow into a second ignore-everything list: this repository commits its generated artifacts on purpose (the standalone build, the port payloads, the fixtures, the crawl files), because a single-file app and a drag-install bookmarklet only work if the bytes are in the repo. What is ignored is *planning*, which is a different category from *build output*.

README's Docs list and layout lost their references to it, and `agents.md` now says "the original specification (kept off this repository on purpose)" instead of pointing at a file the reader cannot open. The dozens of `PRD Task 4.1` comments in `app.html` stay: they are design anchors into a document that still exists locally, and renaming them would churn every artifact for no information.

### 2. The extension can be handed a link, and it found a dead button

A browser side panel has no address bar, so a `#zdata=` link had nowhere to arrive — which the previous session documented across four pages rather than fixed. Now there are two doors: the field on the panel's first screen, and **☰ → Open a workspace link…**, a dialog that works *while another list is already open*, which is the case that matters ("Sam sent me another queue" is exactly when one is).

Deciding whether a pasted string is a link or a file is the load-bearing part, and it is a rule rather than a guess, because a wrong answer is a `fetch` of a workspace link — which returns HTML or nothing:

1. A **`zdata` payload anywhere** is unambiguous: nothing else spells a URL parameter that way.
2. A payload in the **fragment** is unambiguous too, and for a reason worth writing down — a fragment is never sent to a server, so it *cannot* be file URL arguments. `outreach.csv#data=…` can only be about a handed-over list, on any host.
3. A **`?data=` in a query string** is genuinely ambiguous — plenty of file endpoints take `?data=…` — so it counts only on one of our own pages (same origin, path ending `.html` or the directory root). That is the tooling case, where something can only append a query.

Twenty assertions cover it in Node, including the negatives that matter: a plain `.csv` URL stays a file, and a `?data=` on somebody else's host does too. The dialog has no clipboard auto-read, on purpose: a permission prompt that appears because you opened a menu is a prompt people learn to dismiss.

**The bug underneath:** the welcome panel's URL field had *no handler at all*. The Load button and the Enter key were both dead — and nothing noticed, because every sweep drives files through the drop zone and text through a paste, and neither had ever typed into that row. Both are wired now, and the browser sweep covers all three arrivals (field + button, bare `#zdata=…` tail + Enter, and the ☰ dialog including a paste that is *not* a link being refused with a reason).

### 3. What rebuilding cost, and what caught it

Adding to `app.html` changes every artifact that inlines it, so all three builds were regenerated — and both port builds refused on their first run, which is exactly what their anchor assertions are for: the extension's *deep links* sentence and the bookmarklet's `?file=` help paragraph had each been reworded by the app-side change, and a build that patched by luck would have shipped a stale sentence or a payload that silently no longer matched. Each patch was rewritten to say something true for its own edition: the panel's copy now names the two paste doors, and the bookmarklet's paragraph is about a **shared link**, the one kind an overlay on somebody else's page can rely on because it needs nothing fetched.

The rebuild moved every size, and the no-JavaScript fallback check written two turns ago caught **all eight** stale numbers on the two pages that print one (`252 KB` → `260 KB`, `1.21 MB` → `1.22 MB`, `1.17 MB` → `1.18 MB`) before any of them reached a reader — the number a reader with JavaScript off and most crawlers actually see, and therefore the one nobody ever notices going stale. That check has now paid for itself twice in one session.

`sw.js` was deliberately **not** version-bumped, and that is a decision rather than an oversight: its fetch handler is network-first for navigations, so anyone online gets the newly deployed `app.html` on their first load, and the version constant exists to invalidate *old caches* when the precache **list** changes — not when a file already on it does. This change adds no new precached file; the dialog and the router live inside `app.html`.

| Check | Result |
| --- | --- |
| `node test/run.js` | **432 passed, 0 failed** (20 new: the link-or-file rule) |
| `test/fixtures.html` | **67 per edition** — `app.html`, the standalone *from a bare directory*, `panel-test.html`, `panel-csp.html` |
| `test/bookmarklet.html` | **81/81** — unchanged, re-run because the payload changed |
| `build-site.js --check`, the three build `--check`s, `make-fixtures.js --check` | all green |

## 2026-09-25 — Three items in the bar, the docs brought up to the code, and the first push

**Request, in three parts:** the top bar on the sales page carries too much — Home, versions and launch is the whole of it, with the editions *semi hidden* (reachable by the intended path rather than advertised); the Markdown in the repo has to be true; and the tested work goes to production.

### 1. The bar is three items, and now it is asserted

Home · All versions · **Launch app →**. The four edition pages are reached the way the page already sets up — hero → *Find your version* → the edition that fits — and every page's footer still lists all of them for anyone who would rather not walk the path. That is what "semi hidden" means here: not gone, not competing with the two things a visitor actually needs.

Applied site-wide rather than to the landing page alone, because a nav that changes shape between pages is worse than either version. The guide pages lose their own link from the bar with it — the page's `<h1>` and the `BreadcrumbList` already say where you are.

The rule is checked, not remembered: `build-site.js` reads each page's `<nav class="topnav">` and refuses anything whose `.link`/`.go` hrefs are not exactly `index.html versions.html app.html`. A top bar that lists every page of a site is a table of contents, and it grows back one "useful link" at a time.

### 2. The Markdown was not true, and the numbers were the worst of it

A grep for `KB`/`MB` across the repo's Markdown found the README quoting a **1.07 MB** standalone (it is 1.21 MB), a bookmarklet table from two releases ago (`~176 KB` / `~186 KB` / `~1.12 MB` against today's **252 KB / 261 KB / 1.17 MB**), the bookmarklet's own README repeating those same numbers, and the extension page quoting "13 files of its own" when the build says 15.

Worse than any of those: the **fallback text** on the guide pages — the size and version printed when JavaScript is off, which is what a reader without scripts and most crawlers actually see. `site.js` rewrites those numbers from `assets/sizes.json` on load, which is exactly why nobody notices the fallback going stale: it is invisible in a browser with scripts on, and it was a whole release behind. `build-site.js` now computes what `site.js` would print (same formatter, same 1024 thresholds) and fails if a page's fallback disagrees with the artifact — the *one* place where a stale number is both real and permanently invisible.

Two documentation files were also describing a different project. `agents.md` still said the app was a single `index.html` and listed CDN dependencies — the app is `app.html` and a CDN reference violates its own `default-src 'none'` policy, so an agent following that file would have written a policy violation. It is rewritten against the repository as it is: the file map, the generated-not-hand-edited rule, the CSP, the prose budget, the structured-data parity rule, the three suites, and the two things to push back on (iframe CORS, WebAssembly). `PRD-Turnstone.md` is now marked up front as **the frozen V1 specification**, naming the two places it would mislead a reader (`index.html`, CDN dependencies), and its §4 — which was a stale duplicate of the rules — now points at `agents.md` instead of contradicting it. README's Docs list and layout were corrected with them, and `workspace-link.html` was missing from the layout entirely.

### 3. Verification, then the first push to production

Everything below was run against the tree as committed: `node test/run.js` **411 passed, 0 failed**; `node assets/make-fixtures.js --check`; `assets/build-site.js --check` (crawl files, canonicals, structured data against the page, nav shape, size fallbacks, prose budget); and the three build `--check`s — standalone, bookmarklet, extension. The browser sweeps were re-run for the editions they cover, and the changed pages were checked at 1280px and 375px.

This is the first push of the entire v0.13/v0.14 line — workspace links, the portal lists, the fixture generator, the four editions' rebuilds, the site — to `main`, which is what GitHub Pages serves. Every earlier session ended with the work uncommitted by design; this one does not. The push is `d8f0dc9..017db44`, and production was checked afterwards rather than assumed: the live bar is the three-item one, `/versions.html` carries the agent table, the new pages and both agent files answer `200`, and the **no-JavaScript numbers the live page serves** read 1.21 MB / 252 KB / 1.17 MB / 1.22 MB — the same values the new check compares against the artifacts.

## 2026-09-25 — The sales page, cut to five reasons, and what an agent cannot be handed

**Request, in two parts:** the versions page has to say plainly that a Chrome extension panel cannot be driven by a coding agent (an agent has no such browser); and the sales page is too verbose — lead with the five reasons people actually adopt this.

### 1. The five reasons, and a budget so there are still five

The page had grown the way sales pages grow: every claim was true, every claim got a paragraph, and the ones that mattered were buried among them. It is now built around the five arguments that carry it — **a modern workspace however messy the upstream process** (rows with no links included), **nothing to roll out and nobody to ask**, **it fits the browser, webmail and web phone already in use**, **you end at the file you started with, updated**, and **let your agent hand you the list**. Five cards, not seven: the one-click/undo/presets detail moved to the app's own page, where a person who wants features is already looking.

Layout follows the argument. The first card states the whole point, so it spans the row with its icon beside the text; the other four pair off beneath it. Five equal columns would have squeezed each claim into ~200px of prose, and a 3+2 grid leaves a hole.

What keeps it short is `assets/build-site.js`: **the landing page has a 1,000-word budget of visible prose** (it is at 978), and the check says *cut something* rather than handing back a number to raise. Prose is authored, so this is a tripwire rather than a generator — but it is the tripwire that would have caught the growth in the first place.

### 2. Structured data has to say what the page says — and it didn't

Google and every answer engine ask for markup whose content matches the page, and nothing renders JSON-LD, so a page whose prose was rewritten while its markup was not looks perfect in a browser and is wrong to every machine that reads it. That is precisely the failure mode of keeping two copies of the same sentences in one file — which is what an `FAQPage` is.

So `build-site.js` now reads the edited page and asserts, for every page with markup: every marked-up answer must appear **on the page**, every question asked on the page must be **in the markup**, and every `HowTo` step must say what the page says. The comparison deletes whitespace and treats a `<code>` tag in the middle of a sentence as nothing, because the same sentence is wrapped one way in HTML and another in JSON — but punctuation is compared exactly, which is the part that catches drift.

It found real drift on the first run: `workspace-link.html`'s FAQ markup was a **second, older copy** of its own visible questions (four in the markup, five on the page, none of them worded the same). Two fixes, both worth having on their own: the markup now names the page's own five questions with the page's own answers, and the *build a link* recipe became a visible numbered list of four steps — the JSON-LD `HowToStep` texts and the visible steps are now the same four sentences.

The check was verified by breaking it: changing one word of one visible answer in `index.html` fails `build-site.js --check` with *"the marked-up answer … is not on the page"*, and restoring the file passes.

### 3. A phone-width bug that measuring found and reading would not

At 375px the new value grid's column measured **416px inside a 361px viewport**. A grid item's automatic minimum size is its *min-content* width, and the one long unbreakable token on the page — the portal template `https://portal.example.com/ticket/{Ticket}` — set it. The page's own `overflow-x: clip` then hid the damage rather than showing it, so nothing looked wrong until it was measured. `min-width: 0` on the cards and `overflow-wrap: anywhere` on inline code fix it; the old page had the same defect in its "no links at all" card.

### 4. What an agent can and cannot be handed

This is a limit of browser side panels, not of Turnstone, and the versions page now says so where the choice is made: **the web app, standalone build and bookmarklet open a link; the extension takes a file**. An agent that has found or generated a list should give you a CSV, TSV or XLSX for the extension — and a workspace link for anything with an address bar. Driving the panel would need its own Chrome with the extension loaded and a panel open, which a coding agent in a sandbox, in a headless browser, or on another machine does not have; and a side panel has no address bar for a `#zdata=` link to arrive through. The same fact is now in the extension's own *what it does not do* list, in a new `llms.txt` section that sends an agent to the right edition, and in the rewritten `index.html.md` twin.

Nothing in the app changed for this, because nothing in the app was wrong: the panel has always taken a file, and the missing piece was saying so.

### 5. One bug in the checking code itself

`main()` destructured the check result without `landingWords`, so the writer crashed *after* the file was written — `--check` passed and the build script itself exited 1. Worth recording because it is the shape of mistake to expect: the new number was wired into `check()` and referenced in `main()` without going through the destructuring that connects them.

| Suite | Before | Now |
| --- | --- | --- |
| `node test/run.js` | 407 | **411 passed** — four new assertions that the agent/extension limitation stays said, on the versions page, the extension page and `llms.txt` |
| `assets/build-site.js --check` | link graph | **+ FAQ/HowTo parity, + the landing-page prose budget** |
| browser | — | the trimmed page, the agent table and the extension page checked at 1280px and 375px: no horizontal overflow anywhere, tables stack, the value grid is one column on a phone |

All three build `--check`s pass, the site artifacts were rewritten, and nothing is committed.

## 2026-09-25 — A list inside a link, and the site made legible to agents

**Request, in two parts:** SEO/AEO work on the sales page, and a way for a *web LLM* — a Claude agent, or anything else that has found or generated a list — to set up a workspace and hand over the link, so the list can simply be worked.

Those two asks turn out to be one feature seen from two sides. For an agent to hand over a workspace, the workspace has to be something a URL can carry; and for a site to be legible to answer engines, it has to say precisely what it is in a form a machine reads. Both are about a URL doing real work.

### 1. Workspace links — the list goes in the fragment, and that is the whole design

`app.html#zdata=<payload>&sum=<length>.<hash>` opens a ready-to-work queue with no file, no fetch and no server involved. `#data=` is the same list as percent-encoded text, for the small case and for anyone writing one by hand.

Putting the payload in the **fragment** rather than the query string is not a stylistic choice, and it has two independent justifications. A fragment is never sent to a server, so a list of client names handed over this way does not land in GitHub's access logs — which matters more than usual for an app whose entire claim is that nothing is uploaded. And a query string is part of the HTTP request line, which is size-limited: nginx's default 8 KB header buffer answers anything longer with a `414`, so a long `?data=` would be refused by the host before any of our code ran. A fragment escapes that limit entirely. Both facts were checked rather than assumed, and `?data=` is still read for tooling that can only append a query.

The encoder picks whichever form is genuinely shorter. On ten rows the deflate header costs more than it saves, so a small list stays readable text and a long one is compressed — machine work and human work getting different encodings because they have different needs.

### 2. The checksum, and the failure mode that made it necessary

A link that loses its tail is the normal way this breaks: chat clients wrap and trim long URLs, mail clients mangle them, and a post can cut one in half. So truncation had to be *detected*, not hoped against.

It was not, at first. A truncated payload in a browser threw `Failed to fetch` — the engine's wording for a `Response` whose body stream errored, which tells a person nothing — so the message was rewritten to say what actually happened. But the deeper problem is that a deflate stream cut at a **block boundary** inflates *without error at all*, producing a shorter list that looks completely normal. Nothing else in this codebase fails that way, and a silently short queue is the worst thing the app could hand someone.

So every link we build now carries `sum=<length>.<fnv1a32>` — twelve characters of URL that buy the ability to say *this link is not what was sent*. The suite attacks it directly: a 4,000-row list compressed, then cut at nineteen points, asserting that **not one** cut yields a different list quietly (each must either be refused or come back byte-identical). A link *without* a checksum is still opened, because a person typing `#data=` cannot compute one and refusing their link would be pedantry.

### 3. Two bugs the browser found that the Node suite could not

The first: my own test was wrong in a way that looked like a pass. I loaded a deliberately truncated link, the app reported ten tasks, and I nearly wrote it up as *"truncation is silently accepted — here is the bug"*. It was not: navigating from `app.html#A` to `app.html#B` is a **same-document** navigation. The script never re-runs, the old page was still on screen, and the success I was reading was the previous load's leftover toast. The real bug was underneath it — **editing the address bar to a second workspace link did nothing at all**. A `hashchange` listener now opens the new workspace, and the sweep tests exactly that path (fragment-only navigation, counters before and after).

The second: the bookmarklet runs inside somebody else's page, so `location` there is *their* address. Building a share link from it produced a URL on the host page that opened nothing, and the new "Build a link" panel's *Open it here* would have rewritten the host page's fragment. The build now refuses to emit a payload that reads `location.search`/`location.hash` at all (asserted, like the existing `documentElement` guard), points both share-link builders at the hosted app, and opens the built link in a new tab. An anchor assertion in that same build is what surfaced it: renaming one line in `app.html` failed the build loudly, which is the entire reason those assertions exist.

### 4. The sales page, for people and for answer engines

The page already had `SoftwareApplication` and `FAQPage` structured data. What it did not have was a social image, so every link posted into Slack, Teams or LinkedIn rendered as a bare line of text — the one moment a page has to look like a product. `assets/build-og-image.js` now generates a 1200×630 card by **reusing the icon rasterizer and PNG encoder**, which meant splitting those out of `build-icons.js` behind a `require.main` guard rather than writing a second copy of both. The card carries no text, deliberately: drawing a wordmark would mean hand-authoring glyph outlines, and every platform renders `og:title` and `og:description` as real text beside the image anyway.

Structured data was also extended — `WebPage` with `speakable`, a `HowTo` for the three ways in, four more FAQ entries matching questions that are actually visible on the page, and `softwareVersion`, `license`, `codeRepository` and `isAccessibleForFree` on the application node. Then every guide page got a `WebPage` + `BreadcrumbList` block, because a page with none is invisible to a rich result.

### 5. `llms.txt` is the agent half of the same idea

`llms.txt` follows the v2 proposal — H1, blockquote summary, detail sections, then H2 sections holding markdown lists of links — and carries the complete workspace-link specification, so an agent that reads one file can build a working link without fetching anything else. `index.html.md` and `workspace-link.html.md` are the Markdown twins the proposal asks for, advertised with `rel="alternate" type="text/markdown"`, and both pages point at the map with `rel="describedby"`.

`assets/build-site.js` generates `sitemap.xml` and `robots.txt` (deriving the page list from the directory, so adding a page is all it takes to have it listed) and then checks the whole agent-facing graph as **filesystem facts**: every page's canonical is its own, every advertised markdown twin exists, every link in `llms.txt` resolves, every `og:image` resolves, and every JSON-LD block parses. That check found four real things on its first run — `app.html` and the generated standalone had no canonical at all, `index.html` advertised a markdown twin that had not been written yet, and the standalone was about to inherit `app.html`'s canonical, which is the one way a canonical tag does active harm. The standalone build now rewrites both its canonical and its structured-data URL, and `test/run.js` imports the same checks rather than keeping a second opinion about what a page is.

### 6. Numbers

| Suite | Before | Now |
| --- | --- | --- |
| `node test/run.js` | 389 | **405 passed** — 55 for the link codec, plus a new section for the site itself |
| `test/fixtures.html` | 52 | **61 passed** on `app.html`, the standalone *from a bare directory*, `panel-test.html` and `panel-csp.html` |
| `test/bookmarklet.html` | 81 | **81 passed** — unchanged, and re-run because the payload changed |

A workspace link opened in the standalone makes **zero** network requests from the app frame, which is the feature stated as a measurement. All four build `--check`s pass, and the three browser sweeps were re-run against every edition after the fixture family was regenerated.

One thing was left undone on purpose: `sample-links.xlsx`'s Hacker News note now matches its ten sibling containers, but the fixture's *page* exclusion list and the new canonical checks are asserted in two places (`assets/build-site.js` and `test/run.js`) — the second imports the first, so they cannot drift, but a reader looking for "what counts as a page" should know the answer lives in the build script.

## 2026-09-25 — One definition for the whole fixture family

**Request:** follow-up on the note the last session ended with — *"rather than keep hand-maintaining eleven files that are supposed to be the same queue, a single generator could emit the whole family from one definition, making drift like that xlsx note structurally impossible."*

So `assets/make-fixtures.js` now emits **every fixture in the repo** — the canonical queue and the workflow family both — and `assets/make-sample-docx.js` and `assets/make-workflows.js` are gone. The canonical list is declared once, as `HEADERS` and `ROWS`, and eleven renderers turn it into a CSV, a TSV, JSON, an RSS-shaped XML feed, an HTML table, a hand-written XLSX, a hand-written DOCX, a task list, a pipe table and the two contact lists.

By the time I did this I had already been asked twice about one inconsistency — the xlsx Hacker News note missing the `— use ↗` the other containers carry — and the generator found a **second, larger instance I had missed**: `sample-links-email.csv` and `sample-links-phone.csv`, the two fixtures written by hand *most recently*, had also lost it. That is the whole argument in one example. Drift is not a risk of hand-kept files; it is what hand-kept files do, and it shows up first in the newest ones.

### Proving the regeneration safe rather than assuming it
Nothing in the repo asserted fixture *bytes* — the suites assert detection and the shared target — so regeneration was safe in principle. "In principle" is not a reason to overwrite twenty files, so the output was compared against the pre-generator copies file by file:

| Fixture | Result |
| --- | --- |
| `sample-links.tsv`, `.html`, `.md`, `-table.md` | **byte-identical** — the strongest available evidence that the definition is faithful |
| `sample-links.json` | structurally identical; only pretty-printing differs |
| `sample-links.xml` | differs in one comment |
| `sample-links.docx` | 1,359 vs 1,361 b — the trailing paragraph names this script instead of the old one |
| `sample-links.xlsx` | **2,102 vs 17,881 b** — the hand-written ZIP writer replaced SheetJS's, which is the point of writing it |
| the three CSVs | **CRLF** now, plus the recovered note |

The three byte-identical files are the ones that matter: two of them (`.html`, `-table.md`) had *regressed* in the first draft of the generator, and both were real bugs in it rather than acceptable churn. The HTML renderer was escaping `"` as `&quot;` in **text nodes**, where a quote is not special — only inside an attribute value is it — so `escText` was split out from `esc` and the file came back exact. The markdown table renderer built rows as `| ${cells.join(' | ')} |`, which turns an empty trailing cell into `|  |`; the original hand-typed file had `| |`, and a padded-per-cell join reproduces it.

The CSV line-ending change is deliberate, not incidental: `Papa.unparse` emits `\r\n`, so a CRLF fixture now survives an export/write-back round trip **byte-for-byte**, which an LF one never could. And the XLSX shrinking by 88% is a real improvement in what the fixture proves: a workbook a script wrote itself, with no library in the loop, is now read correctly by the vendored SheetJS *and* by the app — the two directions are finally independent.

`node assets/make-fixtures.js --check` exits non-zero if any fixture in the tree differs from what the definition produces, so the drift this work was about cannot return. It joins the three build `--check`s as something to run before a release.

## 2026-09-25 — Real queues, portal lists, and the four ways a list arrives

**Request, in five parts:** (1) research the kinds of list admin and white-collar work actually produces, find or generate examples, and check the workflows really work; (2) support lists with **no links at all**, where every row is worked inside one portal — either a fixed address or one composed from the row's own values; (3) assess whether OCR and a small local model should be added for "badly formatted lists"; (4) support **email files**; (5) support **pasting a list** in.

The uncomfortable finding first: the fixture family could not answer question (1) at all. All eleven files were *one list*, whose link column was a page in a column called `URL`. So the two features built most recently — an address list and a call list as legal link columns — had no end-to-end test, and nothing in the repo could tell you whether a service-desk export would survive contact with it.

### 1. The workflow family — `assets/make-workflows.js` (9 new fixtures; that script is now folded into `assets/make-fixtures.js` — see the entry above)
Six lists assembled from the recurring shapes of back-office work — a service-desk queue, a hand-kept triage sheet, an accounts-payable workbook, a vendor onboarding tracker, a compliance renewals register, a meeting action log — plus three ways a queue arrives with no file at all. Each is awkward the way the real thing is: **the identifier column comes first and the title sits in the middle**, statuses are spelled the way the system spells them, money is a real number, and four of them hold no link anywhere.

Making them work found three genuine detector bugs:

- **Money was read as a phone number.** `12480.75` has seven digits, so `isPhoneValue` accepted it — and one such cell was enough to score the column as a link column, which meant the file was never recognized as link-free and its rows never got the portal prompt. A decimal amount is now excluded by shape (one dot and a short fraction, or a thousands separator), while `555.123.4567`, `+44 20 7946 0958` and a bare 7-digit number are all still numbers.
- **Status columns were not found.** `Stage` (vendor trackers, pipelines) and `Phase`, `Progress`, `Result`, `Outcome`, `Disposition` are the same column as `Status`, and a list whose status column is not recognized loses every tick the user made in the system it came from.
- **The title column was lost to the identifier beside it.** A header row of `Ticket, Summary, …` titled every card `INC0041821`. `HEADER_NAME_RE` now knows the words trackers actually use (`Summary`, `Item`, `Vendor`, `Candidate`, …) and `HEADER_ID_RE` marks the ones that find a row rather than describe it.

Two of those bugs also hid a subtler one — **a link-free list could not be recognized as having a header row at all**, because the old heuristic needed a link *below* the first row to call it a header, which a portal export can never supply. A first row that reads entirely as labels, over rows that do not, now counts.

### 2. Portal lists — a URL composed from the row
Four of the new fixtures are queues: rows of ticket numbers, invoice IDs and vendor names that all live inside one system. That is the shape the app previously had nothing to say about — detection correctly found no link and then the list was simply dead.

- `?link=` / the **Portal link template** field / the prompt that appears on a link-free list: one address, typed once, remembered per column layout like a preset, and shareable in a URL: `?file=queue.csv&link=https://portal.example.com/incident/{Ticket ID}`.
- `{Column}` is replaced from that row and **percent-encoded** (what a path segment or query value needs); `{Column|raw}` splices verbatim; `{0}` addresses a column by position so a headerless file still works.
- A template with **no placeholders** gives every card the same address — the literal "all the work is in one portal" case — and the card is then labelled with the portal host instead of repeating a long URL ten times.
- Safety is one gate: `applyUrlTemplate` returns a URL only if the result is `http(s)`, so no template can produce a `javascript:` or `data:` link. An **empty value in a path** (as opposed to in a query) produces no link at all, because `/incident/` is a link to the wrong page.
- The field offers the file's own columns as clickable chips and previews the first card's composed URL live, so a template never has to be guessed at.

One bug this found, and it was a bad one: `String(undefined)` from a missing localStorage entry leaked into `state.linkTemplate` on **every ordinary list**, and the URL builder dutifully composed `https://undefined` for every row. It surfaced in the browser sweep as the page navigating away to a host that does not exist.

### 3. Email — `.eml` / `.mht`, in both shapes a queue arrives
A forward is how a queue usually arrives, and two shapes matter: the list is a **table in the body**, and the payload is **the sheet attached**.

MIME is walked properly rather than string-matched: the boundary tree (nested `multipart/alternative` inside `multipart/mixed`), folded headers, `base64` and `quoted-printable`, and a declared charset decoded as bytes through `TextDecoder`. Everything works in "binary string" space — one representation from the raw file down to the part bodies — which is what makes the decoders correct rather than lucky. A part whose filename maps to a format we can read is handed **back to the ordinary detector**, so a forwarded `approvals.csv` opens as a CSV and a forwarded workbook would open as a workbook.

`.mht`/`.mhtml` are the same container, so one parser reads a page saved from a portal that has no export button. Detection is by extension, by `message/rfc822`, and by **shape** — a header block of at least two known `Field: value` lines terminated by a blank line with something after it — which needed care: a two-line file whose first line contains a colon is a data row, not a message, and claiming it would have replaced a CSV with *"this email has no list in it"*.

Two failure modes are refused rather than guessed at, and both are the "confidently wrong" kind this app exists to avoid: a **prose body** is not a list however comma-shaped it looks, and a plain-text body has to be *rectangular* to count. Splitting "Shi,\n\nThe queue for this week's run is attached. Ten items, four of them" on commas yields rows of wildly different lengths — and the lenient test called it a list.

### 4. Paste a list
The shortest path there is: copy a table out of a portal, a mail client or a spreadsheet and press Ctrl+V. The clipboard carries both `text/html` (the real markup) and tab-separated `text/plain`, and the HTML one wins when it holds a table.

Nothing loads without confirmation — a preview shows the rows it understood and the count — because a paste that turns out to be a sentence must never silently replace the queue you are working through. That is also why the same rectangular rule applies here, and why a paste into a text field, or anywhere in the app that is not the overlay, is left alone. In the bookmarklet the listener is scoped to the overlay, so copying a sentence on somebody else's site cannot raise our prompt.

### 5. OCR and a 45M-parameter local model: measured, and recommended against
This was asked as a question and it has a measured answer, so it is recorded rather than guessed at. Both options are WebAssembly, and this app's own Content-Security-Policy refuses WebAssembly outright. Demonstrated with the app's byte-identical policy:

```
instantiate: BLOCKED → CompileError: Refused to compile or instantiate WebAssembly module
because 'unsafe-eval' is not an allowed source of script in the following Content Security
Policy directive: "script-src 'self' 'unsafe-inline' file:"
```

So tesseract.js (~7 MB of core plus trained data) or `needle-rs` (600 KB of WASM plus a 13.7 MB model) would each cost the directive that makes this app's "no remote code, no eval" claim credible — for inputs that are rare in this domain and that the paste path already handles **exactly** rather than approximately (copying a table out of a portal gives us its real markup; a screenshot gives us pixels). The full reasoning, including the size and quality numbers and what would have to be true to revisit it, is in [`todo.md`](todo.md).

### 6. A real bug the browser sweep found in reload handling
In fallback mode `saveNow()` deliberately left `state.isDirty` true after a successful snapshot, "until exported". Two consequences: the status line said **● unsaved** about work that had just been written, and the `beforeunload` guard was *permanently armed*, so every reload and every tab close raised a *"you have unexported changes"* confirm. The harness hit it as a hung navigation — the iframe's `src` and its document's URL disagreed, which is what a blocked `beforeunload` looks like from outside. A prompt that always fires is one people learn to click through, which is how a guard stops protecting the one case it exists for. `persistSessionSnapshot()` now reports whether the snapshot landed, and dirty reflects *that* — so a build with no durable storage (the bookmarklet's throwaway origin) still keeps its guard armed, which is right there.

### 7. Suites, and the numbers
| Suite | Before | Now |
| --- | --- | --- |
| `node test/run.js` | 196 | **332 passed** — new sections for workflows, portal composition, email MIME, plus the money/status/title regressions |
| `test/fixtures.html` | 22 | **52 passed** — on `app.html`, the standalone from a bare directory, `panel-test.html` and `panel-csp.html` |
| `test/bookmarklet.html` | 64 | **81 passed** — the new fixtures in all three variants, including `.eml` in the zero-library one |

Every new fixture lands the shared target in every edition that can read it, which is why the existing assertions could be extended rather than rewritten. Two engine differences were found and handled rather than papered over: **Node's `windows-1252` decoder returns U+0092 where a browser returns U+2019** (Outlook's curly quote), so the Node suite asserts the byte survives the round trip and the browser sweep asserts the quote; and the standalone was confirmed, in a directory with nothing but itself beside it, to register **zero** service workers — which resolves the anomaly the previous session left open (it had been serving a directory that happened to contain `sw.js`).

No new dependencies were added for any of this. Email is `atob` + `TextDecoder` + the HTML parser that was already there; portal templates are string composition; the paste path reuses the format layer. `app.html` is **223.4 KB**, the standalone **1212.5 KB**, the bookmarklet **227.9 / 237.6 / 1174.1 KB**, the extension **1223.4 KB** shipped (**1247.0 KB** with the two test harnesses and the Chrome mock, which is what the build's own table totals and what an unpacked install actually holds) — all three builds pass `--check`.

## 2026-09-25 — Every format, in production, in every edition — and the three suites that keep it that way

**Request:** "Test everything in production and add any necessary test files to the repo for all the intended supported formats. Fix any bugs found."

What that turned into is the difference between *having tested* the format layer and *being able to*. The app had nine fixtures and no automated way to run them; four editions had never been swept at all; the two embedded layers had been verified once, by hand, in one build. So this is three suites and two new fixtures, and the honest part is that the suites found more in the harnesses than in the app — which is itself worth recording.

### 1. `node test/run.js` — the fast layer (196 assertions, ~1 s)
No framework, no dependencies: the suite slices the detection-and-parsing layer **out of the real `app.html`** and evaluates it with the vendored PapaParse and SheetJS, so an anchor that moves fails the suite loudly instead of testing a stale copy. It asserts every `FORMAT_INFO` row, every extension and content-type alias, the shared target for every DOM-free fixture, generated `xls`/`xlsm`/`xlsb`/`ods` workbooks (no four more binaries in the repo root), the DOCX container, the sniffer's four "must not steal" cases, both markdown shapes, the value predicates, link-column scoring and the refusals. What it cannot reach — HTML, XML, DOCX→matrix — needs `DOMParser`, and the split is deliberate rather than a hole.

### 2. `test/fixtures.html` — one sweep, every edition (22 checks)
Every fixture is loaded through the **real app in an iframe** and asserted against the app's own rendered counters and cards, not its internals: `#count-total`, `#count-done`, `article.card`. The edition under test is a query parameter, so the same page sweeps `app.html`, the extension's `panel-test.html` **and its `panel-csp.html`** (which passes all 22 under the extension's own `script-src 'self'; object-src 'self'` — every format and both pickers, no inline script, no console output), and the standalone build: `?app=turnstone-standalone.html&fixtures=./` from a directory containing nothing else. That last one is the only way to prove the offline build, and it now also proves it requests **nothing**: `performance.getEntriesByType('resource')` is empty and the log says `Service worker skipped (standalone single-file build)` with `sw.js` a 404 beside it.

### 3. `test/bookmarklet.html` — the edition nobody had swept (64 checks)
The bookmarklet has no URL, no reachable internals and no ownership of the page it runs on, so it gets its own harness: each variant's `dist/*.txt` is fetched, its `javascript:` URL **decoded exactly as a browser decodes a bookmark**, and the payload evaluated inside a throwaway empty page. From then on nothing is stubbed — files arrive through the real `drop` path as real `File` objects, and every assertion reads the overlay's shadow DOM. The result is a complete variant × format matrix: the `csv` payload reads CSV, TSV, JSON, XML, HTML, DOCX, Markdown and both contact lists; `core` adds XLSX; `full` matches. Each variant's promise is checked against the capability notice **it prints itself** (`CSV-only build` / `Read-only workbooks` / `Plain email and phone links`), and the `csv` variant is made to drop a workbook and prove it refuses *by name* — `XLSX needs workbook support, which this build does not include` — rather than rendering an empty queue.

Three things only this harness could check, and all three pass: a host page that already has its own `XLSX` and `Papa` keeps **exactly those** after a `full` payload has run; `✕ Close` restores the page's `documentElement.innerHTML` byte-for-byte; and a second run refuses (`already running`) instead of stacking overlays.

### 4. Two fixtures nothing was testing: the link column itself
Every fixture had a URL column — a *page*. The MailLayer/PhoneLayer work added two more supported kinds of link column (an address list, a call list) and there was no fixture for either, so the two features most recently built were the two with no end-to-end test. `sample-links-email.csv` and `sample-links-phone.csv` fix that: same ten tasks, same four columns, but the link column **is** the address, and in the phone version it is a number in six international formats. Both land the shared target, both make the card link resolve to `mailto:`/`tel:` with the ✉/☎ glyph instead of ↗, and both are precached by `sw.js` — which they were not before, so until now an offline user could not open them at all.

### 5. The layers, clicked
Rendering a `mailto:` anchor is not the feature; the feature is that clicking it opens a provider picker. The sweep now clicks the rendered anchors and asserts both that the picker appeared **and** that the click was intercepted — a mailto: that opens MailLayer *and* still hands the link to the OS is a bug this would catch. It needed the right instrument: **MailLayer listens on `document` in the capture phase and calls `stopPropagation()`**, so a bubble-phase probe never runs and the first version of this check reported "opened but still left to the browser" while the picker was plainly on screen. One spy per phase, registered after the layer's own, reads `defaultPrevented` in both cases. The other-column rule — an address or number in *any* column is a link, without flagging it in Settings first — is checked on a synthesized five-column matrix, along with the app's own `data-phonelayer-theme` / `data-phonelayer-color` stamping and the rule that **only a page** carries `target="_blank"`.

### Bugs found, and one honest caveat
The app's own defects had already surfaced earlier in this push (`formatHints`'s `{1,5}` extension regex made `.markdown` and `.ndjson` unreachable; `HAS_ZIP` conflated "can inflate" with "can parse XML"; `sample-links.xml` was feed-shaped and had never carried a status column). What the new suites added was a real `sw.js` gap — the two new fixtures were not precached — and two **harness** traps that are worth more than they cost, because both would have produced confident, wrong passes:
- **A cross-realm `ArrayBuffer` is not `instanceof ArrayBuffer`.** SheetJS decides "is this a ZIP?" that way, so a workbook fetched in the parent frame and handed to the app read as 33 rows of `PK\u0003\u0004…` binary text — identical bytes, identical sha256, wrong answer. Both sweeps now fetch inside the frame they are testing.
- **A `fetch` in a document that is then discarded never settles.** `resetApp()` originally polled for "a window that has `parseDetected`" — but `contentWindow` keeps its identity across a same-frame navigation, so it returned the document it was leaving and then awaited a promise that could never resolve. It now waits on the iframe's **`load` event** and confirms the new query string before proceeding. The sweep hung with no error until this was understood.

The caveat is the one already documented and deliberately unchanged: MailLayer's picker fetches Gmail/Outlook icons from `upload.wikimedia.org`, `img-src 'self'` refuses them, and the buttons show text only. The suite asserts the policy stays that way — the only off-origin URL in any artifact is those two icons, and the CSP still has no `img-src https:` — so "make the picker pretty" cannot quietly win later.

### Housekeeping
- New: `test/run.js`, `test/fixtures.html`, `test/bookmarklet.html`, `test/README.md`, `sample-links-email.csv`, `sample-links-phone.csv`. `sw.js` precaches the two new fixtures; `README.md`, `testing-notes.md` (rewritten around the fixture family and a per-edition matrix) and this log updated.
- Sizes after the rebuild: `app.html` **174.5 KB**, standalone **1163.6 KB**, bookmarklet `csv` **177.3** / `core` **186.9** / `full` **1123.5 KB**, extension **1174.6 KB** of shipped files. All three builds pass `--check`.
- How to run all of it, and what "production" means for each edition, is [`test/README.md`](test/README.md).

## 2026-09-25 — Desktop-only by design, columns named by their values, and two more kinds of link

**Request, in three parts:** (1) Turnstone is a desktop product — a phone must be told so, not handed a broken workspace. (2) Stop guessing the URL column from header names; choose it from the **values**, and let the user flag a column in Settings so the choice sticks. (3) Add **DOCX** import plus **MailLayer** (emails) and **PhoneLayer** (phones) embedding to the web, standalone and extension editions.

### 1. A desktop-only gate that says why
`pointer: coarse` **and** `hover: none` — a touch-first primary pointer — raises `#mobile-gate`: a full-screen overlay reusing the app's own `.modal-box`, naming the pointer it detected and the window size (`805×858` in the test), with a **Continue anyway** escape hatch for someone deliberately using a tiny screen, and a `matchMedia` change listener plus `resize`/`orientationchange` so rotating a tablet or docking a keyboard re-evaluates it live. The bar is deliberately pointer-based, not width-based: **touch laptops keep a fine pointer and pass, the extension's side panel passes, and a narrow desktop window passes** — the layout is built to work narrow, so width would have produced false positives. Verified in-browser both ways: hidden on this desktop (`coarse=false, hover:none=false`), and shown after monkey-patching `matchMedia` to report a coarse pointer, then dismissed by its own button.

### 2. The link column comes from the values now, and Settings can overrule it
Header names are a guess about someone else's spreadsheet; the cells are evidence. `isUrlValue` decides from the value alone — a scheme (`https://…`) or a bare domain, with a `FILE_EXT_TLDS` set so `setup.exe` and `notes.txt` stay filenames instead of becoming "links" — and `analyzeMatrix` now **scores every column** by how many link-shaped values it holds over the first 200 body rows, skipping status/notes columns outright so a notes column full of pasted links can never outbid the real one. The header is used **only to break an exact tie**. A column called `Page`, `Resource` or nothing at all lands correctly now; before, it needed the header to say so.

That left one honest gap: if detection guesses wrong there is no way to say so, so **⚙ Columns** grew a per-column role dropdown (Data column / URL / Name / Status / Notes). Roles persist to `turnstone-col-roles`, keyed by the file's `headerSignature`, are carried inside column presets, and are applied in `loadMatrix` **before** the status/notes seeding so a re-flagged status column still round-trips. A headerless list is session-only by construction, and `urlCol` is never cleared — a file that once had a link column keeps the flag. Verified by reload: detection said column 1, the stored flag said column 2, and the flag won.

### 3. DOCX — a Word table with no library at all
A `.docx` is a ZIP containing `word/document.xml`, and browsers expose `DecompressionStream('deflate-raw')`, so this needed no new dependency: walk the central directory, inflate that one member, parse the XML. `<w:tbl>` → `<w:tr>` → `<w:tc>` becomes the matrix, and a cell's text is its `<w:t>` runs joined — which is what makes a value Word split across two runs (`https://www.` + `bbc.com/`) arrive whole. A document with no table falls back to one row per paragraph, split on tabs. Two details worth having: the format is decided from the container's **member list** (`word/document.xml` vs `xl/workbook.xml`), so a Word file renamed `.xlsx` still opens as Word, and a legacy `.doc` is identified by the UTF-16LE `WordDocument` stream name in its OLE2 directory and **refused by name** instead of being handed to SheetJS to produce a nonsense error. `HAS_ZIP` gates it, and a browser without `DecompressionStream` is told so on the welcome panel rather than on first drop.

A fixture family needs one shared target, so `sample-links.docx` mirrors `sample-links.csv` exactly (10 rows, 4 columns, 3 complete) and `assets/make-sample-docx.js` generates it (since folded into `assets/make-fixtures.js`) — a real ZIP with real DEFLATE and CRC32, written by hand against node's zlib because this repo has no build tooling, and byte-identical between runs so the binary is reproducible. **Verified in-browser**: `?file=sample-links.docx` → `magic PK\x03\x04 (ZIP container → docx)`, `DOCX parsed: 1 table(s), 11 rows, 4 columns` → `urlCol=1, nameCol=0, statusCol=2, notesCol=3` → **10 cards, 7 visible, 3 complete**, matching every other fixture. Cell-by-cell against the XLSX fixture it differs in exactly one pre-existing place — the XLSX's Hacker News note is missing the `— use ↗` the CSV has — which is a stale xlsx fixture, not a DOCX bug; the DOCX matches the CSV.

### 4. MailLayer and PhoneLayer, embedded
Both are ours, both are small (12.8 KB and 24.0 KB), both are vendored into `vendor/` with sha256s recorded, and both work by intercepting clicks on real anchors — so the app needed **no calls into them**: a cell that is an address renders as `mailto:`, one that is a number as `tel:`, and the layers take the click. `linkKindOf`/`linkHrefOf` are the single place that decides href shape, and the link-column scoring learned the same two kinds (URL 2 · email 1.5 · phone 1) so a list with a Website *and* an Email column still leads with the website while an address-only list still gets a working link column. Any email or number on a card row is clickable too, without flagging the column first.

PhoneLayer documents per-trigger `data-phonelayer-theme`/`data-phonelayer-color`, so **each `tel:` anchor is stamped with the theme and accent of the moment it was rendered** — better than configuring the script tag once at load, and it means the picker matches the app in either theme. `HAS_LAYERS` reads `window.PhoneLayer` (MailLayer publishes no global; the pair is vendored together), and the welcome panel collects **every** missing capability into one list now instead of overwriting itself, so the bookmarklet's `core` variant correctly reports both "read-only workbooks" and "plain email and phone links".

**Verified in-browser**: both modals open — MailLayer's provider picker (`gmail/outlook/yahoo/native`, `defaultPrevented: true`) and PhoneLayer's `.pl-overlay` with its 40 providers. Two honest caveats, both documented rather than papered over: **MailLayer's picker fetches Gmail/Outlook icons from `upload.wikimedia.org` and our `img-src 'self'` refuses them**, so those two buttons show text without the logo (a request-free app beats a logo — do not widen the policy), and **MailLayer's own `isMobile()` test is `innerWidth <= 768 && 'ontouchstart' in window`**, so in a narrow *desktop* window it hands the click to the system mail handler instead of showing its picker. PhoneLayer's check is user-agent based and is unaffected.

The bookmarklet is deliberately **left out**: those layers build their modals in the host page's DOM, which on someone else's site is not ours to decorate, so its welcome panel says addresses and numbers go to the system handlers. It still gains DOCX for free, because the ZIP work is browser-native.

### 5. Markdown — the format the two features above paid for
DOCX had already proved the pattern, so markdown was the cheap one: it is **plain text**, so one `FORMAT_INFO` row, one `EXT_FORMAT` alias set, one `parseMarkdownText()` and one sniff test covers it — in **every** edition, including the zero-library `csv` bookmarklet. The design bet was that a task list *is* a table: `- [x] Finish the audit — https://acme.example — called Tuesday` already has a name, a link, a checkbox and a note, so the checkbox becomes the card's status, the text before the link its name and the text after it the note. It came out shaped **exactly** like the CSV fixture — `urlCol=1, nameCol=0, statusCol=2, notesCol=3`, 10 cards, 7 visible, 3 complete, 5 notes — which means nothing downstream ever learned that a checkbox was involved. Both shapes ship as fixtures (`sample-links.md` as a task list, `sample-links-table.md` as a pipe table) and both hit that target.

Three things testing changed, all worth recording:
- **The scan needed value-shaped scheme matchers.** Matching "non-whitespace after `tel:`" captured `tel:+1` out of `tel:+1 (555) 987-6543` and dumped the rest of the number into the note — a number with spaces is normal and the first version only worked because the test used one without. `mailto:` now matches an address and `tel:`/`sms:` a run of digits and separators.
- **`- Task (https://link)` split its bracket pair** (the `(` landed in the name, the `)` in the note). The two are now dropped together — and only when they pair, so a note that legitimately begins with `(` survives.
- **Sniffing stays deliberately narrow.** Only a checklist item or a real pipe table (a pipe row followed by its `|---|` delimiter) counts. A bare bullet list of URLs is *still* a one-column delimited list, which is what keeps every existing `.txt` behaving exactly as it did.

Write-back is off, and that refusal is a **choice**, not a limitation: completion and notes could round-trip losslessly, but the file is a document, so writing means reflowing prose and normalising bullets. Doing it properly needs a line-level surgical edit, and that deserves its own decision rather than a checkbox in the UI now.

The fixture sweep that verified all this also turned up a **pre-existing gap**: `sample-links.xml` is feed-shaped (`title`/`link`/`notes`) and lands **3 columns, 0 statuses, 10 visible** — where every other fixture, and `history.md`'s own claim about the four measured fixtures, says 4 columns / 3 complete / 7 visible. Recorded in `todo.md` rather than quietly "fixed", because the fixture is a published artifact.

### Housekeeping
- `sw.js` → **v0.11.0**, precaching the two layers, `sample-links.docx` and both markdown fixtures. The markdown work landed in the same unpublished version, so no second bump was needed.
- All three ports rebuilt: `app.html` 173.7 KB → **standalone 1162.8 KB**; bookmarklet `csv` 176.4 KB / `core` 186.0 KB / `full` 1122.6 KB; extension `dist/` 1194.3 KB. The bookmarklet build needed one patch count updated (4 theme-root reads, not 3 — `currentTheme()` is a new one), which is the anchor system doing its job.
- Regression-tested: the XLSX fixture still parses through the vendored SheetJS (11 rows, 3 complete), the extension panel boots under `script-src 'self'`, the bookmarklet's `core` payload mounts in a shadow root with no host-page globals leaked (`window.PhoneLayer` undefined there), and `node --check` passes on all three inline script blocks and both new vendor files. A Node test over the real detection slice covers the new predicates and scoring (30 assertions, incl. dates and quantities *not* becoming phone numbers), a second covers the markdown parser and sniffer (43 assertions), and all **nine** fixtures were swept in-browser through `loadMatrix` to confirm they land the same queue.

## 2026-09-24 — A site map in the chrome, and elements stacked instead of crammed

**Request:** add a simple top nav, check the site's alignment — some elements "aren't quite working as intended" — and stack more rather than sitting everything side by side. Every complaint turned out to be real and measurable.

### The top nav
Every page now opens with one bar: the Turnstone brand, then Overview · All versions · Web app · Standalone · Bookmarklet · Extension, and **Launch app →** pushed to the right. The current page is marked visually *and* with `aria-current="page"`. The bar lives in `site.css`; `index.html` keeps its own copy inline because its `default-src 'none'` policy loads nothing external, which is part of what that page demonstrates. The redundant breadcrumb went away — the nav *is* the trail now. On a phone the bar wraps to two rows: brand on its own line, links beneath, instead of one crowded line.

### What "not quite working" turned out to mean, measured
- **The sales-page hero was clipping its own text on phones.** The hero is a row flex container, and a flex item refuses to shrink below its min-content width — so at 420px the `.container` was **479px wide in a 406px viewport**: the headline, the eyebrow pill and half of *Try the web app* ran off the right edge, silently hidden by `overflow-x: clip`. Fixed by making the hero a column with `min-width: 0` on its child, and giving the hero the same horizontal padding as every other section (it previously sat flush against the viewport edge while the rest of the page was inset — the alignment mismatch you could feel but not name).
- **The hero's supporting paragraph was shredding words.** `word-break: break-all` on centred text broke every line mid-syllable ("yo/u want", "installed or f/etched"). Now `overflow-wrap: anywhere` with a 780px measure: breaks only when a word genuinely cannot fit, so the long `app.html?file=…` code sample still wraps and the prose doesn't.
- **The headline sizing breakpoint missed on its own threshold.** `@media (max-width: 420px)` does not fire *at* 420px, so a 420px screen got the 3.3rem desktop headline. Replaced with `clamp()` — the headline scales continuously and there is no width at which anything jumps.
- **The versions page dragged sideways.** The seven-column *Side by side* table was 564px of content in a 406px viewport — the entire page scrolled horizontally because of one table. It (and the situation/planned tables) now declares its column widths explicitly under `table-layout: fixed`, and below 760px each row becomes a **card**: the item's name as the card title, every other cell showing its column name as a small caption above its value. Nothing is lost — every number and qualifier is still there, labelled.
- **The four edition cards were a wall.** Four across a 1000px measure gave each card 228px, wrapping every sentence to three lines of hyphenated fragments. Now two across (470px cards), single column under 640px, with each card's *Details →* link pinned to its foot so the four links line up regardless of text length.
- **Buttons stack on a phone.** Two half-width buttons with ragged edges became full-width targets under 560px.

One debugging note worth keeping: twice the browser served a **stale cached `site.css`** from the dev server's heuristic caching, which made a correct stylesheet look broken (the new stacking rules absent from the CSSOM, the nav's 22px brand image at its natural 512px). Busting the `href` confirmed the file was right both times. If CSS changes appear to do nothing on `127.0.0.1`, suspect the cache before the code.

One genuine CSS lesson in the stacked tables: the first implementation laid each cell out as a label/value **flex row**, and a cell ending in `core/full` pushed 48px past its own card — flex items don't shrink below min-content, which is exactly the mechanism that broke the hero. The caption-above-value layout cannot overflow, and reads better.

`sw.js` → `v0.9.9`; the five guide pages are precached, so their cached copies update on next visit.

## 2026-09-24 — The app sets no style attribute, so a strict `style-src` costs nothing

**Request:** none directly — this closes the one limitation the site had been documenting rather than fixing, and it came out of hardening the strict-CSP story the bookmarklet exists for.

### What was wrong
The app carried **15 inline `style="…"` attributes** — 2 in markup, 13 built into `innerHTML` dialog templates — plus two runtime ones. On a page enforcing `style-src 'self'` the CSP console reported all of them and the affected dialogs lost their entire layout, not just their polish: the open-mode picker, the sheet picker and a few settings rows. A `style` attribute is governed by `style-src-attr`, so nothing about the overlay being *constructed* rather than injected saved those.

All 15 are now classes keyed by id or class name, and so are the two runtime cases: the toast (whose styling was already entirely static — it just happened to be written with `el.style`) and the `execCommand` clipboard fallback's off-screen `<textarea>` (`.clip-fallback`). That leaves exactly **one** style the app writes at runtime, the hamburger menu's `left`, which is computed from the button's live position and could not be a class; CSSOM property writes are not CSP-governed, so even that one is free. Verified in the DOM on a loaded queue: **0** `[style]` elements belonging to the app.

### The test was lying, and that was the more useful find
The bookmarklet's strict-CSP harness (`ports/bookmarklet/test-csp.html`) declares `style-src 'self'` — and then styled itself with an inline `<style>` block. Every run therefore logged a violation before the payload had even run, which made the result impossible to attribute: you could not tell the payload's violations from the page's own. The styles moved to `test-harness.css` (shared with `test.html`), so **every message on that page is now the payload's**. Re-run against the same policy: the overlay mounts, 2 constructed stylesheets, 0 `<style>` elements, and **no `style-src` violation at all**.

One honest gap remains, and it is pre-existing: the logo is a `data:`-URI SVG `<img>`, so a page with a strict `img-src 'self'` refuses it and shows the wordmark without the small stone mark. Nothing else in the app loads an image. Inlining the SVG would take the payload to a genuinely silent console on a strict page. That one is **newly surfaced by the fixed harness** rather than caused by this change.

`sw.js` → `v0.9.8`; standalone, bookmarklet payloads and the extension dist all rebuilt from the same `app.html`.

## 2026-09-24 — One page per edition, and a ways page that answers the first question

**Request:** the versions page had grown into five product pages wearing one hat. Split it: home → versions → the edition you need, with a page for each one. And stop leading the hero with "try the web app" — lead with "find your version", because a first-time visitor does not yet know which edition is for them. Recommend the web/PWA first, and offer the others for locked-down environments.

### The structure
`versions.html` is now a **chooser**, not an encyclopedia. It opens with the recommendation — *start with the web app* — and then a single table that maps a **situation** (nothing may be installed; nothing may be fetched; a browser that will not write to your file; a site that blocks framing; Firefox; a `.xlsx`; a very large file) to the edition that handles it, with the reason. The full detail for each edition moved off the page and onto its own:

| | |
|---|---|
| `web-app.html` | what it does, what it will not do, how to install it as a PWA — marked **Start here** |
| `standalone.html` | the offline single-file build, and exactly which browser rules still apply from `file://` |
| `bookmarklet.html` | install by dragging, a five-step test, the three variants, and the limits |
| `extension.html` | the side panel, its permissions, and load-unpacked steps |

Every page carries the same breadcrumb (**Overview › All versions › this edition**) and the same footer, so the path is walkable in both directions, and `versions.html` keeps the side-by-side comparison, the honest gaps, and the planned editions.

### The hero, and what replaced it
`index.html` led with "▶ Launch the app" — a call to action that only makes sense once you already know the app is what you want. It now leads with **Find your version → `versions.html`**, with *Try the web app* beside it and the sample-queue link folded into the supporting sentence, which is where the recommendation actually lives: *nine times out of ten you want the web app; the other three exist for the times it does not fit*. The footer and the roadmap answer say the same thing in the same order, and the framing question now points at the extension (which never frames a page) before mentioning the desktop build.

### Two things the split forced, both improvements
- **Shared chrome, but not shared with the sales page.** A new `site.css` holds the guide pages' tokens, cards, tables, pills and steps, replacing four copies of the same stylesheet. `index.html` deliberately keeps its own: it runs under `default-src 'none'` and loading nothing external *is* part of what it demonstrates. The split also **loosened one CSP**: `versions.html` no longer needs `'unsafe-inline'` in `script-src`, because the clickable `javascript:` links moved to `bookmarklet.html` — which still needs it, and still documents why.
- **No page quotes a size it cannot prove.** `site.js` (plus `bookmarklet.js` for the drag anchors) fills every number from the artifact: a **HEAD request's `Content-Length`** for sizes — `Content-Length` is a CORS-safelisted header, so it is readable same-origin without downloading a 1.07 MB file — and `build.json` for the extension's version, file count and installed size. The HTML carries the current value as fallback text, so the pages still read correctly with JavaScript off; the script only ever corrects it.

That immediately caught two stale claims: the standalone is **1.07 MB**, not the 1.09 MB the old page said, and the bookmarklet payloads are **141 KB / 151 KB / 1.06 MB** rather than 142/152/1.09 — they shrank when the PWA-removal patch in the previous commit started removing the whole block instead of stopping early. Sizes in this log's earlier entries are the values measured *then*, which is why they differ.

`versions.js` is gone (its two jobs are `site.js` and `bookmarklet.js`); the extension build now also emits `dist/build.json`; `sw.js` precaches the five guide pages and their two scripts/sheet (`v0.9.6`).

## 2026-09-24 — Chrome extension: the queue drives the browser instead of hosting it

**Request:** push the repo, then start the next port — the Chrome extension.

`ports/extension/dist/` is now a loadable Manifest V3 side panel, generated by `ports/extension/build.js` from `app.html` the same way the bookmarklet is: extract the stylesheet, markup and script, patch only the platform seams, and **assert every anchor** so an upstream change fails the build instead of shipping a drifted panel. The three scaffolding files (`sidepanel.html`, `sidepanel.js`, `background.js`) were replaced by real ones; the panel is not a reimplementation, it *is* the sidebar.

### The shape of the port
A side panel is about 360 px of browser chrome, not a viewport, so the locked scope's "no iframe workflow" is not a limitation to work around — it is the whole design. Links become **real browser tabs**, and the panel remembers which tab belongs to which row: clicking a card opens its link, and clicking it again **switches to that tab instead of reloading it** — the same "focus, never duplicate" rule the web app's iframe tab bar follows, re-pointed at `chrome.tabs`. A closed tab is forgotten (`tabs.onRemoved`), so the next click opens a fresh one rather than trying to focus a tab that is gone.

Seams, and what each cost:
- **The iframe workspace region is deleted outright** — one contiguous block between two unique markers — and replaced by a `closeAllTabs()` no-op, because that is the only helper the rest of the app still calls. `openInIframe`, `renderTabbar`, `activateTab`, `closeTab` and `tabTitle` are gone, and the build asserts their absence.
- **Three open modes collapse to one.** Rather than delete the mode plumbing, `OPEN_MODES` keeps a single `tabs` entry labelled *Real browser tabs*: `getOpenMode`/`setOpenMode`, the menu checkmark and the first-run gate all keep working unchanged, the menu is pruned to match, and the first-run picker short-circuits (it would ask a question with one answer).
- **One pane at a time.** The drop-zone screen and the queue each take the whole panel, swapped by a `has-file` class on `<body>` — state `updateChrome()` already had, so no new state was needed. Pure CSS plus one line.
- **Exports** go through `chrome.downloads` (real filename, no anchor dance), with the original anchor path kept as the harness fallback. **PWA manifest + install-prompt plumbing, the `beforeunload` guard and service-worker registration are removed**: an install prompt or an "unsaved changes" dialog belongs to a web origin, and the panel keeps its IndexedDB snapshot either way.
- **Right-click → "Add link to Turnstone"** appends a row, or *starts* a queue when none is open. If the panel is shut, the worker stashes the link in `chrome.storage` and the panel picks it up on next open — with the listener registered **before** the stash is read, so an add landing mid-load cannot fall between the two paths.

### Two live bugs found on the way, and both are fixed
Building a port is a good way to read the app closely, and reading it closely found two things the app had been shipping:
1. **The hamburger dropdown's CSS never applied.** In `app.html` the rule's closing comment was followed by a literal `n` instead of a newline, turning `#menu { … }` into the selector **`n #menu`** — which matches nothing. So the dropdown rendered **in the sidebar's flow**: opening the ☰ menu shoved the search box, the filters and every card down the panel instead of floating over them. Confirmed live (`getComputedStyle(#menu).position` → `static`) before and after (`fixed`).
2. **The bookmarklet's PWA-removal regex stopped too early.** It matched from the PWA heading to the first `})();` — which is the *icon-constants* IIFE, not `buildManifest()`. So a `buildManifest()` survived in every bookmarklet payload and threw *"ICON_192 is not defined"* on each launch: a console warning on somebody else's page, which is worse than useless in an overlay. Re-anchored on the end of that block, and the extension build now asserts the whole PWA + service-worker region is gone (and the payloads got ~2 KB smaller).

### Verifying a port that only runs inside Chrome
The extension page CSP (`script-src 'self'; object-src 'self'`) is applied as a **response header**, so an ordinary server cannot reproduce it — which means "it works when I load the file" proves nothing about the panel. Two generated harnesses close that gap, and neither is referenced by the manifest:
- **`dist/panel-csp.html`** restates the same policy as a meta tag. Loading it proves the panel needs **no inline script and no eval**: it mounts, loads the CSV *and* the SheetJS `.xlsx` fixture (10 tasks / 3 done / 7 left, statuses and notes resumed through the same round-trip path), and lays out correctly at 380 px with **zero console errors or warnings**.
- **`dist/panel-test.html` + `src/chrome-mock.js`** stand up a test double for `chrome.tabs` / `chrome.action` / `chrome.storage` / `chrome.downloads` and record what the panel asked for. This is how the half that cannot exist outside an extension got checked: one tab per card; a second click **switching** to that tab (`tabUpdates: [{id:1, active:true}]`, tab count still 1) instead of duplicating it; a closed tab forgotten so the next click opened tab id 2; the badge message carrying the remaining count; Export CSV reaching `chrome.downloads` as `demo-links-turnstone.csv`; a context-menu add taking the queue 5 → 6 cards; and `?pending=<url>` restoring a link queued while the panel was shut (`storageRemoved: ['pendingLink']`, and a fresh *Turnstone queue* started around it).

### Front door
The [versions page](versions.html) gained an **Available** extension section — load-unpacked steps, what it does and does not do, and a permissions note — with its version read from the built `manifest.json` so the page cannot advertise a build that is not on disk. The Chrome-extension row moved out of *Planned editions*, the sales page's roadmap bullet and the ports table were rewritten, and `ports/README.md` now records why the DOM-free `core.js` never happened: what differs per platform is the shell and the capabilities, and a generator that asserts its anchors is a better fit for both than an extraction.

## 2026-09-24 — Versions & downloads page (install the right edition, or find out which one)

**Request:** make the bookmarklet actually accessible and installable from a proper page — instructions to drag it onto the bookmarks bar and to test it, plus the variants' limitations and intended use cases, steering to other editions (current and future) when a format or feature isn't supported. And put that on the GitHub site as a versions/downloads page.

`versions.html` (+ `versions.js`) is now the front door for every edition: the hosted web app, the download-able standalone single-file build, and the three bookmarklet variants, each with what it carries, what it costs in size, who it is for, and a **“if what you need isn't supported, go here”** table that maps an unsupported format or feature to the edition that solves it.

Design decisions worth recording:
- **The drag links are built at load time from `dist/`**, not pasted into the page. A bookmarklet can only be installed by dragging an anchor whose `href` *is* the payload, and hand-copying three payloads into a page would drift the moment `app.html` changed. Fetching them keeps the page a few KB while the links and sizes are always the real build. They are also formatted by **UTF-8 byte count, not `String.length`** — the payloads carry non-ASCII (ticks, dashes, and SheetJS's codepage table), and character counting under-reported the `full` variant by ~240 KB (851 KB instead of 1.06 MB).
- **The page needs `script-src 'self' 'unsafe-inline'`, and that was found the hard way.** With a stricter `script-src 'self'`, clicking a bookmarklet link did nothing: *”Refused to run the JavaScript URL because it violates the following Content Security Policy directive: script-src 'self'“*. Clicking a `javascript:` link is a page script execution and is CSP-governed, whereas the installed bookmark is exempt. Dragging works either way; the relaxation exists purely so “click it here to try it” works, and nothing external is permitted (scripts stay same-origin, `connect-src 'self'`). This is the same distinction the port README documents for `test-csp.html`.
- **Every claim on the page is honest about the hard limits**, because a versions page is where users find out something will not work: bookmarklet memory is session-only (*“this tab only — export to keep”*, with Copy/Restore state and export as the ways out), workbooks are read-only unless you install `full`, a strict `img-src` costs the small stone mark (the inline-`style` limit that used to sit here is fixed — see the next entry), and a closed `connect-src` blocks remote-URL loads. Future editions (extension, Tauri, CSV-only standalone, PDF) are listed with their real status rather than aspirational copy.

Wired in: footer + roadmap answer on the sales page, the repo layout and ports section in `README.md`, `sw.js` precaches the page and its script (`v0.9.4`), and the generated bookmarklet install page now links back to it as the umbrella page.

Verified in-browser: the three rows build with real `javascript:` hrefs and live sizes (142 KB / 152 KB / 1.06 MB); clicking `core` **on that page** mounts the overlay, the XLSX fixture loads (7 visible of 10, 3 complete, notes intact) and ✕ Close leaves the page exactly as it was, with no CSP violations in the console.

## 2026-09-24 — Bookmarklet: the whole app on any page, with no libraries and no network

**Request:** "begin work on the bookmarklet version of the app, maintaining as much functionality as we can, while having no dependencies. If we can vendor any libraries or support in while still working, we can pursue that. And if we need to split it into multiple versions to support different file types because of the parsers lengths, I am open to that."

That request deliberately unlocked three of the scaffold's locked decisions (CDN injection, a ~8 KB budget, a single payload), so the first job was to find out which parts of the original design were actually buildable.

### The finding that shaped everything: a composed document inherits the page's CSP
The scaffold had the bookmarklet **compose the app in a new tab** and inject SheetJS from a CDN. Probing that on a page declaring `script-src 'self'` showed both halves were impossible there: injecting an inline `<script>` into the page **and** into a same-origin `about:blank` iframe each produced *"Refused to execute inline script because it violates the following Content Security Policy directive: script-src 'self'"*. Documents created under the page's origin inherit its policy container — `about:blank`, `srcdoc`, `blob:`, same-origin `document.write`. And a CDN `<script src>` is exactly what `script-src` is there to stop.

The way out is that a **bookmarklet's own code is exempt from page CSP** (it is why bookmarklets still work on GitHub). So the payload composes the app **in the current page**: a shadow host covering the viewport, the app's stylesheet adopted as a **constructed stylesheet** (which `style-src` does not govern, unlike an injected `<style>`), the app's markup inside the shadow root, and every element lookup scoped there. Nothing is injected into the page, so no CSP exemption is needed for anything except the payload itself.

### No dependencies, and no cut-down app
Two stand-ins implement exactly the API surface `app.html` consumes, so the app is untouched below the seams:
- **`src/papa-shim.js`** (~2 KB) — an RFC-4180 reader/writer with delimiter sniffing, quoted fields, doubled quotes, embedded newlines and BOM handling.
- **`src/xlsx-shim.js`** — a **read-only XLSX reader with no library behind it**: it walks the ZIP central directory, inflates members with the browser's own `DecompressionStream('deflate-raw')` and reads the workbook/sharedStrings/worksheet XML with `DOMParser`. `.xls`/`.xlsb`/`.ods` get a readable refusal.

Variants then differ only in parser weight: `csv` ~142 KB (no libraries), `core` ~152 KB (+ the XLSX reader), `full` ~1.09 MB (vendored PapaParse + SheetJS — every format, plus XLSX export and write-back). The old "~8 KB" target could only have been met by shipping a different, smaller app; "the whole app" was always the promise, so the budget is met by splitting instead.

### Host-page safety, deliberately engineered
- **Globals:** the vendored UMDs are evaluated against shadow objects (`Object.create(window)`, with `define`/`module`/`exports` shadowed so they take the browser branch), and the payload's own scope is an IIFE. Verified with the page's *own* `window.XLSX`/`window.Papa` stubbed to fakes: both survived untouched (`read()` still returned the page's value) while Turnstone parsed a real workbook with its own copies.
- **Storage:** `indexedDB` is shadowed by an in-memory stand-in, so the app's snapshot code works for the tab's lifetime and the user's queue never lands in the host site's database. `localStorage` stays real for theme/open-mode/presets (namespaced keys), and the UI now *says* what it is: the chip reads *"this tab only — export to keep"*.
- **Left-over behaviour:** the `beforeunload` guard and the PWA install/manifest blocks are removed in this build (an unsaved-changes dialog on someone else's page is not ours to raise), the drag handlers attach to the overlay rather than `document` so they die with it, and the host page's own `?file=` query is ignored.
- **Bar:** a 26px strip with the variant label and **Copy state / Restore state** — the locked-scope way to carry a queue across sessions, implemented as a JSON snapshot that restores through the same `loadMatrix` round-trip path the app uses for re-imported files (statuses *and* notes verified restored, `['carried note','second note']` with `[true,false]`).

### App-side capability flags (shared with the unbuilt standalone CSV-only variant)
`app.html` gained `HAS_XLSX` / `HAS_XLSX_WRITE` (reading and *rebuilding* a workbook are separate capabilities: without a writer, XLSX export hides itself and workbooks become one-way imports via `canWrite()`), `SESSION_ONLY` (storage wording), and visible degradation: a welcome-panel notice, a trimmed format list, the Test-XLSX button hidden, and an actionable refusal if a workbook is dropped on a build that cannot read it. This is exactly the "real degradation logic, not just an omitted script tag" that the standalone CSV-only variant was blocked on; only its build flag is left.

### Verification
`core`, exercised through the harness from the real `javascript:` payload: demo list → 5 cards; ✓ Complete → `5 tasks | 1 done | 4 left`; note typed; CSV drop → 10 tasks / 3 done / 7 left with the round-trip resume toast; menu and settings overlays render **inside** the shadow root (nothing leaks into the page body); Copy state → *"Copied 10 cards as JSON (1.2 KB)"*; Restore state rejects junk and restores a snapshot with statuses and notes intact; ✕ Close removes the host and leaves the page as found. `csv` degrades exactly as specified (visible *"CSV-only build"*, workbook drop refused with a reason, CSV still whole). `full` parses **and exports** the XLSX fixture with `window.XLSX`/`window.Papa`/`window.cptable` undefined throughout. And under `script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'`, injecting the payload as a same-origin script (no exemption) mounted the overlay — 2 constructed stylesheets, **0** `<style>` elements, XLSX drop → 10 tasks / 3 done / 7 left, complete + notes working. The only CSP console output is the inline-`style`-attribute limitation now documented in the port README (15 attributes; features unaffected, some dialog chrome loses padding). *(Superseded: that limitation is fixed in the entry of the same date below, and the harness itself no longer logs a violation of its own.)*

Hosted `app.html` was regression-passed after the capability changes (XLSX load, Test-XLSX write + async read, multi-sheet inspection, capability notice still hidden) and `turnstone-standalone.html` rebuilt. `sw.js` → `v0.9.3`.

### What ships in the repo
`ports/bookmarklet/{build.js,src/,test.html,test.js,test-csp.html}` plus committed `dist/` payloads (`turnstone-bookmarklet-{csv,core,full}.txt`), a small generated `dist/install.html` that fetches the payloads and builds draggable install links, and `dist/csp-probe.js` (the `core` payload source) that the strict-CSP harness injects as a same-origin script — the reproducible form of the evidence above.

## 2026-09-24 — Resume: a re-imported file restores its progress

**Request:** "can the app recognize when an exported or updated file has been dropped back in, with notes a completed column, so it can set the default values of those on load? we want folks to be able to pick up where they left off with that approach as well".

### What already worked — and the exact gap
`loadMatrix` has seeded cards from a file's own Status/Notes columns since v0.2, so a Turnstone-written file did reopen with its progress. But the detection was one word deep: a column literally headed `Status` and a value matching `complete|completed|done|yes|true|1|x`. Probing the running app made the gap concrete — a perfectly ordinary list with a **`Completed`** column loaded every single card as *incomplete*, silently, notes and all. The most common shapes people actually receive work in (`Completed`, `Done`, `Finished`, `Checked`, often carrying `Y`/`N` or a date) were precisely the ones that reset.

### What changed in `app.html`
- **The completed column is recognized by name, not by one word.** `Status`, `State`, `Complete(d)`, `Completion`, `Done`, `Finished`, `Checked`, `Reviewed`, `Processed`, `Handled` — matched as a **whole header word first**, then as a prefix. The ordering matters: `pickColumn` looks for an exact word before falling back to a prefix, so a list with both `Checked` (column 2) and `Completed` (column 5) doesn't hand the role to whichever happens to sit leftmost. `Completed on` and `Checked?` still match through the prefix pass. Notes widened the same way: `Note(s)`, `Comment(s)`, `Remark(s)`, `Memo`.
- **The value vocabulary widened, and decoration is stripped before the test.** Ticks (`✓ ✔ ☑ ✅`, variation selectors dropped), `y`, `finished`, and ISO **completion dates** (`2026-09-01`, with or without a time) all read as done — a "Finished on" column is a completion column, not a data column. Stripping decoration first means `✓ done`, `done ✔`, `- complete` and `✅` all count, while the tests stay anchored so `not done` and `incomplete` can't leak in as complete.
- **Resume is now visible instead of silent.** Each seeded column logs its own line naming the real header (`Seeded 5 'complete' status(es) from the file's Status column (round-trip)`), and the load toast reports the outcome: `Loaded 10 tasks from queue-turnstone.csv — resumed 5 complete · 5 notes`. Nothing is claimed when a file carries no such columns, or none of them hold values.
- **An all-complete file explains itself.** With completed cards hidden by default the card area used to read "No tasks match your filters."— technically true, useless on a file that is simply finished. It now says `All N tasks complete — tick “Show completed” to review them.` (the `done` count moved above the empty-state render so the two branches share it).
- Header evidence for "this first row is a header" now includes the widened status/notes words, so a list whose only recognizable header is `Completed` still parses as headed.

### Verification (in-browser, through the real loader)
The round trip was exercised the way a user does it — real `File` objects through `loadFromFileObject`, which is the shared path for both a **drop** and a **pick**: load `sample-links.csv`, mark two further rows complete and note a row, then re-import the app's own output. CSV (`Papa.unparse(buildExportMatrix())`), TSV (tab delimiter preserved) and XLSX (`XLSX.write`) each landed `10 tasks | 5 done | 5 left`, first note intact (`resume me`), completed cards hidden, toast `resumed 5 complete · 5 notes`, `statusCol=2, notesCol=3`.
Header probes: `Completed`, `Done` (Y/N), `Finished on` (dates), `Checked?`, `Notes / comments` all map to the right role; a `Priority` column containing `yes` is **not** mistaken for status; `✓ done` / `- complete` / `✅` / `☑️` are complete while `not done` / `incomplete` / `N` are not; and an all-complete file renders the new empty state with the toast `resumed 2 complete`. No console errors or warnings.

### Follow-through
`sw.js` → **`v0.9.2`** so the changed shell is re-precached. `README.md` gained a **Resume where you left off** bullet under *Working the list* (naming the accepted column names and values), `todo.md` the task entry with the verified counts, and `testing-notes.md` a step 4b: export a queue, drop it back in, expect the counts and notes to return — then rename the completed column and expect it to survive that too.

## 2026-09-24 — v0.9.0: more input formats (TSV, JSON, HTML tables, XML, spreadsheets)

**Request:** add more input-format support — TSV, JSON arrays, HTML tables, XML maybe, "potentially PDFs with tables or lists" — and call out other common formats people get work in with.

### The design bet: one matrix, many formats
Every supported input now collapses into the same value the CSV path always produced — a 2D array of strings. So the pipeline below the parse stage (`analyzeMatrix` → `loadMatrix` → `renderCards` → write-back) is untouched and format-agnostic, and adding a format is one `FORMAT_INFO` row plus one parser that returns rows.

New pieces in `app.html`: `FORMAT_INFO` (label + `writable` per format), `detectFormat()` (precedence: **magic bytes → content sniff → extension → Content-Type**, with the reason logged), and `parseDetected()` (dispatch). `loadFromFileObject` and `loadFromUrl` both now run through them, which also removed the duplicated parse branch the two loaders used to keep.

### Formats added
- **Delimited text** — one parser for CSV/TSV/semicolon/pipe, with PapaParse auto-detecting the delimiter (European `;` exports, Excel "Unicode Text"). A one-URL-per-line `.txt` becomes a one-column list.
- **JSON** — array of objects (union of keys → columns), array of arrays, a wrapping object like `{"items":[…]}` unwrapped automatically, an object map (keys kept as `_key`), and NDJSON/JSON Lines recovery when `JSON.parse` fails.
- **HTML tables** — the largest top-level `<table>` wins, `rowspan`/`colspan` expanded into a real grid, nested layout tables ignored. Parsed with `DOMParser` into an **inert** document, so page scripts never run and nothing is fetched. A *local* pick with no table falls back to its `<a href>` list (saved bookmarks pages); remote URLs do not, which is what keeps a 200-HTML error page from being silently imported.
- **XML** — finds the repeated record element and maps child elements *and* attributes to columns: RSS/Atom feeds, sitemaps, OPML subscription lists and generic `<record>` lists all become link queues. The picker is container-aware, which matters — in an RSS feed `<link>` occurs more often than `<item>`, and a naive count would tabulate the wrong element.
- **Excel/ODF workbooks** — SheetJS's own type detection now covers `.xls` (OLE2 magic), `.xlsm`, `.xlsb` and `.ods` beside `.xlsx`, at no extra dependency cost.
- **PDF** — detected via `%PDF` magic and refused with a clear message instead of being mangled. See the deferred note in `todo.md`.

### Write-back became format-aware
CSV, TSV and XLSX write silently back into the original file (TSV keeps its tab delimiter; the export filename strip now handles any extension). **Everything else is a one-way import**: the file handle is dropped, the load lands in fallback mode, and a toast says edits live in browser storage until exported. Two reasons, both correctness: rewriting a `.xls`/`.xlsm` container with XLSX bytes would drop macros and mislabel the file, and a JSON/HTML/XML source can't absorb Status/Notes columns without changing its shape.

### Files
- `app.html` — format layer, parsers, both loaders, format-aware write-back, and widened UI copy (`accept=`, `FS_PICK_OPTS`, welcome panel "Choose file…", empty states, PWA description).
- `sample-links.tsv` / `.json` / `.html` / `.xml` — new fixtures mirroring the CSV exactly, so every importer can be checked against the same target: 10 cards, 4 columns, 7 visible / 3 complete. The HTML fixture deliberately carries a nav link list above the table, and the XML one is feed-shaped.
- `sw.js` → `v0.9.0` (precaches the new fixtures).
- `README.md` — new "Supported input formats" section with the write-back rule spelled out; repo-layout tree updated (and the stale "plus PapaParse + SheetJS from CDN" line fixed).

### Verification (all in-browser against a local server)
- All four text fixtures via `?file=`: one correct `Format detection:` line each, then `urlCol=1, nameCol=0, statusCol=2, notesCol=3` → 10 cards / 7 visible / 3 complete — identical to the CSV.
- CSV and XLSX regressions pass unchanged.
- Workbook sweep: real xlsx/ods/BIFF8-xls/xlsb/xlsm files generated and read back through the detector — correct format, 3 rows, correct sample row, only xlsx `writable`.
- Parser sweep: JSON in five shapes, XML in four (including Atom `href` attributes and OPML), HTML with `rowspan`, nested tables and a link-only page, semicolon CSV, one-URL-per-line text, malformed JSON/XML, and the strict no-table error.
- Local-pick paths exercised through real `File` objects: correct `ext`, fallback mode, handle dropped for import-only formats, status/notes seeded from the file's own columns.
- `.fods` dropped from the extension map after SheetJS's flat-ODS reader threw `'table:table-cell' is not a valid selector` in browsers.

### Standalone single-file build, shipped as a beta
`assets/build-standalone.js` turns `app.html` into `turnstone-standalone.html` (~1.08 MB): the app shell, PapaParse, SheetJS and both logo SVGs in one document for `file://`, USB sticks, internal shares and air-gapped machines. Because the app already makes zero third-party requests, "building" is purely inlining — and the script treats that as a contract: it fails loudly if a `vendor/` or `assets/` reference would survive, and asserts the inlined library entry points really are present. It also flips a single-line `STANDALONE_BUILD` flag that suppresses service-worker registration, so a copied file doesn't 404 against a `sw.js` that was never next to it. A visible `beta · standalone` chip and a build stamp (timestamp + commit sha) ride along in the artifact.

Verified by serving a directory containing **only** the standalone file: the app booted with no external requests, no console errors, and the inlined SheetJS parsed `sample-links.xlsx` into the same 10 cards / 7 visible / 3 complete as the hosted app. Opening it is covered by docs; the File System Access API, clipboard and PWA code paths all degrade to their documented fallbacks on `file://`. The CSV-only variant remains open (it needs genuine degradation logic, not a missing script tag).

### Streamlined start experience (drag area + click to choose)
The welcome panel now leads with a **drop zone** instead of a `Choose file…` button: a dashed target reading "Drop a file here, or click to choose", listing the supported formats and stating that parsing happens on-device. It carries `role="button"` + `tabindex`, so Enter/Space open the picker too. Everything else moved behind it in order of likelihood — paste a link-list URL, then one compact "try it with sample data" row (the two test-data paragraphs collapsed into a single line).

The drop handlers sit on `document` rather than on the zone, for two reasons: a file dropped anywhere loads, and — the more important one — a drop outside the zone can no longer make the browser navigate away from the app to the dropped file. Every handler gates on `dataTransfer.types.includes('Files')`, so the settings panel's column-reorder drag keeps working untouched.

Dropped files and write-back: Chromium exposes a `getAsFileSystemHandle()` per dropped item, so the code resolves one and uses it only when it is *already* writable — deliberately no permission dialog on drop. Otherwise the load lands in fallback mode with the usual browser-storage persistence, export and `beforeunload` guard, and the reason is logged.

Verified with synthetic `DragEvent`s in the browser: a `text/plain` drag is neither prevented nor highlighted, a `Files` drag is prevented and highlights the zone, a dropped `.tsv` produced 2 cards (1 complete, round-tripped from its Status column) and hid the welcome panel, a dropped `.json` replaced the open queue with correct columns and notes, and click + Enter both reach `openLocalFile()`. `sw.js` → `v0.9.1`.

### Sales page
`index.html`'s copy, FAQ answers and JSON-LD feature list said "CSV or XLSX" and now name the wider set; the long-standing claim that you can drag a file onto the app was left intact at the time (flagged as unimplemented) and is **now true** — see the streamlined start experience below.

## 2026-09-24 — v0.8.0: vendored dependencies + zero data call-outs, sales-page hero fix

**Requests:** (1) vendor SheetJS and any other dependencies so nothing loads from a CDN — the tool must work in highly secure environments; (2) then add headers that prevent data call-outs, as long as that doesn't break iframe mode; (3) fix the sales-page logo placement and shorten the hero heading; (4) add bundled single-file `.html` builds for `file://` / internal hosting to the roadmap.

### Vendored dependencies (`vendor/`)
- `vendor/papaparse.min.js` (5.4.1) and `vendor/xlsx.full.min.js` (0.20.3) — the exact upstream builds, fetched from the very URLs the page used to reference, syntax-checked and served from the repo root.
- `app.html`'s script tags now point at `vendor/…`; both CDN `<script>` tags are gone. Verified in-browser: a full CSV load produced **only same-origin requests** (shell, logo SVGs, both vendor scripts, the data file) — no jsdelivr, no sheetjs.com.
- `sw.js` → `v0.8.0`: precaches `vendor/papaparse.min.js` + `vendor/xlsx.full.min.js` instead of the CDN URLs, and the cache-first CDN branch is deleted (nothing requests those hosts any more).

### Data-call-out lockdown (CSP + referrer policy)
- GitHub Pages can't set HTTP response headers, so the policy ships as `<meta http-equiv="Content-Security-Policy">`.
- `app.html`: `default-src 'self' file:`; `script-src`/`style-src` `'self' 'unsafe-inline' file:` (the app *is* an inline-script single file); `img-src 'self' data: blob: file:`; `manifest-src 'self' blob: file:` (the PWA manifest is a runtime Blob URL); `worker-src 'self' blob: file:`; `connect-src 'self' https: blob: file:`; `object-src`, `base-uri`, `form-action` `'none'`. `file:` is listed throughout so copies opened from disk keep working.
- **`frame-src https: http: file:` is deliberately left open** — the iframe workspace has to frame the sites in the queue. Verified live under the policy: tabs mode + a card click produced `GET https://example.com/ → 200 (Document)`, the workspace tab opened normally, and **no CSP violation was logged**. That was the acceptance test for "don't break iframe mode."
- `connect-src` keeps `https:` because the **user-initiated `?file=` / share-link remote load is a supported feature** — it's the product's single outbound path. Everything else outbound is closed: `ws:`/`wss:` (a classic exfiltration channel), `http:`, and `data:`. With `form-action 'none'` and `object-src 'none'`, the classic data-call-out routes are shut. `referrer: no-referrer` on both pages stops deep-link URLs leaking via `Referer` to framed or fetched sites.
- Sales page (`index.html`) is stricter: `default-src 'none'` plus only `script-src`/`style-src 'unsafe-inline'` (its inline legacy redirect) and `img-src 'self' data:`. Console stayed completely empty — no violations.
- Regression-tested under the policy: CSV load (PapaParse), XLSX load (`Parsing XLSX binary (17881 bytes) with SheetJS` → 11 rows → 10 cards), CSV blob download + XLSX write via SheetJS (15,914 b), the PWA manifest blob, session persistence to IndexedDB, and the legacy `?file=` redirect from the sales page. **Zero CSP violations anywhere.**

### Sales page: hero logo + headline
- The hero had `padding: 0` and the logo's `getBoundingClientRect().top` was `0` — the stone was jammed against (and visually clipped by) the top edge. Added `padding: 3.6rem 0 3.2rem` to `.hero`; the logo now sits 58px down with real breathing room.
- Removed the duplicate 13px logo inside the eyebrow pill — two marks stacked read as a mistake. The pill is now text-only.
- Headline shortened from "Your link spreadsheet, worked like a workspace." to **"Your spreadsheet, now a modern workspace."**

### Roadmap
- `todo.md` + README roadmap: **bundled single-file `.html` builds** (`turnstone-standalone.html`) for `file://` and internal/air-gapped hosting — a build step inlining the shell, vendored libraries, and icons into one document, plus an optional CSV-only variant. Since the app now makes no external requests, that build is genuinely self-contained.
- Also fixed a stale filename in the porting prerequisite (`index.html` → `app.html`).

## 2026-09-23 — v0.7.1: New logo (engraved stone) + web-MCP future state

**Request:** the product logo is a circular grey stone with a dark-grey checkmark engraved into it — compose it as SVG, break it out into asset files, keep easy light/dark variants. Also add web MCP setup to the future-state plans (agents set up the workspace for users, or take over on request).

### Logo system (`assets/`)
- `logo.svg` (master), `logo-light.svg` (brighter stone for white surfaces), `logo-dark.svg` (rimmed stone for dark surfaces) — the engraving is a second, +2px-offset copy of the check under the main one, reading as the groove's shadow lip. Theme swap is a plain CSS rule keyed off the app's existing `data-theme` attribute.
- `build-icons.js`: zero-dependency rasterizer + PNG encoder that regenerates all rasters from the master geometry (`node assets/build-icons.js` → `assets/icon-192/512.png`, `icon-maskable-512.png` at 80% safe zone, plus root-level copies the SW precaches). PNGs verified structurally (chunks, zlib stream, RGBA8) and via ASCII render showing the engraved check.
- Consumed everywhere: `app.html` favicon + apple-touch-icon data URIs now the new icon (old gem retired); welcome-screen branding shows the real logo with light/dark variants; the inline PWA manifest gains the 512px and maskable icons; sales page hero shows the logo and its favicon path was fixed (`assets/icon-192.png`); SW precaches the SVGs and bumps to `v0.7.1`.

### Future state: web MCP server (`todo.md`)
- Agent tools (`load_queue`, `set_open_mode`, `get_state`/`set_status`/`set_notes`, `complete_row`/`advance`, `export`, `screenshot`), a "set up for my user" flow (load file, apply preset, pick mode, hand over a ready workspace / deep link) and a "take over for me" flow (agent works the queue through the same write-back engine), transport options (Streamable HTTP vs local stdio+CDP companion), and the shared `core.js` constraint.

Also: README repo-layout tree + roadmap updated for the new assets and the MCP item.

---

## 2026-09-23 — v0.7: Sales page + ports scaffolding

**Request:** scaffold the bookmarklet / extension / Tauri ports; make `index.html` an SEO/AEO sales page following the SupportLayer/Hushwing pattern (biggest selling point: a modern streamlined workspace with **no expensive backend** — spreadsheet users get an instantly upgraded experience); move the actual app to a linked `app.html`; README notes future-state plans. **No animated background.**

### Restructure
- `index.html` → `app.html` (git mv). SW precache now lists `app.html` + the new sales page, `VERSION` bumped to `v0.7.0`; manifest `start_url` annotated (still `location.pathname`, so the installed PWA keeps launching the app and deep links keep working).
- New `index.html` = the sales page. Follows the SupportLayer pattern (eyebrow → hero h1/subtitle → CTA pair → product visual → feature boxes → workflow → FAQ → footer with cross-project links), in Turnstone's own palette. **Static** radial-gradient background, explicitly no animation.

### Sales page (SEO + AEO)
- Meta description/canonical/OG/Twitter; `SoftwareApplication` JSON-LD (free offer, featureList) and `FAQPage` JSON-LD whose answers mirror the visible FAQ details — answer-engine-ready.
- Keyword-targeted copy: link queue manager, CSV task tracker, spreadsheet workflow, zero backend, client-side. The pitch: keep the spreadsheet you already have, get a modern split-pane workspace — no backend to buy, no seat licenses, nothing to sign up for.
- Pure-CSS product mock of the real app (tab bar + framed page on the left, task cards with ✓ Complete / DONE chips on the right) instead of a screenshot.
- FAQ includes the honest iframe-headers answer (browser rule, not a bug; switch open mode; native version removes it) and links the roadmap.
- Deep-link compatibility: visitors hitting the root with `?file=`/`?url=` (old bookmarks/shared links) are forwarded to `app.html` preserving all params.

### Ports scaffolding (`ports/`)
- `ports/README.md` — map + status of all ports; shared `core.js` prerequisite.
- `bookmarklet/` — README with the locked scope (session-only memory, CSV-only fallback with built-in RFC-4180 parser when SheetJS can't load, <~8KB budget) + planned `build.js`/`src/`/`dist/` layout.
- `extension/` — MV3 `manifest.json` (sidePanel/tabs/storage/downloads/contextMenus), `background.js` service-worker scaffold (context menu + open-tab/focus-tab message surface), `sidepanel.html/js` stubs.
- `tauri/` — Tauri 2 `tauri.conf.json` scaffold (`frontendDist` → repo root so the canonical app is the frontend, tray + bundle icons) + README (CORS wall disappears; silent write-back; tray; auto-update).

### README
- Rewritten: app links point at `app.html`, root is described as the sales page, repo-layout tree added, and a **Roadmap** section summarizes the ports + future state (comms hand-off layers, native CORS bypass, cloud sync).

Not yet done: live Pages verification of the new root/`app.html` split (right after this push), and the ports' actual builds (items logged in `todo.md` v0.7).

---

## 2026-09-23 — Bookmarklet scope: CSV-only fallback when SheetJS can't load

**Request:** the bookmarklet must work in even the most secure environments — if SheetJS fails to load, fall back to CSV-only for that session and make the UI say so.

### Added to the bookmarklet scope in `todo.md`
- The payload embeds its own tiny RFC-4180 CSV parser (quotes, embedded commas/newlines), so a failed CDN injection never means a broken app.
- On SheetJS load failure/timeout (blocked network, strict CSP, no external scripts): **CSV-only session** — CSV loading, cards, link modes, and CSV export keep working; XLSX loading is disabled with a visible badge ("CSV-only — SheetJS unavailable") and a toast if the user tries an .xlsx file; XLSX export hides itself.
- Failure is always visible and explained — never silent or broken. This makes the no-external-scripts case (the strictest lockdown) a fully supported first-class mode.
- Budget unchanged (< ~8KB minified) with the fallback parser included.

No code changes in this step — scope documentation only.

---

## 2026-09-23 — Port plans revised: extension is sidebar-only + tab switching; Tauri keeps iframes

**Request:** update the Chrome-extension and Tauri plans per feedback.

### Changes recorded in `todo.md`
- **Chrome extension** — now explicitly **sidebar-only UX**: render just the task-card sidebar via Chrome's Side Panel API and **skip the entire iframe workflow**. Links open as real browser tabs (`chrome.tabs.create`), and selecting a card **switches the active tab** to that page (`chrome.tabs.update`). Everything else mirrors the web version (parsing, columns/presets, complete/undo, show-completed, sort, auto-open/auto-advance where "open" means tab-switch, downloads export, chrome.storage persistence). Open-mode menu collapses to tab mode.
- **Tauri app** — matches the web version's full experience **including the tabbed-iframe workspace**; the feedback confirms the iframe CORS/X-Frame-Options issue disappears in the Tauri shell, so sites that refuse iframing on the web work natively there. Filesystem write-back without permission prompts, tray, auto-update unchanged.
- Web app stays the canonical core (DOM-free `core.js` prerequisite unchanged).

No code changes in this step — planning only.

---

## 2026-09-23 — Bookmarklet scope: composes the app live, session-only memory

**Request:** define the bookmarklet's scope — it composes the Turnstone app live in a new tab; keep what's possible given that session/localStorage won't stick, but the core items remain: CSV/XLSX parsing via SheetJS, card rendering, ideally file write-back, export, and iframe/new-tab/window link modes.

### Recorded in `todo.md`
- **Composition model:** bookmarklet injects CSS + builds the full app DOM in a new tab — no hosted file, any origin.
- **Kept core:** SheetJS parsing (covers CSV and XLSX, so PapaParse is optional), card rendering with complete/undo and show-completed, the three link-opening modes, and CSV/XLSX export downloads.
- **Write-back:** included via the File System Access API where available (pick file once per session, silent write-back while the tab lives); export is the fallback elsewhere.
- **Explicit non-assumption:** storage does NOT persist — state is session-only in JS, with an in-page "Copy state / paste-restore" pair as the manual carry-across-sessions mechanism.
- **Practical constraints noted:** SheetJS CDN injected dynamically at runtime (the one network dependency); payload budget < ~8KB minified so it survives paste into bookmark fields.

No code changes in this step — scope documentation only.

---

## 2026-09-23 — Future state: ports (bookmarklet, Chrome extension, Tauri)

**Request:** add other versions/ports of Turnstone to future state — a bookmarklet version, a Chrome extension version, and a Tauri application version.

### Recorded in `todo.md`
- **Bookmarklet** — capture the current page's links (or a pasted list) into a Turnstone queue; options: fully self-contained inline UI vs. seeding the hosted app via URL hash; sync status back via localStorage/postMessage.
- **Chrome extension (MV3)** — side-panel queue over the active tab, native iframe/XFO bypass, downloads API for exports, context-menu link capture, badge count, chrome.storage sync; shares the web app's core code.
- **Tauri app** — native desktop shell with a Rust backend: unrestricted filesystem write-back (every OS, no permission prompts), no CORS limits, system tray, global hotkey capture, auto-update; small binary vs Electron.
- **Shared prerequisite noted** — extract a DOM-free `core.js` (parse/analyze/presets/persistence) so all ports reuse one canonical codebase; this also un-blocks the Deferred/V2 iframe-bypass item, which the extension and Tauri ports make feasible.

No code changes in this step — planning only.

---

## 2026-09-23 — Queue UX: click-to-open, one-click complete, auto-open/auto-advance, sorting (v0.6)

**Request:** no Open button — clicking a card opens its link; optional auto-open on card selection; optional auto-open-next-on-complete; complete dropdown becomes a single button; completed cards hidden by default with a reveal option plus a subtle per-card undo; sort cards by any column asc/desc.

### Delivered
- **Click = open** — the Open ▶ button is gone; clicking a card's title opens its link (per selected mode) and expands the card. The card-URL link and ↗ still force real browser tabs.
- **✓ Complete / ↺ Incomplete** — the status dropdown is now a single button: green ✓ Complete on open cards; completed cards get a subtle dashed ↺ Incomplete to flip back. Cards dim slightly when done.
- **Completed hidden by default** — a **Show completed** checkbox (replaces "Hide completed", inverted semantics); the filter line shows `N shown · M hidden` while filtered.
- **Automation options** (☰ menu, persisted): **Open link when card is selected** (opening happens on title click which also expands), and **Auto-open next after completing** — completing a card opens the next incomplete card's link (file order, wrapping), with a 🎉 "queue finished" toast on the last one.
- **Sorting** — a Sort row in the sidebar: column dropdown (file order default; fixed roles marked `*`) + asc/desc toggle. Numeric-aware ordering, case-insensitive strings; persists per file until reset.

### Verified in sandbox
- Test CSV: 7 visible (3 completed hidden), filter info `7 shown · 3 hidden`; Show completed → 10 with 3 undo buttons; undo flips status and re-hides.
- Title click opens iframe tab + expands (no Open button anywhere); Complete hides the card; auto-advance opens next incomplete; toggles persist in localStorage and check/uncheck in the menu.
- Sorting by Name asc/desc and by Status groups completes first when ascending; file order resets cleanly; demo + test regressions pass.

---

## 2026-09-23 — Open modes + hamburger UI (v0.5)

**Request:** iframed tabs are one mode among several, not the default for everyone — users pick tabs / new browser tab / popup windows when they first load a file, changeable live in settings. Drop the branding topbar (brand the launch screen instead) and move its UI into a hamburger menu at the top of the sidebar for maximum vertical space. Also add phone/SMS/mail hand-off layers to future state.

### Delivered
- **Open modes** — `tabs` (iframes, the old behavior), `newtab` (real browser tab), `newwin` (popup window, `noopener`); stored in localStorage, applied everywhere links open (card title click, Open ▶ button, `?open=1` deep link) via a single `openUrlFor()`. Popup-blocked toast in `newwin`.
- **First-run picker** — on the first file load, a modal asks how to work through links (3 options with hints + "Decide later (tabs by default)"); choice persisted and never shown again. Re-openable anytime via ☰ → "Which should I pick?".
- **Live switching** — ☰ menu lists all three modes with a ✓ on the active one; switching takes effect immediately (tabbar shows/hides itself outside tabs mode; empty-state hint only renders in tabs mode).
- **Topbar removed** — branding moved to the welcome screen (◆ Turnstone + tagline); all topbar actions relocated:
  - Sidebar header: ☰ button + current file name with mode/ext + save dot (● unsaved / ✓ saved hh:mm).
  - ☰ menu: Open file…, Restore last file, Close current file, Copy share link, — Opening links (3 modes + help), Columns & presets…, Export CSV/XLSX, Install app, Light/Dark toggle. Outside-click and Esc close; item availability matches state (export disabled without a file, link disabled without a source URL, restore hidden until one exists).
- **Future state added to todo.md** — phonelayer embedded (`tel:` hand-off to the OS/PWA dialer) and maillayer embedded (`mailto:`/`sms:` hand-off + templates), each respecting the open-mode concept.

### Verified in sandbox
- Topbar gone; welcome branded; sidebar header shows file · mode · ext and save state; menu open/close (button, outside click, Esc) works.
- Mode items check correctly; switching tabs→newtab→newwin persists across calls; card click honors the mode (tab opened in tabs mode; `window.open` to example.com in newtab mode; popup-blocked toast in newwin); `?open=1` path routed through `openUrlFor`.
- First-run picker: shows on first load, disappears after picking (newwin chosen), never again afterwards; "Decide later" leaves tabs default.
- Menu regressions: export/theme/columns/close all function from the menu; export disabled without file; restore item appears only when a recents record exists.
- Demo + test CSV/XLSX regressions pass; title click expands card + opens per mode.

---

## 2026-09-23 — Card layout tweaks: inline copies, column collapse/expand, layout presets (v0.4.1)

**Request:** (1) copy icons always sit just right of the value they copy and show on hover; (2) cards show only the first 3 data columns by default, and clicking a card opens the URL *and* expands it to show the rest; (3) a settings gear to choose which columns show, in what order, saved as presets that auto-apply when other files load with the same headers in the same order.

### Delivered
- **Inline hover copies** — every value row (name, URL, notes, each extra column) ends with its own ⧉ button (`data-copy-col="row:col"`), revealed on card hover (`opacity` transition), always visible on touch devices (`hover: none`) and flashed ✓ on copy.
- **Compact cards + expand** — fixed card features (name/URL/status/notes) stay put; data columns render as labeled rows showing only the first 3. A ▼ +N toggle expands/contracts a single card; **clicking the card title opens the URL in a workspace tab and expands the card** in one action. Empty cells render no row.
- **⚙ Columns panel** — lists every column (URL/name/status/notes pinned as fixed card features; extras draggable + checkbox-toggled), Apply/Delete per preset, Reset to file order. Presets are saved in `localStorage` keyed by a header signature (trimmed/lowercased header row joined with `¦`), and `loadMatrix` auto-applies a matching preset on any file load (order + hidden set, tolerant of extra/missing columns). Empty cells stay rowless; column order also drives search (full-row match) and export is unchanged.

### Verified in sandbox
- 6-column synthetic file: collapsed = 3 data rows (fixed cols excluded), toggle expands to 4 with correct labels; title click opens the iframe tab AND sets `ex`.
- Settings: 8 rows for an 8-col file (4 fixed), hide via checkbox shrinks cards, drag reorder + reset work, preset save/apply/delete with live toast.
- Preset auto-apply: reload with identical header applies the saved order/hidden automatically; a file with a changed column name does NOT match (fresh order). Demo + test CSV/XLSX regressions pass (10 cards, 3 seeded, no extra-column UI when there are none).
- Hover reveal confirmed (transition-aware read: opacity 1 on hover/`.ok`; idle 0; touch always-on via media query).

---

## 2026-09-23 — PWA: installable + offline (v0.4)

**Request:** make Turnstone installable as a PWA (manifest + service worker, still single-file friendly) so it works offline and can be installed from the browser.

### Delivered
- **Icons** — `icon-192.png` (2.2 KB) and `icon-512.png` (8 KB), generated programmatically in Node (hand-built PNG encoder: CRC-checked chunks, deflate): rounded tile in the app's accent gradient with the white Turnstone gem, transparent outside the rounded corners, safe for masking. Both also embedded in `index.html` as data URIs (favicon + apple-touch-icon).
- **Inline web-app manifest** — built at runtime from the embedded icon data URI and injected as a Blob URL: no `manifest.json` file needed; `name`, `short_name`, `display: standalone`, `start_url: location.pathname` (deep links keep working from the installed app), `scope`, dark `theme_color`/`background_color`.
- **`sw.js`** — versioned cache (`turnstone-v0.4.0`): precaches the shell, both CDN libraries (PapaParse, SheetJS), icons, and the sample files (each miss tolerated so sandboxed previews can't break install); stale-while-revalidate for same-origin assets; cache-first for CDN (immutable versioned URLs); network-first navigations with cache fallback so the app **opens offline**, deep links included (`ignoreSearch` + clean-path fallback); old caches purged on activate.
- **⤓ Install button** in the topbar, shown only when the browser fires `beforeinstallprompt`; hidden after install or dismissal; `appinstalled` welcome toast.
- **Graceful degradation** — SW registration only on https/localhost; skipped (with a log line) on `file://`.

### Verified
- Manifest JSON parses from the Blob URL with correct fields and a data-URI icon.
- In the sandbox preview (no sibling files served): SW registration fails soft with a warning — no unhandled errors, app fully functional.
- README gained an Install section + `sw.js` docs entry.

### Verified in production (post-push `87c5068`)
- Pages rebuilt; `sw.js`, `icon-192.png`, `icon-512.png` all HTTP 200.
- SW registered and **activated** on the live site (`turnstone-v0.4.0`, scope `/Turnstone/`); page controlled.
- Cache inspection: all 8 precache entries present (shell, both CDN libs, icons, both samples); cache matches serve the shell for deep-link paths (`ignoreSearch`) and the CDN libs.
- App fully functional under the SW: sample CSV loads 10 cards with 3 seeded statuses while controlled.
- Note: the ⤓ Install button needs a real (non-embedded) browser session — `beforeinstallprompt` doesn't fire in the automation browser; on regular Chrome/Edge the button appears once the SW is active.

---

## 2026-09-23 — Production deployment + README demo links (v0.3.1)

**Request:** make sure everything is pushed and working in prod, and update the README to link the web app plus an example deep link that pre-loads a demo file.

### Delivered
- **Enabled GitHub Pages** for the repo (`main` branch, root) → **https://spuds0588.github.io/Turnstone/** — the natural prod home for a zero-server static app.
- **README** now opens with the live-app link and two copy-pasteable example deep links: the CSV one (`?file=` pre-loading `sample-links.csv` from the repo itself) and an XLSX one with `&open=1` that auto-opens the first task.

### Verified in production
- Pages build completed; app root, `index.html`, `sample-links.csv`, and `sample-links.xlsx` all HTTP 200.
- `access-control-allow-origin: *` confirmed on the sample files, so the app can fetch its own samples cross-origin.
- Live E2E in a real browser against the Pages URL: CSV via `?file=` → 10 cards, 3 seeded statuses, chip + Link button working (clipboard copy confirmed); XLSX via `?url=&open=1` → sheet `Links`, 10 cards, first task auto-opened in a workspace tab.
- README pushed (`18dcd16`), verified live on `raw.githubusercontent.com` (3 live-link + 5 demo-param mentions); repo in sync with `origin/main`.

---

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

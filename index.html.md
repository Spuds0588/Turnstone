# Turnstone — tracking your work on a spreadsheet is dumb

> Tracking your work on a spreadsheet is dumb. Throw it at Turnstone instead: the CSV, XLSX, Word
> table, Markdown list, JSON export, email thread or pasted table you already keep becomes task cards
> with statuses and notes, with the pages themselves alongside. Everything happens in your browser: no
> account, no server, nothing uploaded, and the file you started with is the one that gets updated.

Canonical page: <https://spuds0588.github.io/Turnstone/>
Part of: <https://spuds0588.github.io/Turnstone/> — see also <https://spuds0588.github.io/Turnstone/llms.txt>
Licence: MIT · Free and open source · No telemetry · No account

## Why it works when the process doesn't

Your list can be a mess upstream — six systems, a chain of forwards, a sheet kept by hand. Throw
anything in, and your side of it comes out as one organized system.

- **Throw anything in. Organized work comes out.** CSV, TSV, XLSX, Word tables, Markdown, JSON, HTML
  tables, XML feeds, saved email — even a table pasted from a portal. Any list, any spreadsheet, becomes
  task cards with statuses, notes and the pages themselves: one system for doing the work, not a grid of
  cells. Rows with *no links* work too: point it at your portal once (`…/ticket/{Ticket}`) and every card
  builds its own address.
- **No account, nobody to ask.** One person can start today: no sign-up, no seat licence, no IT ticket, no
  manager sign-off.
- **All local — nothing is uploaded.** There is no server to upload to. Your browser reads your file and
  writes your ticks and notes back into that same file.
- **Works with the web tools you already use.** Pages open beside the list instead of in fifteen tabs, and
  an address or a number opens your webmail or web phone — not a desktop app you don't have.
- **Works with your AI agent already.** Your assistant finds or writes the list and gives you one link. It
  opens ready to work, and the rows travel inside the link rather than through a server. See
  [Share a list as a link](https://spuds0588.github.io/Turnstone/workspace-link.html.md).

## From list to workspace in one step

1. **Throw the list in** — drop a CSV, XLSX, Word table, Markdown list, JSON or saved email anywhere on the
   app, paste a table, or open a link someone sent you. No template, no import wizard.
2. **Work it like an app** — cards down one side, pages across the other. Complete, note, auto-advance —
   and your file is already up to date.
3. **Let your agent hand you the list** — have your assistant find or write it, and open the link it
   gives you. Nothing to set up, install or upload.

## Supported formats

CSV, TSV, XLSX (plus XLS/XLSM/XLSB/ODS), Word tables (`.docx`), Markdown task lists and pipe tables,
JSON, HTML tables, XML feeds (RSS, Atom, sitemaps, OPML), saved email (`.eml` and `.mht`, with the list
in the body or a spreadsheet attached), and a table pasted from the clipboard.

The link column is chosen from the **values** rather than the headers, so a URL, an email address or a
phone number all work as the thing a row opens; if it ever guesses wrong you can set the column in
**⚙ Columns**, and the choice is remembered per layout. CSV, TSV and XLSX can be written back in place;
the other formats are read-only sources.

## Editions

Four, and most of the time you want the first:

- **[Web app](https://spuds0588.github.io/Turnstone/web-app.html)** — the full experience, installable as
  a PWA, with silent write-back to your file in Chromium, offline access from a service-worker cache, and
  your queue remembered between sessions.
- **[Standalone single file](https://spuds0588.github.io/Turnstone/standalone.html)** — one HTML document
  holding the app, its libraries and its artwork, for a machine where nothing may be installed or fetched.
- **[Bookmarklet](https://spuds0588.github.io/Turnstone/bookmarklet.html)** — the whole workspace running
  over any page you are already on, in three sizes, the smallest carrying no libraries at all.
- **[Chrome extension](https://spuds0588.github.io/Turnstone/extension.html)** — a side panel that drives
  real browser tabs, so a site that refuses to be framed still works.

A native desktop edition and a Firefox sidebar are next.
[The versions page](https://spuds0588.github.io/Turnstone/versions.html) compares them in one screen.

For agents: the web app, the standalone build and the bookmarklet all open a workspace **link**; the
extension takes a data **file** (CSV, TSV, XLSX) into its side panel, and no edition's panel can be driven
by an agent — a side panel is worked by a person in a real browser window.

## Questions, answered

**Does Turnstone upload my spreadsheet anywhere?**
No. Parsing, tracking and saving all happen in your browser, and your file is written back to your own
disk. Nothing is uploaded — you can watch the network tab stay quiet.

**What file formats does Turnstone support?**
CSV, TSV, XLSX (plus XLS/XLSM/XLSB/ODS), Word tables (`.docx`), Markdown task lists and pipe tables,
JSON, HTML tables, XML feeds, saved email (`.eml` or `.mht`, list in the body or a spreadsheet attached)
and a pasted clipboard table. The link column is picked from the *values* — a URL, an email address or a
phone number — and you can set it yourself in **⚙ Columns**. Statuses and notes are saved back into the
file (or exported where the browser can't write).

**Can I pick up where I left off?**
Yes. Reload the same file and its status and notes columns are read back onto the cards, so the queue
continues where it stopped. The completed column is recognised by name (`Status`, `Done`, …) as well as by
its values (`done`, `yes`, `1`, a tick, a date).

**Do I need IT approval, a licence or an account?**
No. Nothing to install, no account, no server and no per-seat cost — one person can just start, with no
rollout and no procurement conversation. Open source and MIT licensed if anyone asks.

**What do I have at the end?**
The same file you started with, updated with your ticks and notes. Nothing to copy back, nothing to
reconcile, nothing done twice.

**Can my AI agent set it up for me?**
Yes — it is the shortest path from "here's a list" to "here's a workspace". Your assistant hands you a
[workspace link](https://spuds0588.github.io/Turnstone/workspace-link.html.md): the rows travel inside the
URL, after the `#`, which a browser never sends to a server. Open it and the queue is ready, with nothing
set up, installed or signed up for. Agents that produce files work too: point the app (or the Chrome
extension) at the spreadsheet. <https://spuds0588.github.io/Turnstone/llms.txt> has the format.

**Some sites refuse to load in the tabbed pane. Why?**
A few sites forbid being framed by any web app — a browser rule, not ours. Switch the open mode to a new
tab or a popup in the ☰ menu, or use the Chrome extension, which never frames a page.

# Turnstone skill — set up and hand over work queues from an agent

Give this file to your AI agent (Claude, a coding agent, any assistant that reads
Markdown). It tells the agent how to hand a list to **Turnstone** —
<https://spuds0588.github.io/Turnstone/app.html>, a zero-backend workspace that turns
a list of links into task cards with statuses and notes, and writes progress back to
the file — using only the tools that already exist: text, URLs, and files.

Two ways to hand over work, in order of preference:

1. **A workspace link** — the list travels *inside* the URL. Nothing is uploaded,
   nothing is fetched, and opening it loads a ready queue. This is the skill.
2. **A data file** — write a `.csv`/`.tsv`/`.xlsx` to disk. Every Turnstone edition
   opens one, including the Chrome extension, which takes files but not links.

## The one rule that makes a link work

```
url = "https://spuds0588.github.io/Turnstone/app.html#zdata=" + payload + "&sum=" + sum

raw    = utf8_bytes(list_text)
sum    = base36(len(raw)) + "." + base36(fnv1a32(raw))     # e.g. "eu.1trlcee"
zdata  = base64url(deflate_raw(raw), padding=none)          # raw deflate — NOT zlib, NOT gzip
```

- **`fnv1a32` must be a true 32-bit multiply.** In JavaScript use `Math.imul(h, 0x01000193)`;
  the naive `h * 0x01000193` overflows float64 past 2^53 and the hash silently disagrees
  with Turnstone's, so the link is refused as tampered. In Python and other languages with
  native 32-bit ints: `h = ((h ^ byte) * 0x01000193) & 0xFFFFFFFF`.
- **The checksum is optional but always build it.** A link cut short in transit either
  refuses to open or (worse, without a checksum) opens a shorter queue that looks normal.
- **Deflate must be raw** (window bits −15). `zlib.deflate()` output will not decode.

Node, three lines, standard library only:

```js
const zlib = require('zlib');
const b = Buffer.from(list, 'utf8');
let h = 0x811c9dc5; for (const x of b) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; }
const url = 'https://spuds0588.github.io/Turnstone/app.html'
  + '#zdata=' + zlib.deflateRawSync(b).toString('base64url')
  + '&sum='   + `${b.length.toString(36)}.${(h >>> 0).toString(36)}`;
```

Python, standard library only (base36 included — the `sum` is base 36, not hex):

```python
import base64, zlib

def b36(n):
    d = '0123456789abcdefghijklmnopqrstuvwxyz'
    s = ''
    n = int(n)
    while n:
        s = d[n % 36] + s
        n //= 36
    return s or '0'

raw = list_text.encode('utf-8')
co  = zlib.compressobj(9, zlib.DEFLATED, -15)          # -15 = raw deflate
payload = base64.urlsafe_b64encode(co.compress(raw) + co.flush()).rstrip(b'=')
h = 0x811c9dc5
for x in raw:
    h = ((h ^ x) * 0x01000193) & 0xFFFFFFFF
url = (f"https://spuds0588.github.io/Turnstone/app.html"
       f"#zdata={payload.decode()}&sum={b36(len(raw))}.{b36(h)}")
```

## Optional URL parameters (after `&sum=…`, or on their own)

| Parameter | Use it when |
| --- | --- |
| `&name=Quarterly%20outreach` | You want the sidebar to name the workspace. |
| `&open=1` | The user should start on the first task immediately. |
| `&format=csv` | The list's format is ambiguous and sniffing may guess wrong (`csv`, `tsv`, `json`, `md`, `xml`, `html`). |
| `&link=https://portal.example.com/ticket/{Ticket}` | The rows have **no links** — they are keys into one portal. `{Column}` is percent-encoded, `{Column|raw}` is spliced verbatim, `{0}` by position. Only `http(s)` results become links. |

## Shaping the list so the columns land right

Turnstone picks the URL / name / status / notes columns from the **values**, not just
the headers, and remembers the choice. You almost never need to configure anything —
but a list shaped like this parses perfectly every time:

```csv
Name,URL,Status,Notes
Acme Corp,https://acme.example.com,incomplete,"Call Friday — asked for the MSA"
Bright Path,https://brightpath.io,complete,
```

- **Status values that count as done:** `complete`, `done`, `yes`, `true`, `1`, `x`, `✓`,
  and the terminal states systems emit — `closed`, `resolved`, `approved`, `paid`,
  `sent`, `rejected`, `archived`, … (anchored, so "in progress" never reads as done).
  A `YYYY-MM-DD` date in the status column counts as done, too.
- **Header words recognized:** name/title/task/summary/vendor/client/… ·
  url/link/site/address/… · status/state/stage/phase/progress/… ·
  notes/comments/remarks/memo.
- **A list with no URL column at all is a supported input**, not an error — that is the
  portal case above. Rows whose only "link" is a ticket number are exactly what
  `&link=` is for.
- CSV, TSV, JSON (array of objects), Markdown task lists, and HTML tables all work in a
  link. Pick whichever your source already is.

## Choosing the hand-off

- **List fits in a URL** (roughly under 100 KB of text; it compresses 4–6×) → build a
  workspace link. Under ~1 KB, prefer the readable `#data=<percent-encoded list>` form
  instead of compressing. Past 100 KB the app warns that chat clients trim links; past
  2 MB it refuses — switch to a file.
- **The user works in the Chrome extension's side panel** → a panel has no address bar.
  Send a **file** instead (or the link pasted into ☰ → *Open a workspace link…*), and
  say so.
- **The list is huge or lives behind a login** → write a `.csv`/`.xlsx` file to a shared
  location and give the user the path; every edition opens it with the picker.

## Verifying your link before you send it

Decode-then-recompute in the same breath — never trust the URL you built:

```js
const round = zlib.inflateRawSync(Buffer.from(payload, 'base64url')).toString('utf8');
if (round !== list) throw new Error('link does not round-trip');
```

If you have a browser tool, open the link once: a good link opens with a toast
`Opened a shared workspace — N tasks read from the link`. A refusal message is honest —
it means truncation or a hash mismatch, and it names which.

## What you cannot do (so you do not try)

- **Drive the workspace itself.** No edition can be operated by an agent: there is no
  API, deliberately, because the app is a single file with no backend. The hand-off is
  the whole contract — build the link or the file, hand it over, and the person works it.
- **Fetch the user's file.** A workspace link needs nothing fetched; a `?file=` deep
  link needs a public URL and the user's browser does the fetching. Never assume you can
  read their disk.
- **Share links carry state after the `#` only.** Do not put a payload in the query
  string of a request a server will log — `#data=`/`#zdata=` stay in the browser.

## One-paragraph version for a system prompt

> To give someone a Turnstone workspace from a list you found or generated: UTF-8 the
> list, raw-deflate it, base64url it without padding, prepend
> `https://spuds0588.github.io/Turnstone/app.html#zdata=`, append
> `&sum=<base36 len>.<base36 fnv1a32>` (Math.imul in JS, 32-bit mask in Python), plus
> `&name=`, `&open=1`, `&format=`, or `&link=<portal template with {Column}>` as needed.
> Hand over the URL. The link opens as task cards with statuses and notes and saves
> progress back to the user's own file — nothing is uploaded. If the list is huge, the
> user prefers files, or they work in the extension's side panel, write a CSV/XLSX
> instead and give them the path.

Reference: <https://spuds0588.github.io/Turnstone/llms.txt> (the same spec, machine-shaped) ·
<https://spuds0588.github.io/Turnstone/workspace-link.html.md> (worked recipes and the reasoning) ·
<https://spuds0588.github.io/Turnstone/> (what Turnstone is).

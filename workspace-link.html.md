# Share a list as a link — Turnstone workspace links

> A Turnstone **workspace link** carries a whole list inside the URL. Opening it loads the queue as
> task cards — rows, columns, statuses, notes, and the portal address its rows are worked at — with no
> file to send, nothing uploaded, and no account on either end.

Canonical HTML: <https://spuds0588.github.io/Turnstone/workspace-link.html>
Part of: <https://spuds0588.github.io/Turnstone/> — see also <https://spuds0588.github.io/Turnstone/llms.txt>

## What a workspace link is

A URL of the form:

```
https://spuds0588.github.io/Turnstone/app.html#zdata=<payload>&sum=<length>.<hash>
```

Turnstone reads the parameters from the fragment (or the query string), decodes the list, parses it
with the same reader it uses for a pasted table, and loads it as a workspace. There is no API, no key,
no service and no upload — the list is in the link.

## Parameters

| Parameter | What it carries |
| --- | --- |
| `data` | The list as percent-encoded text. Readable, debuggable, and the one to use for a handful of rows. |
| `zdata` | The list deflated with **raw** deflate and base64url-encoded, no padding. Four to six times smaller, which is the difference between a link that survives a chat client and one that gets trimmed. |
| `sum` | Optional integrity token: the byte length and an FNV-1a 32-bit hash of the list's UTF-8 bytes, each in base 36, joined with a dot. Verified when present, ignored when absent. |
| `format` | Forces the reader: `csv`, `tsv`, `json`, `md`, `xml`, `html`. Otherwise the format is sniffed. |
| `link` | A portal address to compose each row's link from, for lists with no links of their own: `https://portal.example.com/ticket/{Ticket}`. |
| `name` | What to call the workspace in the sidebar. |
| `open` | `1` to open the first task as soon as the link loads. |

A parameter in the fragment wins over the same parameter in the query string, so
`app.html?file=queue.csv#zdata=…` opens the list from the fragment.

## Building one

Four steps of ordinary string work, in any language:

1. **Get the list as text.** A CSV or TSV export, a JSON array, a Markdown task list, or a plain list of
   links, one per line.
2. **Deflate it raw and base64url it.** The stream must be raw deflate — no zlib or gzip wrapper — and
   base64url with no padding.
3. **Put it in the fragment with a checksum.**
   `app.html#zdata=<payload>&sum=<length>.<fnv1a>`, with the length and hash in base 36.
4. **Add a portal address if the rows have no links of their own.**
   `&link=https://portal.example.com/ticket/{Ticket}` composes each card's URL from the row.

```js
// Node — standard library only
const zlib = require('zlib');
const b = Buffer.from(list, 'utf8');
let h = 0x811c9dc5;
for (const x of b) { h ^= x; h = Math.imul(h, 0x01000193) >>> 0; }
const sum = `${b.length.toString(36)}.${(h >>> 0).toString(36)}`;
const url = 'https://spuds0588.github.io/Turnstone/app.html'
  + '#zdata=' + zlib.deflateRawSync(b).toString('base64url') + '&sum=' + sum;
```

```python
# Python — standard library only
import base64, zlib
raw = list_text.encode("utf-8")
co = zlib.compressobj(9, zlib.DEFLATED, -15)          # -15 = raw deflate
payload = base64.urlsafe_b64encode(co.compress(raw) + co.flush()).rstrip(b"=")
url = f"https://spuds0588.github.io/Turnstone/app.html#zdata={payload.decode()}"
```

```js
// In a page, with the platform's own streams
const stream = new Blob([new TextEncoder().encode(list)])
  .stream().pipeThrough(new CompressionStream('deflate-raw'));
const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
let bin = ''; for (const byte of bytes) bin += String.fromCharCode(byte);
const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
```

A link that needs no compression at all — four rows, plain text:

```
https://spuds0588.github.io/Turnstone/app.html#data=Name%2CURL%0AApple%20Newsroom%2Chttps%3A%2F%2Fwww.apple.com%2Fnewsroom%2F%0AGitHub%20Trending%2Chttps%3A%2F%2Fgithub.com%2Ftrending
```

## The list with no links in it

Rows of ticket numbers, invoice IDs or vendor names all live inside one system, so there is no per-row
URL to put in a column. The link supplies the address and Turnstone composes each card's link from the
row's own values:

```
#data=…&link=https%3A%2F%2Fportal.example.com%2Fincident%2F%7BTicket%7D
```

`{Column}` is substituted per row and percent-encoded (what a path segment or query value needs),
`{Column|raw}` is spliced verbatim, and `{0}` addresses a column by position for a file with no header
row. A template with no placeholders gives every card the same address — the literal "all the work is
in one portal" case. Only an `http(s)` result is ever turned into a link, so a template cannot produce
a `javascript:` URL.

## Why the fragment rather than the query string

- **Privacy.** Everything after `#` is never sent to a server. The host sees a request for `app.html`
  and nothing else, so a list of client names handed over this way stays in the browser.
- **Size.** Request lines are size-limited — nginx's default 8 KB header buffer answers a longer one
  with `414` — and the fragment is not part of the request line, so a long list works where `?data=`
  would be refused at the host before any code ran.

## Limits and failure modes

- A list over **2 MB** is refused, with the reason. Past **100 KB** the link is still built, with a
  warning that chat and mail clients trim links this long.
- A link whose checksum disagrees is **refused**, and says the link is not what was sent. This is
  deliberate: a deflate stream cut at a block boundary inflates without error, so without the checksum
  a truncated link could decode to a shorter list that looked entirely normal.
- A compressed payload needs `DecompressionStream`, which every current browser has. Building a link
  needs `CompressionStream`; without it Turnstone falls back to the plain encoding rather than failing.

## Questions this answers

**Does this upload my list?**
No. Everything after the `#` stays in the browser, which is why the payload lives there and not in the
query string.

**How big can a list be?**
A typical queue compresses to a few hundred characters. A 4,000-row export still lands around a fiftieth
of its original size. Past 100 KB Turnstone warns that chat clients may trim the link; past 2 MB of list
it refuses, because a URL is not a file.

**What if the link arrives damaged?**
Every link we build carries a checksum, so a link that lost its tail is refused with a reason instead of
quietly opening a shorter queue.

**Do the notes and ticks come along?**
Yes — a link built from a workspace you have been working in carries the statuses and notes you have
entered, not just the original rows.

**Does it work offline?**
Yes, once the app itself is cached. Opening a workspace link needs no network beyond loading the page.

## For an agent, in one paragraph

Read the list, deflate it raw, base64url it without padding, compute the checksum, and assemble
`app.html#zdata=…&sum=…`. Add `&link=` if the rows are keys into a portal rather than links of their
own, and `&name=` if you want the sidebar to say what the list is. Hand over the URL: opening it loads
the workspace with no further setup. If you cannot compress — no `CompressionStream`, no `zlib` — use
`#data=` with a percent-encoded list instead; it is smaller than the compressed form for anything
under about a kilobyte.

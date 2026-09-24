# ports/ — Turnstone outside the browser tab

Each folder here holds one port of Turnstone. The **web app (`/app.html`) is the canonical
core** — ports reuse its logic rather than forking it. Nothing in `ports/` is required for
the web app to run; these are future builds living next to the product.

| Port | Path | Status | One-liner |
|---|---|---|---|
| Web app | `/app.html` | **Live** — the canonical experience | Split-pane queue + tabbed iframe workspace, zero backend |
| Bookmarklet | [`bookmarklet/`](bookmarklet/) | **Built** — `csv` / `core` / `full` variants, zero library dependencies | Composes the whole app in a shadow-DOM overlay on the page you are on; no network, no CDNs; session-only memory with Copy/Restore state |
| Chrome extension | [`extension/`](extension/) | **Built** — `extension/dist/` loads unpacked | Side Panel queue (no iframes); links open as real tabs and selecting a card switches to that card's tab; toolbar badge; right-click "Add link"; persists per browser |
| Tauri desktop | [`tauri/`](tauri/) | Scaffolded | Native shell, full web experience incl. iframes — no CORS/X-Frame-Options wall, silent file write-back |

## How a port is actually built

The early plan was to extract a shared `core.js` first and have each port wrap it. In practice
every port so far has gone the other way — and it has held up better. A port is a **generator**
(`<port>/build.js`) that extracts `app.html`'s stylesheet, markup and script, patches only the
seams the platform changes, and **asserts every anchor**, so a change upstream fails the build
instead of quietly shipping a port that has drifted from the app. The app stays one file; the
ports stay provably in step with it. See [`bookmarklet/build.js`](bookmarklet/build.js) and
[`extension/build.js`](extension/build.js).

That is why there is still no `core.js`: the DOM-free core has never been the bottleneck. What
differs per platform is the *shell* (a shadow-DOM overlay, a side panel, a native window) and the
*capabilities* (`chrome.tabs`, Tauri commands, File System Access) — both of which the generator
patch is a better fit for than an extraction.

Scoped specs (features, constraints, fallbacks, budgets) live in the root
[`todo.md`](../todo.md) under *Future state* and in each port's README. Scope is locked in
conversation history — read it before changing a port's contract.

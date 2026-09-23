# ports/ — Turnstone outside the browser tab

Each folder here holds one port of Turnstone. The **web app (`/app.html`) is the canonical
core** — ports reuse its logic rather than forking it. Nothing in `ports/` is required for
the web app to run; these are future builds living next to the product.

| Port | Path | Status | One-liner |
|---|---|---|---|
| Web app | `/app.html` | **Live** — the canonical experience | Split-pane queue + tabbed iframe workspace, zero backend |
| Bookmarklet | [`bookmarklet/`](bookmarklet/) | Scaffolded | Composes the whole app live in a new tab; session-only memory; CSV-only fallback when SheetJS can't load |
| Chrome extension | [`extension/`](extension/) | Scaffolded | Side Panel queue (no iframes); links open as real tabs; selecting a card switches the active tab |
| Tauri desktop | [`tauri/`](tauri/) | Scaffolded | Native shell, full web experience incl. iframes — no CORS/X-Frame-Options wall, silent file write-back |

## The shared prerequisite

Before any port ships, the DOM-free core is extracted from `app.html` into a shared
`core.js` (parsing, matrix analysis, presets, persistence). Port shells then provide only
platform-specific layers: UI surfaces (side panel / composed page / native window) and
capabilities (chrome.tabs, Tauri commands, File System Access).

Scoped specs (features, constraints, fallbacks, budgets) live in the root
[`todo.md`](../todo.md) under *Future state* and in each port's README. Scope is locked in
conversation history — read it before changing a port's contract.

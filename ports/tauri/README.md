# Turnstone Tauri App — port scaffold

**Status: scaffolded, not built.** The locked scope lives in the root [`todo.md`](../../todo.md)
(*Future state → Tauri application version*); the conversation history holds the design
discussion. Read before changing the contract below.

## What it is

A native desktop app (Tauri 2, tiny bundle vs Electron) that **matches the web version's
full experience 1:1 — including the tabbed iframe workspace**.

## The headline difference

The **CORS / `X-Frame-Options` wall disappears** inside the Tauri shell: the webview can
permissively load any frame, and the Rust side can fetch any URL. Sites that refuse
iframing on the web — the ones that forced the whole open-mode/tab-handoff concept —
work natively in the app. The iframe open mode stops being a best-effort feature and
becomes the default that just works.

## What else the shell unlocks

- True filesystem read/write without permission prompts — silent write-back to the
  original CSV/XLSX on every OS.
- System tray queue.
- Auto-update.
- No CDN dependency: the SheetJS/PapaParse libraries ship inside the bundle.

## Layout

```
tauri/
  tauri.conf.json  # Tauri 2 config scaffold — window, tray, bundle, frontendDist -> repo root
  src/             # TODO: Rust shell (src-tauri) — commands for fs read/write + fetch passthrough
  icons/           # TODO: icon set generated from the web app's gem PNGs
```

## Build notes

- `frontendDist` points at the repo root so the canonical `app.html` *is* the frontend —
  no forked copy. Keep the web app the single source of truth; the only Tauri-specific
  layer is the shell config plus Rust commands (`fs_write`, `fetch_any`) invoked from
  feature-detected JS in `app.html`.
- Prerequisite: the DOM-free `core.js` extraction (see [`ports/README.md`](../README.md)).
- `cargo tauri init` / `cargo tauri dev` to stand the shell up when the port is built.

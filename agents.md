# agents.md — AI Developer Context & Rules

If you are an AI agent assisting with Project Turnstone, you must strictly adhere to the following rules.

## Context

Project Turnstone is a vanilla JS single-page application that acts as a split-pane task manager. It reads local/remote CSV/XLSX files, populates a sidebar of task cards, loads URLs into tabbed iframes, and automatically saves progress back to the user's filesystem or browser storage.

**Approved deviation from the PRD (2026-09-22):** The sidebar sits on the **RIGHT** side of the screen; the tabbed iframe workspace is on the LEFT. All other PRD behavior stands.

## Development Rules

1. **Strictly Vanilla:** Do not introduce bundlers (Webpack, Vite), frameworks (React, Vue), or TypeScript. Stick to pure HTML, CSS, and JS in a single `index.html` file (or linked `.js`/`.css` if file size exceeds reasonable limits).
2. **YAGNI (You Aren't Gonna Need It):** Prefer simple one-liners and native JS methods over complex abstractions.
3. **No Backends:** This is a zero-server application. Everything lives in the browser and the user's local filesystem.
4. **Iframe Awareness:** Always assume iframes might fail to load due to CORS/`X-Frame-Options`. Provide secondary `<a target="_blank">` escape hatches for all links.
5. **Persistence Handling:**
   * Chromium: Store the `FileSystemFileHandle` in IndexedDB. Remember to request `verifyPermission()` on reload.
   * Fallback: Track an `isDirty` boolean. If `isDirty` is true and File System Access API is not active, trigger `event.preventDefault()` on `beforeunload`.
6. **Extensive Console Logging:** Every major action, state change, file read, file write, and caught error MUST have a descriptive `console.log()`.
7. **Code Output:** When outputting code, output the FULL file contents. Do not use snippets like `// ... rest of code`. The PM needs to copy-paste the entire file to test.
8. **Pushback:** If the PM asks to bypass Iframe CORS headers in the web version, push back and remind them that this is impossible in standard browsers and is explicitly slated for the V2 Electron/Extension phase.

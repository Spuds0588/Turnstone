# agents.md — AI Developer Context & Rules

If you are an AI agent working on Project Turnstone, adhere to the following. The rules are
written for the project as it actually is today, not as the original spec imagined it — where
the two disagree, this file and [`README.md`](README.md) win.

## Context

Turnstone is a zero-backend, vanilla-JS, single-page application that turns a list (a spreadsheet,
CSV, JSON, Markdown, Word table, XML feed, saved email, a paste, or a list carried in a URL) into a
workspace: task cards with statuses and notes on one side, the pages themselves on the other, with
progress saved back into the file the user started with.

- **`app.html` is the application** — one file, no build step, no framework, no runtime dependency
  that is not vendored. The original spec called it `index.html`; that name now belongs to the
  **sales/landing page** of the site.
- **The site** is the surrounding static pages (`versions.html` and one page per edition,
  `workspace-link.html`, `index.html`), plus the agent-facing files `llms.txt`, the `.md` twins,
  `sitemap.xml` and `robots.txt`.
- **`ports/`** holds the other editions (bookmarklet, Chrome extension, Tauri). Each is *generated*
  from `app.html` by its own `build.js`, which patches the seams and asserts every anchor.
- **`test/`** holds the three suites; `assets/` holds the generators (fixtures, icons, social card,
  site artifacts).

**Approved deviation from the original specification (2026-09-22):** the sidebar sits on the
**RIGHT** side of the screen; the tabbed iframe workspace is on the **LEFT**. Every other
behaviour it describes stands. (That specification is a planning document kept off this
repository on purpose — see [`.gitignore`](.gitignore) — so this file is the live copy of
everything an agent needs.)

## Development Rules

1. **Strictly vanilla, one file.** No bundlers, frameworks, TypeScript or new runtime dependencies
   in `app.html`. Anything that has to be a library is **vendored** under `vendor/`, hashed in
   [`vendor/README.md`](vendor/README.md), and copied byte-for-byte into each port. **Never a CDN**:
   the app's own policy is `default-src 'self' file:` with no `https:` host anywhere, so an
   off-origin subresource is both a policy violation and a broken promise. (The **guide pages** are
   stricter still — `default-src 'none'` — and `index.html` is the strictest of all.)
   `test/run.js` asserts there is no remote `src` anywhere.
2. **YAGNI.** Prefer a native method and a plain function over an abstraction. The app is deliberately
   one long, commented file.
3. **No backend, nothing uploaded.** Everything happens in the browser and in the user's own files.
   No telemetry, no analytics, no accounts, and never a network call the user did not ask for.
4. **Iframes fail, by design and often.** Assume `X-Frame-Options`/CORS may block any page: every link
   needs a new-tab and a popup escape hatch, and a composed portal link must behave exactly like a
   real one.
5. **The user's file is sacred.** Write-back is debounced and silent in Chromium, falls back to an
   export elsewhere, and never rewrites a document the app only reads (`.md` is read-only on purpose).
   Track `isDirty` honestly — a `beforeunload` prompt that fires over saved work is a bug.
6. **`app.html` is the source; everything else is generated.** Never hand-edit
   `turnstone-standalone.html`, `ports/*/dist/`, `sample-links.*`, `sitemap.xml`, `robots.txt`,
   `assets/sizes.json` or `assets/og-image.png`. Regenerate with the script named in
   [`README.md`](README.md) → *Repository layout*, and run its `--check`.
   One chore a rebuild leaves behind: it changes an artifact's byte size, so the
   **`data-size-fallback`** text on the guide pages — what a reader with JavaScript off, and most
   crawlers, actually see — goes stale, and `build-site.js` fails with the two numbers side by side.
   Rewrite those values on `versions.html`, `standalone.html` and `extension.html` after any build.
7. **Structured data must say what the page says.** Nothing renders JSON-LD, so prose and markup
   drifting apart is invisible in a browser and total to a machine. `assets/build-site.js` compares
   every marked-up answer to the page and every `HowTo` step to its heading — keep them in step, and
   keep the landing page inside its **1,000-word prose budget** (the check says *cut something*
   rather than offering a number to raise).
8. **The editions are reached through the versions page.** The top bar is deliberately three items
   (Home · All versions · Launch app) and is asserted; footers carry the full list for anyone who
   would rather not walk the path.
9. **Test before you claim.** `node test/run.js` (fast, DOM-free, slices the format layer out of the
   real `app.html`), then the browser sweeps when the format layer, the layers or a port changed,
   then every build's `--check` and `node assets/make-fixtures.js --check`. The suites and what each
   one is for are in [`test/README.md`](test/README.md) and [`testing-notes.md`](testing-notes.md).
10. **Write it down.** A change to behaviour, a reversed decision, or a limit discovered in testing
    belongs in [`history.md`](history.md) (why, with the measurement that proved it) and
    [`todo.md`](todo.md) (done, or still open). Documentation that drifts is worse than none.
11. **Console logging:** useful `console.log`/`console.warn` on boot, state changes, file read/write
    and caught errors — enough to debug a report from someone else's machine, not a running diary.
12. **Pushback.** If asked to bypass iframe CORS/`X-Frame-Options` in the web edition, say plainly
    that no browser allows it and point at the [Tauri port](ports/tauri/) or the
    [Chrome extension](extension.html). If asked to add WebAssembly (OCR, a local model), say that
    this app's CSP refuses `wasm` and that the deliberate decision, with reasoning, is in
    [`todo.md`](todo.md) — and that the paste path already handles those inputs exactly.
13. **Output complete files.** When handing code back, give the whole file or the whole replacement
    block, never `// ... rest of code`.
14. **Icons are characters, not pictures.** No emoji — each OS draws its own, in its own colours,
    ignoring the theme — and no icon font or SVG sprite, because either one costs bytes in every
    bookmarklet variant and the single-file claim is the point. Use monochrome text-presentation
    characters, which inherit the theme's colour and weight and load nothing: `▤ ⇢ ↺ ✕ ⇲ ⧉ ⇱ ❐ ↗ ◱ ⚙ ↧
    ⤓ ◐ ⌫` today. Card links keep `✉ ☎ ↗`, where they name the kind of link rather than decorate a
    button. `test/run.js` scans the three artifacts for emoji ranges and fails; lines defining the
    **completion vocabulary** (`✅`, `✔`, `yes`, `done`, …) are exempt, because those have to keep
    parsing out of the *user's* file.

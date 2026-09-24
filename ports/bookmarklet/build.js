#!/usr/bin/env node
'use strict';

/* Turnstone — bookmarklet build.
 *
 * Emits a `javascript:` one-liner that turns whatever page you're on into a full
 * Turnstone workspace, with no hosted file, no network and no libraries required.
 *
 * How it works, and why: a bookmarklet runs INSIDE the host page, so the app is
 * mounted into a shadow root the payload builds itself. That is not a style
 * preference — a bookmarklet-created document (new tab / about:blank iframe)
 * INHERITS the page's Content-Security-Policy, so inline scripts there are
 * refused outright on a strict-CSP site. The payload's own code is exempt (that
 * is why bookmarklets work on GitHub at all), so the app is composed from the
 * payload and every one of its queries is scoped to the overlay.
 *
 * Variants — the parsers are the only thing that makes the payload big, so they
 * are split rather than forced on everyone:
 *   csv   ~130 KB  app + a 2 KB RFC-4180 reader (CSV/TSV/JSON/HTML/XML only)
 *   core  ~137 KB  + a small read-only XLSX reader (own ZIP + DecompressionStream)
 *   full  ~1.1 MB  + vendored PapaParse and SheetJS (all formats, XLSX export)
 *
 * Usage:
 *   node ports/bookmarklet/build.js                    # all variants → ports/bookmarklet/dist/
 *   node ports/bookmarklet/build.js --variant core     # just one
 *   node ports/bookmarklet/build.js --check            # verify dist matches app.html, write nothing
 *
 * app.html is patched, never forked: every edit below is asserted to apply, so a
 * change upstream fails the build instead of silently shipping a broken overlay.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { recordSizes } = require(path.join(__dirname, '..', '..', 'assets', 'sizes.js'));

const ROOT = path.resolve(__dirname, '..', '..');
const HERE = path.resolve(__dirname);
const DIST = path.join(HERE, 'dist');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const only = args.indexOf('--variant') >= 0 ? args[args.indexOf('--variant') + 1] : null;

const read = (p) => fs.readFileSync(p, 'utf8');
const size = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`;

function git(revArgs, fallback) {
  try { return execSync(`git ${revArgs}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch (e) { return fallback; }
}

/** Replace exactly `expect` occurrences, or fail the build. */
function patch(text, find, replace, label, expect = 1) {
  const count = text.split(find).length - 1;
  if (count !== expect) throw new Error(`expected ${expect} ${label} reference(s), found ${count}`);
  return text.split(find).join(replace);
}

const svgUri = (p) => `data:image/svg+xml;base64,${Buffer.from(read(p)).toString('base64')}`;

/* ------------------------------------------------------------- extract ---- */

const html = read(path.join(ROOT, 'app.html'));

const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('no <style> block found in app.html');
let css = cssMatch[1];

const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
if (!bodyMatch) throw new Error('no <body> found in app.html');
let markup = bodyMatch[1];

const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const appJs = scripts.filter((s) => /'use strict'/.test(s.slice(0, 40))).sort((a, b) => b.length - a.length)[0];
if (!appJs) throw new Error('could not find the app script (the inline script starting with \'use strict\')');
if (scripts.some((s) => s === appJs && s.length < 20000)) throw new Error('app script looks truncated');

/* Two scripts and two <img>s in the markup point at files on disk. The first is
   dropped (the theme boot is replaced by the overlay's own), the second (the
   bundled sample dataset) has no meaning outside the repo. */
markup = markup.replace(/<script[\s\S]*?<\/script>/g, '');
if (/<script/i.test(markup)) throw new Error('script tags survived markup extraction');

/* ------------------------------------------------------- stylesheet ------- */

const cssBefore = css;
css = patch(css, ':root {', ':host {', 'bare :root token block');
css = patch(css, ':root[data-theme="light"]', ':host([data-theme="light"])', 'light-theme token block', 3);
css = patch(css, 'html, body { height: 100%; }', '#ts-app { height: 100%; }', 'html/body height rule');
css = patch(css,
  '  body {\n    margin: 0;\n    background: var(--bg);\n    color: var(--text);\n    font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;\n    display: flex;\n    overflow: hidden;\n  }',
  '  #ts-app {\n    flex: 1 1 auto; min-height: 0;\n    margin: 0;\n    background: var(--bg);\n    color: var(--text);\n    font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;\n    display: flex;\n    overflow: hidden;\n  }',
  'body rule → #ts-app');
if (!css.includes(':host {')) throw new Error('theme tokens were not remapped onto the shadow host');
if (css === cssBefore) throw new Error('stylesheet was not patched at all');

/* ------------------------------------------------------------ app code ---- */

let js = appJs;

/* Element lookups and theme now scope to the overlay. */
js = patch(js, 'const $ = (sel) => document.querySelector(sel);', 'const $ = (sel) => ROOT.querySelector(sel);', 'element lookup helper');
js = patch(js, 'document.documentElement.dataset.theme', 'THEME_ROOT.dataset.theme', 'theme root', 3);
/* Overlays the app appends to<body> belong in the shadow root (they must sit above the app). */
js = patch(js, 'document.body.appendChild(overlay);', 'ROOT.appendChild(overlay);', 'overlay append', 2);
/* Drag targets move from the host page's document to the app viewport, so the
   handlers disappear with the overlay instead of hijacking the page's own drops. */
js = patch(js, "document.addEventListener('dragover'", "ROOT.addEventListener('dragover'", 'dragover listener');
js = patch(js, "document.addEventListener('dragleave'", "ROOT.addEventListener('dragleave'", 'dragleave listener');
js = patch(js, "document.addEventListener('drop'", "ROOT.addEventListener('drop'", 'drop listener');

/* There is no sw.js beside a bookmarklet, so registration is switched off via the
   flag app.html already carries for the standalone build. */
js = patch(js, 'const STANDALONE_BUILD = false;', 'const STANDALONE_BUILD = true;', 'service-worker gate');
js = patch(js, 'const SESSION_ONLY = false;', 'const SESSION_ONLY = true;', 'session-only storage flag');

/* The host page's own ?file= must never be read as ours. */
js = patch(js, "const fileParam = params.get('file') || params.get('url');", 'const fileParam = null;   // bookmarklet: the host page\'s query string is not ours to read', 'deep-link param');

/* PWA + unload machinery is host-page behaviour, not overlay behaviour: an
   install prompt or a "you have unsaved changes" dialog on someone else's page
   would be rude and wrong. */
/* Anchored on the end of buildManifest, not on the first "})();" after the heading:
   the icon constants above it are an IIFE too, so the loose pattern stopped early
   and left a buildManifest() behind that threw "ICON_192 is not defined" on every
   launch — a console warning on somebody else's page. */
js = patch(js, /\/\* ------------------------------ PWA plumbing ------------------------------ \*\/[\s\S]*?warn\('Manifest build failed \(PWA features limited\)', e\); \}\n\}\)\(\);\n/,
  '/* PWA plumbing removed in the bookmarklet build — an installed app and an\n   install prompt belong to a real origin, not to a page we were launched from. */\n', 'PWA plumbing block');
js = patch(js, '/* PRD Task 4.4: strict beforeunload guard in fallback/remote modes. */\nwindow.addEventListener(\'beforeunload\', (e) => {\n  if (state.mode && state.mode !== \'fs\' && state.isDirty) {\n    warn(\'beforeunload blocked: unexported changes in fallback mode\');\n    e.preventDefault();\n    e.returnValue = \'\'; // required for Chrome\n    return \'You have unexported changes. Export CSV/XLSX before leaving.\';\n  }\n});\n',
  '/* beforeunload guard removed in the bookmarklet build: leaving a page is the host\n   page\'s business, and our state is session-only by design anyway. */\n', 'beforeunload guard');
if (/document\.documentElement/.test(js)) throw new Error('a documentElement reference survived patching');
if (/addEventListener\('beforeunload'/.test(js)) throw new Error('a beforeunload handler survived patching');  if (!js.includes('ROOT.querySelector')) throw new Error('element lookups were not scoped to the overlay');
if (!js.includes('const SESSION_ONLY = true;')) throw new Error('session-only storage flag was not set');

/* ------------------------------------------------------------- markup ----- */

markup = patch(markup, 'src="assets/logo-dark.svg"', `src="${svgUri(path.join(ROOT, 'assets/logo-dark.svg'))}"`, 'dark logo');
markup = patch(markup, 'src="assets/logo-light.svg"', `src="${svgUri(path.join(ROOT, 'assets/logo-light.svg'))}"`, 'light logo');
/* The sample-file buttons load bundled fixtures from the repo; there is no repo here. */
/* The welcome copy promises autosave "back to the file … or browser storage"; in an
   overlay with no durable storage that would be a lie, so it is corrected here. */
markup = patch(markup, 'or browser storage.', 'or, in this build, this tab only — export to keep your work.', 'autosave copy');
markup = patch(markup, '<button class="btn" id="btn-test-csv"', '<button class="btn" hidden id="btn-test-csv"', 'test-CSV button');
markup = patch(markup, '<button class="btn" id="btn-test-xlsx"', '<button class="btn" hidden id="btn-test-xlsx"', 'test-XLSX button');
/* The deep-link paragraph points at app.html? The overlay has no URL of its own. */
markup = markup.replace(/<p style="font-size:11px; color:var\(--muted\); margin:0 0 10px">Any public link-list[\s\S]*?<\/p>/, '');
if (/(src|href)="(assets|vendor)\//.test(markup)) throw new Error('markup still references files on disk');

/* ---------------------------------------------------------- variants ------ */

const SHIM = (f) => read(path.join(HERE, 'src', f));

/* Vendored libraries are evaluated against shadow objects so nothing becomes a
   global on the host page: a page already shipping its own SheetJS or PapaParse
   keeps its own copy, and `this`/`window` inside the library resolve to the
   shadow, never to the real window. */
function vendors(libs) {
  let out = '';
  if (libs.includes('papaparse')) {
    out += `/* PapaParse 5.4.1 — vendored, evaluated against a shadow root object. */\n` +
      `var __papaRoot = {};\n(function (define, module, exports) {\n${read(path.join(ROOT, 'vendor/papaparse.min.js'))}\n}).call(__papaRoot, void 0, void 0, void 0);\nvar Papa = __papaRoot.Papa;\n` +
      `if (!Papa || typeof Papa.parse !== 'function') throw new Error('Turnstone: PapaParse failed to initialise');\n`;
  } else if (libs.includes('papa-shim')) {
    out += `/* PapaParse stand-in — the app's API surface, in ~2 KB, no dependency. */\n${SHIM('papa-shim.js')}\n`;
  }
  if (libs.includes('sheetjs')) {
    out += `/* SheetJS 0.20.3 — vendored, with \`window\` shadowed so its export guard lands\n   on a throwaway object instead of the host page's global. */\n` +
      `var __xlsxWin = Object.create(window);\nvar XLSX = (function (define, module, exports, window) {\n${read(path.join(ROOT, 'vendor/xlsx.full.min.js'))}\nreturn XLSX;\n}).call({}, void 0, void 0, void 0, __xlsxWin);\n` +
      `if (!XLSX || typeof XLSX.read !== 'function') throw new Error('Turnstone: SheetJS failed to initialise');\n`;
  } else if (libs.includes('xlsx-shim')) {
    out += `/* SheetJS stand-in — read-only XLSX via the browser's own ZIP + DecompressionStream. */\n${SHIM('xlsx-shim.js')}\n`;
  }
  return out;
}

const VARIANTS = {
  csv:  { libs: ['papa-shim'], blurb: 'no libraries — CSV, TSV, JSON, HTML, XML' },
  core: { libs: ['papa-shim', 'xlsx-shim'], blurb: 'no libraries — the above plus read-only XLSX' },
  full: { libs: ['papaparse', 'sheetjs'], blurb: 'vendored PapaParse + SheetJS — every format, XLSX export' },
};

/* javascript: URLs are percent-decoded before execution, so newlines travel as
   %0A: the bookmark field never sees a raw line break, and the payload stays
   readable source. `%` and `#` go along for the ride (fragment + escape rules). */
function encodePayload(code) {
  return 'javascript:' + code
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '%0A');
}

const payloadStamp = (variant) =>
  `/* Turnstone bookmarklet — "${variant}" variant, generated ${new Date().toISOString()}\n` +
  `   from app.html @ ${sha}${dirty}. Regenerate with: node ports/bookmarklet/build.js --variant ${variant}\n` +
  `   Lines are %0A-encoded at the end of the build; everything above is app.html. */\n`;

function buildVariant(name) {
  const spec = VARIANTS[name];
  if (!spec) throw new Error(`unknown variant "${name}" (expected ${Object.keys(VARIANTS).join(' | ')})`);
  const meta = `var __TS_BMK__ = { variant: ${JSON.stringify(name)}, libs: ${JSON.stringify(spec.libs)},\n` +
    `  blurb: ${JSON.stringify(spec.blurb)},\n  css: ${JSON.stringify(css)},\n  markup: ${JSON.stringify(markup)} };`;

  /* Three layers on purpose:
       1. sloppy outer scope — vendored UMDs need non-strict semantics;
       2. the app — app.html starts with 'use strict', so it keeps its own scope
          and strictness, and `ROOT`/`THEME_ROOT`/`Papa`/`XLSX` reach it by closure;
       3. the bar wiring, inside the same scope so it can call app functions. */
  const code =
    `(function(){\n` +
    payloadStamp(name) +
    `'use strict';\n` +
    meta + '\n' +
    SHIM('boot-pre.js') + '\n' +
    vendors(spec.libs) + '\n' +
    `(function(){\n${js}\n` + SHIM('boot-post.js') + `\n}).call(this);\n` +
    `})();void 0\n`;

  /* ---------------------------------------------------------- assert ------ */
  if (/(src|href)="(assets|vendor)\//.test(code)) throw new Error(`${name}: payload references a file on disk`);
  if (!code.includes('TS_HOST.attachShadow')) throw new Error(`${name}: host shell missing`);
  if (!code.includes('ROOT.querySelector')) throw new Error(`${name}: app not scoped to the overlay`);
  if (spec.libs.includes('papaparse') && !code.includes('Papa.parse')) throw new Error(`${name}: PapaParse missing`);
  if (spec.libs.includes('sheetjs') && !code.includes('sheet_to_json')) throw new Error(`${name}: SheetJS missing`);
  if (spec.libs.includes('papa-shim') && !code.includes('countOutsideQuotes')) throw new Error(`${name}: Papa shim missing`);
  if (spec.libs.includes('xlsx-shim') && !code.includes('findEocd')) throw new Error(`${name}: XLSX shim missing`);
  if (spec.libs.includes('sheetjs') && code.includes('window.XLSX = window.XLSX')) throw new Error(`${name}: SheetJS containment broken`);
  const oneLiner = encodePayload(code);
  if (/\n/.test(oneLiner)) throw new Error(`${name}: newlines survived encoding — the bookmark field would mangle it`);
  return { code, oneLiner, spec };
}

const sha = git('rev-parse --short HEAD', 'unknown');
const dirty = git(`diff --quiet HEAD -- . ":!ports/bookmarklet/dist"`, 'dirty') === 'dirty' ? ' + uncommitted changes' : '';

/* ------------------------------------------------------------- emit ------- */

const targets = only ? [only] : Object.keys(VARIANTS);
const built = {};
for (const name of targets) built[name] = buildVariant(name);

/* ------------------------------------------------------- install page ----- */
/* Kept small on purpose: the page fetches the payloads and builds real anchors at
   load time, instead of inlining ~2.5 MB of script into the HTML. A JS-created
   <a href="javascript:…"> is just as draggable as a hand-written one. */
function installPage() {
  const rows = Object.keys(VARIANTS).map((name) => {
    const b = built[name] || buildVariant(name);
    return `      <tr>
        <td><span class="install" data-variant="${name}" title="Fetching payload…">Turnstone <code>${name}</code></span></td>
        <td>${b.spec.libs.join(' + ') || '—'}</td>
        <td>${(Buffer.byteLength(b.oneLiner) / 1024).toFixed(0)} KB</td>
        <td>${b.spec.blurb}</td>
      </tr>`;
  }).join('\n');
  return `<!doctype html>
<!--
  Turnstone — bookmarklet install page. GENERATED by ports/bookmarklet/build.js;
  edit the build script, not this file. Drag a link below onto your bookmarks bar,
  or copy a payload out of dist/*.txt into a new bookmark's URL field.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Turnstone bookmarklet — install</title>
<style>
  body { margin: 0; padding: 32px 24px; background: #0f1115; color: #e6e9ef;
         font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p  { color: #8b93a5; max-width: 68ch; }
  table { border-collapse: collapse; margin: 18px 0; }
  th, td { text-align: left; padding: 8px 14px 8px 0; border-bottom: 1px solid #262b36; vertical-align: top; }
  th { color: #8b93a5; font-size: 11px; text-transform: uppercase; letter-spacing: .8px; }
  code { background: #1d212b; border-radius: 4px; padding: 1px 5px; }
  a.install { display: inline-block; padding: 6px 12px; border: 1px solid #5a82e0; border-radius: 7px;
              background: #1d212b; color: #e6e9ef; text-decoration: none; font-weight: 600; cursor: grab; }
  a.install:hover { background: #262b36; }
  .warn { border-left: 3px solid #f5c542; padding-left: 12px; }
</style>
</head>
<body>
  <h1>Turnstone bookmarklet</h1>
  <p>Drag a link below onto your <strong>bookmarks bar</strong> (or copy a payload from
     <code>dist/*.txt</code> into a new bookmark's URL field). Then click it on any page to work a
     link list without leaving that page.</p>
  <p><a href="../../../versions.html">← All versions &amp; downloads</a> — the same links, plus the standalone build,
     the hosted app and which edition to pick for a given format.</p>
  <table>
    <thead><tr><th>Install</th><th>Bundled</th><th>Payload</th><th>Formats</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p class="warn">A bookmarklet runs inside the page you are on, so the workspace is composed in a
     shadow-DOM overlay there. Nothing is uploaded, nothing is fetched, and the host page's own
     scripts and globals are left alone. Your queue lives for the tab's lifetime — use
     <em>Copy state</em> in the overlay's bar to carry it somewhere else.</p>
  <p>Generated ${new Date().toISOString()} from <code>app.html @ ${sha}${dirty}</code>.</p>
<script>
(function () {
  document.querySelectorAll('.install[data-variant]').forEach(function (el) {
    var name = el.getAttribute('data-variant');
    fetch('turnstone-bookmarklet-' + name + '.txt')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (payload) {
        var a = document.createElement('a');
        a.className = 'install';
        a.href = payload.trim();
        a.textContent = 'Turnstone ' + name;
        a.title = 'Drag this onto your bookmarks bar';
        el.replaceWith(a);
      })
      .catch(function (e) {
        el.textContent = 'Turnstone ' + name + ' — payload missing (' + e.message + '); run node ports/bookmarklet/build.js';
      });
  });
})();
</script>
</body>
</html>
`;
}

/* ------------------------------------------------------------- report ----- */

const report = Object.keys(VARIANTS).map((name) => {
  const b = built[name] || buildVariant(name);
  return `  ${name.padEnd(5)} ${size(b.oneLiner).padStart(9)}  ${b.spec.libs.join(' + ') || 'no libraries'}`;
}).join('\n');

if (CHECK) {
  let stale = [];
  for (const name of targets) {
    const file = path.join(DIST, `turnstone-bookmarklet-${name}.txt`);
    const current = fs.existsSync(file) ? read(file) : '';
    // Compare on content, not provenance: the payload's first comment carries a
    // timestamp (and the `%0A`-encoded newlines make it one line in dist/).
    const strip = (s) => s.replace(/^javascript:\(function\(\)\{%0A[\s\S]*?\*\/%0A/, '');
    if (strip(current) !== strip(built[name].oneLiner)) stale.push(name);
  }
  console.log(`bookmarklet payloads:\n${report}`);
  console.log(stale.length
    ? `\n--check: STALE (${stale.join(', ')}) — rerun without --check`
    : '\n--check: dist payloads are up to date');
  process.exit(stale.length ? 1 : 0);
}

fs.mkdirSync(DIST, { recursive: true });
for (const name of targets) {
  const file = path.join(DIST, `turnstone-bookmarklet-${name}.txt`);
  fs.writeFileSync(file, built[name].oneLiner);
}

/* Record the payload sizes so the site pages quote the build that exists. */
recordSizes(Object.fromEntries(targets.map((name) => [
  path.relative(ROOT, path.join(DIST, `turnstone-bookmarklet-${name}.txt`)).split(path.sep).join('/'),
  Buffer.byteLength(built[name].oneLiner),
])));

/* The strict-CSP harness needs the payload as a real same-origin script file: a
   page with `script-src 'self'` refuses inline scripts AND in-page javascript:
   links, so injecting dist/csp-probe.js is the only way to exercise the payload
   there without a bookmarklet's own CSP exemption. What it proves is the part
   that could genuinely break under CSP — that mounting needs no inline script,
   no eval, and no <style> element — and it fails loudly if that stops being true. */
if (!only || only === 'core') {
  fs.writeFileSync(path.join(DIST, 'csp-probe.js'), built.core.code);
}
if (!only) fs.writeFileSync(path.join(DIST, 'install.html'), installPage());

console.log(`bookmarklet payloads (source ${size(built[targets[0]].code)} → encoded):`);
console.log(report);
console.log(`\nwrote ${targets.map((n) => path.relative(ROOT, path.join(DIST, `turnstone-bookmarklet-${n}.txt`))).join('\n      ')}`);
if (!only) console.log(`wrote ${path.relative(ROOT, path.join(DIST, 'install.html'))}`);
if (!only || only === 'core') console.log(`wrote ${path.relative(ROOT, path.join(DIST, 'csp-probe.js'))} (core payload source, for test-csp.html)`);

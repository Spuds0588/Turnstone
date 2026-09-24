#!/usr/bin/env node
'use strict';

/* Turnstone — Chrome extension build (Manifest V3, side panel only).
 *
 * The panel is the web app's task sidebar, not a reimplementation: this build
 * extracts app.html's stylesheet, markup and script into a real extension page and
 * patches only the seams that a browser side panel changes:
 *
 *   - links always open as REAL browser tabs (chrome.tabs), and selecting a card
 *     switches to that card's tab instead of reloading it — a panel has nowhere to
 *     put an iframe, so the whole tabbed-iframe workspace is switched off;
 *   - a one-pane layout: the drop-zone screen and the queue each take the panel;
 *   - the toolbar badge carries the "left to do" count with the panel shut;
 *   - right-click "Add link to Turnstone" appends a row (src/panel-bridge.js);
 *   - exports go through chrome.downloads;
 *   - the PWA / install-prompt / beforeunload machinery is dropped.
 *
 * Nothing is forked. Every edit is asserted against an exact anchor, so a change
 * upstream fails the build loudly instead of quietly shipping a broken panel.
 *
 * Usage:
 *   node ports/extension/build.js            # → ports/extension/dist/
 *   node ports/extension/build.js --check    # verify dist matches app.html, write nothing
 *
 * Load dist/ with chrome://extensions → Developer mode → Load unpacked.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const HERE = path.resolve(__dirname);
const SRC = path.join(HERE, 'src');
const DIST = path.join(HERE, 'dist');
const CHECK = process.argv.slice(2).includes('--check');

const read = (p) => fs.readFileSync(p, 'utf8');
const bytesOf = (v) => (Buffer.isBuffer(v) ? v : Buffer.from(v, 'utf8'));
const size = (v) => `${(bytesOf(v).length / 1024).toFixed(1)} KB`;

function git(args, fallback) {
  try { return execSync(`git ${args}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch (e) { return fallback; }
}

/** Replace exactly `expect` occurrences, or fail the build. */
function patch(text, find, replace, label, expect = 1) {
  const count = typeof find === 'string' ? text.split(find).length - 1 : (text.match(find) || []).length;
  if (count !== expect) throw new Error(`expected ${expect} ${label} reference(s), found ${count}`);
  return typeof find === 'string' ? text.split(find).join(replace) : text.replace(find, replace);
}

/* ------------------------------------------------------------- extract ---- */

const html = read(path.join(ROOT, 'app.html'));

const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('no <style> block found in app.html');
let css = cssMatch[1];

const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
if (!bodyMatch) throw new Error('no <body> found in app.html');
let markup = bodyMatch[1];

/* Inline scripts, in document order: the theme boot (head), the bundled sample
   dataset (body), then the app itself. Extension pages are served under
   `script-src 'self'`, so none of them may stay inline — each becomes a file. */
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const appJs = inline.filter((s) => /'use strict'/.test(s.slice(0, 40))).sort((a, b) => b.length - a.length)[0];
if (!appJs || appJs.length < 20000) throw new Error('could not find the app script in app.html');
const bootJs = inline.find((s) => /TURNSTONE_TEST_DATA/.test(s));
if (!bootJs) throw new Error('could not find the bundled sample-dataset script');
const themeJs = inline.find((s) => s !== appJs && s !== bootJs && /turnstone-theme/.test(s));
if (!themeJs) throw new Error('could not find the theme-boot script');

markup = markup.replace(/<script[\s\S]*?<\/script>/g, '');
if (/<script/i.test(markup)) throw new Error('script tags survived markup extraction');

/* ---------------------------------------------------------- stylesheet ---- */

/* One pane at a time: a side panel is ~360 px wide, so the split layout becomes a
   single column and the two screens swap places instead of sitting side by side.
   `body.has-file` is set by the app's own updateChrome() — no new state. */
css += `
  /* ---------- Side panel layout (added by ports/extension/build.js) ---------- */
  /* There is no iframe workspace in this port: the left pane only ever shows the
     welcome / drop-zone screen, and the queue takes the whole panel once a file
     is loaded. */
  #app { grid-template-columns: 1fr; }
  #tabbar, #pane-hint { display: none; }
  #workspace { display: none; }
  body:not(.has-file) #workspace { display: flex; }
  #sidebar { display: none; border-left: none; }
  body.has-file #sidebar { display: flex; }
  /* openMenu() already parks the dropdown under the ☰ button; only the width needs
     widening to a narrow panel's measure. */
  #menu { width: min(280px, calc(100vw - 16px)); }
  #welcome { padding: 14px; }
  #welcome .box { padding: 20px; }
  @media (max-width: 760px) { #app { grid-template-rows: 1fr; } }
`;

/* ------------------------------------------------------------ app code ---- */

let js = appJs;

/* --- 1. Real browser tabs replace the iframe workspace --------------------- */
js = patch(js, `const OPEN_MODES = {
  tabs:   { label: 'Tabs (iframes)',       hint: 'Open inside this app, one tab per link' },
  newtab: { label: 'New browser tab',      hint: 'Hand off to a full browser tab' },
  newwin: { label: 'New popup window',     hint: 'Small always-on-top window beside the queue' },
};`,
`const OPEN_MODES = {
  /* A side panel has nowhere to put a page, so there is exactly one mode here.
     Keeping the map (instead of deleting the mode plumbing) leaves getOpenMode,
     setOpenMode, the menu checkmark and the first-run gate working unchanged. */
  tabs: { label: 'Real browser tabs', hint: 'Open each link as a browser tab, and switch to the card you pick' },
};`,
'open-mode table');

js = patch(js, `  if (mode === 'tabs') { openInIframe(url, i); return; }
  if (mode === 'newtab') { window.open(url, '_blank', 'noopener'); return; }
  if (mode === 'newwin') {
    const w = window.open(url, 'turnstone-win', 'popup=yes,width=1024,height=768,noopener');
    if (!w) toast('Popup blocked — allow popups for this site, or use Tabs/New tab mode', 'error');
  }`,
`  /* The side panel drives the browser: open the link as a real tab, or switch to
     the tab this row already owns (see openBrowserTab in the panel bridge). */
  openBrowserTab(url, i);`,
'openUrlFor mode dispatch');

/* The iframe workspace itself goes. It is one contiguous region between two
   unique markers; the only helper the rest of the app still calls is kept, as a
   no-op, so nothing else has to change. */
js = patch(js, /\/\* ------------------------- Tabbed iframe workspace ------------------------ \*\/[\s\S]*?\n\/\* ------------------------ Write-back & persistence ----------------------- \*\//,
`/* ----------------------- Browser-tab workspace ----------------------------
   A side panel cannot host a page, so the web app's tabbed iframe workspace has
   no equivalent here: openBrowserTab() in the panel bridge drives REAL browser
   tabs instead, and remembering which card owns which tab is its job. Only the
   two call sites the rest of the app still makes are kept, as no-ops. */
function closeAllTabs() { /* the panel has no iframe tabs to close */ }

/* ------------------------ Write-back & persistence ----------------------- */`,
  'iframe workspace region');

js = patch(js, `// Tab bar event delegation
els.tabbar.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  const id = tab.dataset.tabId;
  if (e.target.closest('.tab-close')) { closeTab(id); return; }
  if (e.target.closest('.tab-ext')) return; // let the <a target=_blank> do its thing
  activateTab(id);
});
`, '', 'tab bar listener');

/* The first-run picker asks a question that has one answer here. */
js = patch(js, '  showModePicker(true);',
  "  setOpenMode('tabs', false);   // side panel: one mode, nothing to pick",
  'first-run mode picker');

/* The app's own popup paths must be gone before the bridge is added — the bridge
   carries exactly one window.open, as its no-extension fallback. */
if (/\bwindow\.open\b/.test(js)) throw new Error('a window.open call survived patching in the app code');

/* --- 2. The panel bridge: tabs, badge, context-menu adds ------------------ */
js = patch(js, '/* --------------------------------- Boot ---------------------------------- */',
  `${read(path.join(SRC, 'panel-bridge.js'))}\n/* --------------------------------- Boot ---------------------------------- */`,
  'boot marker');

/* Badge = tasks still open, so the count is readable with the panel shut. */
js = patch(js, '  log(`renderCards done: ${visible} visible, ${done} complete`);',
  "  log(`renderCards done: ${visible} visible, ${done} complete`);\n"
  + "  sendToWorker({ type: 'badge', remaining: total - done });",
  'renderCards completion log');

/* One pane at a time, driven by state the app already tracks. */
js = patch(js, '  els.miExportXlsx.hidden = !HAS_XLSX_WRITE;   // no workbook writer → offer only what works',
  '  els.miExportXlsx.hidden = !HAS_XLSX_WRITE;   // no workbook writer → offer only what works\n'
  + "  // Side panel: swap between the drop-zone screen and the queue (see the panel CSS).\n"
  + "  document.body.classList.toggle('has-file', has);",
  'updateChrome menu state');

/* Exports go through the downloads API, which names the file and needs no anchor
   click. The anchor stays as the fallback for harness runs outside an extension. */
js = patch(js, '  document.body.appendChild(a); a.click(); a.remove();',
  `  if (EXT && chrome.downloads) {
    chrome.downloads.download({ url: a.href, filename: a.download, saveAs: false }, () => {
      if (chrome.runtime.lastError) {
        warn('chrome.downloads failed', chrome.runtime.lastError);
        toast('Export failed — the extension needs the downloads permission', 'error');
      } else {
        log(\`Exported \${a.download} (\${kind}) via chrome.downloads\`);
        toast(\`Exported \${a.download}\`, 'success');
      }
    });
    return;
  }
  document.body.appendChild(a); a.click(); a.remove();`,
  'export download');

/* --- 3. Gone: PWA plumbing, install prompt, unload guard ------------------ */
/* Anchored on the end of buildManifest, not on the first "})();" after the
   heading — the icon constants above it are an IIFE too, and stopping there left
   a buildManifest() behind that threw "ICON_192 is not defined" on every load. */
js = patch(js, /\/\* ------------------------------ PWA plumbing ------------------------------ \*\/[\s\S]*?warn\('Manifest build failed \(PWA features limited\)', e\); \}\n\}\)\(\);\n/,
  '/* PWA plumbing removed in the extension build: an install prompt and a manifest\n   belong to a web origin — the panel is installed as an extension instead. */\n',
  'PWA plumbing block');
js = patch(js, /\/\* Service worker: offline shell\.[\s\S]*?\n\}\n/,
  `/* Service worker registration removed in the extension build: the panel ships as
   packed files and needs no offline shell. */\n`,
  'service-worker registration block');


js = patch(js, /\/\* Install button: only shown when the browser fires beforeinstallprompt\. \*\/[\s\S]*?\n\}\);\n/,
  '/* Install button removed in the extension build (nothing fires beforeinstallprompt\n   in an extension page, and the toolbar icon already opens the panel). */\n',
  'install-prompt block');

js = patch(js, `/* PRD Task 4.4: strict beforeunload guard in fallback/remote modes. */
window.addEventListener('beforeunload', (e) => {
  if (state.mode && state.mode !== 'fs' && state.isDirty) {
    warn('beforeunload blocked: unexported changes in fallback mode');
    e.preventDefault();
    e.returnValue = ''; // required for Chrome
    return 'You have unexported changes. Export CSV/XLSX before leaving.';
  }
});
`,
  '/* beforeunload guard removed in the extension build: closing a side panel must not\n   raise a dialog, and the IndexedDB snapshot is kept either way. */\n',
  'beforeunload guard');

const winOpens = (js.match(/\bwindow\.open\b/g) || []).length;
if (winOpens !== 1) throw new Error(`expected exactly 1 window.open (the bridge's no-extension fallback), found ${winOpens}`);
for (const dead of ['openInIframe', 'renderTabbar', 'activateTab(', 'closeTab(', 'tabTitle']) {
  if (js.includes(dead)) throw new Error(`the iframe workspace survived: ${dead}`);
}
if (!js.includes('function closeAllTabs()')) throw new Error('the closeAllTabs shim is missing');
if (/addEventListener\('beforeunload'/.test(js)) throw new Error('a beforeunload handler survived patching');
for (const gone of ['buildManifest', 'ICON_192', 'serviceWorker', 'ICON_512_PNG', 'STANDALONE_BUILD']) {
  if (js.includes(gone)) throw new Error(`PWA machinery survived: ${gone}`);
}
if (!js.includes("document.body.classList.toggle('has-file'")) throw new Error('has-file flag was not wired');
if (!js.includes('openBrowserTab(url, i)')) throw new Error('openUrlFor was not re-pointed at browser tabs');

/* ------------------------------------------------------------- markup ----- */

/* Relabel and prune the open-mode menu: one mode means one item. */
markup = patch(markup, '<button class="menu-item mode-item" data-mode="tabs"><span class="mi">🗂</span> Tabs (iframes)</button>',
  '<button class="menu-item mode-item" data-mode="tabs"><span class="mi">🗂</span> Real browser tabs</button>',
  'tabs menu item');
markup = patch(markup, '      <button class="menu-item mode-item" data-mode="newtab"><span class="mi">↗</span> New browser tab</button>\n', '', 'newtab menu item');
markup = patch(markup, '      <button class="menu-item mode-item" data-mode="newwin"><span class="mi">◱</span> New popup window</button>\n', '', 'newwin menu item');
markup = patch(markup, '      <button class="menu-item" id="mi-mode-help"><span class="mi">❔</span> Which should I pick?</button>\n', '', 'mode-help menu item');

/* The deep-link sentence describes a URL a side panel does not have. */
markup = patch(markup, 'Deep-link support: <code>?file=&lt;url&gt;</code> or <code>?url=&lt;url&gt;</code>; add <code>&amp;open=1</code> to auto-open the first task.',
  'Paste the address of a list shared as a web file.', 'deep-link sentence');

/* ---------------------------------------------------------- page shell ---- */

const page = `<!doctype html>
<!--
  Turnstone side panel — GENERATED by ports/extension/build.js from app.html;
  edit app.html or the build script, not this file.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<title>Turnstone</title>
<link rel="stylesheet" href="sidepanel.css">
<link rel="icon" href="icons/icon-192.png">
<script src="boot.js"></script>
</head>
<body>
${markup}
<script src="vendor/papaparse.min.js"></script>
<script src="vendor/xlsx.full.min.js"></script>
<script src="sidepanel.js"></script>
</body>
</html>
`;

const boot = `/* Turnstone side panel — boot (theme + bundled sample dataset).
   Generated by ports/extension/build.js from the two scripts that cannot stay
   inline under the extension page CSP (script-src 'self'). */

/* --- theme boot: runs before first paint, so there is no flash of the wrong theme --- */
${themeJs}

/* --- bundled sample dataset, behind the Welcome screen's Test buttons --- */
${bootJs}
`;

const README = `Turnstone — Chrome extension (unpacked build)
=============================================

Generated by ports/extension/build.js. Do not edit these files: they are built
from app.html and ports/extension/src/*, and the build fails rather than ship a
panel that has drifted from the app.

Install
-------
1. Open chrome://extensions
2. Turn on "Developer mode" (top right)
3. Click "Load unpacked" and choose this folder
4. Click the Turnstone toolbar icon — the queue opens in Chrome's side panel
   (or right-click any link → "Add link to Turnstone" to open it with the link queued)

Needs Chromium 114+ (the Side Panel API): Chrome and Edge. Firefox cannot load
this folder — it is Manifest V3 with a side panel, which Firefox does not
implement. Use the web app or the standalone build there instead.

How it differs from the web app
------------------------------
- Links open as REAL browser tabs. Selecting a card switches to that card's tab
  rather than reloading it, and completing a task auto-advances to the next one.
- There is no iframe workspace: a side panel cannot host a page.
- The toolbar badge shows how many tasks are left.
- Right-click any link → "Add link to Turnstone" appends it to the open queue.
- Your queue, column presets and open file live per-browser in IndexedDB, so they
  survive closing the panel. Picking a file keeps live write-back to that file.
`;

/* ---------------------------------------------------------- assemble ------ */

const files = {
  'sidepanel.html': page,
  'sidepanel.css': css,
  'sidepanel.js': js,
  'boot.js': boot,
  'background.js': read(path.join(SRC, 'background.js')),
  'manifest.json': read(path.join(HERE, 'manifest.json')),
  'README.txt': README,
  'vendor/papaparse.min.js': read(path.join(ROOT, 'vendor/papaparse.min.js')),
  'vendor/xlsx.full.min.js': read(path.join(ROOT, 'vendor/xlsx.full.min.js')),
  'assets/logo-dark.svg': read(path.join(ROOT, 'assets/logo-dark.svg')),
  'assets/logo-light.svg': read(path.join(ROOT, 'assets/logo-light.svg')),
  'icons/icon-192.png': fs.readFileSync(path.join(ROOT, 'assets/icon-192.png')),
  'icons/icon-512.png': fs.readFileSync(path.join(ROOT, 'assets/icon-512.png')),
  /* The panel runs under the extension page CSP, which the browser applies as a
     response header — impossible to reproduce from a file on an ordinary server.
     This copy carries the same policy as a meta tag, so opening it over http
     proves the panel needs no inline script and no eval. Chrome ignores the file. */
  'panel-csp.html': page.replace('<head>',
    '<head>\n<!-- Harness: the extension page CSP, as a meta tag, for http testing. -->\n'
    + '<meta http-equiv="Content-Security-Policy" content="script-src \'self\'; object-src \'self\'">'),
  /* The bridge only runs inside an extension, so this copy stands up a mock of the
     tab, badge, storage and download APIs first — the extension-specific half of
     the port is otherwise unverifiable outside chrome://extensions. */
  'chrome-mock.js': read(path.join(SRC, 'chrome-mock.js')),
  'panel-test.html': page.replace('<script src="boot.js"></script>',
    '<script src="chrome-mock.js"></script>\n<script src="boot.js"></script>'),
};

/* ------------------------------------------------------------ assert ------ */

if (/<script(?![^>]*src=)/.test(page)) throw new Error('an inline script survived into sidepanel.html');
if (!files['panel-csp.html'].includes('Content-Security-Policy')) throw new Error('the CSP harness lost its policy');
if (!files['panel-test.html'].includes('src="chrome-mock.js"')) throw new Error('the mock-APIs harness lost its mock');
if (/<script(?![^>]*src=)/.test(files['panel-csp.html'])) throw new Error('an inline script survived into the CSP harness');
if (!page.includes('src="sidepanel.js"')) throw new Error('sidepanel.html does not load the app');
for (const m of page.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const rel = m[1];
  if (/^(https?:|data:|#)/.test(rel)) continue;
  if (!files[rel]) throw new Error(`sidepanel.html references ${rel}, which the build does not package`);
}
if (!js.includes('const EXT = ')) throw new Error('the panel bridge was not inlined');
if (!js.includes('chrome.tabs.create')) throw new Error('tab creation is missing');
if (!js.includes('chrome.downloads.download')) throw new Error('the downloads export path is missing');
if (!css.includes('body.has-file #sidebar')) throw new Error('the panel layout CSS is missing');
if (!/Real browser tabs/.test(js) || !/Real browser tabs/.test(page)) throw new Error('the tab-only mode was not applied');

const manifest = JSON.parse(files['manifest.json']);
const needed = [manifest.side_panel.default_path, manifest.background.service_worker,
  manifest.action.default_icon, ...Object.values(manifest.icons)];
for (const p of needed) if (!files[p]) throw new Error(`the manifest points at an unpackaged file: ${p}`);

/* ------------------------------------------------------------- report ----- */

const sha = git('rev-parse --short HEAD', 'unknown');
const dirty = git(`diff --quiet HEAD -- . ":!ports/extension/dist"`, 'dirty') === 'dirty' ? ' + uncommitted changes' : '';
const total = Object.values(files).reduce((n, v) => n + bytesOf(v).length, 0);
const rel = (p) => path.relative(ROOT, path.join(DIST, p));

if (CHECK) {
  const changed = Object.entries(files).filter(([p, want]) => {
    const file = path.join(DIST, p);
    return !fs.existsSync(file) || !fs.readFileSync(file).equals(bytesOf(want));
  }).map(([p]) => p);
  console.log(`extension dist: ${Object.keys(files).length} files, ${(total / 1024).toFixed(1)} KB`);
  console.log(changed.length
    ? `\n--check: STALE (${changed.join(', ')}) — rerun without --check`
    : '\n--check: dist matches app.html and ports/extension/src');
  process.exit(changed.length ? 1 : 0);
}

for (const [p, content] of Object.entries(files)) {
  const file = path.join(DIST, p);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

console.log(`Turnstone extension → ${path.relative(ROOT, DIST)}/`);
console.log(`  generated from app.html @ ${sha}${dirty}`);
for (const p of Object.keys(files).sort()) console.log(`  ${p.padEnd(28)} ${size(files[p]).padStart(9)}`);
console.log(`  ${'TOTAL'.padEnd(28)} ${(total / 1024).toFixed(1).padStart(6)} KB`);
console.log(`\n  load it: chrome://extensions → Developer mode → Load unpacked → ${path.relative(ROOT, DIST)}`);

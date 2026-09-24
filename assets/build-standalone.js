#!/usr/bin/env node
'use strict';

/* Turnstone — standalone single-file build.
 *
 * Produces turnstone-standalone.html: one document holding the entire app, with
 * everything app.html normally loads from disk inlined — the two vendored
 * libraries and the logo art. That makes the file genuinely self-contained, so
 * it can be double-clicked from a USB stick, dropped on an internal share, or
 * carried onto an air-gapped machine: no server, no checkout, no network.
 *
 * Because app.html already makes zero third-party requests, "inlining" is the
 * whole build — there is nothing to rewrite, bundle or transpile.
 *
 * Usage:
 *   node assets/build-standalone.js                 # writes turnstone-standalone.html
 *   node assets/build-standalone.js --out /tmp/x.html
 *   node assets/build-standalone.js --check         # verify the build matches app.html, write nothing
 *
 * Any change to app.html that adds or removes a <script src> or logo <img>
 * reference must be mirrored in the REPLACEMENTS list below — the build fails
 * loudly (rather than shipping a half-offline file) if a reference it expects
 * is missing or a reference it does not know about is still present.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const outArg = args.indexOf('--out');
const OUT = outArg >= 0 && args[outArg + 1] ? path.resolve(args[outArg + 1]) : path.join(ROOT, 'turnstone-standalone.html');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const size = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} KB`;

function git(revArgs, fallback) {
  try { return execSync(`git ${revArgs}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch (e) { return fallback; }
}

/** Replace exactly once, or fail the build. */
function mustReplace(html, find, replace, label) {
  const count = html.split(find).length - 1;
  if (count !== 1) throw new Error(`expected exactly 1 ${label} reference, found ${count}\n  pattern: ${find}`);
  return html.split(find).join(replace);
}

const svgUri = (p) => `data:image/svg+xml;base64,${Buffer.from(read(p)).toString('base64')}`;
const jsBlock = (src, comment) => `<script>\n/* ${comment} — vendored, inlined for the standalone build. */\n${read(src)}\n</script>`;

/* ---------------------------------------------------------------- build ---- */

let html = read('app.html');
const before = Buffer.byteLength(html);
const papaBytes = Buffer.byteLength(read('vendor/papaparse.min.js'));
const xlsxBytes = Buffer.byteLength(read('vendor/xlsx.full.min.js'));

const replacements = [
  ['vendor/papaparse.min.js script tag',
    '<script src="vendor/papaparse.min.js"></script>',
    jsBlock('vendor/papaparse.min.js', 'PapaParse 5.4.1')],
  ['vendor/xlsx.full.min.js script tag',
    '<script src="vendor/xlsx.full.min.js"></script>',
    jsBlock('vendor/xlsx.full.min.js', 'SheetJS 0.20.3')],
  ['dark logo image',
    'src="assets/logo-dark.svg"',
    `src="${svgUri('assets/logo-dark.svg')}"`],
  ['light logo image',
    'src="assets/logo-light.svg"',
    `src="${svgUri('assets/logo-light.svg')}"`],
  /* No sw.js sits next to a copied standalone file, so registration is turned off
     rather than left to 404 in the console. */
  ['service worker gate', 'const STANDALONE_BUILD = false;', 'const STANDALONE_BUILD = true;'],
  ['title', '<title>Turnstone — URL List Processor</title>',
    '<title>Turnstone — standalone beta</title>'],
  ['tagline', '<p class="tagline">Your list, worked through.</p>',
    '<p class="tagline">Your list, worked through. '
    + '<span class="ts-beta" title="Standalone single-file beta build: the app, its libraries and its artwork all live in this one document. Nothing is loaded from the network. Local files work fully; remote ?file= URLs need the hosted app.">beta · standalone</span></p>'],
];

for (const [label, find, replace] of replacements) html = mustReplace(html, find, replace, label);

/* Beta chip styling, appended to the existing inline stylesheet. */
html = mustReplace(html, '\n</style>', `
  /* standalone build marker */
  .ts-beta {
    display: inline-block; font-size: 9.5px; letter-spacing: .05em; text-transform: uppercase;
    padding: 2px 7px; border-radius: 999px; border: 1px solid var(--border);
    color: var(--muted); vertical-align: 1.5px;
  }
</style>`, 'closing style tag');

/* Build stamp, right after the doctype. */
const sha = git('rev-parse --short HEAD', 'unknown');
// Tracked modifications only, and never the artifact itself: a rebuild always
// rewrites this file, so counting it would brand every build as dirty.
const relOut = path.relative(ROOT, OUT).split(path.sep).join('/');
const dirty = git(`diff --quiet HEAD -- . ":!${relOut}"`, 'dirty') === 'dirty' ? ' + uncommitted changes' : '';
const stamp = [
  '<!--',
  '  Turnstone — standalone BETA build.',
  `  Generated ${new Date().toISOString()} from app.html @ ${sha}${dirty}.`,
  '',
  '  Self-contained by construction: the app shell, PapaParse, SheetJS and the logo',
  '  artwork are all inlined above, and the app makes no third-party requests, so this',
  '  document needs no server, no network and no repository checkout.',
  '',
  '  Regenerate with:  node assets/build-standalone.js',
  '-->',
].join('\n');
html = mustReplace(html, '<!doctype html>', `<!doctype html>\n${stamp}`, 'doctype');

/* ------------------------------------------------------------- assert ----- */

const leftovers = html.match(/(?:src|href)="(?:assets|vendor)\/[^"]*"/g);
if (leftovers) throw new Error(`standalone still references files on disk:\n  ${leftovers.join('\n  ')}`);
for (const needle of ['Papa.parse', 'sheet_to_json', 'data:image/svg+xml;base64,']) {
  if (!html.includes(needle)) throw new Error(`standalone is missing expected inlined content: ${needle}`);
}
if (!html.includes('const STANDALONE_BUILD = true;')) throw new Error('STANDALONE_BUILD flag was not flipped — the SW gate has drifted from app.html');

const report = [
  `app.html                ${size(read('app.html'))}`,
  `  papaparse.min.js      ${(papaBytes / 1024).toFixed(1)} KB → inlined`,
  `  xlsx.full.min.js      ${(xlsxBytes / 1024).toFixed(1)} KB → inlined`,
  `  logo-dark/light.svg   inlined as data URIs`,
  `app.html total          ${(before / 1024).toFixed(1)} KB`,
  `standalone              ${size(html)} (${((Buffer.byteLength(html) / before) * 100).toFixed(0)}% of the app shell alone)`,
].join('\n');

if (CHECK) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  // Ignore the build stamp (timestamp + sha) when comparing.
  const strip = (s) => s.replace(/<!--\n {2}Turnstone — standalone BETA build[\s\S]*?-->\n/, '');
  const same = strip(current) === strip(html);
  console.log(report);
  console.log(same ? `\n--check: ${path.relative(ROOT, OUT)} is up to date` : `\n--check: ${path.relative(ROOT, OUT)} is STALE — rerun without --check`);
  process.exit(same ? 0 : 1);
}

fs.writeFileSync(OUT, html);
console.log(report);
console.log(`\nwrote ${path.relative(ROOT, OUT)}`);

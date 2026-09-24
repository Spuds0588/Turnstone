'use strict';

/* Turnstone — artifact size registry.
 *
 * The guide pages quote sizes (the bookmarklet's whole selling point is that its
 * smallest variant is small), and a quoted size that has gone stale is a page lying
 * to the person deciding which edition to install.
 *
 * The obvious way to keep it honest — a HEAD request's Content-Length — does NOT
 * work on a CDN that content-encodes: GitHub Pages gzips these files and reports the
 * *compressed* length, so the bookmarklet's 141 KB core payload read as 42 KB. A
 * script cannot ask for identity encoding either: `Accept-Encoding` is a forbidden
 * header name in fetch. Measuring by downloading would be correct but costs ~2.3 MB
 * on a page whose job is to help someone decide.
 *
 * So each build records the byte counts of what it just produced, here. The site
 * reads one small JSON instead of three large files, and no page has to hardcode a
 * number a rebuild can invalidate.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'assets', 'sizes.json');

function readSizes() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

/** Merge `{ 'relative/path': bytes }` into the registry. Returns the paths that changed. */
function recordSizes(map) {
  const merged = readSizes();
  const changed = [];
  for (const [rel, bytes] of Object.entries(map)) {
    if (merged[rel] !== bytes) changed.push(rel);
    merged[rel] = bytes;
  }
  const sorted = {};
  for (const key of Object.keys(merged).sort()) sorted[key] = merged[key];
  fs.writeFileSync(FILE, JSON.stringify(sorted, null, 2) + '\n');
  return changed;
}

module.exports = { ROOT, FILE, readSizes, recordSizes };

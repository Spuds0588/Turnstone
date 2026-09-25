
'use strict';
/* =========================================================================
   Project Turnstone — zero-server URL-list processor.
   Vanilla JS. Workspace on the LEFT, task sidebar on the RIGHT (deviation).
   ========================================================================= */

const LOG = '[Turnstone]';
const log  = (...a) => console.log(LOG, ...a);
const warn = (...a) => console.warn(LOG, ...a);
const err  = (...a) => console.error(LOG, ...a);

/* ---------------------------- IndexedDB layer ---------------------------- */
const DB_NAME = 'turnstone', DB_VER = 1;
let idbPromise = null;

function idbOpen() {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('session')) db.createObjectStore('session', { keyPath: 'key' });
      log('IndexedDB stores created');
    };
    req.onsuccess = () => { log('IndexedDB opened'); resolve(req.result); };
    req.onerror = () => { err('IndexedDB open failed', req.error); reject(req.error); };
  });
  return idbPromise;
}
async function idbPut(store, value) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => { log(`IDB put → ${store}/${value.key}`); res(); };
    tx.onerror = () => { err(`IDB put failed → ${store}/${value.key}`, tx.error); rej(tx.error); };
  });
}
async function idbGet(store, key) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const req = db.transaction(store).objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => { err(`IDB get failed → ${store}/${key}`, req.error); rej(req.error); };
  });
}
async function idbGetAll(store) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => { err(`IDB getAll failed → ${store}`, req.error); rej(req.error); };
  });
}

/* --------------------------------- State --------------------------------- */
/* `?link=` is read by the boot sequence but consumed by the *next* loadMatrix, so
   it lives outside `state` and is cleared once used. */
let bootLinkTemplate = '';
/* The payload of the workspace link currently loaded, so a same-document fragment
   change is not reloaded into itself (see the hashchange listener at boot). */
let loadedInlineKey = '';
const state = {
  name: null,          // file name or URL label
  ext: 'csv',          // format id: csv | tsv | xlsx | xls | ods | json | html | xml
  mode: null,          // 'fs' (File System Access) | 'fallback' | 'remote' | 'demo'
  fileHandle: null,    // FileSystemFileHandle (Chromium only)
  sheetName: 'Sheet1',
  data: [],            // 2D array, exactly as parsed
  hasHeader: false,
  urlCol: 0, nameCol: -1, statusCol: -1, notesCol: -1,
  linkless: false,     // true when no cell in the file is link-shaped (portal list)
  linkTemplate: '',    // portal URL template, e.g. https://portal.example.com/ticket/{Ticket ID}
  status: [],          // virtual per-card status ('incomplete'|'complete'), cardIndex-based
  notes: [],           // virtual per-card notes
  isDirty: false,
  search: '', hideCompleted: true,   // completed cards hidden by default (toggle: Show completed)
  sortCol: null, sortAsc: true,      // card ordering; null = file order
  autoOpenOnSelect: false,           // open a link as soon as its card is expanded
  autoAdvance: false,                // open the next incomplete card's link when one is completed
  sourceUrl: null,      // remote URL the file was fetched from (?file=/ pasted), enables 🔗 Link
  colOrder: null,       // card-display order of data columns (indices); null = file order
  colHidden: {},        // column index → true when hidden from cards
  expanded: {},         // card index → true when all data columns are shown
};

const $ = (sel) => document.querySelector(sel);
/* Every modal this app builds is mounted, and asked for, through these two
   helpers rather than through `document.body` / `document.querySelector`. One
   place to point them at, which matters because the bookmarklet build mounts the
   app inside a shadow root — where `document.body` is somebody else's page and
   `document.querySelector` cannot see our own overlays at all. */
const mountPoint = () => document.body;
const modalOpen = (sel) => !!document.querySelector(sel);
const els = {
  fileInput: $('#file-input'), dropzone: $('#dropzone'), btnDemo: $('#btn-demo'),
  dzFormats: $('#dz-formats'), capNotice: $('#cap-notice'),
  btnMenu: $('#btn-menu'), menu: $('#menu'), headName: $('#head-name'), headSave: $('#head-save'),
  miOpen: $('#mi-open'), miRestore: $('#mi-restore'), miClose: $('#mi-close'), miLink: $('#mi-link'), miBuild: $('#mi-build'),
  miColumns: $('#mi-columns'), miExportCsv: $('#mi-export-csv'), miExportXlsx: $('#mi-export-xlsx'),
  miInstall: $('#mi-install'), miTheme: $('#mi-theme'), miThemeLabel: $('#mi-theme-label'),
  miAutoOpen: $('#mi-auto-open'), miAutoAdvance: $('#mi-auto-advance'),
  miPortal: $('#mi-portal'), miPaste: $('#mi-paste'), pasteHint: $('#paste-hint'),
  settingsOverlay: $('#settings-overlay'), settingsCols: $('#settings-cols'), settingsPresets: $('#settings-presets'),
  settingsX: $('#settings-x'), presetName: $('#preset-name'), btnPresetSave: $('#btn-preset-save'), btnColsReset: $('#btn-cols-reset'),
  gate: $('#mobile-gate'), gateW: $('#gate-w'), gateH: $('#gate-h'), gateDismiss: $('#gate-dismiss'),
  urlInput: $('#url-input'), btnLoadUrl: $('#btn-load-url'),
  btnTestCsv: $('#btn-test-csv'), btnTestXlsx: $('#btn-test-xlsx'),
  welcome: $('#welcome'), recents: $('#recents'), recentsList: $('#recents-list'),
  tabbar: $('#tabbar'), panes: $('#panes'),
  search: $('#search'), showCompleted: $('#show-completed'), filterInfo: $('#filter-info'),
  sortCol: $('#sort-col'), sortDir: $('#sort-dir'),
  cards: $('#cards'),
  countTotal: $('#count-total'), countDone: $('#count-done'), countLeft: $('#count-left'),
  toast: $('#toast'),
};

/* ------------------------------- Utilities ------------------------------- */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function highlight(text, q) {
  const raw = String(text ?? '');
  if (!q) return esc(raw);
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return raw.split(rx).map(esc).join('<mark>' + esc(q) + '</mark>'); // split keeps separators; escape every part
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

let toastTimer = null;
function toast(msg, type = '') {
  log('Toast:', msg);
  els.toast.textContent = msg;
  els.toast.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.className = ''; }, 3500);
}

async function copyText(text, label = 'text') {
  try {
    await navigator.clipboard.writeText(text);
    log(`Copied ${label} to clipboard (${text.length} chars)`);
    return true;
  } catch (e) {
    warn('Clipboard API failed, falling back to execCommand', e);
    const ta = document.createElement('textarea');
    ta.value = text; ta.className = 'clip-fallback';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    log(`execCommand copy ${ok ? 'succeeded' : 'failed'} for ${label}`);
    return ok;
  }
}

/* ------------------------------ Parsing core ------------------------------ */
/* Every supported input — CSV, TSV, XLSX/XLS/ODS, JSON, HTML tables, XML —
   collapses into ONE shape: a 2D array of strings. Everything downstream
   (analyzeMatrix → loadMatrix → renderCards) is format-agnostic, so adding a
   format means one detector entry plus one parser that returns rows. */

const HEADER_URL_RE = /^(url|link|href|website|web site|site|address|loc|permalink|portal|record|open in)\b/i;
/* The words real trackers use for "the thing this row is about". A vendor
   onboarding sheet, a ticket queue, an approvals list and a candidate pipeline
   all name this column something other than "Name" — and the column that *does*
   read like a label on those sheets is the identifier beside it. */
const HEADER_NAME_RE = /^(name|title|task|label|page|description|summary|subject|item|issue|request|job|candidate|applicant|vendor|supplier|client|customer|company|asset|document|contract|policy|renewal|action|deliverable|activity|step|milestone|what|thing)\b/i;
/* Identifier columns: `INC0041821` is what you *find* a row by, never what the
   row is. Recognized so a title column can outrank it — ``#2``, not ``#1``. */
const HEADER_ID_RE = /^(id|no|num|number|ref|reference|code|key|#|ticket|case|invoice|order|po|sku|uid|guid|index|seq|sequence|row)(\b|$)/i;

/* A cell is a URL *value* when it looks like a link, whatever its column is
   called. This is the only test used to choose the URL column: the header text
   is at most a tiebreaker, so a list whose URL column is titled "Page",
   "Resource" or nothing at all still lands on the right column. */
const URL_VALUE_RE = /^https?:\/\//i;
const DOMAIN_VALUE_RE = /^(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(?:[/?#].*)?$/i;
const FILE_EXT_TLDS = new Set(['exe','txt','doc','docx','pdf','zip','png','jpg','jpeg','gif','csv','tsv','xls','xlsx','ods','json','html','htm','xml','md','log','bak','tmp','py','js','ts','css','mp3','mp4','svg','ppt','pptx','tar','gz','rar','7z','iso','dmg','apk']);
/* A label, not a value: short, readable, and free of the marks that give a real
   data value away — a long digit run (`INC0041821`), a date, an address, a link,
   or a number pretending to be a word. "Phone 1" and "Q3 notes" are labels;
   "1200" and "2024-05-12" are not. */
const LABEL_SHAPE_RE = /^[A-Za-z][A-Za-z0-9 ._/#&'()%+\-]{0,39}$/;
function looksLikeLabel(v) {
  const s = String(v ?? '').trim();
  if (!s) return false;
  if (/\d{3,}/.test(s)) return false;
  if (DATE_SHAPE_RE.test(s)) return false;
  return LABEL_SHAPE_RE.test(s) && !isUrlValue(s) && !isEmailValue(s) && !isPhoneValue(s);
}
/** Is `first` a header row over `sample`? Every filled cell must read as a label
    and at least one column must hold values that are *not* labels below it —
    otherwise a two-row list of plain names would be promoted to a header. */
function looksLikeLabelRow(first, sample) {
  const cells = first.map(c => String(c ?? '').trim());
  const filled = cells.filter(Boolean);
  if (filled.length < 2) return false;
  if (!filled.every(looksLikeLabel)) return false;
  for (let c = 0; c < cells.length; c++) {
    let values = 0, nonLabels = 0;
    for (const r of sample) {
      const v = String(r[c] ?? '').trim();
      if (!v) continue;
      values++;
      if (!looksLikeLabel(v)) nonLabels++;
    }
    if (values >= 2 && nonLabels / values >= 0.6) return true;
  }
  return false;
}
function isUrlValue(v) {
  const s = String(v ?? '').trim();
  if (!s) return false;
  if (URL_VALUE_RE.test(s)) return true;
  const m = s.match(DOMAIN_VALUE_RE);
  if (!m) return false;
  const tld = m[1].slice(m[1].lastIndexOf('.') + 1).toLowerCase();
  return !FILE_EXT_TLDS.has(tld);   // "setup.exe" is a filename, not a link
}

/* ------------------------------------------------------------------ *
   Portal lists: work that lives behind one URL
   ------------------------------------------------------------------ *
   A large share of real admin queues carries no link at all. The rows are
   ticket numbers, invoice IDs, vendor names or case references, the portal is
   the same page every time, and the *key* to a row is a column value — not an
   address. Turnstone's link detection is value-based and rightly finds nothing
   there, so the list gets a template instead: the user names the portal once
   (or arrives with `?link=`) and every row composes its own URL.

   `{Column name}` is filled from that column and percent-encoded, because that
   is what a path segment or a query value needs 90% of the time. `{Column|raw}`
   splices the value verbatim for the other 10% — a template that rebuilds a
   path the value already spells out. `{0}` addresses a column by index, so a
   file with no header row can still be templated. */
const TEMPLATE_FIELD_RE = /\{([^{}]+)\}/g;
const isHttpUrl = (s) => /^https?:\/\//i.test(String(s ?? '').trim());

/** The distinct placeholders a template names, `|raw` stripped (for the UI). */
function templateFields(tpl) {
  const out = [];
  TEMPLATE_FIELD_RE.lastIndex = 0;
  let m;
  while ((m = TEMPLATE_FIELD_RE.exec(String(tpl ?? '')))) {
    const name = m[1].trim().replace(/\|raw$/i, '').trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/** Resolve one placeholder against a row: header name (case-insensitive) first,
    then a bare column index. Returns null when nothing matches, '' when the
    column exists but this row is empty — the difference decides the warning. */
function resolveTemplateField(field, row, header) {
  const name = String(field).trim();
  const idx = header.findIndex(h => String(h ?? '').trim().toLowerCase() === name.toLowerCase());
  if (idx >= 0) return String(row[idx] ?? '').trim();
  if (/^\d+$/.test(name) && Number(name) < row.length) return String(row[Number(name)] ?? '').trim();
  return null;
}

/** Compose one row's URL. `''` means "this row has no link" — either the template
    is blank, a placeholder has no matching column, or the row's key is empty.
    A missing *column* is a template mistake and is reported once; a blank *cell*
    is simply a row without a key, which is ordinary and stays quiet. */
function applyUrlTemplate(tpl, row, header) {
  let t = String(tpl ?? '').trim();
  if (!t) return '';
  // A template typed as a bare host means https, the same way it does in the
  // address bar. This is the single place that forgives that, so the preview in
  // the UI and the URL on a card can never disagree.
  if (!/^[a-z][a-z0-9+.\-]*:/i.test(t)) t = 'https://' + t;
  /* An empty value is fatal in the *path* and harmless in the query. A portal
     address like `/incident/` with the ticket number missing is not a link to
     this row, it is a link to the wrong page — so there is no link. `?tag=` with
     an empty tag is just an empty filter, and dropping the whole row's link over
     it would be worse than keeping it. */
  const queryAt = t.search(/[?#]/);
  let missing = false;
  const url = t.replace(TEMPLATE_FIELD_RE, (whole, field, offset) => {
    const name = field.trim().replace(/\|raw$/i, '').trim();
    const raw = /\|raw$/i.test(field.trim());
    const value = resolveTemplateField(name, row, header);
    if (value === null) { missing = true; return ''; }
    if (value === '' && (queryAt < 0 || offset < queryAt)) { missing = true; return ''; }
    return raw ? value : encodeURIComponent(value);
  }).trim();
  if (missing) return '';
  /* Last gate before a value becomes a clickable href: only a real http(s) URL
     comes back, so no template can ever produce a `javascript:` or `data:` link. */
  return isHttpUrl(url) ? url : '';
}

/** The host a template points at — used to label a constant portal URL. */
function portalLabel(tpl) {
  try { return new URL(String(tpl).replace(/\{[^{}]*\}/g, 'x')).host || 'the portal'; }
  catch (e) { return 'the portal'; }
}

/** Validate a template against the loaded columns. Returns a human reason, or null. */
function templateProblem(tpl, header) {
  const t = String(tpl ?? '').trim();
  if (!t) return null;
  if (/^\s*(javascript|data|vbscript|file|blob):/i.test(t)) return 'Only http:// and https:// templates are allowed';
  const names = header.map(h => String(h ?? '').trim().toLowerCase());
  const unknown = templateFields(t).filter(f => !names.includes(f.toLowerCase()) && !/^\d+$/.test(f));
  if (unknown.length) {
    const cols = header.filter(h => String(h ?? '').trim()).map(h => `“${String(h).trim()}”`).join(', ');
    return `No column called ${unknown.map(u => `“${u}”`).join(' or ')} — ${cols ? `this file has ${cols}` : 'this file has no header row, so use {0}, {1} … by position'}`;
  }
  return null;
}

/* ---- Remembered portal templates ---------------------------------------- */
/* Keyed by header signature, exactly like column roles and presets, so the same
   report opened next month composes its links again without being asked. A file
   with no header row has no signature to key on, so its template is not
   remembered — it is re-entered (or passed with `?link=`) each time. */
const LS_TEMPLATES = 'turnstone-link-templates';
function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(LS_TEMPLATES) || '{}'); }
  catch (e) { warn('Could not read saved link templates', e); return {}; }
}
function saveTemplates(t) {
  try { localStorage.setItem(LS_TEMPLATES, JSON.stringify(t)); return true; }
  catch (e) { warn('Could not persist link template', e); return false; }
}
/** A header signature is only meaningful when there is a header row. */
const templateKeyFor = (data, hasHeader) => (hasHeader ? headerSignature((data || [])[0] || []) : '');
function rememberTemplate(key, tpl) {
  if (!key) return;
  const all = loadTemplates();
  if (String(tpl || '').trim()) all[key] = String(tpl).trim();
  else delete all[key];
  if (saveTemplates(all)) log(`Link template ${tpl ? 'saved' : 'cleared'} for this header signature`);
}

/* An address and a phone number are the other two "link-shaped" values a list
   can carry, and they are decided from the *value* for the same reason a URL is:
   nobody's CRM export calls those columns what we would. Turnstone vendors the
   two embedded layers that make the click useful — MailLayer for addresses,
   PhoneLayer for numbers — so a click opens a webmail composer or a VoIP/SMS
   provider picker instead of a dead desktop handler. */
const EMAIL_VALUE_RE = /^[a-z0-9._%+'\-]+@[a-z0-9\-]+(?:\.[a-z0-9\-]+)+$/i;
const PHONE_VALUE_RE = /^\+?\d[\d\s().\u2011\u2013\-/]{4,}\d$/;
const DATE_SHAPE_RE = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/;   // 2024-05-12 is a date, not a number
function isEmailValue(v) {
  const s = String(v ?? '').trim();
  if (!s || s.length > 254 || /\s/.test(s)) return false;
  if (!EMAIL_VALUE_RE.test(s)) return false;
  const tld = s.slice(s.lastIndexOf('.') + 1);
  return tld.length >= 2 && !/\d/.test(tld);   // "a@b.12" is not an address
}
/* Money and measurements are not telephone numbers. `12480.75` is an invoice
   amount with seven digits in it, and it read as a phone number — which was
   enough, on its own, to stop a finance sheet being recognized as a list whose
   rows are worked in one portal. A decimal number has one dot (or a thousands
   separator) and a fraction; a dotted phone number (555.123.4567) has two or
   three groups instead. */
const DECIMAL_NUMBER_RE = /^-?(?:\d{1,3}(?:,\d{3})+)(?:\.\d+)?$|^-?\d+\.\d+$/;
function isPhoneValue(v) {
  const s = String(v ?? '').trim();
  if (!s || DATE_SHAPE_RE.test(s) || DECIMAL_NUMBER_RE.test(s)) return false;
  if (!PHONE_VALUE_RE.test(s)) return false;
  const digits = s.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;   // E.164 stops at 15 digits
}
/** Which kind of link a cell value is — the one place that decides href shape. */
function linkKindOf(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (isUrlValue(s)) return 'url';
  if (isEmailValue(s)) return 'email';
  if (isPhoneValue(s)) return 'phone';
  return null;
}
/** Where a link-shaped value should actually go. */
function linkHrefOf(v) {
  const s = String(v ?? '').trim();
  const kind = linkKindOf(s);
  if (kind === 'email') return `mailto:${s}`;
  if (kind === 'phone') return `tel:${s.replace(/(?!^\+)[^\d]/g, '')}`;   // same sanitization PhoneLayer applies
  return s;
}
/* A link column usually wants a page over an address over a bare number, so a list
   with both a Website and an Email column still leads with the website. */
const LINK_WEIGHT = { url: 2, email: 1.5, phone: 1 };
const LAYER_ACCENT = { dark: '#7aa2ff', light: '#3b66d0' };
const currentTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
/** PhoneLayer documents per-trigger colour/theme overrides — stamp them, so its
    provider picker matches the app instead of arriving in its own light default. */
const layerAnchorAttrs = (kind) => kind === 'phone'
  ? ` data-phonelayer-color="${LAYER_ACCENT[currentTheme()]}" data-phonelayer-theme="${currentTheme()}"`
  : '';

/* Completed/status + notes columns. We emit "Status"/"Notes" on export, but a
   file dropped back in (or built elsewhere) may label them Completed / Done /
   Finished / Checked / Comment — accepting that whole family is what lets a
   re-import resume the user's progress instead of resetting every card. */
/* Pipeline vocabulary included on purpose: a vendor tracker says Stage, a
   candidate pipeline says Stage or Phase, a project sheet says Progress. Those
   are the same column as Status, and a list whose status column goes unrecognized
   loses every tick the user made in the system it came from. */
const HEADER_STATUS_RE = /^(status|state|stage|phase|progress|complet(e|ed|ion)|done|finished|checked|reviewed|processed|handled|result|outcome|disposition)\b/i;
const HEADER_NOTES_RE  = /^(notes?|comments?|remarks?|memo)\b/i;
const STATUS_HEADER_WORDS = new Set(['status', 'state', 'stage', 'phase', 'progress', 'complete', 'completed', 'completion', 'done', 'finished', 'checked', 'reviewed', 'processed', 'handled', 'result', 'outcome', 'disposition']);
const NOTES_HEADER_WORDS  = new Set(['note', 'notes', 'comment', 'comments', 'remark', 'remarks', 'memo']);
const normalizeHeader = (h) => String(h ?? '').toLowerCase().replace(/[^a-z]/g, '');

/** Cell values that mean "this task is done". Ticks are accepted so rows pasted
    from a spreadsheet round-trip, and a completion *date* counts as done too. */
/* Terminal states, as the systems these lists come out of spell them. Turnstone
   asks "has this row been handled?", not "did it succeed?" — so a closed ticket,
   a paid invoice and a rejected application are all done with, because the queue
   is what matters. Every in-flight word (open, new, pending, awaiting, in
   progress, blocked) is deliberately absent, and the two tests below are anchored
   to the whole value, so "Pending approval" can never read as "Approved". */
const COMPLETE_RE = /^(complete|completed|done|finished|yes|y|true|1|x|✓|✔|☑|✅|closed?|resolved|approved?|accepted|paid|sent|signed|shipped|filed|submitted|handled|processed|cancell?ed|declined|rejected|void|archived|reconciled|verified|published|renewed|delivered|no action needed)$/i;
const COMPLETE_DATE_RE = /^\d{4}-\d{1,2}-\d{1,2}([T ].*)?$/;
/* Same test after stripping decoration, so "✓ done", "done ✔" and "- complete"
   all count. Anchored matches keep "not done" and "incomplete" safely false. */
const DONE_DECOR_RE = /[\s✓✔☑✅·•\-–—:]/g;
const isCompleteValue = (raw) => {
  const v = String(raw ?? '').trim().replace(/\uFE0F/g, '');   // drop emoji variation selectors
  if (!v) return false;
  return COMPLETE_RE.test(v) || COMPLETE_RE.test(v.replace(DONE_DECOR_RE, '')) || COMPLETE_DATE_RE.test(v);
};

/* `writable` = we can rebuild the file byte-for-byte in its own format, so edits
   save silently in place. Everything else is a one-way import: its edits live in
   browser storage until the user exports CSV/XLSX. XLS/XLSM/XLSB/ODS are read-only
   on purpose — writing XLSX bytes under a .xls/.xlsm name would drop macros and
   mislabel the file. */
const FORMAT_INFO = {
  csv:  { label: 'CSV',        writable: true  },
  tsv:  { label: 'TSV',        writable: true  },
  xlsx: { label: 'XLSX',       writable: true  },
  xls:  { label: 'XLS',        writable: false },
  xlsm: { label: 'XLSM',       writable: false },
  xlsb: { label: 'XLSB',       writable: false },
  ods:  { label: 'ODS',        writable: false },
  docx: { label: 'Word doc',   writable: false },
  md:   { label: 'Markdown',   writable: false },
  doc:  { label: 'Word 97-2003', writable: false },
  json: { label: 'JSON',       writable: false },
  html: { label: 'HTML table', writable: false },
  xml:  { label: 'XML',        writable: false },
  eml:  { label: 'Email (.eml)', writable: false },
  pdf:  { label: 'PDF',        writable: false },
};
/** The formats welcome-panel / drop-zone copy advertises. One place, so the
    advertised list and the accepted list cannot drift apart. */
const ADVERTISED_FORMATS = ['CSV · TSV', 'XLSX / XLS / ODS', 'DOCX', 'Email (.eml)', 'Markdown', 'JSON · HTML · XML'];
const formatLabel = (f) => (FORMAT_INFO[f] || {}).label || String(f || '').toUpperCase();
/** Formats whose matrix can be written back into the source file in place. */
const isWritable = (f) => !!(FORMAT_INFO[f] && FORMAT_INFO[f].writable);

/* Workbook support is a **capability**, not a build assumption. The bookmarklet's
   no-library variant and the standalone CSV-only build ship without SheetJS, and
   the app must degrade out loud: refuse `.xlsx` with a real reason, hide the XLSX
   export, and say so on the welcome panel — never fail on the first workbook. */
const HAS_XLSX = typeof XLSX === 'object' && XLSX !== null && typeof XLSX.read === 'function';
/* Reading a workbook and *rebuilding* one are separate capabilities: a build can
   ship a read-only workbook reader (the bookmarklet's zero-library variant does)
   and must then treat workbooks as one-way imports instead of promising a
   write-back it cannot deliver. */
const HAS_XLSX_WRITE = HAS_XLSX && typeof XLSX.write === 'function';
/* The two embedded layers are a capability like any other. MailLayer publishes no
   global, so the pair is read from PhoneLayer's: they are vendored together and a
   build has both or neither. Without them an address still opens the system mail
   handler and a number the system dialler — so the app degrades, it never breaks. */
const HAS_LAYERS = typeof window.PhoneLayer === 'object' && window.PhoneLayer !== null;
/* Some builds have no durable storage at all — the bookmarklet overlay runs on a
   throwaway origin and shadows IndexedDB. Those builds must say so instead of
   promising a snapshot that will not outlive the tab. */
const SESSION_ONLY = false;   // ports/bookmarklet/build.js flips this to true
const storageLabel = () => (SESSION_ONLY ? 'this tab only' : 'browser storage');
/** Formats we can rebuild in place, given this build's capabilities. */
const canWrite = (f) => isWritable(f) && (!isWorkbookFormat(f) || HAS_XLSX_WRITE);
/** Everything SheetJS opens as a workbook container. */
const isWorkbookFormat = (f) => f === 'xlsx' || f === 'xls' || f === 'xlsm' || f === 'xlsb' || f === 'ods';

/* Extension → format. Explicit aliases only; content sniffing outranks them. */
const EXT_FORMAT = {
  csv: 'csv', txt: 'csv', tsv: 'tsv', tab: 'tsv',
  xlsx: 'xlsx', xlsm: 'xlsm', xlsb: 'xlsb', xls: 'xls', ods: 'ods',
  json: 'json', jsonl: 'json', ndjson: 'json',
  html: 'html', htm: 'html', xml: 'xml', rss: 'xml', atom: 'xml', opml: 'xml',
  /* .mht / .mhtml are the same MIME container as .eml — a saved page is a
     multipart message whose body part is HTML — so one parser reads both. */
  eml: 'eml', mht: 'eml', mhtml: 'eml',
  pdf: 'pdf', docx: 'docx',
  md: 'md', markdown: 'md', mdown: 'md', mkd: 'md',
};
const CT_FORMAT = [
  [/spreadsheetml|ms-excel|excel/, 'xlsx'],
  [/opendocument\.spreadsheet/, 'ods'],
  [/wordprocessingml|msword/, 'docx'],
  [/markdown/, 'md'],
  [/rfc822|ms-outlook/, 'eml'],
  [/json/, 'json'],
  [/html/, 'html'],
  [/xml/, 'xml'],
  [/tab-separated/, 'tsv'],
  [/csv|comma-separated/, 'csv'],
  [/pdf/, 'pdf'],
];

const MAGIC = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  ole: [0xd0, 0xcf, 0x11, 0xe0], // OLE2 container — legacy .xls and .doc
  zip: [0x50, 0x4b, 0x03, 0x04], // PK\x03\x04 — xlsx / xlsm / xlsb / ods / docx
};
function hasMagic(buf, bytes) {
  return buf.byteLength >= bytes.length && bytes.every((b, i) => new DataView(buf).getUint8(i) === b);
}
/** An OLE2 file is Word when its stream directory names a WordDocument stream.
    The directory stores names as UTF-16LE, so the marker arrives NUL-interleaved. */
function oleLooksLikeWord(buf) {
  const head = new Uint8Array(buf, 0, Math.min(buf.byteLength, 8192));
  return new TextDecoder('utf-16le', { fatal: false }).decode(head).includes('WordDocument');
}
/** ZIP walking, shared by the DOCX parser. A .docx is a ZIP of XML and browsers
    expose DecompressionStream('deflate-raw'), so the container opens with no
    library at all — the same technique the bookmarklet's SheetJS stand-in uses
    for .xlsx. Reading and rebuilding a Word file are different problems: this is
    read-only on purpose, so DOCX stays a one-way import. */
/* Reading DOCX needs two browser capabilities, and they are worth naming apart:
   inflating a ZIP member (`DecompressionStream`) and reading the XML inside it
   (`DOMParser`). Every browser with one has the other, but keeping them separate
   keeps the capability honest — and lets the container work be tested without a
   DOM, which is the only reason `test/run.js` can cover DOCX at all. */
const HAS_INFLATE = typeof DecompressionStream === 'function';
const HAS_DOMPARSER = typeof DOMParser === 'function';
const HAS_ZIP = HAS_INFLATE && HAS_DOMPARSER;
const ZIP_SIG = { entry: 0x04034b50, cd: 0x02014b50, eocd: 0x06054b50 };
/** Central directory as name → { method, compSize, localOffset }. */
function zipEntries(buf) {
  const dv = new DataView(buf);
  const floor = Math.max(0, dv.byteLength - 65557 - 22);
  let eocd = -1;
  for (let i = dv.byteLength - 22; i >= floor; i--) if (dv.getUint32(i, true) === ZIP_SIG.eocd) { eocd = i; break; }
  if (eocd < 0) throw new Error('not a ZIP container (no end-of-central-directory record)');
  const count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (off + 46 > dv.byteLength || dv.getUint32(off, true) !== ZIP_SIG.cd) break;
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const commentLen = dv.getUint16(off + 32, true);
    entries.set(new TextDecoder('utf-8').decode(new Uint8Array(buf, off + 46, nameLen)), {
      method: dv.getUint16(off + 10, true),
      compSize: dv.getUint32(off + 20, true),
      localOffset: dv.getUint32(off + 42, true),
    });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}
/** Inflate one member to text. Method 0 (stored) needs no zlib at all. */
async function zipEntryText(buf, entry) {
  const dv = new DataView(buf);
  if (dv.getUint32(entry.localOffset, true) !== ZIP_SIG.entry) throw new Error('corrupt ZIP member header');
  const start = entry.localOffset + 30 + dv.getUint16(entry.localOffset + 26, true) + dv.getUint16(entry.localOffset + 28, true);
  if (entry.method === 0) return new TextDecoder('utf-8').decode(new Uint8Array(buf, start, entry.compSize));
  if (entry.method !== 8) throw new Error(`unsupported ZIP compression method ${entry.method}`);
  const stream = new Blob([buf.slice(start, start + entry.compSize)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new TextDecoder('utf-8').decode(await new Response(stream).arrayBuffer());
}
function bufHead(buf, n = 2048) {
  return new TextDecoder('utf-8').decode(buf.slice(0, Math.min(n, buf.byteLength))).replace(/^\uFEFF/, '');
}

/** Is this text markdown? Only strong, structural signals count: a checklist item,
    or a pipe row followed by its `|---|` delimiter. A bulleted list of bare URLs is
    deliberately **not** a signal — that stays a one-column .txt list, exactly as it
    did before markdown existed, because nothing about it is markdown-specific. */
function looksLikeMarkdown(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    if (MD_FENCE_RE.test(lines[i])) { fenced = !fenced; continue; }
    if (fenced) continue;
    if (MD_TASK_RE.test(lines[i])) return true;
    if (lines[i].includes('|') && i + 1 < lines.length && mdIsDelimiterRow(lines[i + 1])) return true;
  }
  return false;
}

/* An .eml carries no magic bytes and is text, so it has to be recognized by
   shape. The test is deliberately strict: an RFC 5322 header block is a run of
   `Name: value` fields (plus folded continuations) that ends at the first blank
   line, and it has to contain at least two *known* field names. A data row never
   survives that — `From,To` has no colon, and a lone `Subject: hi` is one known
   field, not two. */
const RFC822_FIELD_RE = /^([!-9;-~]+):/;
const RFC822_KNOWN_RE = /^(from|to|cc|bcc|subject|date|received|message-id|in-reply-to|references|mime-version|content-type|content-transfer-encoding|content-disposition|content-id|reply-to|return-path|delivered-to|sender|authentication-results|dkim-signature|x-[a-z0-9-]+)\s*:/i;
function looksLikeEml(head) {
  const lines = String(head || '').split(/\r?\n/);
  let known = 0;
  const limit = Math.min(lines.length, 80);
  for (let i = 0; i < limit; i++) {
    const l = lines[i];
    if (!l.trim()) {
      /* A header block needs something on the other side of the blank line. Two
         header-ish lines and then the end of the file is a data row that happens
         to contain colons, not a message — and claiming it would turn a two-line
         CSV into "this email has no list in it". */
      return known >= 2 && lines.slice(i + 1).some(x => x.trim());
    }
    if (/^[ \t]/.test(l)) continue;        // folded continuation of the field above
    if (!RFC822_FIELD_RE.test(l)) return false;
    if (RFC822_KNOWN_RE.test(l)) known++;
  }
  return false;                            // no blank line within 80 lines — not a message
}

/** Content sniffing for text formats — the strongest signal we have. */
function sniffTextFormat(head) {
  const h = head.trimStart().toLowerCase();
  if (!h) return null;
  /* Checked before the others: a header block is a far stronger structure than
     "starts with [" or "has a pipe row", and a multipart body can contain
     anything at all underneath it — including something that looks like a
     markdown table. */
  if (looksLikeEml(head)) return 'eml';
  /* Markdown is checked first because it is the one text format with no magic
     bytes *and* no delimiter of its own: a task list or a real pipe table is
     unambiguous, and a file that starts with `[` is otherwise claimed by JSON. */
  if (looksLikeMarkdown(head)) return 'md';
  if (h[0] === '[' || h[0] === '{') return 'json';
  if (h.startsWith('<!doctype html') || h.startsWith('<html')) return 'html';
  if (h.startsWith('<?xml')) return 'xml';
  if (h.startsWith('<!--')) return /<!doctype html|<html|<table/.test(h) ? 'html' : 'xml';    if (h[0] === '<') return /<table\b|<tr\b|<td\b/.test(h) ? 'html' : 'xml';
  return null; // delimiter choice is PapaParse's job, not ours
}

/** Split an extension + Content-Type into soft hints used only when content is inconclusive. */
function formatHints(name, contentType) {
  /* Up to 10 characters, not 5: `.markdown` and `.ndjson` are both longer than the
     old cap, so their aliases in EXT_FORMAT were unreachable — the extension simply
     failed to match and the file fell through to the delimited-text default. */
  const m = String(name || '').match(/\.([a-z0-9]{1,10})(?:$|[?#])/i);
  const ext = m ? m[1].toLowerCase() : null;
  const ct = String(contentType || '').toLowerCase();
  const hit = CT_FORMAT.find(([re]) => re.test(ct));
  return { ext, extFormat: (ext && EXT_FORMAT[ext]) || null, ctFormat: hit ? hit[1] : null, contentType: ct };
}

/** Decide the format of a buffer. Precedence: magic bytes → content → hints. */
function detectFormat(buf, name, contentType) {
  const hint = formatHints(name, contentType);
  let format, why;
  if (hasMagic(buf, MAGIC.pdf)) { format = 'pdf'; why = 'magic %PDF'; }
  else if (hasMagic(buf, MAGIC.ole)) {
    // The OLE2 container carries both Excel 97-2003 and Word 97-2003; the stream
    // directory says which, and only one of them is worth opening.
    if (oleLooksLikeWord(buf)) { format = 'doc'; why = 'magic OLE2 (legacy Word)'; }
    else { format = 'xls'; why = 'magic OLE2 (legacy Excel)'; }
  }
  else if (hasMagic(buf, MAGIC.zip)) {
    /* xlsx / xlsm / xlsb / ods / docx all share the ZIP magic. The member list
       answers it exactly (`word/document.xml` vs `xl/workbook.xml`), so a Word
       file renamed to .xlsx still opens as a Word file; the extension is only
       the fallback for a container whose directory we cannot walk. */
    let zipKind = null;
    try {
      const names = zipEntries(buf);
      if (names.has('word/document.xml')) zipKind = 'docx';
      else if (names.has('xl/workbook.xml') || names.has('xl/workbook.bin')) zipKind = isWorkbookFormat(hint.extFormat) ? hint.extFormat : 'xlsx';
    } catch (e) { warn('ZIP central directory unreadable — falling back to the file extension', e); }
    format = zipKind || (hint.extFormat === 'docx' ? 'docx' : isWorkbookFormat(hint.extFormat) ? hint.extFormat : 'xlsx');
    why = `magic PK\\x03\\x04 (ZIP container → ${format})`;
  } else {
    const sniffed = sniffTextFormat(bufHead(buf));
    if (sniffed) { format = sniffed; why = 'content sniff'; }
    else if (hint.extFormat) { format = hint.extFormat; why = `extension .${hint.ext}`; }
    else if (hint.ctFormat) { format = hint.ctFormat; why = `content-type "${hint.contentType}"`; }
    else { format = 'csv'; why = 'assumed delimited text'; }
  }
  log(`Format detection: ${why} → ${format} (ext=${hint.ext || 'none'}, content-type="${hint.contentType || 'none'}")`);
  return { format, ...hint };
}

/* ---- Parser: delimited text (CSV, TSV, semicolon/pipe) ---- */
function parseDelimitedText(text, format) {
  const t = String(text).replace(/^\uFEFF/, '').trim();
  const res = Papa.parse(t, { skipEmptyLines: 'greedy', delimiter: format === 'tsv' ? '\t' : '' });
  if (res.errors.length) warn('PapaParse reported errors:', res.errors.slice(0, 3));
  const delim = (res.meta && res.meta.delimiter) || ',';
  const rows = res.data.map(r => (Array.isArray(r) ? r : [r]).map(c => String(c ?? '')));
  log(`Parsed ${formatLabel(format)} text (${text.length} chars) with PapaParse — delimiter ${JSON.stringify(delim)}, ${rows.length} rows`);
  return rows;
}

/* ---- Parser: workbooks (XLSX / XLS / ODS / XLSB) via SheetJS ---- */
async function parseWorkbook(buf, sheetPick) {
  log(`Parsing workbook (${buf.byteLength} bytes) with SheetJS${sheetPick ? `, sheet "${sheetPick}"` : ''}`);
  // `await` on purpose: the real SheetJS resolves synchronously, but a
  // dependency-free reader (the bookmarklet build) inflates asynchronously.
  const wb = await XLSX.read(buf, { type: 'array' });
  const name = sheetPick && wb.SheetNames.includes(sheetPick) ? sheetPick : wb.SheetNames[0];
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    .map(row => row.map(c => String(c ?? '')));
  log(`Workbook parsed: ${wb.SheetNames.length} sheet(s), loaded "${name}" — ${rows.length} rows`);
  return { rows, sheetName: name };
}

/* ---- Parser: DOCX (Word) ---- */
const WORDPROC_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
/** A Word table row is <w:tr>, a cell <w:tc>, and text lives in <w:t> runs inside
    <w:p> paragraphs — so a cell's text is that cell's runs joined. Tables are what
    a link list lives in; a document without one falls back to a row per paragraph
    (cells split on tabs), which is exactly what a pasted-from-Word list looks like. */
async function parseDocx(buf) {
  const entry = zipEntries(buf).get('word/document.xml');
  if (!entry) throw new Error('this .docx has no word/document.xml — is it a Word file, or something else renamed?');
  const xml = await zipEntryText(buf, entry);
  const dom = new DOMParser().parseFromString(xml, 'application/xml');
  if (dom.querySelector('parsererror')) throw new Error('word/document.xml is not readable XML — the file may be damaged');
  const runs = (el) => Array.from(el.getElementsByTagNameNS(WORDPROC_NS, 't')).map(t => t.textContent || '').join('').trim();
  const tables = Array.from(dom.getElementsByTagNameNS(WORDPROC_NS, 'tbl'));
  if (tables.length) {
    const rows = [];
    for (const tbl of tables) {
      for (const tr of Array.from(tbl.getElementsByTagNameNS(WORDPROC_NS, 'tr'))) {
        rows.push(Array.from(tr.children)
          .filter(c => c.namespaceURI === WORDPROC_NS && c.localName === 'tc')
          .map(runs));
      }
    }
    log(`DOCX parsed: ${tables.length} table(s), ${rows.length} rows, ${Math.max(...rows.map(r => r.length), 0)} columns`);
    if (!rows.length) throw new Error('the Word table in this document is empty');
    return rows;
  }
  const rows = Array.from(dom.getElementsByTagNameNS(WORDPROC_NS, 'p'))
    .map(p => runs(p).split('\t').map(s => s.trim()))
    .filter(r => r.some(c => c));
  log(`DOCX parsed: no table — ${rows.length} paragraph rows`);
  if (!rows.length) throw new Error('this .docx has no text to read');
  return rows;
}

/* ---- Parser: Markdown (task lists, pipe tables, link lists) ----
   Markdown is plain text, so this needs no library — the same reason DOCX needed
   none — which means every build gets it, including the zero-library bookmarklet.
   A task list is already a table with the four columns Turnstone wants: the task,
   its link, the checkbox and the trailing note. So the list parser emits a matrix
   shaped exactly like the CSV fixture's, and nothing downstream has to know that a
   checkbox was ever involved. */
const MD_FENCE_RE = /^\s*(?:```|~~~)/;
const MD_TASK_RE = /^\s*(?:[-*+]|\d+[.)])\s+\[([ xX])\]\s+(.*)$/;
const MD_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s+(\S.*)$/;
const MD_HEADING_RE = /^\s{0,3}#{1,6}\s/;
/* One scan for every link shape markdown actually carries: [label](target),
   <autolink>, an explicit scheme URL, a bare http/www URL, and a bare address.
   Order matters — the scheme alternative has to run before the bare-address one, or
   "mailto:ada@example.com" would match as "ada@example.com" and leave "mailto:"
   stranded in the task's text. */
const MD_LINK_SCAN = /\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+"[^"]*")?\s*\)|<((?:https?|mailto|tel|sms):[^>\s]+)>|(mailto:[a-z0-9._%+'\-]+@[a-z0-9\-]+(?:\.[a-z0-9\-]+)+)(?:\?[^\s]*)?|((?:tel|sms):[+\d][\d\s().\u2011\-\/]{4,}\d)(?:\?[^\s]*)?|((?:https?:\/\/|www\.)[^\s<>()\[\]`*_]+)|([a-z0-9._%+'\-]+@[a-z0-9\-]+(?:\.[a-z0-9\-]+)+)/gi;
const MD_LINK_RE = /\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+"[^"]*")?\s*\)/g;
/* Separators a task line uses to set its name and note apart from its link. */
const MD_TRIM_RE = /^[\s·•\-–—:]+|[\s·•\-–—:]+$/g;

/** Markdown's decoration, removed: code spans, bold, italic, backslash escapes. */
function mdStripInline(s) {
  return String(s ?? '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2')
    .replace(/(^|[\s(])_([^_\n]+)_/g, '$1$2')
    .replace(/\\([\\`*_{}\[\]()#+\-.!|>])/g, '$1');
}

/** Every link on a line, in order, with its exact span in the raw text. */
function mdLinks(text) {
  const out = [];
  MD_LINK_SCAN.lastIndex = 0;   // the scan regex is shared, so its cursor is reset per call
  let m;
  while ((m = MD_LINK_SCAN.exec(text))) {
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      label: m[1] !== undefined ? mdStripInline(m[1]).trim() : '',
      target: (m[2] || m[3] || m[4] || m[5] || m[6] || m[7] || '').trim(),
    });
  }
  return out;
}

/** A markdown link's target may carry its own kind (`mailto:`, `tel:`, `sms:`) and a
    query. The matrix wants the bare *value*, so the app's own value predicates
    recognise it and the href can be rebuilt from the kind at render time. */
function normalizeLinkTarget(target) {
  const t = String(target ?? '').trim().replace(/^<(.*)>$/, '$1');
  const m = t.match(/^(?:mailto|tel|sms):([^?#]*)/i);
  return m ? (m[1].trim() || t) : t;
}

/** A pipe-table cell: decoration stripped, a lone link resolved to its target (so a
    URL column holds a URL), an inline link in prose reduced to its label. */
function mdInlineCell(raw) {
  const text = mdStripInline(raw).trim();
  const links = mdLinks(text);
  if (links.length === 1 && !text.slice(0, links[0].start).trim() && !text.slice(links[0].end).trim()) {
    const target = normalizeLinkTarget(links[0].target);
    return linkKindOf(target) ? target : (links[0].label || target);
  }
  return text.replace(MD_LINK_RE, (whole, label, target) => label.trim() || normalizeLinkTarget(target));
}

/** `| a | b |` → ['a','b'], honouring `\|` escapes and stripping the outer pipes. */
function mdSplitRow(line) {
  const t = String(line).trim().replace(/^\||\|$/g, '');
  const cells = [];
  let cur = '';
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '\\' && t[i + 1] === '|') { cur += '|'; i++; continue; }
    if (t[i] === '|') { cells.push(cur); cur = ''; continue; }
    cur += t[i];
  }
  cells.push(cur);
  return cells.map(mdInlineCell);
}
/** The `|---|:--:|` row that makes a stack of pipes a table rather than a paragraph. */
function mdIsDelimiterRow(line) {
  const t = String(line).trim();
  if (!t.includes('-')) return false;
  return t.replace(/^\||\|$/g, '').split('|').every(c => /^:?-{2,}:?$/.test(c.trim()));
}
/** Lines outside fenced code blocks — a URL in a code fence is an example, not a task. */
function mdUnfencedLines(text) {
  const out = [];
  let fenced = false;
  for (const line of String(text).replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (MD_FENCE_RE.test(line)) { fenced = !fenced; continue; }
    if (!fenced) out.push(line);
  }
  return out;
}
function mdFindTable(lines) {
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].includes('|') || !mdIsDelimiterRow(lines[i + 1])) continue;
    const header = mdSplitRow(lines[i]);
    const rows = [header];
    for (let j = i + 2; j < lines.length; j++) {
      if (!lines[j].includes('|')) break;
      if (mdIsDelimiterRow(lines[j])) continue;
      const cells = mdSplitRow(lines[j]);
      while (cells.length < header.length) cells.push('');
      rows.push(cells.slice(0, header.length));
    }
    log(`Markdown parsed: pipe table — ${header.length} column(s), ${rows.length - 1} row(s)`);
    return rows;
  }
  return null;
}

/** List item → { name, link, checked, note }. The first link ends the name and
    starts the note, which is why a note containing its own em dash survives. */
function mdListItem(body, box) {
  const links = mdLinks(body);
  if (!links.length) return { name: mdStripInline(body).replace(MD_TRIM_RE, ''), link: '', checked: box, note: '' };
  const first = links[0];
  let before = mdStripInline(body.slice(0, first.start)).replace(MD_TRIM_RE, '');
  let after = mdStripInline(body.slice(first.end)).replace(MD_TRIM_RE, '');
  /* `- Task (https://link)` — the link sat inside brackets, so one half of the pair
     lands in the name and the other in the note. Drop them together, and only when
     they actually pair up, so a note that legitimately starts with "(" survives. */
  if (/[([]$/.test(before) && /^[)\]]/.test(after)) {
    before = before.replace(/[([]$/, '').trim();
    after = after.replace(/^[)\]]/, '').trim();
  }
  const target = normalizeLinkTarget(first.target);
  const link = linkKindOf(target) ? target : (linkKindOf(first.label) ? first.label : target);
  return { name: before || first.label || link, link, checked: box, note: after };
}

/** Items → matrix, with only the columns the file actually has. A bare-URL list
    gets one column; a task list gets all four, headed exactly like the CSV fixture. */
function mdMatrix(items) {
  const hasLink = items.some(it => it.link);
  const hasBox = items.some(it => it.checked !== null);
  const hasNote = items.some(it => it.note);
  const hasNames = items.some(it => it.name && it.name !== it.link);
  const cols = [];
  if (hasNames) cols.push(['Name', it => it.name]);
  if (hasLink) cols.push(['URL', it => it.link]);
  if (hasBox) cols.push(['Status', it => (it.checked ? 'complete' : 'incomplete')]);
  if (hasNote) cols.push(['Notes', it => it.note]);
  if (!cols.length) cols.push(['Name', it => it.name]);
  log(`Markdown parsed: ${items.length} item(s) → ${cols.map(([h]) => h).join(' / ')}`);
  return [cols.map(([h]) => h), ...items.map(it => cols.map(([, get]) => get(it)))];
}

function parseMarkdownText(text) {
  const lines = mdUnfencedLines(text);
  const table = mdFindTable(lines);
  if (table) return table;
  const listed = [], loose = [];
  for (const line of lines) {
    const task = line.match(MD_TASK_RE);
    const bullet = task ? null : line.match(MD_ITEM_RE);
    if (task) listed.push(mdListItem(task[2].trim(), task[1].toLowerCase() === 'x'));
    else if (bullet) {
      const item = mdListItem(bullet[1].trim(), null);
      /* A bullet is only a task if it points somewhere — that is what keeps a
         README's bulleted prose out of the queue. */
      if (item.link) listed.push(item);
    } else if (!MD_HEADING_RE.test(line) && line.trim()) {
      const item = mdListItem(line.trim(), null);
      if (item.link) loose.push(item);
    }
  }
  /* A list wins outright when there is one: a document's stray prose links should
     not be appended to the queue its list describes. */
  const items = listed.length ? listed : loose;
  if (!items.length) throw new Error('nothing to queue in this markdown file — it has no table, no list and no links');
  return mdMatrix(items);
}

/* ---- Parser: JSON (array of objects, array of arrays, wrapped array, NDJSON) ---- */
function jsonScalar(v) {
  if (v === null || v === undefined) return '';
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

/** Array of objects → header row (union of keys, first-seen order) + data rows. */
function jsonObjectsToMatrix(objs) {
  const keys = [], seen = new Set();
  for (const o of objs) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) continue;
    for (const k of Object.keys(o)) if (!seen.has(k)) { seen.add(k); keys.push(k); }
  }
  if (!keys.length) return null;
  return [keys, ...objs.map(o => keys.map(k => jsonScalar(o && typeof o === 'object' ? o[k] : '')))];
}

/** First array nested anywhere inside an object, e.g. {items:[…]} or {data:{rows:[…]}}. */
function findJsonArray(value, depth = 0) {
  if (depth > 4 || !value || typeof value !== 'object' || Array.isArray(value)) return null;
  for (const v of Object.values(value)) if (Array.isArray(v) && v.length) return v;
  for (const v of Object.values(value)) {
    const hit = findJsonArray(v, depth + 1);
    if (hit) return hit;
  }
  return null;
}

function jsonToMatrix(value) {
  let v = value;
  if (!Array.isArray(v)) {
    if (v && typeof v === 'object') {
      const inner = findJsonArray(v);
      if (inner) { log('JSON: unwrapped a single nested array (e.g. {items:[…]})'); v = inner; }
      else {
        const vals = Object.values(v);
        if (vals.length && vals.every(x => x && typeof x === 'object' && !Array.isArray(x))) {
          log(`JSON: an object map with ${vals.length} entries → records, keys kept as _key`);
          return jsonObjectsToMatrix(Object.entries(v).map(([k, o]) => ({ _key: k, ...o })));
        }
        log('JSON: a single object → one record');
        return jsonObjectsToMatrix([v]);
      }
    } else {
      return [['Value'], [jsonScalar(v)]];
    }
  }
  if (!v.length) return [];
  if (v.every(Array.isArray)) {
    log(`JSON: array of ${v.length} arrays → rows verbatim`);
    return v.map(r => r.map(jsonScalar));
  }
  if (v.every(x => x && typeof x === 'object' && !Array.isArray(x))) {
    const m = jsonObjectsToMatrix(v);
    if (m) { log(`JSON: array of ${v.length} objects → ${m[0].length} columns`); return m; }
  }
  log(`JSON: array of ${v.length} scalars → single Value column`);
  return [['Value'], ...v.map(x => [jsonScalar(x)])];
}

function parseJsonText(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text).replace(/^\uFEFF/, ''));
  } catch (e) {
    // JSON Lines / NDJSON: one object per line is a very common export shape.
    const lines = String(text).trim().split(/\r?\n/).filter(l => l.trim());
    const objs = lines.length > 1 && lines.every(l => /^\s*[\[{]/.test(l))
      ? lines.map(l => { try { return JSON.parse(l); } catch { return null; } })
      : [];
    if (!objs.length || !objs.every(Boolean)) throw new Error(`invalid JSON (${e.message})`);
    log(`JSON.parse failed — recovered as NDJSON (${objs.length} lines)`);
    return jsonToMatrix(objs);
  }
  const rows = jsonToMatrix(parsed);
  log(`JSON parsed: ${rows.length} rows × ${rows.reduce((m, r) => Math.max(m, r.length), 0)} cols`);
  return rows;
}

/* ---- Parser: HTML tables (and, for local picks, plain link lists) ---- */
/** Rows of a <table> → rectangular grid, honouring rowspan/colspan. */
function tableToMatrix(table) {
  const own = (el) => el.closest('table') === table; // ignore nested tables
  const trs = [...table.querySelectorAll('tr')].filter(own);
  const grid = [];
  trs.forEach((tr, r) => {
    grid[r] = grid[r] || [];
    let col = 0;
    for (const cell of [...tr.querySelectorAll('th, td')].filter(own)) {
      while (grid[r][col] !== undefined) col++;
      const cs = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1);
      const rs = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1);
      const text = cell.textContent.replace(/\s+/g, ' ').trim();
      for (let dr = 0; dr < rs; dr++) {
        grid[r + dr] = grid[r + dr] || [];
        for (let dc = 0; dc < cs; dc++) {
          if (grid[r + dr][col + dc] === undefined) grid[r + dr][col + dc] = dr === 0 && dc === 0 ? text : '';
        }
      }
      col += cs;
    }
  });
  return grid
    .filter(row => row && row.some(c => c !== undefined && c !== ''))
    .map(row => { const out = []; for (let i = 0; i < row.length; i++) out[i] = String(row[i] ?? ''); return out; });
}

function parseHtmlText(text, { allowLinkFallback = true } = {}) {
  // parseFromString yields an inert document: no scripts run, no images fetch.
  const doc = new DOMParser().parseFromString(String(text), 'text/html');
  // Only consider top-level tables; a nested table is almost always layout filler.
  const tables = [...doc.querySelectorAll('table')].filter(t => !(t.parentElement && t.parentElement.closest('table')));
  let best = null, bestScore = 0;
  for (const t of tables) {
    const m = tableToMatrix(t);
    const score = m.length * m.reduce((w, r) => Math.max(w, r.length), 0);
    if (score > bestScore) { bestScore = score; best = m; }
  }
  if (best && best.length >= 2) {
    log(`HTML parsed: picked the largest of ${tables.length} table(s) — ${best.length} rows × ${best.reduce((w, r) => Math.max(w, r.length), 0)} cols`);
    return best;
  }
  if (!allowLinkFallback) throw new Error('that URL returned a web page with no data table in it');
  // Saved bookmarks pages and link round-ups are lists, not tables.
  const seen = new Set(), links = [];
  for (const a of doc.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href) || seen.has(href)) continue;
    seen.add(href);
    links.push([a.textContent.replace(/\s+/g, ' ').trim() || href, href]);
  }
  if (links.length) {
    log(`HTML parsed: no usable table — harvested ${links.length} http(s) link(s) from <a href>`);
    return [['Name', 'URL'], ...links];
  }
  throw new Error('no <table> rows and no http(s) links found');
}

/* ---- Parser: XML (RSS/Atom feeds, sitemaps, OPML, generic record lists) ---- */
const XML_RECORD_TAGS = /^(item|entry|record|row|link|url|post|article|result|job|task|page|doc|node|member|place|event|product|book)$/i;

/** The element name that most looks like a repeated record in this document.
    Record containers (elements that hold fields) beat leaf elements — otherwise an
    RSS feed would tabulate its <link> elements instead of its <item> elements. */
function pickXmlRecordTag(doc) {
  const seen = new Map(); // tagName → { count, containers }
  for (const el of doc.querySelectorAll('*')) {
    const n = el.tagName;
    const rec = seen.get(n) || { count: 0, containers: 0 };
    rec.count++;
    if (el.children.length) rec.containers++;
    seen.set(n, rec);
  }
  const repeated = [...seen.entries()]
    .filter(([n, r]) => r.count >= 2 && !/^(html|head|body|script|style)$/i.test(n))
    .map(([n, r]) => ({ tag: n, ...r, known: XML_RECORD_TAGS.test(n) }));
  if (!repeated.length) return null;
  const rank = (a, b) => (b.known - a.known) || (b.count - a.count);
  const containers = repeated.filter(r => r.containers === r.count).sort(rank);
  if (containers.length) return containers[0].tag;
  return repeated.sort(rank)[0].tag;
}

/** Text of a leaf element — falling back to its url-ish attribute (Atom <link href>). */
function xmlLeafValue(el) {
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  if (text) return text;
  for (const a of ['href', 'url', 'src', 'loc']) {
    const v = el.getAttribute && el.getAttribute(a);
    if (v) return v;
  }
  return [...(el.attributes || [])].map(a => a.value).join(' ');
}

function xmlElementToRecord(el) {
  const rec = {};
  // Attributes first so href/url land in an early column.
  for (const attr of el.attributes || []) rec[attr.name] = attr.value;
  const kids = [...el.children];
  if (!kids.length && !Object.keys(rec).length) rec.value = xmlLeafValue(el);
  for (const k of kids) {
    const val = k.children.length ? JSON.stringify(xmlToPlain(k)) : xmlLeafValue(k);
    rec[k.tagName] = rec[k.tagName] === undefined ? val : `${rec[k.tagName]}; ${val}`;
  }
  return rec;
}
function xmlToPlain(el) {
  const o = {};
  for (const attr of el.attributes || []) o[attr.name] = attr.value;
  const kids = [...el.children];
  if (!kids.length) o.value = xmlLeafValue(el);
  for (const k of kids) o[k.tagName] = k.children.length ? xmlToPlain(k) : xmlLeafValue(k);
  return o;
}

function parseXmlText(text) {
  const doc = new DOMParser().parseFromString(String(text), 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML is not well-formed');
  const tag = pickXmlRecordTag(doc);
  if (!tag) throw new Error('no repeated record elements to turn into rows');
  const els = [...doc.querySelectorAll(tag)];
  log(`XML parsed: ${els.length} <${tag}> record element(s)`);
  const recs = els.map(xmlElementToRecord);
  const keys = [];
  for (const r of recs) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
  return [keys, ...recs.map(r => keys.map(k => jsonScalar(r[k])))];
}

/* ---- Parser: email (.eml / .mht) ------------------------------------------ */
/* An .eml is a MIME message, and a queue very often arrives as one: someone
   forwards "here is this week's list, please work through it", or a portal emails
   a digest. Two things make it worth reading properly rather than refusing:

     1. the message body is HTML or text, and both parsers already exist; and
     2. a forwarded queue usually has the *spreadsheet attached*, so the real
        payload is a base64 part that our own detector can already open.

   Everything below works in "binary string" space — a JS string whose character
   codes are the file's bytes, 1:1. That keeps one representation from the raw
   file down to the part bodies, so base64, quoted-printable and a declared
   charset are all decodable without guessing at any point.

   Unlike every other parser here, this one is async: recursing into an attached
   workbook means calling back into parseDetected. */
const MIME_MAX_DEPTH = 8;
function bytesToBinary(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return s;
}
function binaryToBytes(bin) {
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i) & 0xff;
  return a;
}
/** Charset labels we will hand to TextDecoder, aliased to the canonical name.
    Anything unrecognized falls back to UTF-8, which is the safe modern default. */
const CHARSET_ALIAS = {
  'utf8': 'utf-8', 'utf-8': 'utf-8', 'us-ascii': 'utf-8', 'ascii': 'utf-8', 'unicode-1-1-utf-8': 'utf-8',
  'latin1': 'windows-1252', 'latin-1': 'windows-1252', 'iso-8859-1': 'windows-1252', 'iso8859-1': 'windows-1252',
  'iso-8859-15': 'iso-8859-15', 'cp1252': 'windows-1252', 'windows-1252': 'windows-1252',
  'utf-16': 'utf-16le', 'utf-16le': 'utf-16le', 'utf-16be': 'utf-16be',
  'gb2312': 'gbk', 'gbk': 'gbk', 'big5': 'big5', 'shift_jis': 'shift_jis', 'sjis': 'shift_jis', 'euc-kr': 'euc-kr',
};
function charsetDecode(bin, charset) {
  const label = CHARSET_ALIAS[String(charset || '').trim().toLowerCase().replace(/^"|"$/g, '')] || 'utf-8';
  try { return new TextDecoder(label).decode(binaryToBytes(bin)); }
  catch (e) { warn(`Unknown charset "${charset}" — decoded as UTF-8`, e); return new TextDecoder('utf-8').decode(binaryToBytes(bin)); }
}
/** `=XX` escapes and soft line breaks (a trailing `=`) — quoted-printable. */
function decodeQuotedPrintable(bin) {
  return String(bin)
    .replace(/=\r?\n/g, '')                      // soft line break: the line continues
    .replace(/=([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
/** Header fields, with folded continuations joined and names lower-cased. */
function mimeHeaderFields(block) {
  const map = new Map();
  let last = null;
  for (const line of String(block).split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && last) { map.set(last, map.get(last) + ' ' + line.trim()); continue; }
    const m = line.match(/^([!-9;-~]+):[ \t]?(.*)$/);
    if (!m) continue;
    last = m[1].toLowerCase();
    map.set(last, m[2].trim());
  }
  return map;
}
/** Split a MIME entity at the first blank line: everything above is headers. */
function splitMimeEntity(text) {
  const m = /\r?\n\r?\n/.exec(text);
  if (!m) return { headers: mimeHeaderFields(text), body: '' };
  return { headers: mimeHeaderFields(text.slice(0, m.index)), body: text.slice(m.index + m[0].length) };
}
function mimeParams(value) {
  const out = {};
  const re = /;\s*([a-z0-9*_-]+(?:\*\d+)?)\s*=\s*(?:"([^"]*)"|([^;]*))/gi;
  let m;
  while ((m = re.exec(String(value)))) out[m[1].toLowerCase()] = (m[2] !== undefined ? m[2] : (m[3] || '')).trim();
  return out;
}
function mimeContentType(headers) {
  const raw = headers.get('content-type') || 'text/plain';
  return { type: (raw.split(';')[0] || '').trim().toLowerCase(), params: mimeParams(raw) };
}
/** A filename, honouring the RFC 2231 form Outlook writes for non-ASCII names. */
function mimeFilename(part) {
  const disp = part.headers.get('content-disposition') || '';
  const p = mimeParams(disp);
  if (p['filename*0*'] || p['filename*']) {
    const raw = p['filename*'] || p['filename*0*'];
    // utf-8''na%C3%AFve.csv
    const m = /^([^']*)'[^']*'(.*)$/.exec(raw);
    if (m) { try { return decodeURIComponent(m[2]); } catch (e) {} }
  }
  return p.filename || part.params.name || '';
}
/** Walk the boundary tree, flattening to leaf entities. */
function collectMimeParts(text, depth, out) {
  if (depth > MIME_MAX_DEPTH) { warn('MIME nesting too deep — stopping'); return; }
  const { headers, body } = splitMimeEntity(text);
  const { type, params } = mimeContentType(headers);
  if (type.startsWith('multipart/') && params.boundary) {
    for (const chunk of splitMimeParts(body, params.boundary)) collectMimeParts(chunk, depth + 1, out);
    return;
  }
  out.push({ headers, body, type, params });
}
/** Split a multipart body on its boundary. The closing `--boundary--` ends the
    list; the CRLF that precedes a delimiter belongs to the delimiter, not to the
    part, which is why the match starts with it. */
function splitMimeParts(body, boundary) {
  const esc = String(boundary).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(?:^|\\r?\\n)--' + esc + '(--)?[^\\r\\n]*', 'g');
  const marks = [];
  let m;
  while ((m = re.exec(body))) marks.push({ start: m.index, end: m.index + m[0].length, close: !!m[1] });
  const parts = [];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].close) break;
    /* One leading CRLF belongs to the delimiter line, so it is not part of the
       part that follows — and leaving it there would make the part's own first
       line look like a blank one, i.e. an empty header block. */
    const chunk = body.slice(marks[i].end, marks[i + 1] ? marks[i + 1].start : body.length);
    parts.push(chunk.replace(/^\r?\n/, ''));
  }
  return parts;
}
/** A leaf part's content, transfer-decoded then charset-decoded. */
function decodeMimePart(part) {
  const enc = (part.headers.get('content-transfer-encoding') || '').toLowerCase().trim();
  let bin = part.body;
  if (enc === 'base64') { try { bin = atob(bin.replace(/[^A-Za-z0-9+/=]/g, '')); } catch (e) { warn('base64 part did not decode cleanly', e); } }
  else if (enc === 'quoted-printable') bin = decodeQuotedPrintable(bin);
  return charsetDecode(bin, part.params.charset);
}
/** Is this a *list*, or just prose that happens to have line breaks? Without this
    an email that says "Hi, three things" would parse as a three-row table of
    sentences — confidently wrong, which is the one outcome this app avoids. */
function plausibleList(rows) {
  const body = rows.filter(r => r.some(c => String(c ?? '').trim()));
  if (body.length < 2) return false;
  const width = body.reduce((m, r) => Math.max(m, r.length), 0);
  if (width >= 2) return true;
  const vals = body.map(r => String(r[0] ?? '').trim()).filter(Boolean);
  return vals.length >= 2 && vals.every(v => linkKindOf(v));
}
/** A text/plain body: markdown if it is markdown, otherwise delimited. */
function parseEmlPlainText(text) {
  const guess = sniffTextFormat(String(text).slice(0, 4096));
  if (guess === 'md') return parseMarkdownText(text);
  return parseDelimitedText(text, /\t/.test(text) ? 'tsv' : 'csv');
}

/** Is this ambiguity-prone text a *table*? Stricter than `plausibleList`, and
    both callers are the cases where prose can masquerade as data:

      - a text/plain email body, which is prose by default — splitting "Hi,\n\nThe
        queue for this week's run is attached. Ten items, four of them" on commas
        yields rows of wildly different lengths; and
      - a paste, where the same paragraph arrives through the same door, and
        loading it would silently replace the queue the user is working through.

    So it has to be *rectangular* — every row the same width — or a single column
    of nothing but link-shaped values. A real table from Excel, Sheets or a portal
    is rectangular because the cells are there whether or not they hold anything. */
function plausibleTable(rows) {
  if (!plausibleList(rows)) return false;
  const body = rows.filter(r => r.some(c => String(c ?? '').trim()));
  const widths = new Set(body.map(r => r.length));
  if (widths.size !== 1) return false;
  const width = [...widths][0];
  return width >= 2 || body.every(r => linkKindOf(String(r[0] ?? '').trim()));
}

/** Read an .eml / .mht: the best body part that yields a list, else an attachment. */
async function parseEmlText(bin, { depth = 0, sheetPick = null } = {}) {
  const parts = [];
  collectMimeParts(bin, 0, parts);
  const bodies = { 'text/html': [], 'text/plain': [] };
  const attachments = [];
  for (const p of parts) {
    const disp = (p.headers.get('content-disposition') || '').toLowerCase();
    const filename = mimeFilename(p);
    if (/^\s*attachment/.test(disp) || (!p.type.startsWith('text/') && filename)) { attachments.push(Object.assign(p, { filename })); continue; }
    if (bodies[p.type]) bodies[p.type].push(p);
  }
  log(`Email parsed: ${parts.length} MIME part(s) — ${bodies['text/html'].length} HTML body, ${bodies['text/plain'].length} text body, ${attachments.length} attachment(s)`);

  /* Bodies first: a forward often carries both the table *and* the file, and the
     table is the more deliberate statement of the list. HTML before plain,
     because the plain part of a multipart/alternative is its degraded copy. */
  for (const p of [...bodies['text/html'], ...bodies['text/plain']]) {
    let text;
    try { text = decodeMimePart(p); } catch (e) { warn('Could not decode a body part', e); continue; }
    if (!text.trim()) continue;
    let rows;
    try {
      rows = p.type === 'text/html'
        ? (HAS_DOMPARSER ? parseHtmlText(text, { allowLinkFallback: true }) : null)
        : parseEmlPlainText(text);
    } catch (e) { log(`Body part (${p.type}) had no list: ${e.message}`); continue; }
    const acceptable = p.type === 'text/html' ? plausibleList(rows) : plausibleTable(rows);
    if (rows && acceptable) {
      log(`Email body used: ${p.type} body part → ${rows.length} row(s)`);
      return { rows, from: `${p.type} body` };
    }
    if (rows) log(`Body part (${p.type}) parsed but is not list-shaped — ignoring it`);
  }

  /* Then attachments: "here is the queue" with the export attached. */
  if (depth < 1) {
    for (const a of attachments) {
      if (!a.filename) continue;
      const ext = (a.filename.match(/\.([a-z0-9]{1,10})$/i) || [])[1];
      if (!ext || !EXT_FORMAT[ext.toLowerCase()]) { log(`Skipping attachment "${a.filename}" (no reader for it)`); continue; }
      const bytes = binaryToBytes(decodeMimePartBinary(a));
      if (bytes.byteLength < 8) continue;
      const det = detectFormat(bytes.buffer, a.filename, a.headers.get('content-type') || '');
      if (det.format === 'eml') continue;   // an attached message would just recurse
      try {
        const { rows, format } = await parseDetected(bytes.buffer, det, sheetPick, { allowLinkFallback: false });
        if (plausibleList(rows)) { log(`Email attachment used: "${a.filename}" → ${format}, ${rows.length} row(s)`); return { rows, from: `attachment ${a.filename}` }; }
        log(`Attachment "${a.filename}" parsed as ${format} but is not list-shaped`);
      } catch (e) { log(`Attachment "${a.filename}" could not be read: ${e.message}`); }
    }
  }
  if (!parts.length) throw new Error('this file is not a readable email message');
  throw new Error('no list in this email — no table, no link list, and no readable attachment in it');
}
/** The raw transfer-decoded bytes of a part (attachments need bytes, not text). */
function decodeMimePartBinary(part) {
  const enc = (part.headers.get('content-transfer-encoding') || '').toLowerCase().trim();
  if (enc === 'base64') { try { return atob(part.body.replace(/[^A-Za-z0-9+/=]/g, '')); } catch (e) { warn('base64 attachment did not decode cleanly', e); return part.body; } }
  if (enc === 'quoted-printable') return decodeQuotedPrintable(part.body);
  return part.body;
}

/* ======================================================================
   Workspace links — a whole list carried inside a URL
   ======================================================================
   This is the one container that has no file behind it: an agent (or a person)
   hands over a link, and the list is already there. It is a *format* concern like
   every other reader in this file, so it lives here rather than in the boot code.

   Two encodings, for two different callers:

     #data=<text>   the list as percent-encoded text. Readable, debuggable, and the
                    one a language model or a person can write by hand.
     #zdata=<text>  the same text deflated (raw) then base64url'd, no padding. Four
                    to six times smaller, which is the difference between a link
                    that survives a chat client and one that gets truncated. Needs
                    DecompressionStream to open — native, and no dependency.

   The fragment rather than the query string is a deliberate choice with two
   independent reasons. A fragment is never sent to the server, so a list of client
   names handed over this way never lands in GitHub's access logs — which matters
   for an app whose whole claim is that nothing is uploaded. And it escapes the
   ~8 KB request-line limit that a query string is subject to (nginx's default
   8 KB header buffer answers anything longer with a 414), so a long list works
   where `?data=` would be refused by the host before our code ever ran.
   `?data=` is still read, for tooling that can only append a query. */

/** Past this, a URL is being asked to be a file. Refused with a reason. */
const INLINE_MAX_BYTES = 2 * 1024 * 1024;
/** Past this, a link may still work but chat clients start trimming it. Warned about. */
const INLINE_WARN_BYTES = 100 * 1024;

/** Bytes → base64url, no padding. Chunked, because the spread operator dies at
    ~100k arguments and a list is bigger than that. */
function bytesToBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url → bytes. Accepts the standard alphabet and padding too, because
    `+` and `/` survive enough transports that people paste them in. */
function base64UrlToBytes(s) {
  const clean = String(s || '').replace(/[\s]/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = clean.length % 4 ? '='.repeat(4 - (clean.length % 4)) : '';
  const bin = atob(clean + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** FNV-1a, 32-bit, over the raw bytes. Small and dependency-free, which is the
    whole requirement — this is a "did the link arrive whole?" check, not a
    security primitive. */
function fnv1a32(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A short integrity token for a list: its length and checksum, in base 36.
 *
 * Why this exists at all: a deflate stream cut at a *block* boundary inflates
 * without error, so a link that lost its tail in a chat client or a line-wrapped
 * post can decode to a shorter list that looks perfectly plausible. Every other
 * failure mode here announces itself; that one does not, and a silently short
 * queue is the worst thing this app could hand someone. Twelve characters of URL
 * buys the ability to say "this link is not what was sent" instead. */
function inlineDigest(bytes) {
  return `${bytes.length.toString(36)}.${fnv1a32(bytes).toString(36)}`;
}

/** Raw deflate / inflate through the platform's streams — no library, no eval. */
async function deflateRawBytes(bytes) {
  if (typeof CompressionStream !== 'function') throw new Error('this browser cannot compress a link (no CompressionStream)');
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function inflateRawBytes(bytes) {
  if (!HAS_INFLATE) throw new Error('this browser cannot open a compressed link (no DecompressionStream)');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  /* The engine's own wording here is useless to a person — a truncated stream
     surfaces as "Failed to fetch" (a Response whose body stream errored), and
     "unexpected end of file" in Node. Both mean the same thing to the reader. */
  try {
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch (e) {
    throw new Error('the compressed list could not be unpacked — a link cut short in transit is the usual reason, so ask for it to be sent again');
  }
}

/** The parameters a workspace link may carry, from **both** the query string and
    the fragment (the fragment wins — that is where we put ours). Pure string work,
    so the Node suite can test it without a browser. */
function inlineParamsFrom(search, hash) {
  const into = (acc, s) => {
    try {
      new URLSearchParams(String(s || '').replace(/^[?#]/, '')).forEach((v, k) => { acc[k] = v; });
    } catch (e) { warn('Could not read URL parameters:', e); }
    return acc;
  };
  return into(into({}, search), hash);
}

/** Decode whichever encoding the link used. Returns { text, encoding, bytes }.
    Throws a message meant for the user, because the usual failure here is a link
    that a chat client truncated, and "the list is incomplete" is the thing they
    need to know. */
/** Verify the integrity token, when the link carries one. A link without one is
    still opened — a person typing `#data=` by hand cannot compute a checksum, and
    refusing their link would be pedantry. A link *with* a token that disagrees is
    refused, because that is the silent-partial-list case. */
function checkInlineDigest(raw, text) {
  const claimed = String(raw.sum || '').trim();
  if (!claimed) return { verified: false };
  const actual = inlineDigest(new TextEncoder().encode(text));
  if (claimed !== actual) {
    throw new Error('this link is not what was sent — it decoded to a different list, which is what a link cut short in transit looks like');
  }
  return { verified: true };
}

async function decodeInlineList(raw) {
  const z = String(raw.zdata || '').trim();
  const plain = String(raw.data || '');
  if (!z && !plain) throw new Error('this link carries no list in it');
  if (z) {
    let bytes;
    try { bytes = base64UrlToBytes(z); }
    catch (e) { throw new Error('the compressed list in this link is not valid base64 — it was probably truncated when it was shared'); }
    const out = await inflateRawBytes(bytes);
    if (out.length > INLINE_MAX_BYTES) throw new Error(`this link carries ${Math.round(out.length / 1048576)} MB of list — too much for a URL`);
    const text = new TextDecoder('utf-8').decode(out);
    const { verified } = checkInlineDigest(raw, text);
    return { text, encoding: 'zdata', bytes: out.length, verified };
  }
  const bytes = new TextEncoder().encode(plain);
  if (bytes.length > INLINE_MAX_BYTES) throw new Error(`this link carries ${Math.round(bytes.length / 1048576)} MB of list — too much for a URL`);
  const { verified } = checkInlineDigest(raw, plain);
  return { text: plain, encoding: 'data', bytes: bytes.length, verified };
}

/** Build a workspace link for a list whose bytes we already have. Compressed when
    compression actually helps and the browser can do it, plain text when it does
    not — on a ten-row list the deflate header costs more than it saves. Returns
    { url, encoding, bytes, warning }. */
async function buildInlineLink(text, opts = {}) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > INLINE_MAX_BYTES) throw new Error(`that list is ${Math.round(bytes.length / 1048576)} MB — too big to carry in a URL`);
  let encoding = 'data', payload = encodeURIComponent(text);
  if (typeof CompressionStream === 'function') {
    const deflated = await deflateRawBytes(bytes);
    const candidate = bytesToBase64Url(deflated);
    /* Only when it is genuinely shorter: for a short list the base64 of a deflate
       stream is longer than the text itself, and `#data=` is also readable. */
    if (candidate.length < payload.length * 0.9) { encoding = 'zdata'; payload = candidate; }
  }
  const base = opts.base || `${location.origin}${location.pathname}`;
  const params = Object.assign({ sum: inlineDigest(bytes) }, opts.params || {});
  const extra = new URLSearchParams(params).toString();
  const url = `${base}#${encoding}=${payload}${extra ? `&${extra}` : ''}`;
  const warning = bytes.length > INLINE_WARN_BYTES
    ? `That list is ${Math.round(bytes.length / 1024)} KB — some chat apps and mail clients trim links this long.`
    : '';
  log(`Workspace link built: ${encoding}, ${bytes.length} bytes of list → ${payload.length} chars of URL`);
  return { url, encoding, bytes: bytes.length, warning };
}

/** Detect + parse any supported buffer into a matrix. Throws a friendly error for the rest. */
async function parseDetected(buf, det, sheetPick, htmlOpts) {
  const format = det.format;
  if (format === 'pdf') {
    throw new Error('PDF is not supported yet — export the list to CSV/XLSX first');
  }
  if (format === 'doc') {
    throw new Error('Legacy .doc (Word 97-2003) is not supported — open it in Word and save as .docx, or export the list as CSV');
  }
  if (format === 'docx') {
    // Word is read through the browser's own ZIP reader, so a build without it
    // must refuse out loud rather than fail on the first drop.
    if (!HAS_ZIP) throw new Error('this browser cannot unpack DOCX (no ZIP or XML support) — save the list as CSV or XLSX instead');
    return { rows: await parseDocx(buf), sheetName: null, format };
  }
  if (format === 'eml') {
    const { rows, from } = await parseEmlText(bytesToBinary(buf), { sheetPick });
    log(`Email import: ${rows.length} row(s) taken from the ${from}`);
    return { rows, sheetName: null, format, from };
  }
  if (isWorkbookFormat(format)) {
    if (!HAS_XLSX) throw new Error(`${formatLabel(format)} needs workbook support, which this build does not include — load a CSV, TSV, JSON, HTML or XML list instead`);
    const { rows, sheetName } = await parseWorkbook(buf, sheetPick);
    return { rows, sheetName, format };
  }
  const text = new TextDecoder('utf-8').decode(buf);
  const rows = format === 'json' ? parseJsonText(text)
    : format === 'md' ? parseMarkdownText(text)
    : format === 'html' ? parseHtmlText(text, htmlOpts)
    : format === 'xml' ? parseXmlText(text)
    : parseDelimitedText(text, format);
  return { rows, sheetName: null, format };
}

/** Pick a header column: an exact word ("Completed") outranks a prefix match
    ("Completed on", "Notes / comments"). Returns -1 when nothing matches. */
function pickColumn(header, exactWords, re) {
  const exact = header.findIndex(h => exactWords.has(normalizeHeader(h)));
  return exact >= 0 ? exact : header.findIndex(h => re.test(h));
}

/** Detect header row + column roles from a 2D matrix. */
function analyzeMatrix(data) {
  // Trim fully-empty trailing rows
  while (data.length && data[data.length - 1].every(c => !String(c).trim())) data.pop();

  const width = data.reduce((m, r) => Math.max(m, r.length), 1);
  const first = (data[0] || []).map(c => String(c).trim());

  // Header heuristic: known header words, or a first row with no URL values while later rows have URLs.
  const firstRowHasLink = first.some(c => linkKindOf(c));
  const sample = data.slice(1, 51);
  /* The old second clause needed a link below the first row to call it a header —
     which a *portal* list can never supply, because nothing in it is a link. So a
     first row that reads entirely like labels, over rows that do not, counts too.
     Guarded by "no link in the first row" either way, so a headerless list of
     values is still left headerless. */
  const hasHeader = first.some(c => HEADER_NAME_RE.test(c) || HEADER_URL_RE.test(c) || HEADER_STATUS_RE.test(c) || HEADER_NOTES_RE.test(c))
    || (!firstRowHasLink && (sample.some(r => r.some(c => linkKindOf(c))) || looksLikeLabelRow(first, sample)));

  const header = hasHeader ? first : [];
  let urlCol = -1, nameCol = -1, statusCol = -1, notesCol = -1;

  if (hasHeader) {
    header.forEach((h, i) => { if (nameCol < 0 && HEADER_NAME_RE.test(h)) nameCol = i; });
    statusCol = pickColumn(header, STATUS_HEADER_WORDS, HEADER_STATUS_RE);
    notesCol = pickColumn(header, NOTES_HEADER_WORDS, HEADER_NOTES_RE);
  }

  /* URL column: score link-shaped *values* per column and take the winner. A
     URL, an email address and a phone number all count — weighted, so a list
     with both a Website and an Email column leads with the website while a list
     that only holds addresses still gets a working link column. Status/notes
     columns are skipped so a notes column full of pasted links never outbids the
     real one; the header name only settles an exact tie. */
  const skip = new Set([statusCol, notesCol].filter(c => c >= 0));
  const bodyStart = hasHeader ? 1 : 0;
  const sampleEnd = Math.min(data.length, bodyStart + 200);
  let bestCount = 0, bestHeaderMatch = false;
  for (let c = 0; c < width; c++) {
    if (skip.has(c)) continue;
    let n = 0;
    for (let r = bodyStart; r < sampleEnd; r++) n += LINK_WEIGHT[linkKindOf(data[r][c])] || 0;
    if (!n) continue;
    const headerMatch = hasHeader && HEADER_URL_RE.test(header[c] || '');
    if (n > bestCount || (n === bestCount && headerMatch && !bestHeaderMatch)) {
      bestCount = n; bestHeaderMatch = headerMatch; urlCol = c;
    }
  }
  if (urlCol < 0 && hasHeader) {
    const h = header.findIndex(x => HEADER_URL_RE.test(x));   // nothing link-shaped: trust the label
    if (h >= 0) urlCol = h;
  }
  if (urlCol < 0) {
    for (let c = 0; c < width; c++) if (c !== nameCol && !skip.has(c)) { urlCol = c; break; }
  }
  if (urlCol < 0) urlCol = 0;

  /* Name column: a title-ish header decides, and an identifier column is never
     allowed to — `Ticket, Summary, …` must title its cards with the summary, not
     with `INC0041821`. Failing that, the first column with text that is neither
     the link, the status, the notes, nor an identifier. */
  if (nameCol < 0 && hasHeader) {
    nameCol = header.findIndex(h => HEADER_NAME_RE.test(String(h || '')) && !HEADER_ID_RE.test(String(h || '').trim()));
    if (nameCol >= 0) log(`Name column taken from the "${String(header[nameCol]).trim()}" header`);
  }
  const idish = hasHeader ? header.map(h => HEADER_ID_RE.test(String(h || '').trim())) : [];
  const firstTextColumn = (allowId) => {
    for (let c = 0; c < width; c++) {
      if (c === urlCol || skip.has(c)) continue;
      if (!allowId && idish[c]) continue;
      if (data.some(r => String(r[c] || '').trim())) return c;
    }
    return -1;
  };
  if (nameCol < 0) nameCol = firstTextColumn(false);
  if (nameCol < 0) nameCol = firstTextColumn(true);   // every column looked like an identifier
  log(`Matrix analyzed: header=${hasHeader}, urlCol=${urlCol} (${bestCount} link point${bestCount === 1 ? '' : 's'}${bestHeaderMatch ? ', header agreed' : ''}), nameCol=${nameCol}, statusCol=${statusCol}, notesCol=${notesCol}, width=${width}`);
  /* `linkless` is the signal that this is a *portal* list: not one cell anywhere
     looks like an address. That is not a broken list, it is a list whose rows are
     keys — so it gets a URL template instead of a link column. */
  return { hasHeader, urlCol, nameCol, statusCol, notesCol, width, linkless: bestCount === 0 };
}

/** Load a normalized 2D matrix into app state. */
function loadMatrix(data, meta) {
  log(`loadMatrix: ${data.length} rows from "${meta.name}" (mode=${meta.mode}, ext=${meta.ext})`);
  const a = analyzeMatrix(data);
  // A column the user flagged in Settings outranks detection — and it must land
  // before the status/notes seeding below, so a re-flagged status column still
  // round-trips the file's progress.
  const roleRec = a.hasHeader ? loadRoles()[headerSignature(data[0] || [])] : null;
  if (applyRoleRecord(a, roleRec, a.width)) log(`Remembered column flags applied: URL=${a.urlCol}, name=${a.nameCol}, status=${a.statusCol}, notes=${a.notesCol}`);
  const bodyRows = data.length - (a.hasHeader ? 1 : 0);

  state.name = meta.name;
  state.ext = meta.ext;
  state.mode = meta.mode;
  state.fileHandle = meta.handle || null;
  state.sourceUrl = meta.sourceUrl || null;
  state.sheetName = meta.sheetName || 'Sheet1';
  state.data = data;
  state.hasHeader = a.hasHeader;
  state.urlCol = a.urlCol; state.nameCol = a.nameCol; state.statusCol = a.statusCol; state.notesCol = a.notesCol;
  state.linkless = a.linkless;
  /* Where a row's link comes from, decided once per file: an explicit `?link=`
     or the settings panel, else whatever was remembered for this header, else
     nothing (and the row's own link cell, if it has one). */
  const tplKey = templateKeyFor(data, a.hasHeader);
  const fromParam = String(meta.linkTemplate ?? bootLinkTemplate ?? '').trim();
  bootLinkTemplate = '';                       // one load only
  /* `?? ''` on the *remembered* value too, not just the incoming one: a header that
     has never carried a template has no entry, so this is `undefined` on every
     ordinary file — and `String(undefined)` is the string "undefined", which the
     URL builder would then happily turn into https://undefined for every row. */
  const remembered = String((tplKey ? loadTemplates()[tplKey] : '') ?? '').trim();
  state.linkTemplate = fromParam || remembered;
  if (fromParam && tplKey) rememberTemplate(tplKey, fromParam);
  if (state.linkTemplate) log(`Link template for this list: ${state.linkTemplate}`);

  // Seed per-card status/notes. Priority: explicit session restore > the file's
  // own Status/Notes columns (round-trip) > blank state.
  const n = bodyRows;
  const fileHasCols = a.hasHeader && (a.statusCol >= 0 || a.notesCol >= 0);
  const headerRow = data[0] || [];
  const statusName = a.statusCol >= 0 ? String(headerRow[a.statusCol] || 'Status') : 'Status';
  const notesName  = a.notesCol  >= 0 ? String(headerRow[a.notesCol]  || 'Notes')  : 'Notes';
  const seeded = Array.from({ length: n }, (_, i) => {
    const row = data[i + (a.hasHeader ? 1 : 0)] || [];
    const raw = a.statusCol >= 0 ? String(row[a.statusCol] || '').trim() : '';
    return isCompleteValue(raw) ? 'complete' : 'incomplete';
  });
  const seededNotes = a.hasHeader && a.notesCol >= 0
    ? Array.from({ length: n }, (_, i) => String((data[i + (a.hasHeader ? 1 : 0)] || [])[a.notesCol] ?? ''))
    : null;
  const restoring = Array.isArray(meta.status) && meta.status.length === n;
  state.status = restoring ? meta.status.slice() : seeded;
  state.notes  = restoring ? (Array.isArray(meta.notes) && meta.notes.length === n ? meta.notes.slice() : Array(n).fill(''))
               : (seededNotes || Array(n).fill(''));

  // Round-trip resume: an exported/updated file dropped back in carries the
  // user's progress in its completed status + notes columns. Report what was
  // picked up so "continue where you left off" is visible, not silent.
  const seededDone = seeded.filter(s => s === 'complete').length;
  const seededWithNotes = seededNotes ? seededNotes.filter(s => String(s).trim()).length : 0;
  const resumed = [];
  if (!restoring && fileHasCols) {
    if (a.statusCol >= 0) {
      log(`Seeded ${seededDone} 'complete' status(es) from the file's ${statusName} column (round-trip)`);
      if (seededDone) resumed.push(`${seededDone} complete`);
    }
    if (a.notesCol >= 0) {
      log(`Seeded ${seededWithNotes} note(s) from the file's ${notesName} column (round-trip)`);
      if (seededWithNotes) resumed.push(`${seededWithNotes} note${seededWithNotes === 1 ? '' : 's'}`);
    }
  }

  state.isDirty = false;
  closeAllTabs();
  els.search.value = ''; state.search = '';
  els.showCompleted.checked = false; state.hideCompleted = true;  // completed hidden by default
  state.sortCol = null; state.sortAsc = true; els.sortDir.textContent = '↓';
  state.expanded = {};
  applyLayoutFor(state.data[0] || []);   // auto-apply a saved preset when the header matches
  buildSortOptions();

  updateChrome();
  renderCards();
  els.welcome.hidden = true;   // #welcome[hidden] in the stylesheet — no inline write needed
  maybeShowFirstRunPicker();
  maybeOfferPortalSetup();
  const noun = `task${n === 1 ? '' : 's'}`;
  toast(`Loaded ${n} ${noun} from ${state.name}${resumed.length ? ` — resumed ${resumed.join(' · ')}` : ''}`, 'success');
}

/* ----------------------- First-run open-mode picker ----------------------- */
const LS_SEEN_PICKER = 'turnstone-mode-picked';

function maybeShowFirstRunPicker() {
  let seen = false;
  try { seen = localStorage.getItem(LS_SEEN_PICKER) === '1'; } catch (e) {}
  if (seen) return;
  setOpenMode('tabs', false);   // side panel: one mode, nothing to pick
}

/** Ask the user how links should open (first run, or later via the menu). */
function showModePicker(firstRun) {
  log(`Showing open-mode picker (firstRun=${firstRun})`);
  const overlay = document.createElement('div');
  overlay.id = 'mode-picker';
  const opts = Object.entries(OPEN_MODES).map(([k, v]) => `
    <button data-pick="${k}" class="pick-opt">
      <span class="label">${v.label}</span>
      <span class="hint">${v.hint}</span>
    </button>`).join('');
  overlay.innerHTML = `
    <div class="modal-box">
      <h3 class="modal-title">How do you want to work through your links?</h3>
      <p class="modal-sub">You can change this anytime from the ☰ menu.</p>
      ${opts}
      <button id="picker-later" class="modal-cancel">${firstRun ? 'Decide later (tabs by default)' : 'Cancel'}</button>
    </div>`;
  mountPoint().appendChild(overlay);
  const done = () => { overlay.remove(); };
  overlay.querySelectorAll('button[data-pick]').forEach(b => {
    b.onclick = () => {
      setOpenMode(b.dataset.pick, false);
      try { localStorage.setItem(LS_SEEN_PICKER, '1'); } catch (e) {}
      toast(`Links will open as ${OPEN_MODES[b.dataset.pick].label.toLowerCase()}`, 'success');
      done();
    };
  });
  overlay.querySelector('#picker-later').onclick = () => {
    try { localStorage.setItem(LS_SEEN_PICKER, '1'); } catch (e) {}
    log('Open-mode picker deferred — staying with current mode');
    done();
  };
}

/* ------------------------- Card column layout ----------------------------- */
const COLLAPSED_COLS = 3;   // data columns shown on a collapsed card
const LS_PRESETS = 'turnstone-col-presets';

/** Header signature: trimmed, lowercased header values joined with '¦'. */
function headerSignature(headerRow) {
  return (headerRow || []).map(h => String(h || '').trim().toLowerCase()).join('¦');
}

function loadPresets() {
  try { return JSON.parse(localStorage.getItem(LS_PRESETS) || '{}'); }
  catch (e) { warn('Could not read column presets', e); return {}; }
}

function savePresets(p) {
  try { localStorage.setItem(LS_PRESETS, JSON.stringify(p)); return true; }
  catch (e) { warn('Could not persist column presets', e); return false; }
}

/* ---- Column roles: which column is the URL / name / status / notes ---- */
/* Detection reads values and is right most of the time; when it is not, the
   settings panel lets the user say so. That flag is remembered per header
   signature, so re-opening the same list — or the same export — keeps it. */
const LS_ROLES = 'turnstone-col-roles';
const ROLE_FIELDS = { url: 'urlCol', name: 'nameCol', status: 'statusCol', notes: 'notesCol' };
const ROLE_LABELS = { '': 'Data column', url: 'URL', name: 'Name', status: 'Status', notes: 'Notes' };

function loadRoles() {
  try { return JSON.parse(localStorage.getItem(LS_ROLES) || '{}'); }
  catch (e) { warn('Could not read column flags', e); return {}; }
}
function saveRoles(r) {
  try { localStorage.setItem(LS_ROLES, JSON.stringify(r)); return true; }
  catch (e) { warn('Could not persist column flags', e); return false; }
}

/** Which role a column currently holds ('' when it is an ordinary data column). */
function columnRole(c) {
  for (const [role, field] of Object.entries(ROLE_FIELDS)) if (state[field] === c) return role;
  return '';
}

/** Remember this header shape's role assignment. Headerless lists have no stable
    signature, so their flags last for the session only. */
function persistRoles() {
  if (!state.hasHeader) { log('No header row to key column flags to — flags last this session only'); return; }
  const sig = headerSignature(state.data[0]);
  const all = loadRoles();
  all[sig] = { url: state.urlCol, name: state.nameCol, status: state.statusCol, notes: state.notesCol, ts: Date.now() };
  if (saveRoles(all)) log(`Column flags saved for header signature: URL=${state.urlCol}, name=${state.nameCol}, status=${state.statusCol}, notes=${state.notesCol}`);
}

/** Overlay a remembered role record onto a role set (analysis `a` or `state`).
    Detection proposes; a recorded flag decides — out-of-range values are ignored
    so schema drift degrades to detection instead of a broken column. */
function applyRoleRecord(target, rec, width) {
  if (!rec || typeof rec !== 'object') return false;
  const ok = (v) => Number.isInteger(v) && v >= 0 && v < width;
  const set = (field, v) => {
    if (v === -1) { if (field !== 'urlCol') target[field] = -1; }   // URL must always land somewhere
    else if (ok(v)) target[field] = v;
  };
  set('urlCol', rec.url); set('nameCol', rec.name); set('statusCol', rec.status); set('notesCol', rec.notes);
  return true;
}

/** Assign a role to a column from the settings panel ('' clears it back to data). */
function setColumnRole(col, role) {
  const prev = columnRole(col);
  if (prev) state[ROLE_FIELDS[prev]] = -1;
  if (role && ROLE_FIELDS[role]) {
    const holder = state[ROLE_FIELDS[role]];
    if (holder >= 0 && holder !== col) log(`Column ${holder} (${colLabel(holder)}) released the ${role} role → data column`);
    state[ROLE_FIELDS[role]] = col;
    delete state.colHidden[col];   // a role column is a card feature, never hidden
  }
  log(`Column ${col} (${colLabel(col)}) flagged as ${ROLE_LABELS[role] || 'Data column'}`);
  persistRoles();
  renderCards();
  renderSettings();
}

/** If a saved preset matches this file's header exactly, apply its layout. */
function applyLayoutFor(headerRow) {
  const width = (state.data[0] || []).length;
  if (!width) return;
  const sig = headerSignature(headerRow);
  const presets = loadPresets();
  const preset = sig && presets[sig];
  if (preset && Array.isArray(preset.colOrder)) {
    const valid = preset.colOrder.filter(c => Number.isInteger(c) && c >= 0 && c < width);
    for (let c = 0; c < width; c++) if (!valid.includes(c)) valid.push(c); // tolerate schema drift
    state.colOrder = valid;
    state.colHidden = {};
    for (const c of preset.hidden || []) if (c >= 0 && c < width) state.colHidden[c] = true;
    // The live flag store wins over a preset's copy: a preset is only saved on
    // demand, so it can be stale the moment the user re-flags a column.
    if (preset.roles && !loadRoles()[sig] && applyRoleRecord(state, preset.roles, width)) log('Preset also carried column flags (URL/name/status/notes)');
    log(`Preset "${preset.name}" auto-applied (header signature matched)`);
    toast(`Layout preset "${preset.name}" applied`, 'success');
  } else {
    state.colOrder = null;
    state.colHidden = {};
    log('No matching layout preset for this header — using file order');
  }
}

/** Data-column display order for cards (fixed roles excluded). */
function cardColumns() {
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  const fixed = new Set([state.urlCol, state.nameCol, state.statusCol, state.notesCol].filter(c => c >= 0));
  const all = [];
  for (let c = 0; c < width; c++) if (!fixed.has(c)) all.push(c);
  const order = state.colOrder ? state.colOrder.filter(c => !fixed.has(c) && c < width) : [];
  for (const c of all) if (!order.includes(c)) order.push(c); // append anything the preset didn't mention
  return order.filter(c => !state.colHidden[c]);
}

function colLabel(c) {
  if (state.hasHeader) return String((state.data[0] || [])[c] || '').trim() || `Column ${c + 1}`;
  return `Column ${c + 1}`;
}

function visibleCardCount() { return cardColumns().length; }

/* ------------------------------ Settings UI -------------------------------- */
function openSettings() {
  log('Opening column settings');
  renderSettings();
  /* The portal field is mounted here rather than written into the markup, so it
     can list this file's own columns as chips and preview against a real row. */
  const input = document.getElementById('portal-set-input');
  if (input) input.value = state.linkTemplate;
  const refresh = wirePortalEditor('portal-set', { onCommit: null });
  const apply = document.getElementById('portal-set-apply');
  const clear = document.getElementById('portal-set-clear');
  if (apply) apply.onclick = () => { applyPortalTemplate(input.value); openSettings(); };
  if (clear) clear.onclick = () => { input.value = ''; applyPortalTemplate(''); openSettings(); };
  if (refresh) refresh();
  els.settingsOverlay.hidden = false;
}
function closeSettings() { els.settingsOverlay.hidden = true; }

function renderSettings() {
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  const order = state.colOrder ? state.colOrder.filter(c => c < width) : [];
  for (let c = 0; c < width; c++) if (!order.includes(c)) order.push(c);

  const frag = document.createDocumentFragment();
  for (const c of order) {
    const role = columnRole(c);
    const div = document.createElement('div');
    div.className = 'set-col' + (role ? ' fixed' : '');
    div.draggable = !role;
    div.dataset.col = c;
    const opts = ['', 'url', 'name', 'status', 'notes']
      .map(r => `<option value="${r}"${r === role ? ' selected' : ''}>${ROLE_LABELS[r]}</option>`).join('');
    div.innerHTML =
      `<span class="drag"${role ? '' : ' title="Drag to reorder"'}>⋮⋮</span>
       ${role ? '' : `<input type="checkbox" data-colshow="${c}" aria-label="Show ${esc(colLabel(c))} on cards" title="Show on cards" ${state.colHidden[c] ? '' : 'checked'}>`}
       <span class="cname" title="${esc(colLabel(c))}">${esc(colLabel(c))}</span>
       <select data-colrole="${c}" title="What this column means" aria-label="Role for ${esc(colLabel(c))}">${opts}</select>
       <span class="pos">${role ? 'card feature' : '#' + (order.indexOf(c) + 1)}</span>`;
    frag.appendChild(div);
  }
  if (!order.length) els.settingsCols.innerHTML = '<p class="hint">No columns in this file.</p>';
  else { els.settingsCols.innerHTML = ''; els.settingsCols.appendChild(frag); }

  const presets = loadPresets();
  const sig = headerSignature(state.hasHeader ? state.data[0] : []);
  els.settingsPresets.innerHTML = '';
  const entries = Object.entries(presets);
  if (!entries.length) { els.settingsPresets.innerHTML = '<p class="hint">No presets saved yet.</p>'; }
  for (const [s, p] of entries) {
    const row = document.createElement('div');
    row.className = 'preset-row';
    row.innerHTML = `<span class="pname">${esc(p.name)}</span>
      <span class="pmeta">${(p.colOrder || []).length} columns · ${p.hidden?.length ? p.hidden.length + ' hidden' : 'none hidden'}${s === sig ? ' · matches this file' : ''}</span>
      <button class="btn" data-preset-apply="${esc(s)}" ${s === sig ? 'disabled' : ''}>Apply here</button>
      <button class="icon" data-preset-del="${esc(s)}" title="Delete preset">🗑</button>`;
    els.settingsPresets.appendChild(row);
  }
}

function savePreset() {
  if (!state.hasHeader) { toast('This file has no header row — presets need column names', 'error'); return; }
  const name = els.presetName.value.trim();
  if (!name) { toast('Give the preset a name first', 'error'); return; }
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  const order = state.colOrder ? state.colOrder.filter(c => c < width) : [];
  for (let c = 0; c < width; c++) if (!order.includes(c)) order.push(c);
  const hidden = Object.keys(state.colHidden).map(Number).filter(c => c < width);
  const sig = headerSignature(state.data[0]);
  const roles = { url: state.urlCol, name: state.nameCol, status: state.statusCol, notes: state.notesCol };
  const presets = loadPresets();
  presets[sig] = { name, colOrder: order, hidden, roles, ts: Date.now() };
  if (savePresets(presets)) {
    log(`Column preset "${name}" saved for header signature (${sig.split('¦').length} cols)`);
    toast(`Preset "${name}" saved — files with this exact header auto-apply it`, 'success');
    els.presetName.value = '';
    renderSettings();
  } else toast('Could not save preset (storage unavailable?)', 'error');
}

function applyPresetByKey(sig) {
  const p = loadPresets()[sig];
  if (!p) return;
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  state.colOrder = (p.colOrder || []).slice();
  state.colHidden = {};
  for (const c of p.hidden || []) state.colHidden[c] = true;
  state.expanded = {};
  if (p.roles && applyRoleRecord(state, p.roles, width)) {
    log('Preset carried column flags (URL/name/status/notes) — remembering them for this header');
    persistRoles();   // the live store follows an explicit preset apply
  }
  log(`Preset "${p.name}" applied manually`);
  renderCards();
  renderSettings();
}

function resetColLayout() {
  state.colOrder = null;
  state.colHidden = {};
  state.expanded = {};
  log('Column layout reset to file order');
  renderCards();
  renderSettings();
}

/* ---------------------- Portal lists (no links at all) -------------------- */
/* The editor is one control mounted twice: the prompt offered when a list turns
   out to have no link-shaped value anywhere, and the same field in the settings
   panel for changing your mind later. `ns` namespaces the field ids so both can
   be in the DOM at once. */
const LS_PORTAL_DECLINED = 'turnstone-portal-declined';

/** The columns a template may name — header names, or positions when there is no
    header row to name. */
function templateColumns() {
  return templateColumnsFor(state.data, state.hasHeader);
}

/** The same naming rule for any matrix, not just the loaded one — the share-link
    builder previews a list that is not loaded yet, and its chips must name columns
    exactly as the live editor would name them. */
function templateColumnsFor(rows, hasHeader) {
  const data = rows || [];
  const header = hasHeader ? (data[0] || []) : [];
  const width = data.reduce((m, r) => Math.max(m, r.length), 0);
  const out = [];
  for (let c = 0; c < width; c++) {
    const name = String(header[c] ?? '').trim();
    out.push(name ? { label: name, field: name } : { label: `column ${c + 1}`, field: String(c) });
  }
  return out;
}

/** The row a preview should be built from: the first row that looks like data. */
function firstBodyRow() {
  return state.data[state.hasHeader ? 1 : 0] || state.data[0] || [];
}

/** Wire the input, the column chips and the live preview for one editor. Calls
    `onCommit(value)` on every keystroke, so the cards follow along as you type. */
function wirePortalEditor(ns, { onCommit } = {}) {
  const input = document.getElementById(`${ns}-input`);
  const chips = document.getElementById(`${ns}-chips`);
  const preview = document.getElementById(`${ns}-preview`);
  if (!input || !chips || !preview) return;
  chips.innerHTML = '';
  for (const col of templateColumns()) {
    const b = document.createElement('button');
    b.className = 'pchip';
    b.type = 'button';
    b.textContent = `{${col.label}}`;
    b.title = `Insert {${col.field}}`;
    b.onclick = () => {
      const at = input.selectionStart ?? input.value.length;
      input.value = input.value.slice(0, at) + `{${col.field}}` + input.value.slice(input.selectionEnd ?? at);
      input.focus();
      input.selectionStart = input.selectionEnd = at + col.field.length + 2;
      refresh();
    };
    chips.appendChild(b);
  }
  const refresh = () => {
    const value = input.value.trim();
    const problem = templateProblem(value, state.hasHeader ? (state.data[0] || []) : []);
    const composed = value ? applyUrlTemplate(value, firstBodyRow(), state.hasHeader ? (state.data[0] || []) : []) : '';
    input.classList.toggle('bad', !!problem);
    preview.className = 'portal-preview' + (problem ? ' bad' : '');
    if (problem) preview.textContent = problem;
    else if (!value) preview.textContent = 'No template — each card links to its own URL column, as before.';
    else if (!composed) preview.innerHTML = 'Template is valid, but the first row has nothing in the column(s) it names — <b>that row will have no link</b>.';
    else preview.innerHTML = `First card would open: <b>${esc(composed)}</b>`;
    if (onCommit) onCommit(value);
  };
  input.oninput = refresh;
  refresh();
  return refresh;
}

/** Apply a portal template to the live list, remembering it for this header. */
function applyPortalTemplate(value) {
  const key = templateKeyFor(state.data, state.hasHeader);
  state.linkTemplate = String(value || '').trim();
  rememberTemplate(key, state.linkTemplate);
  if (state.linkTemplate) {
    const host = portalLabel(state.linkTemplate);
    log(`Portal template applied (${host}); ${templateFields(state.linkTemplate).length} per-row field(s)`);
    toast(`Links are now built from your rows — ${host}`, 'success');
  } else log('Portal template cleared — back to the file\'s own link column');
  markDirty();
  renderCards();
}

function portalDeclined(key) {
  try { return (JSON.parse(localStorage.getItem(LS_PORTAL_DECLINED) || '[]') || []).includes(key); }
  catch (e) { return false; }
}
function declinePortal(key) {
  if (!key) return;
  try {
    const list = JSON.parse(localStorage.getItem(LS_PORTAL_DECLINED) || '[]') || [];
    if (!list.includes(key)) list.push(key);
    localStorage.setItem(LS_PORTAL_DECLINED, JSON.stringify(list));
  } catch (e) { warn('Could not remember that you declined the portal prompt', e); }
}

/** Offer the portal prompt once, for a list that has no links anywhere. */
function maybeOfferPortalSetup() {
  if (!state.linkless || state.linkTemplate || !cardCount()) return;
  if (modalOpen('#mode-picker')) { log('Portal prompt deferred — another modal is open'); return; }
  const key = templateKeyFor(state.data, state.hasHeader);
  if (!key) { log('Portal list with no header row — no key to remember a decline against, offering the prompt each load'); }
  else if (portalDeclined(key)) { log('Portal prompt already declined for this header — staying quiet'); return; }
  showPortalSetup();
}

function showPortalSetup() {
  log('Showing portal setup — this list has no link-shaped value in any column');
  const overlay = document.createElement('div');
  overlay.id = 'portal-modal';
  overlay.innerHTML = `
    <div class="modal-box" style="width:min(560px,92vw)">
      <h3 class="modal-title">This list has no links</h3>
      <p class="modal-sub">Not one cell in it is a page, an address or a number — which usually means the work
      happens in one portal and each row is a <em>key</em> into it. Give Turnstone the portal address and it will
      build the link for every row; use <code>{Column name}</code> anywhere the row's own values belong.</p>
      ${portalEditorMarkup('portal')}
      <div class="srow">
        <button class="btn primary" id="portal-use">Use this portal</button>
        <button class="modal-cancel" id="portal-skip">Keep it link-free</button>
      </div>
    </div>`;
  mountPoint().appendChild(overlay);
  const input = overlay.querySelector('#portal-input');
  const refresh = wirePortalEditor('portal', { onCommit: null });
  const close = () => overlay.remove();
  overlay.querySelector('#portal-use').onclick = () => {
    applyPortalTemplate(input.value);
    if (!state.linkTemplate) { toast('Enter a portal URL first', 'error'); return; }
    close();
  };
  overlay.querySelector('#portal-skip').onclick = () => {
    declinePortal(templateKeyFor(state.data, state.hasHeader));
    log('Portal prompt declined — cards stay link-free');
    close();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') overlay.querySelector('#portal-use').click(); });
  input.focus();
  if (refresh) refresh();
}

function portalEditorMarkup(ns) {
  return `<div class="portal-editor">
    <input type="text" id="${ns}-input" class="portal-input" spellcheck="false" autocomplete="off"
           placeholder="https://portal.example.com/ticket/{Ticket ID}" value="${esc(state.linkTemplate)}">
    <div class="pchips" id="${ns}-chips"></div>
    <p class="portal-preview" id="${ns}-preview"></p>
  </div>`;
}

/* -------------------------- Build a share link --------------------------- */
/* The other half of the paste path. Paste takes a list *from* somewhere; this
   hands one *to* somewhere as a single URL, which is the thing an agent needs — it
   has found or generated a list and wants to give you a workspace to work it in.

   The preview is the real parser rather than an approximation: the panel reports
   what the link will open because it runs the same code the link runs on arrival.
   That is the only way to be sure a link is right before sending it to somebody. */
function showBuildLink() {
  /* Prefilled from the list you are working on, because "send this to Sam" is the
     common case. With nothing loaded the placeholder does the teaching. */
  const prefilled = cardCount() > 0
    ? Papa.unparse(buildExportMatrix(), { delimiter: state.ext === 'tsv' ? '\t' : ',' })
    : '';
  const overlay = document.createElement('div');
  overlay.id = 'build-modal';
  overlay.innerHTML = `
    <div class="modal-box" style="width:min(760px,94vw)">
      <h3 class="modal-title">Build a share link</h3>
      <p class="modal-sub">The list goes <b>inside the link</b> — no upload, no account, nothing to host.
        Whoever opens it gets these rows as a workspace.</p>
      <label class="bl-label" for="bl-text">The list</label>
      <textarea id="bl-text" class="portal-input bl-area" spellcheck="false"
        placeholder="Name,URL,Status,Notes&#10;Apple Newsroom,https://www.apple.com/newsroom/,incomplete,Q3 earnings&#10;BBC Homepage,https://www.bbc.com/,complete,"></textarea>
      <p class="bl-status" id="bl-status"></p>
      <label class="bl-label" for="bl-link">Portal link template (optional — for a list with no links of its own)</label>
      <input type="text" id="bl-link" class="portal-input" spellcheck="false" autocomplete="off"
        placeholder="https://portal.example.com/ticket/{Ticket}">
      <div class="pchips" id="bl-chips"></div>
      <label class="bl-label" for="bl-name">Name this workspace (optional)</label>
      <input type="text" id="bl-name" class="portal-input" spellcheck="false" autocomplete="off" placeholder="Q3 approvals">
      <label class="bl-label" for="bl-url">The link</label>
      <textarea id="bl-url" class="portal-input bl-url" readonly></textarea>
      <p class="bl-size" id="bl-size"></p>
      <div class="srow">
        <button class="btn primary" id="bl-copy">Copy link</button>
        <button class="btn" id="bl-open">Open it here</button>
        <button class="modal-cancel" id="bl-close">Close</button>
      </div>
    </div>`;
  mountPoint().appendChild(overlay);

  const ta = overlay.querySelector('#bl-text');
  const urlBox = overlay.querySelector('#bl-url');
  const status = overlay.querySelector('#bl-status');
  const sizeLine = overlay.querySelector('#bl-size');
  const chips = overlay.querySelector('#bl-chips');
  const tplInput = overlay.querySelector('#bl-link');
  const nameInput = overlay.querySelector('#bl-name');
  ta.value = prefilled;
  tplInput.value = state.linkTemplate || '';

  let built = null;
  let seq = 0;
  async function refresh() {
    const mine = ++seq;                       // a stale async run must not paint
    const text = ta.value;
    if (!text.trim()) {
      status.textContent = 'Paste a list above, or open a file first and this panel starts from it.';
      urlBox.value = ''; sizeLine.textContent = ''; chips.innerHTML = '';
      built = null;
      return;
    }
    let rows = [], format = 'csv';
    try {
      const parsed = await pasteToMatrix({ text, kind: 'text' });
      rows = parsed.rows; format = parsed.format;
    } catch (e) {
      if (mine !== seq) return;
      status.textContent = `That is not a list yet: ${e.message}`;
      urlBox.value = ''; built = null;
      return;
    }
    if (mine !== seq) return;
    const a = analyzeMatrix(rows);
    const tasks = rows.length - (a.hasHeader ? 1 : 0);
    status.innerHTML = `Read as <b>${esc(formatLabel(format))}</b> — <b>${tasks}</b> task${tasks === 1 ? '' : 's'},
      <b>${a.width}</b> column${a.width === 1 ? '' : 's'}${a.hasHeader ? ', header row detected' : ', no header row'}${a.linkless ? ' — no links anywhere, so a portal template will be needed' : ''}`;

    /* The columns this list actually has, as chips: a template is impossible to
       guess at, and clicking one beats typing braces from memory. */
    chips.innerHTML = templateColumnsFor(rows, a.hasHeader)
      .map(c => `<button class="pchip" data-f="${esc(c.field)}" title="${esc(c.label)}">{${esc(c.field)}}</button>`).join('');
    chips.querySelectorAll('.pchip').forEach(b => b.addEventListener('click', () => {
      tplInput.value += `{${b.dataset.f}}`;
      tplInput.focus();
      refresh();
    }));

    const params = {};
    if (tplInput.value.trim()) params.link = tplInput.value.trim();
    if (nameInput.value.trim()) params.name = nameInput.value.trim();
    try {
      const b = await buildInlineLink(text, { params });
      if (mine !== seq) return;
      built = b;
      urlBox.value = b.url;
      const kb = Math.round(b.bytes / 1024);
      sizeLine.className = 'bl-size' + (b.warning ? ' bad' : '');
      sizeLine.textContent = `${b.url.length} characters · carries ${b.bytes} bytes of list (${kb} KB), `
        + `${b.encoding === 'zdata' ? 'compressed' : 'as plain text'}`
        + `${b.warning ? ` — ${b.warning}` : ''}`;
    } catch (e) {
      if (mine !== seq) return;
      built = null; urlBox.value = '';
      sizeLine.textContent = e.message;
      sizeLine.className = 'bl-size bad';
    }
  }

  let timer = 0;
  const kick = () => { clearTimeout(timer); timer = setTimeout(refresh, 160); };
  ta.addEventListener('input', kick);
  tplInput.addEventListener('input', kick);
  nameInput.addEventListener('input', kick);
  overlay.querySelector('#bl-copy').addEventListener('click', async () => {
    if (!built) return;
    const okCopied = await copyText(built.url, 'workspace link');
    toast(okCopied ? 'Link copied — it carries the list itself' : 'Copy failed — select the link text and copy it by hand', okCopied ? 'success' : 'error');
  });
  overlay.querySelector('#bl-open').addEventListener('click', () => {
    if (!built) return;
    log('Opening the link just built (same tab) to check it');
    overlay.remove();
    location.hash = built.url.slice(built.url.indexOf('#'));   // hashchange loads it
  });
  overlay.querySelector('#bl-close').addEventListener('click', () => { log('Share-link builder closed'); overlay.remove(); });
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.remove(); });
  ta.focus();
  refresh();
}

/* ------------------------------ Paste a list ----------------------------- */
/* Copying a table out of a portal, a mail client or a spreadsheet and pasting it
   straight into Turnstone is the shortest path there is — no file, no download,
   no export button to hunt for. The clipboard carries both `text/html` (the real
   markup, multi-line cells and all) and `text/plain` (tab-separated), and the
   first is strictly better when it holds a table, so it wins.

   Nothing is loaded without confirmation: a paste that turns out to be a sentence
   must never silently replace the list you are working through. */
const PASTE_MIN_ROWS = 2;
function isEditableTarget(t) {
  if (!t || !t.tagName) return false;
  const tag = t.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable === true;
}

/** The best list the clipboard is offering, or null. */
function clipboardListText(dt) {
  const html = dt.getData('text/html') || '';
  if (/<table[\s>]/i.test(html)) return { text: html, kind: 'html', why: 'an HTML table on the clipboard' };
  const text = dt.getData('text/plain') || '';
  if (!text.trim()) return null;
  if (/<table[\s>]/i.test(text)) return { text, kind: 'html', why: 'a table pasted as markup' };
  return { text, kind: 'text', why: 'plain text on the clipboard' };
}

/** Parse pasted text into a matrix, or throw. `force` names the format explicitly,
    which the workspace-link path needs: a link has no filename for the extension
    hint to read, so `&format=md` is how a caller says what it is holding. */
async function pasteToMatrix(clip, force = '') {
  if (force) {
    const buf = new TextEncoder().encode(clip.text).buffer;
    const det = detectFormat(buf, `inline.${force}`, '');
    const { rows } = await parseDetected(buf, det, null, { allowLinkFallback: true });
    return { rows, format: det.format };
  }
  if (clip.kind === 'html') {
    const buf = new TextEncoder().encode(clip.text).buffer;
    const det = detectFormat(buf, '', 'text/html');
    const { rows } = await parseDetected(buf, det, null, { allowLinkFallback: true });
    return { rows, format: det.format };
  }
  const head = clip.text.slice(0, 4096);
  const sniffed = sniffTextFormat(head);
  const format = sniffed === 'md' ? 'md' : sniffed === 'json' ? 'json' : /\t/.test(clip.text) ? 'tsv' : 'csv';
  const rows = format === 'md' ? parseMarkdownText(clip.text)
    : format === 'json' ? parseJsonText(clip.text)
    : parseDelimitedText(clip.text, format);
  return { rows, format };
}

/** Build the confirmation dialog: what was understood, shown as a table. */
function showPastePreview(rows, format, why) {
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const body = rows.filter(r => r.some(c => String(c ?? '').trim())).length;
  const head = rows.slice(0, 6);
  log(`Paste candidate: ${why} → ${formatLabel(format)}, ${body} row(s) × ${width} col(s)`);
  const overlay = document.createElement('div');
  overlay.id = 'paste-modal';
  const cell = (v) => `<td title="${esc(v)}">${esc(v)}</td>`;
  overlay.innerHTML = `
    <div class="modal-box" style="width:min(720px,94vw)">
      <h3 class="modal-title">Load this pasted list?</h3>
      <p class="modal-sub">Read as <b>${formatLabel(format)}</b> — ${body} row${body === 1 ? '' : 's'} × ${width} column${width === 1 ? '' : 's'}.</p>
      <div class="paste-preview"><table>
        <tbody>${head.map(r => `<tr>${r.map(c => cell(String(c ?? ''))).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <div class="srow">
        <button class="btn primary" id="paste-load">Load ${body} row${body === 1 ? '' : 's'}</button>
        <button class="modal-cancel" id="paste-cancel">Not this</button>
      </div>
    </div>`;
  mountPoint().appendChild(overlay);
  overlay.querySelector('#paste-load').onclick = () => {
    overlay.remove();
    loadMatrix(rows, { name: 'Pasted list', ext: format, mode: 'fallback' });
    scheduleSave(0);
  };
  overlay.querySelector('#paste-cancel').onclick = () => { log('Paste discarded'); overlay.remove(); };
  overlay.querySelector('#paste-load').focus();
}

/** Handle a paste anywhere in the app that is not a text field. */
async function onPaste(e) {
  if (isEditableTarget(e.target)) return;                      // typing, not loading
  if (modalOpen('#mode-picker, #portal-modal, #paste-modal, #sheet-picker')) return;
  const dt = e.clipboardData;
  if (!dt) return;
  const files = [...(dt.files || [])];
  if (files.length) { e.preventDefault(); log(`Paste carried ${files.length} file(s)`); await handleDroppedFiles(dt); return; }
  const clip = clipboardListText(dt);
  if (!clip) return;
  let parsed;
  try { parsed = await pasteToMatrix(clip); }
  catch (err2) {
    /* An image or a screenshot lands here: there is no OCR in this build, and a
       silently ignored paste would look like a bug. Say so plainly instead. */
    log('Paste could not be read as a list:', err2.message);
    toast(`That paste is not a list — ${err2.message}`, 'error');
    return;
  }
  const body = parsed.rows.filter(r => r.some(c => String(c ?? '').trim())).length;
  /* `plausibleTable`, not `plausibleList`: a paragraph split on its commas is
     shaped like a table to a lenient test, and it must not be allowed to replace
     the list the user is working through. */
  if (body < PASTE_MIN_ROWS || !plausibleTable(parsed.rows)) {
    if (clip.text.trim().split(/\r?\n/).filter(l => l.trim()).length >= 3) {
      log(`Paste had ${body} row(s) and is not list-shaped — ignored`);
      toast('That paste does not look like a list — copy a table from a spreadsheet or portal first', 'error');
    }
    return;
  }
  e.preventDefault();
  showPastePreview(parsed.rows, parsed.format, clip.why);
}

/** Menu action: read the clipboard directly when the browser allows it. */
async function pasteFromClipboard() {
  if (!navigator.clipboard || !navigator.clipboard.read) {
    log('Clipboard read API unavailable — asking the user to paste instead');
    toast('Press Ctrl+V (⌘V on a Mac) anywhere in Turnstone to paste your list', 'success');
    return;
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const htmlType = item.types.find(t => t === 'text/html');
      const textType = item.types.find(t => t === 'text/plain');
      const blob = await item.getType(htmlType || textType);
      const text = await blob.text();
      const clip = { text, kind: htmlType ? 'html' : 'text' };
      const parsed = await pasteToMatrix(clip);
      if (plausibleTable(parsed.rows)) { showPastePreview(parsed.rows, parsed.format, 'the clipboard'); return; }
    }
    toast('Nothing list-shaped on the clipboard', 'error');
  } catch (e) {
    warn('Clipboard read was refused', e);
    toast('Press Ctrl+V (⌘V on a Mac) anywhere in Turnstone to paste your list', 'success');
  }
}

/** Read a File/Blob (picked locally) and load it. */
async function loadFromFileObject(file, handle) {
  state.sourceUrl = null; // local picks are not shareable via ?file=
  log(`Reading picked file "${file.name}" (${file.size} bytes, type="${file.type || 'unknown'}", fsHandle=${!!handle})`);
  try {
    const buf = await file.arrayBuffer();
    const det = detectFormat(buf, file.name, file.type);
    const { rows: matrix, sheetName } = await parseDetected(buf, det, null, { allowLinkFallback: true });
    if (!matrix.length) { toast('File appears to be empty', 'error'); warn('Empty file:', file.name); return; }
    // Only formats we can rebuild get silent write-back; the rest import one-way.
    const writable = canWrite(det.format);
    if (!writable) {
      log(`"${det.format}" is import-only — write-back disabled, edits persist to ${storageLabel()}`);
      toast(`${formatLabel(det.format)} imports as a one-way conversion — your edits save to ${storageLabel()}. Use Export to keep them.`, 'success');
    }
    const keep = writable && !!handle;
    loadMatrix(matrix, { name: file.name, ext: det.format, mode: keep ? 'fs' : 'fallback', handle: keep ? handle : null, sheetName });
    await rememberFile(keep ? { key: 'active', kind: 'fs', name: file.name, ts: Date.now(), handle }
                            : { key: 'active', kind: 'fallback', name: file.name, ts: Date.now(), handle: null });
    scheduleSave(0); // persist a session snapshot right away (fallback modes)
  } catch (e) {
    err('Failed to load file', file.name, e);
    toast(`Could not parse "${file.name}": ${e.message}`, 'error');
  }
}

/* ---------------------- Drag & drop initial acquisition ------------------- */
/** True when a drag is carrying files from the OS (not an in-page drag like the
    settings panel's column reordering, which must stay untouched). */
function isFileDrag(e) {
  return [...((e.dataTransfer && e.dataTransfer.types) || [])].includes('Files');
}

/** Chromium hands dropped files a real handle, which can restore silent write-back.
    Resolve it only when it is already writable — no surprise permission dialog on drop. */
async function handleFromDrop(dt) {
  const item = [...(dt.items || [])].find(i => i.kind === 'file' && typeof i.getAsFileSystemHandle === 'function');
  if (!item) return null;
  try {
    const handle = await item.getAsFileSystemHandle();
    if (!handle || handle.kind !== 'file') return null;
    if (!handle.queryPermission) return handle;
    const state = await handle.queryPermission({ mode: 'readwrite' });
    if (state === 'granted') { log(`Dropped file "${handle.name}" is writable → silent write-back enabled`); return handle; }
    log('Dropped file handle is read-only — edits will go to browser storage (use the drop zone→picker, or Open file…, for live write-back)');
    return null;
  } catch (e) {
    warn('Could not read a file handle from the drop', e);
    return null;
  }
}

/** Load the file(s) of a drop. Extra files are reported rather than silently ignored. */
async function handleDroppedFiles(dt) {
  const files = [...(dt.files || [])];
  if (!files.length) return;
  if (files.length > 1) warn(`Drop carried ${files.length} files — loading the first one ("${files[0].name}")`);
  const file = files[0];
  log(`Dropped file "${file.name}" (${file.size} bytes, type="${file.type || 'unknown'}")`);
  toast(`Reading ${file.name}…`);
  await loadFromFileObject(file, await handleFromDrop(dt));
}

/** If this exact file was previously worked on in fallback mode, reuse its statuses/notes. */
async function readSessionMetaFor(name) {
  try {
    const sess = await idbGet('session', 'session');
    if (sess && sess.name === name) { log('Found prior fallback session for', name); return sess; }
  } catch (e) { warn('No session meta', e); }
  return null;
}

/* --------------------------- File acquisition ---------------------------- */
const FS_PICK_OPTS = {
  types: [{
    description: 'Link list (CSV, TSV, XLSX, XLS, ODS, DOCX, EML, JSON, HTML, XML)',
    accept: {
      'text/csv': ['.csv', '.tsv', '.tab', '.txt'],
      'text/plain': ['.csv', '.tsv', '.txt'],
      'application/json': ['.json', '.jsonl', '.ndjson'],
      'text/html': ['.html', '.htm'],
      'message/rfc822': ['.eml', '.mht', '.mhtml'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/xml': ['.xml', '.rss', '.atom', '.opml'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'],
      'application/vnd.ms-excel': ['.xls', '.xlsb'],
      'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
    },
  }],
  excludeAcceptAllOption: false,
  multiple: false,
};

async function openLocalFile() {
  log(`Open file requested. showOpenFilePicker available: ${!!window.showOpenFilePicker}`);
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker(FS_PICK_OPTS);
      log('File handle acquired:', handle.name);
      const file = await handle.getFile();
      await loadFromFileObject(file, handle);
    } catch (e) {
      if (e.name === 'AbortError') { log('File picker aborted by user'); return; }
      err('showOpenFilePicker failed, using fallback input', e);
      els.fileInput.click();
    }
  } else {
    log('File System Access API unavailable → <input type=file> fallback');
    els.fileInput.click();
  }
}

/** Open a workspace link — a list carried in the URL itself, with nothing to fetch.
 *
 * This is the path an agent's link takes: it reads the payload, hands the text to
 * the same parser a paste goes through, and loads the matrix. The bar for accepting
 * it is deliberately the *file* bar rather than the paste bar — a link is an explicit
 * hand-off, so it is opened rather than questioned, and the load toast reports what
 * was read. Only a payload with no list in it at all is refused.
 */
async function loadInlineWorkspace(raw) {
  const dec = await decodeInlineList(raw);
  loadedInlineKey = String(raw.zdata || raw.data || '');
  log(`Workspace link: ${dec.encoding}, ${dec.bytes} bytes of list decoded`);
  if (dec.bytes > INLINE_WARN_BYTES) warn(`Workspace link carries ${Math.round(dec.bytes / 1024)} KB — a truncated share is the usual way this fails`);
  const { rows, format } = await pasteToMatrix(
    { text: dec.text, kind: 'text', why: 'a workspace link' },
    String(raw.format || '').trim().toLowerCase(),
  );
  const filled = rows.filter(r => r.some(c => String(c ?? '').trim()));
  if (filled.length < 2) {
    throw new Error('it decoded, but there was no list in it — a link cut short in transit looks like this');
  }
  const name = String(raw.name || '').trim();
  loadMatrix(rows, { name: name || 'Shared workspace', ext: format, mode: 'fallback' });
  /* cardCount(), not the row count: `filled` includes the header row, and reporting
     "11 rows" for a ten-task workspace is exactly the kind of off-by-one that makes
     a person distrust the number. */
  toast(`Opened a shared workspace — ${cardCount()} task${cardCount() === 1 ? '' : 's'} read from the link`, 'success');
  scheduleSave(0);
}

/** Load a remote file from ?file=/?url= param or the welcome-panel input. */

async function loadFromUrl(fileUrl) {
  fileUrl = String(fileUrl || '').trim();
  let parsed;
  try {
    parsed = new URL(fileUrl, location.href);
  } catch (e) {
    toast('That does not look like a valid URL', 'error');
    warn('URL parse failed for', fileUrl, e);
    return;
  }
  if (!/^https?:$/.test(parsed.protocol)) { toast('Only http(s) URLs can be fetched', 'error'); return; }
  // Bare words resolve as relative URLs — require a scheme or at least a dot before wasting a fetch.
  if (!/^[a-z][a-z0-9+.\-]*:/i.test(fileUrl) && !fileUrl.includes('.')) {
    toast('That does not look like a valid URL', 'error');
    warn('Rejected non-URL input:', fileUrl);
    return;
  }
  if (parsed.href === location.href) { toast('That URL is this app itself — paste a data file URL', 'error'); return; }

  log(`Loading remote file: ${fileUrl}`);
  toast(`Fetching ${parsed.pathname.split('/').pop() || parsed.host}…`);
  els.btnLoadUrl.disabled = true;
  try {
    const res = await fetch(fileUrl, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const buf = await res.arrayBuffer();
    log(`Fetched ${buf.byteLength} bytes (content-type: ${res.headers.get('content-type') || 'unknown'})`);

    // Format detection: magic bytes first, then content sniffing, then URL extension and Content-Type.
    const det = detectFormat(buf, parsed.pathname, res.headers.get('content-type'));

    // Guard: many hosts serve an HTML error/landing page with HTTP 200. Remote HTML is
    // only believed when it really carries a table — never its navigation link list.
    if (det.format === 'html' && det.ext !== 'html' && det.ext !== 'htm') {
      throw new Error(det.ext
        ? `that URL returned a web page, not a ${det.ext.toUpperCase()} file`
        : 'that URL returned a web page — paste a direct link to a data file instead');
    }

    let { rows: matrix, sheetName } = await parseDetected(buf, det, null, { allowLinkFallback: false });
    if (isWorkbookFormat(det.format) && await wbHasMultipleSheets(buf)) {
      const pick = await pickSheetName(buf, sheetName);
      if (pick === null) { log('User cancelled sheet picker — load aborted'); return; }
      ({ rows: matrix, sheetName } = await parseDetected(buf, det, pick));
    }
    if (!matrix.length) { toast('Remote file appears to be empty', 'error'); return; }

    // If this URL was worked on before in fallback mode, restore its statuses/notes (round-trip for remote files).
    const meta = await readSessionMetaFor(fileUrl);
    loadMatrix(matrix, { name: parsed.pathname.split('/').pop() || parsed.host, ext: det.format, mode: 'remote', sheetName, sourceUrl: fileUrl, status: meta?.status, notes: meta?.notes });
    await rememberFile({ key: 'active', kind: 'url', name: state.name, ts: Date.now(), handle: null, url: fileUrl });
    scheduleSave(0);
  } catch (e) {
    err('Remote file load failed', e);
    // Only network problems get the fetch/CORS framing; parse and format errors
    // (unsupported format, HTML error page, malformed XML) speak for themselves.
    if (/Failed to fetch|NetworkError|load failed/i.test(String(e.message))) {
      toast(`Fetch failed: ${e.message}. The host may block cross-origin reads (CORS) — or the URL is unreachable.`, 'error');
    } else {
      toast(String(e.message), 'error');
    }
  } finally {
    els.btnLoadUrl.disabled = false;
  }
}

/** Sheet-name list for the workbook behind `buf` (SheetJS returns an array OR {SheetNames}). */
async function sheetNamesOf(buf) {
  if (!HAS_XLSX) return [];
  const info = await XLSX.read(buf, { type: 'array', bookSheets: true });
  return Array.isArray(info) ? info : (info && info.SheetNames) || [];
}

/** True when the workbook behind `buf` has more than one sheet. */
async function wbHasMultipleSheets(buf) {
  try { return (await sheetNamesOf(buf)).length > 1; }
  catch (e) { warn('Could not inspect sheet list', e); return false; }
}

/** Ask the user which worksheet to load (only for multi-sheet workbooks). Returns null when cancelled. */
function pickSheetName(buf, current) {
  return new Promise(async (resolve) => {
    const names = await sheetNamesOf(buf);
    log(`Multi-sheet workbook detected: [${names.join(', ')}]`);
    const overlay = document.createElement('div');
    overlay.id = 'sheet-picker';
    overlay.innerHTML = `
      <div class="modal-box wide-options">
        <h3 class="modal-title">Multiple sheets found</h3>
        <p class="modal-sub">Which worksheet holds your task list?</p>
        ${names.map(n => `<button data-sheet="${esc(n)}" class="sheet-opt${n === current ? ' current' : ''}">${esc(n)}</button>`).join('')}
        <button id="sheet-cancel" class="modal-cancel">Cancel</button>
      </div>`;
    mountPoint().appendChild(overlay);
    overlay.querySelector('#sheet-cancel').onclick = () => { overlay.remove(); resolve(null); };
    overlay.querySelectorAll('button[data-sheet]').forEach(b => { b.onclick = () => { const s = b.dataset.sheet; overlay.remove(); log('User picked sheet:', s); resolve(s); }; });
  });
}

/* --------------------- Restore / recent files (IDB) ---------------------- */
async function rememberFile(activeRecord) {
  try {
    await idbPut('handles', activeRecord);
    await idbPut('handles', { key: activeRecord.name, kind: activeRecord.kind, name: activeRecord.name, ts: activeRecord.ts, handle: activeRecord.handle });
    els.miRestore.hidden = false;
    log('File handle remembered in IndexedDB (active + recents)');
  } catch (e) { warn('Could not persist file handle', e); }
}

async function restoreLastFile() {
  log('Restore Workspace clicked');
  try {
    const rec = await idbGet('handles', 'active');
    if (!rec) { toast('No previous workspace found', 'error'); return; }
    if (rec.kind === 'fs' && rec.handle) {
      let perm = await rec.handle.queryPermission({ mode: 'readwrite' });
      log(`Saved handle permission: ${perm}`);
      if (perm !== 'granted') {
        perm = await rec.handle.requestPermission({ mode: 'readwrite' });
        log(`Requested handle permission: ${perm}`);
      }
      if (perm !== 'granted') { toast('Permission denied — pick the file again', 'error'); return; }
      const file = await rec.handle.getFile();
      await loadFromFileObject(file, rec.handle);
    } else {
      const sess = await idbGet('session', 'session');
      if (!sess || !sess.data) { toast('No saved browser session found', 'error'); return; }
      log('Restoring fallback session from IndexedDB:', sess.name);
      loadMatrix(sess.data, { name: sess.name, ext: sess.ext || 'csv', mode: 'fallback', sheetName: sess.sheetName, status: sess.status, notes: sess.notes, sourceUrl: sess.sourceUrl || null, linkTemplate: sess.linkTemplate || '' });
      state.isDirty = true; // still needs exporting
      updateSaveIndicator();
      scheduleSave(0);
    }
  } catch (e) {
    err('Restore failed', e);
    toast(`Restore failed: ${e.message}`, 'error');
  }
}

async function renderRecents() {
  try {
    const all = (await idbGetAll('handles')).filter(r => r.name && r.ts).sort((a, b) => b.ts - a.ts).slice(0, 5);
    if (!all.length) return;
    els.recents.hidden = false;
    els.recentsList.innerHTML = '';
    for (const r of all) {
      const btn = document.createElement('button');
      btn.className = 'recent-item';
      btn.innerHTML = `<span>📄 ${esc(r.name)}</span><span class="ts">${new Date(r.ts).toLocaleString()}</span>`;
      btn.addEventListener('click', () => {
        log('Recent file clicked:', r.name);
        if (r.kind === 'fs' && r.handle) { restoreHandle(r.handle); }
        else if (r.kind === 'url' && r.url) { loadFromUrl(r.url); }
        else { restoreLastFile(); }
      });
      els.recentsList.appendChild(btn);
    }
    log(`Rendered ${all.length} recent file(s)`);
  } catch (e) { warn('Recents render failed', e); }
}

async function restoreHandle(handle) {
  try {
    let perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') { toast('Permission denied — pick the file again', 'error'); return; }
    await loadFromFileObject(await handle.getFile(), handle);
  } catch (e) {
    err('Recent-file restore failed', e);
    toast(`Could not reopen file: ${e.message}`, 'error');
  }
}

/* ------------------------------- Rendering ------------------------------- */
function cardCount() { return state.data.length - (state.hasHeader ? 1 : 0); }

function updateChrome() {
  const modeLabels = { fs: 'file write-back ON', fallback: SESSION_ONLY ? 'this tab only — export to keep' : 'fallback: browser storage', remote: 'remote file (read-only source)', demo: 'demo data' };
  const has = cardCount() > 0;
  // Sidebar header: file name + save state
  els.headName.innerHTML = state.name
    ? `${esc(state.name)} <span class="head-mode">· ${modeLabels[state.mode] || ''} · ${state.ext.toUpperCase()}${state.linkTemplate ? ' · portal links' : ''}</span>`
    : '<span class="no-file">No file loaded</span>';
  els.headName.title = state.sourceUrl ? `${state.name} — from ${state.sourceUrl}` : (state.name || '');
  // Menu item availability
  els.miClose.disabled = !state.mode;
  els.miLink.disabled = !state.sourceUrl && !state.mode;
  els.miExportCsv.disabled = !has;
  els.miExportXlsx.disabled = !has || !HAS_XLSX_WRITE;
  els.miExportXlsx.hidden = !HAS_XLSX_WRITE;   // no workbook writer → offer only what works
  // Side panel: swap between the drop-zone screen and the queue (see the panel CSS).
  document.body.classList.toggle('has-file', has);
  updateSaveIndicator();
  renderModeMenu();
  renderAutoMenu();
}

function updateSaveIndicator() {
  const el = els.headSave;
  el.className = '';
  if (!state.mode) { el.textContent = ''; return; }
  if (state.isDirty) { el.className = 'dirty'; el.textContent = '● unsaved'; }
  else if (state.lastSavedAt) {
    el.className = 'saved';
    el.textContent = `✓ saved ${new Date(state.lastSavedAt).toLocaleTimeString()}`;
  } else el.textContent = '';
}

/* ------------------------------ Card ordering ----------------------------- */
function buildSortOptions() {
  els.sortCol.innerHTML = '<option value="">File order</option>';
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  const fixed = new Set([state.urlCol, state.nameCol, state.statusCol, state.notesCol].filter(c => c >= 0));
  for (let c = 0; c < width; c++) {
    const o = document.createElement('option');
    o.value = String(c);
    o.textContent = (fixed.has(c) ? colLabel(c) + ' *' : colLabel(c));
    els.sortCol.appendChild(o);
  }
  els.sortCol.value = state.sortCol === null ? '' : String(state.sortCol);
}

function sortedIndices() {
  const total = cardCount();
  const idx = Array.from({ length: total }, (_, i) => i);
  if (state.sortCol === null || state.sortCol < 0) return idx;
  const c = state.sortCol;
  const val = i => String((state.data[i + (state.hasHeader ? 1 : 0)] || [])[c] ?? '').trim();
  const numeric = idx.every(i => val(i) === '' || /^-?\d+(\.\d+)?$/.test(val(i)));
  idx.sort((a, b) => {
    const va = val(a), vb = val(b);
    let cmp;
    if (numeric) cmp = (parseFloat(va) || 0) - (parseFloat(vb) || 0);
    else cmp = va.localeCompare(vb, undefined, { sensitivity: 'base', numeric: true });
    return state.sortAsc ? cmp : -cmp;
  });
  return idx;
}

/** Next incomplete card in file order after row i (or first, when i is null). */
function nextIncompleteRow(afterRow) {
  const total = cardCount();
  const start = afterRow === null || afterRow === undefined ? 0 : afterRow + 1;
  for (let j = start; j < total; j++) if ((state.status[j] || 'incomplete') !== 'complete') return j;
  for (let j = 0; j <= (afterRow ?? -1); j++) if ((state.status[j] || 'incomplete') !== 'complete') return j; // wrap
  return -1;
}

/* The one place that answers "where does row i go?". A cell whose value is a
   page, an address or a number answers for itself; a list with a portal template
   gets its URL composed from the row. Everything downstream — the card, the open
   modes, ?open=1 — reads this, so all of them agree by construction. */
function rowLink(i) {
  const row = state.data[i + (state.hasHeader ? 1 : 0)] || [];
  if (state.linkTemplate) {
    const composed = applyUrlTemplate(state.linkTemplate, row, state.data[0] || []);
    if (composed) return { href: composed, kind: 'url', value: composed, composed: true };
  }
  const raw = String(row[state.urlCol] ?? '').trim();
  const kind = linkKindOf(raw);
  return kind ? { href: linkHrefOf(raw), kind, value: raw, composed: false } : null;
}

function renderCards() {
  const q = state.search.trim().toLowerCase();
  const total = cardCount();
  const cols = cardColumns();               // display-ordered, hidden-removed
  const collapsed = cols.slice(0, COLLAPSED_COLS);
  const extra = cols.slice(COLLAPSED_COLS); // shown only when expanded
  let visible = 0;
  log(`renderCards: total=${total}, cols=${cols.length}, sort=${state.sortCol === null ? 'file' : state.sortCol + (state.sortAsc ? ' asc' : ' desc')}, search="${q}", showCompleted=${!state.hideCompleted}`);
  const frag = document.createDocumentFragment();

  const copyBtn = (value, label, key) =>
    `<button class="icon copy" data-copy-col="${key}" data-copy-label="${esc(label)}" title="Copy ${esc(label)}">⧉</button>`;

  const colRow = (c, i) => {
    const row = state.data[i + (state.hasHeader ? 1 : 0)] || [];
    const raw = String(row[c] ?? '').trim();
    if (!raw) return ''; // no value → no row, no clutter
    /* The link column already has a home on the card, so don't repeat it here.
       Every *other* cell that is an address or a number becomes a real link, so
       MailLayer and PhoneLayer pick the click up wherever it appears — no need
       to flag those columns in Settings first. */
    const kind = c === state.urlCol ? null : linkKindOf(raw);
    const body = kind
      ? `<a class="cell-link" href="${esc(linkHrefOf(raw))}"${kind === 'url' ? ' target="_blank" rel="noopener"' : layerAnchorAttrs(kind)}>${esc(raw)}</a>`
      : esc(raw);
    return `<div class="col-row">
      <span class="ck">${esc(colLabel(c))}</span>
      <span class="cv">${body}</span>
      ${copyBtn(raw, colLabel(c), `${i}:${c}`)}
    </div>`;
  };

  for (const i of sortedIndices()) {
    const row = state.data[i + (state.hasHeader ? 1 : 0)] || [];
    const link = rowLink(i);
    const url = link ? link.value : '';
    /* Where the primary link goes depends on what the value *is*: a page opens in
       a real tab, an address goes to the MailLayer composer, a number to the
       PhoneLayer provider picker. */
    const urlKind = link ? link.kind : null;
    const urlHref = link ? link.href : '';
    const urlAttrs = (urlKind === 'url' ? ' target="_blank" rel="noopener"' : '') + layerAnchorAttrs(urlKind);
    const urlGlyph = urlKind === 'email' ? '✉' : urlKind === 'phone' ? '☎' : '↗';
    /* A composed link is labeled with the portal it came from when the template
       is the same for every row, and with the composed URL when the row's own
       values are what make it different. */
    const urlShown = link && link.composed && !templateFields(state.linkTemplate).length ? portalLabel(state.linkTemplate) : url;
    const urlHint = urlKind === 'email' ? `Compose an email to ${url}`
      : urlKind === 'phone' ? `Call or text ${url}`
      : link && link.composed ? `Open this row in ${portalLabel(state.linkTemplate)}`
      : urlKind === 'url' ? 'Open in new browser tab (always a real tab)'
      : 'Open this link';
    const name = String(state.nameCol >= 0 ? row[state.nameCol] : '') || url;
    const status = state.status[i] || 'incomplete';
    const notes = state.notes[i] || '';

    if (state.hideCompleted && status === 'complete') continue;
    if (q && !(`${name} ${url} ${notes} ${row.join(' ')}`.toLowerCase().includes(q))) continue;
    visible++;

    const expanded = !!state.expanded[i] || extra.length === 0;
    const shown = expanded ? cols : collapsed;
    const colRows = shown.map(c => colRow(c, i)).join('');
    const moreBtn = extra.length
      ? `<button class="col-more" data-toggle-col="${i}">${expanded ? '▲ Less' : `▼ +${extra.length} more column${extra.length === 1 ? '' : 's'}`}</button>`
      : '';

    const card = document.createElement('article');
    card.className = 'card' + (status === 'complete' ? ' done' : '') + (expanded ? ' ex' : '');
    card.dataset.rowIndex = i; // PRD: DOM↔array mapping via data-row-index
    card.innerHTML = `
      <div class="card-top">
        <button class="card-title" title="Open this link (your chosen mode) + show all columns">${highlight(name, state.search.trim())}</button>
        ${copyBtn(name, 'name', `${i}:name`)}
        ${url ? `<a class="icon" href="${esc(urlHref)}"${urlAttrs} title="${esc(urlHint)}">${urlGlyph}</a>` : ''}
      </div>
      <div class="card-url">
        ${url ? `<a href="${esc(urlHref)}"${urlAttrs} title="${esc(urlHint)}">${highlight(urlShown, state.search.trim())}</a>` : ''}
        ${copyBtn(url, 'URL', `${i}:url`)}
      </div>
      ${colRows}
      ${moreBtn}
      <div class="card-mid">
        ${status === 'complete'
          ? `<button class="btn-undo" data-undo="${i}" title="Mark back to incomplete">↺ Incomplete</button>`
          : `<button class="btn-done" data-done="${i}" title="Mark complete (auto-opens next when enabled)">✓ Complete</button>`}
      </div>
      <div class="card-notes">
        <span class="label">Notes ${copyBtn(notes, 'notes', `${i}:notes`)}</span>
        <textarea rows="2" placeholder="Add a note…" data-notes="${i}">${esc(notes)}</textarea>
      </div>`;
    frag.appendChild(card);
  }

  const done = state.status.filter(s => s === 'complete').length;
  const allDone = total > 0 && state.hideCompleted && done === total;
  els.cards.innerHTML = '';
  if (!visible) els.cards.innerHTML = `<div class="empty">${
    !total ? 'No file loaded yet.<br>Open a link list to populate task cards.'
    : allDone ? `All ${total} task${total === 1 ? '' : 's'} complete — tick “Show completed” to review them.`
    : 'No tasks match your filters.'}</div>`;
  else els.cards.appendChild(frag);

  els.countTotal.textContent = `${total} task${total === 1 ? '' : 's'}`;
  els.countDone.textContent = `${done} done`;
  els.countLeft.textContent = `${total - done} left`;
  els.filterInfo.textContent = q || state.hideCompleted ? `${visible} shown · ${done} hidden` : '';
  log(`renderCards done: ${visible} visible, ${done} complete`);
  sendToWorker({ type: 'badge', remaining: total - done });
}

/** Completion side-effects: hide the done card (default) and auto-advance. */
function afterComplete(i) {
  if (state.autoAdvance) {
    const next = nextIncompleteRow(i);
    if (next >= 0) {
      log(`Auto-advance: next incomplete row is ${next}`);
      state.expanded[next] = true;
      openUrlFor(next);
    } else {
      log('Auto-advance: no incomplete rows left — queue finished!');
      toast('🎉 Queue finished — every task is complete', 'success');
    }
  }
  renderCards();
  markDirty();
}

/* ------------------------------ Open modes -------------------------------- */
/* How a card's link opens: tabbed iframes, a real browser tab, or a popup window.
   User-selectable at any time; remembered across sessions. */
const LS_OPEN_MODE = 'turnstone-open-mode';
const OPEN_MODES = {
  /* A side panel has nowhere to put a page, so there is exactly one mode here.
     Keeping the map (instead of deleting the mode plumbing) leaves getOpenMode,
     setOpenMode, the menu checkmark and the first-run gate working unchanged. */
  tabs: { label: 'Real browser tabs', hint: 'Open each link as a browser tab, and switch to the card you pick' },
};

function getOpenMode() {
  try { const m = localStorage.getItem(LS_OPEN_MODE); if (OPEN_MODES[m]) return m; } catch (e) {}
  return 'tabs';
}

function setOpenMode(m, announce = true) {
  if (!OPEN_MODES[m]) return;
  try { localStorage.setItem(LS_OPEN_MODE, m); } catch (e) { warn('Could not persist open mode', e); }
  if (announce) { log(`Open mode → ${OPEN_MODES[m].label}`); toast(`Links now open as ${OPEN_MODES[m].label.toLowerCase()}`); }
  renderModeMenu();
}

/** Open a task URL according to the current mode. */
function openUrlFor(i) {
  const link = rowLink(i);
  const url = link ? link.href : '';
  if (!url) { warn(`openUrlFor(${i}): no URL in row (and no portal template composed one)`); return; }
  const mode = getOpenMode();
  log(`Opening row ${i} as ${mode}: ${url}`);
  /* The side panel drives the browser: open the link as a real tab, or switch to
     the tab this row already owns (see openBrowserTab in the panel bridge). */
  openBrowserTab(url, i);
}

function renderModeMenu() {
  const mode = getOpenMode();
  els.menu.querySelectorAll('.mode-item').forEach(b => b.classList.toggle('checked', b.dataset.mode === mode));
  els.tabbar.classList.toggle('hidden-mode', mode !== 'tabs');
}

/* ----------------------- Browser-tab workspace ----------------------------
   A side panel cannot host a page, so the web app's tabbed iframe workspace has
   no equivalent here: openBrowserTab() in the panel bridge drives REAL browser
   tabs instead, and remembering which card owns which tab is its job. Only the
   two call sites the rest of the app still makes are kept, as no-ops. */
function closeAllTabs() { /* the panel has no iframe tabs to close */ }

/* ------------------------ Write-back & persistence ----------------------- */
let saveTimer = null;

/** PRD Task 4.1: debounced auto-save (1.2s in FS mode, 0.7s fallback). */
function markDirty() {
  state.isDirty = true;
  updateSaveIndicator();
  scheduleSave();
}
function scheduleSave(delay) {
  clearTimeout(saveTimer);
  const d = delay ?? (state.mode === 'fs' ? 1200 : 700);
  saveTimer = setTimeout(saveNow, d);
}

async function saveNow() {
  if (!state.mode || !cardCount()) return;
  clearTimeout(saveTimer);
  const t0 = performance.now();
  log(`saveNow: mode=${state.mode}, dirty=${state.isDirty}`);
  try {
    if (state.mode === 'fs' && state.fileHandle && canWrite(state.ext)) {
      const perm = await state.fileHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        warn('Write permission lost — cannot silently save. Data kept in memory.');
        toast('File permission expired — use Restore Workspace to re-authorize, then edit again.', 'error');
        await persistSessionSnapshot(); // safety net
        return;
      }
      await writeBackToFile();
      state.isDirty = false;
      state.lastSavedAt = Date.now(); state.lastSavedWhere = 'to file';
      log(`Wrote file "${state.name}" in ${(performance.now() - t0).toFixed(0)}ms`);
    } else {
      const snapshotted = await persistSessionSnapshot();
      /* Saved is saved — including in fallback mode, where "saved" means the
         snapshot in browser storage. This used to stay dirty on purpose, to keep
         nudging the user to export. It made the status line say "● unsaved" about
         work that had just been written, and — worse — it armed the beforeunload
         guard permanently, so **every reload and every tab close** raised a
         "you have unexported changes" confirm over a list that was already saved.
         A prompt that always fires is one people learn to click through, which is
         how the guard stops protecting the one case it exists for. The header still
         says "fallback: browser storage", and the import toast still says so. */
      /* …and if the snapshot did not land, nothing is saved: stay dirty, so the
         status line and the unload guard both keep telling the truth. A build with
         no durable storage at all (the bookmarklet's throwaway origin) therefore
         keeps its guard armed, which is exactly right there. */
      state.isDirty = !snapshotted;
      if (!snapshotted) warn('Snapshot did not persist — this build has nowhere durable to put it; export to keep the work');
      state.lastSavedAt = Date.now(); state.lastSavedWhere = 'to browser storage';
      log(`Saved session snapshot in ${(performance.now() - t0).toFixed(0)}ms`);
    }
  } catch (e) {
    err('Save failed', e);
    toast(`Save failed: ${e.message}`, 'error');
  }
  updateSaveIndicator();
}

/** Merge virtual Status/Notes columns into an export matrix. */
function buildExportMatrix() {
  let next = state.data.reduce((m, r) => Math.max(m, r.length), 1);
  const stCol = state.statusCol >= 0 ? state.statusCol : next++;
  const ntCol = state.notesCol >= 0 ? state.notesCol : next++;

  const out = [];
  if (state.hasHeader) {
    const header = state.data[0].slice();
    while (header.length < next) header.push('');
    header[stCol] = 'Status';
    header[ntCol] = 'Notes';
    out.push(header);
  } else {
    out.push(Array.from({ length: next }, (_, c) => c === state.urlCol ? 'URL' : c === stCol ? 'Status' : c === ntCol ? 'Notes' : `Column ${c + 1}`));
    log('No header row in source — a header row will be added on write-back to persist Status/Notes');
  }
  for (let i = 0; i < cardCount(); i++) {
    const row = (state.data[i + (state.hasHeader ? 1 : 0)] || []).slice();
    while (row.length < next) row.push('');
    row[stCol] = state.status[i] || 'incomplete';
    row[ntCol] = state.notes[i] || '';
    out.push(row);
  }
  log(`buildExportMatrix: ${out.length} rows × ${next} cols (status@${stCol}, notes@${ntCol})`);
  return out;
}

/** PRD Task 4.1: silent write-back via File System Access API. */
async function writeBackToFile() {
  const matrix = buildExportMatrix();
  const writable = await state.fileHandle.createWritable();
  try {
    if (isWorkbookFormat(state.ext)) {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrix), sanitizeSheetName(state.sheetName));
      await writable.write(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
    } else {
      // Delimited text keeps its own delimiter so a TSV source stays a TSV.
      await writable.write(Papa.unparse(matrix, { delimiter: state.ext === 'tsv' ? '\t' : ',' }));
    }
  } finally {
    await writable.close();
  }
  log(`Write-back complete (${state.ext})`);
}

function sanitizeSheetName(n) {
  const clean = String(n || 'Sheet1').replace(/[\\/?*[\]:]/g, '_');
  return clean.slice(0, 31) || 'Sheet1';
}

/** PRD Task 4.3: fallback persistence — full snapshot to IndexedDB. */
async function persistSessionSnapshot() {
  try {
    await idbPut('session', {
      key: 'session', name: state.name, ext: state.ext, sheetName: state.sheetName,
      data: state.data, status: state.status, notes: state.notes, sourceUrl: state.sourceUrl,
      linkTemplate: state.linkTemplate,   // a headerless portal list has no signature to remember it against
      ts: Date.now(),
    });
    log(`Session snapshot persisted (${cardCount()} cards)`);
    return true;
  } catch (e) {
    err('Session snapshot failed (file too large for IndexedDB?)', e);
    return false;   // the caller must not report "saved" for a snapshot that did not land
  }
}

/* PRD Task 4.3: export via Blob download (always available). */
function exportFile(kind) {
  if (kind === 'xlsx' && !HAS_XLSX_WRITE) {
    warn('XLSX export requested in a build without a workbook writer');
    toast('XLSX export is not in this build — Export CSV instead', 'error');
    return;
  }
  const matrix = buildExportMatrix();
  const base = (state.name || 'turnstone').replace(/\.[a-z0-9]+$/i, '');
  const a = document.createElement('a');
  if (kind === 'xlsx') {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(matrix), sanitizeSheetName(state.sheetName));
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = base + '.xlsx';
  } else {
    a.href = URL.createObjectURL(new Blob([Papa.unparse(matrix)], { type: 'text/csv;charset=utf-8' }));
    a.download = base + '-turnstone.csv';
  }
  if (EXT && chrome.downloads) {
    chrome.downloads.download({ url: a.href, filename: a.download, saveAs: false }, () => {
      if (chrome.runtime.lastError) {
        warn('chrome.downloads failed', chrome.runtime.lastError);
        toast('Export failed — the extension needs the downloads permission', 'error');
      } else {
        log(`Exported ${a.download} (${kind}) via chrome.downloads`);
        toast(`Exported ${a.download}`, 'success');
      }
    });
    return;
  }
  document.body.appendChild(a); a.click(); a.remove();
  log(`Exported ${a.download} (${kind})`);
  toast(`Exported ${a.download}`, 'success');
}

/* beforeunload guard removed in the extension build: closing a side panel must not
   raise a dialog, and the IndexedDB snapshot is kept either way. */
// Safety net: flush pending debounced saves when the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && state.isDirty) { log('Visibility hidden → flushing pending save'); saveNow(); }
});

/* PWA plumbing removed in the extension build: an install prompt and a manifest
   belong to a web origin — the panel is installed as an extension instead. */

/* Service worker registration removed in the extension build: the panel ships as
   packed files and needs no offline shell. */

/* Install button removed in the extension build (nothing fires beforeinstallprompt
   in an extension page, and the toolbar icon already opens the panel). */
els.miInstall.addEventListener('click', async () => {
  closeMenu();
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  log(`Install prompt outcome: ${outcome}`);
  deferredInstallPrompt = null;
  els.miInstall.hidden = true;
});
window.addEventListener('appinstalled', () => {
  els.miInstall.hidden = true;
  log('Turnstone installed as an app');
  toast('Turnstone installed — find it in your apps menu', 'success');
});

/* ----------------------------- Demo dataset ------------------------------ */
const DEMO_CSV = `Name,URL,Notes
Example Domain,https://example.com/,
HTTPBin HTML,https://httpbin.org/html/,
MDN Web Docs,https://developer.mozilla.org/,
OpenStreetMap Embed,https://www.openstreetmap.org/export/embed.html?bbox=-0.2%2C51.4%2C0.0%2C51.6&layer=mapnik,
Wikipedia,https://en.wikipedia.org/wiki/Main_Page,`;

function loadDemo() {
  log('Loading demo dataset');
  const matrix = parseDelimitedText(DEMO_CSV, 'csv');
  loadMatrix(matrix, { name: 'demo-links.csv', ext: 'csv', mode: 'demo', sourceUrl: null });
  scheduleSave(0);
}

/* ------------------------------ Event wiring ----------------------------- */
/* Hamburger menu */
function openMenu() {
  els.menu.hidden = false;
  const r = els.btnMenu.getBoundingClientRect();
  els.menu.style.left = Math.min(r.left, window.innerWidth - 276) + 'px';
  log('Menu opened');
}
function closeMenu() { els.menu.hidden = true; }
els.btnMenu.addEventListener('click', (e) => { e.stopPropagation(); els.menu.hidden ? openMenu() : closeMenu(); });
document.addEventListener('click', (e) => { if (!els.menu.hidden && !e.target.closest('#menu') && !e.target.closest('#btn-menu')) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
window.addEventListener('resize', () => { if (!els.menu.hidden) closeMenu(); });

els.miOpen.addEventListener('click', () => { closeMenu(); openLocalFile(); });

/* Drop zone: click/press to pick a file. Drops themselves are handled on the
   document (below) so that a file dropped anywhere still loads — and, just as
   importantly, so the browser never navigates away to the dropped file. */
els.dropzone.addEventListener('click', openLocalFile);
els.dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLocalFile(); }
});
document.addEventListener('dragover', (e) => {
  if (!isFileDrag(e)) return;                 // leave in-page drags (settings reorder) alone
  e.preventDefault();                          // required for `drop` to fire at all
  els.dropzone.classList.add('over');
});
document.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) els.dropzone.classList.remove('over');   // left the window
});
document.addEventListener('drop', async (e) => {
  els.dropzone.classList.remove('over');
  if (!isFileDrag(e)) return;                 // an in-page drag: not ours to handle
  e.preventDefault();
  try {
    await handleDroppedFiles(e.dataTransfer);
  } catch (err2) {
    err('Dropped-file load failed', err2);
    toast(`Could not read the dropped file: ${err2.message}`, 'error');
  }
});
window.addEventListener('blur', () => els.dropzone.classList.remove('over'));
els.miRestore.addEventListener('click', () => { closeMenu(); restoreLastFile(); });
els.miClose.addEventListener('click', () => { closeMenu(); closeCurrentFile(); });
/* Two kinds of share link, and the difference is where the list lives. A file we
   fetched can be pointed at (`?file=`), which is the smaller link. Anything else —
   a local pick, a dropped file, a paste, a database hand-off — has no address, so
   the list itself goes in the fragment (`#zdata=`), carrying the statuses and notes
   entered so far. Both open the same workspace; the second one needs no server at all. */
els.miBuild.addEventListener('click', () => { closeMenu(); showBuildLink(); });
els.miLink.addEventListener('click', async () => {
  closeMenu();
  if (state.sourceUrl) {
    const link = `${location.origin}${location.pathname}?file=${encodeURIComponent(state.sourceUrl)}`;
    await copyText(link, 'shareable ?file= link');
    toast('Link copied — anyone opening it gets this same file', 'success');
    return;
  }
  if (!state.mode) return;
  try {
    const matrix = buildExportMatrix();
    const text = Papa.unparse(matrix, { delimiter: state.ext === 'tsv' ? '\t' : ',' });
    const params = {};
    if (state.linkTemplate) params.link = state.linkTemplate;
    const built = await buildInlineLink(text, { params });
    await copyText(built.url, 'workspace link');
    log(`Workspace link copied (${built.encoding}, ${built.bytes} bytes of list)`);
    toast(built.warning || 'Link copied — it carries the list, your notes and your ticks', built.warning ? 'warn' : 'success');
  } catch (e) {
    err('Could not build a workspace link', e);
    toast(`Could not build a link: ${e.message}`, 'error');
  }
});
els.menu.querySelectorAll('.mode-item').forEach(b => b.addEventListener('click', () => { closeMenu(); setOpenMode(b.dataset.mode); }));
els.menu.querySelector('#mi-mode-help')?.addEventListener('click', () => { closeMenu(); showModePicker(false); });

/* Automation toggles (persisted) */
const LS_AUTO_OPEN = 'turnstone-auto-open', LS_AUTO_ADV = 'turnstone-auto-advance';
function getAutoOpen() { try { return localStorage.getItem(LS_AUTO_OPEN) === '1'; } catch (e) { return false; } }
function getAutoAdvance() { try { return localStorage.getItem(LS_AUTO_ADV) === '1'; } catch (e) { return false; } }
function renderAutoMenu() {
  els.miAutoOpen.classList.toggle('checked', getAutoOpen());
  els.miAutoAdvance.classList.toggle('checked', getAutoAdvance());
}
els.miAutoOpen.addEventListener('click', () => {
  const next = !getAutoOpen();
  try { localStorage.setItem(LS_AUTO_OPEN, next ? '1' : '0'); } catch (e) {}
  state.autoOpenOnSelect = next;
  log(`Auto-open-on-select → ${next}`);
  toast(next ? 'Cards auto-open their link when selected' : 'Auto-open on select is off');
  renderAutoMenu();
});
els.miAutoAdvance.addEventListener('click', () => {
  const next = !getAutoAdvance();
  try { localStorage.setItem(LS_AUTO_ADV, next ? '1' : '0'); } catch (e) {}
  state.autoAdvance = next;
  log(`Auto-advance → ${next}`);
  toast(next ? 'Completing a task opens the next one' : 'Auto-advance is off');
  renderAutoMenu();
});
els.miColumns.addEventListener('click', () => { closeMenu(); openSettings(); });
els.miPortal.addEventListener('click', () => {
  closeMenu();
  if (!cardCount()) { toast('Load a list first — the template is built from its columns', 'error'); return; }
  showPortalSetup();
});
els.miPaste.addEventListener('click', () => { closeMenu(); pasteFromClipboard(); });
document.addEventListener('paste', onPaste, true);
els.miExportCsv.addEventListener('click', () => { closeMenu(); exportFile('csv'); });
els.miExportXlsx.addEventListener('click', () => { closeMenu(); exportFile('xlsx'); });
els.miTheme.addEventListener('click', () => { closeMenu(); toggleThemeFromMenu(); });

function toggleThemeFromMenu() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('turnstone-theme', next); log(`Theme saved to localStorage: ${next}`); }
  catch (e) { warn('Could not persist theme preference', e); }
}

els.fileInput.addEventListener('change', async () => {
  const f = els.fileInput.files[0];
  els.fileInput.value = '';
  if (f) await loadFromFileObject(f, null);
});
els.btnDemo.addEventListener('click', loadDemo);
els.settingsX.addEventListener('click', closeSettings);
els.settingsOverlay.addEventListener('click', (e) => { if (e.target === els.settingsOverlay) closeSettings(); });
els.btnPresetSave.addEventListener('click', savePreset);
els.presetName.addEventListener('keydown', (e) => { if (e.key === 'Enter') savePreset(); });
els.btnColsReset.addEventListener('click', resetColLayout);

els.settingsCols.addEventListener('change', (e) => {
  const picker = e.target.closest('select[data-colrole]');
  if (picker) { setColumnRole(+picker.dataset.colrole, picker.value); return; }
  const cb = e.target.closest('input[data-colshow]');
  if (!cb) return;
  const c = +cb.dataset.colshow;
  if (cb.checked) delete state.colHidden[c];
  else state.colHidden[c] = true;
  log(`Column ${c} (${colLabel(c)}) → ${cb.checked ? 'shown' : 'hidden'}`);
  renderCards();
  renderSettings();
});
els.settingsPresets.addEventListener('click', (e) => {
  const applyBtn = e.target.closest('[data-preset-apply]');
  if (applyBtn) { applyPresetByKey(applyBtn.dataset.presetApply); return; }
  const delBtn = e.target.closest('[data-preset-del]');
  if (delBtn) {
    const sig = delBtn.dataset.presetDel;
    const presets = loadPresets();
    const name = presets[sig]?.name || sig;
    delete presets[sig];
    savePresets(presets);
    log(`Preset "${name}" deleted`);
    toast(`Preset "${name}" deleted`);
    renderSettings();
  }
});

/* Drag-to-reorder inside the settings panel (HTML5 DnD, desktop convenience). */
let dragCol = null;
els.settingsCols.addEventListener('dragstart', (e) => {
  const row = e.target.closest('.set-col:not(.fixed)');
  if (!row) return;
  dragCol = +row.dataset.col;
  row.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
});
els.settingsCols.addEventListener('dragend', () => {
  els.settingsCols.querySelectorAll('.dragging').forEach(r => r.classList.remove('dragging'));
});
els.settingsCols.addEventListener('dragover', (e) => {
  const over = e.target.closest('.set-col:not(.fixed)');
  if (over && dragCol !== null) e.preventDefault();
});
els.settingsCols.addEventListener('drop', (e) => {
  const over = e.target.closest('.set-col:not(.fixed)');
  if (!over || dragCol === null) return;
  e.preventDefault();
  const target = +over.dataset.col;
  if (target === dragCol) return;
  const width = state.data.reduce((m, r) => Math.max(m, r.length), 0);
  const order = state.colOrder ? state.colOrder.filter(c => c < width) : [];
  for (let c = 0; c < width; c++) if (!order.includes(c)) order.push(c);
  order.splice(order.indexOf(dragCol), 1);
  order.splice(order.indexOf(target), 0, dragCol);
  state.colOrder = order;
  log(`Column order → [${order.join(', ')}]`);
  dragCol = null;
  renderCards();
  renderSettings();
});
els.btnTestCsv.addEventListener('click', () => loadTestFile('csv'));
els.btnTestXlsx.addEventListener('click', () => loadTestFile('xlsx'));

/** Preview-sandbox test loader: consumes window.TURNSTONE_TEST_DATA (sample-links.js).
    Production paths (native picker, ?file=) are unaffected — see testing-notes.md. */
async function loadTestFile(ext) {
  const td = window.TURNSTONE_TEST_DATA;
  if (!td) { toast('Test dataset not found — is sample-links.js loaded?', 'error'); return; }
  log(`Loading test dataset (requested as ${ext}, bundled as ${td.ext})`);
  if (ext === 'xlsx') {
    // Exercise the real XLSX pipeline: build a workbook from the sample data and parse it back.
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(td.data), 'Links');
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const parsed = await parseWorkbook(buf instanceof ArrayBuffer ? buf : buf.buffer);
      loadMatrix(parsed.rows, { name: 'sample-links.xlsx', ext: 'xlsx', mode: 'remote', sheetName: parsed.sheetName, sourceUrl: null });
      return;

    } catch (e) {
      err('Test XLSX build/parse failed', e);
      toast(`Test XLSX failed: ${e.message}`, 'error');
      return;
    }
  }
  loadMatrix(td.data, { name: td.name, ext: td.ext, mode: 'remote', sheetName: td.sheetName, sourceUrl: null });
}

/* ------------------------------ Theme (light/dark) ----------------------- */
function applyTheme(theme, announce = true) {
  document.documentElement.dataset.theme = theme;
  els.miThemeLabel.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  if (announce) log(`Theme → ${theme}`);
}

els.search.addEventListener('input', () => {
  state.search = els.search.value;
  clearTimeout(els.search._t);
  els.search._t = setTimeout(renderCards, 150);
});
els.showCompleted.addEventListener('change', () => { state.hideCompleted = !els.showCompleted.checked; log(`Show-completed → ${els.showCompleted.checked}`); renderCards(); });
els.sortCol.addEventListener('change', () => {
  const v = els.sortCol.value;
  state.sortCol = v === '' ? null : +v;
  log(`Sort column → ${state.sortCol === null ? 'file order' : colLabel(state.sortCol)}`);
  renderCards();
});
els.sortDir.addEventListener('click', () => {
  if (state.sortCol === null) { toast('Pick a column to sort by first'); return; }
  state.sortAsc = !state.sortAsc;
  els.sortDir.textContent = state.sortAsc ? '↓' : '↑';
  els.sortDir.title = state.sortAsc ? 'Ascending — click for descending' : 'Descending — click for ascending';
  log(`Sort direction → ${state.sortAsc ? 'asc' : 'desc'}`);
  renderCards();
});

// Sidebar event delegation (cards are rebuilt often)
els.cards.addEventListener('click', (e) => {
  const doneBtn = e.target.closest('[data-done]');
  const undoBtn = e.target.closest('[data-undo]');
  const titleBtn = e.target.closest('.card-title');
  const copyBtn = e.target.closest('.copy[data-copy-col]');
  const toggleBtn = e.target.closest('[data-toggle-col]');
  const urlLink = e.target.closest('.card-url a');
  if (doneBtn) {
    const i = +doneBtn.dataset.done;
    state.status[i] = 'complete';
    log(`Row ${i} marked complete`);
    afterComplete(i);
  } else if (undoBtn) {
    const i = +undoBtn.dataset.undo;
    state.status[i] = 'incomplete';
    log(`Row ${i} marked back to incomplete`);
    renderCards();
    markDirty();
  } else if (titleBtn) {
    // Clicking the card opens its link (per current mode) AND expands the card.
    const card = titleBtn.closest('.card');
    const i = +card.dataset.rowIndex;
    log(`Card clicked (rowIndex=${i}) → open + expand`);
    const wasExpanded = !!state.expanded[i];
    state.expanded[i] = true;
    if (!wasExpanded && state.autoOpenOnSelect) {
      // Auto-open happens via the expand below; avoid double-open.
      openUrlFor(i);
    } else {
      openUrlFor(i);
    }
    renderCards();
  } else if (toggleBtn) {
    const i = +toggleBtn.dataset.toggleCol;
    state.expanded[i] = !state.expanded[i];
    log(`Card ${i} expand → ${state.expanded[i]}`);
    renderCards();
  } else if (copyBtn) {
    const key = copyBtn.dataset.copyCol;           // "rowIndex:colIndex" or a fixed kind
    const label = copyBtn.dataset.copyLabel || 'value';
    let value;
    if (key.endsWith(':name')) {
      const i = +key.split(':')[0];
      const row = state.data[i + (state.hasHeader ? 1 : 0)] || [];
      value = String(state.nameCol >= 0 ? row[state.nameCol] : row[state.urlCol] || '');
    } else if (key.endsWith(':url')) {
      const i = +key.split(':')[0];
      value = String((state.data[i + (state.hasHeader ? 1 : 0)] || [])[state.urlCol] || '');
    } else if (key.endsWith(':notes')) {
      value = state.notes[+key.split(':')[0]] || '';
    } else {
      const [i, c] = key.split(':').map(Number);
      value = String((state.data[i + (state.hasHeader ? 1 : 0)] || [])[c] ?? '');
    }
    copyText(value.trim(), label).then(ok => {
      copyBtn.classList.add('ok'); copyBtn.textContent = '✓';
      setTimeout(() => { copyBtn.classList.remove('ok'); copyBtn.textContent = '⧉'; }, 900);
      if (!ok) toast('Copy failed — your browser blocked clipboard access', 'error');
    });
  }
});
els.cards.addEventListener('input', (e) => {
  const ta = e.target.closest('textarea[data-notes]');
  if (!ta) return;
  const i = +ta.dataset.notes;
  state.notes[i] = ta.value;
  log(`Notes changed for row ${i} (${ta.value.length} chars)`);
  markDirty(); // no re-render — keeps the textarea focused
});


/* ------------------------------ Close current file ------------------------ */
function closeCurrentFile() {
  if (!state.mode) { log('Close requested but no file is open'); return; }
  log(`Closing current file "${state.name}" (mode=${state.mode})`);
  state.name = null; state.ext = 'csv'; state.mode = null; state.fileHandle = null;
  state.sourceUrl = null; state.data = []; state.hasHeader = false;
  state.urlCol = 0; state.nameCol = -1; state.statusCol = -1; state.notesCol = -1;
  state.status = []; state.notes = []; state.isDirty = false; state.lastSavedAt = null; state.lastSavedWhere = null;
  state.colOrder = null; state.colHidden = {}; state.expanded = {};
  state.sortCol = null; state.sortAsc = true;
  closeAllTabs();
  els.search.value = ''; state.search = '';
  els.showCompleted.checked = false; state.hideCompleted = true;
  els.sortCol.value = '';
  updateChrome(); renderCards();
  els.welcome.hidden = false;
  els.cards.innerHTML = '<div class="empty">No file loaded yet.<br>Open a link list to populate task cards.</div>';
  toast('File closed — pick or paste another when ready');
}

/* --------------------------- Desktop-only gate ---------------------------- */
/* Turnstone is built for desktop: native file pickers, in-place save-back,
   drag-and-drop and the multi-column workspace all assume a pointer and a real
   window. A phone or tablet (a coarse, non-hovering primary pointer) gets an
   honest, dismissible notice instead of a silently broken app. Touch laptops
   keep a fine primary pointer and pass; the extension's side panel is a desktop
   window and passes; a merely narrow desktop window passes too, since the
   layout is designed to work narrow. */
const MOBILE_POINTER_QUERY = '(pointer: coarse) and (hover: none)';
let gateDismissed = false;
const isMobileLike = () => !!(window.matchMedia && window.matchMedia(MOBILE_POINTER_QUERY).matches);

function syncMobileGate() {
  const show = isMobileLike() && !gateDismissed;
  if (els.gate.hidden === !show) return;   // nothing changed → leave the DOM alone
  els.gate.hidden = !show;
  if (show) {
    els.gateW.textContent = window.innerWidth;
    els.gateH.textContent = window.innerHeight;
    log(`Touch-first pointer detected (${MOBILE_POINTER_QUERY}) at ${window.innerWidth}×${window.innerHeight} — showing the desktop-only notice`);
  } else log('Desktop-only notice hidden');
}

els.gateDismiss.addEventListener('click', () => {
  gateDismissed = true;
  log('Desktop-only notice dismissed by the user — continuing at their own risk');
  syncMobileGate();
});
if (window.matchMedia) {
  const mq = matchMedia(MOBILE_POINTER_QUERY);
  if (mq.addEventListener) mq.addEventListener('change', syncMobileGate);
  else if (mq.addListener) mq.addListener(syncMobileGate);
}
window.addEventListener('resize', syncMobileGate);
window.addEventListener('orientationchange', syncMobileGate);
syncMobileGate();

/* ------------------------- Side-panel extension bridge --------------------
 *
 * The panel is an ordinary extension page, so it talks to the browser's own tab
 * API directly — no message relay, no iframes. Two things change versus the web
 * app, and both are deliberate (see ports/extension/README.md):
 *
 *   1. Links always open as REAL BROWSER TABS. The panel is a narrow strip and
 *      cannot host a page, so the queue drives the browser instead of containing
 *      it. Selecting a card whose link is already open switches to that tab
 *      rather than reloading it, which is the same "focus, never duplicate"
 *      behaviour the web app's iframe tab bar has.
 *
 *   2. Right-click → "Add link to Turnstone" appends a row to the open queue.
 *
 * Everything is guarded on `chrome` existing, so this same generated file still
 * runs when opened over http (as the build harness does) — it just falls back to
 * a plain window, having no tabs to reach.
 */

const EXT = (typeof chrome !== 'undefined' && chrome.runtime && chrome.tabs && chrome.tabs.create) ? chrome : null;
const rowTabs = Object.create(null);          // rowIndex → browser tab id

function sendToWorker(msg) {
  if (!EXT) return;
  try { chrome.runtime.sendMessage(msg, () => void chrome.runtime.lastError); }
  catch (e) { warn('Extension worker unreachable', e); }
}

/** Open a card's link in a real browser tab, or switch to the tab it already has. */
function openBrowserTab(url, rowId) {
  if (!EXT) { window.open(url, '_blank', 'noopener'); return; }
  const known = rowTabs[rowId];
  if (known != null) {
    chrome.tabs.get(known, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        delete rowTabs[rowId];
        log(`Tab ${known} for row ${rowId} is gone — opening a fresh one`);
        openBrowserTab(url, rowId);
        return;
      }
      chrome.tabs.update(known, { active: true });
      log(`Switched to open tab ${known} for row ${rowId} (no reload)`);
    });
    return;
  }
  chrome.tabs.create({ url, active: true }, (tab) => {
    if (!tab) { warn(`chrome.tabs.create failed for ${url}`); return; }
    rowTabs[rowId] = tab.id;
    log(`Opened browser tab ${tab.id} for row ${rowId}: ${url}`);
  });
}

/* A closed tab must stop counting as "this row is already open", or the next
   card selection would try to focus a tab that no longer exists. */
if (EXT) {
  chrome.tabs.onRemoved.addListener((id) => {
    for (const k of Object.keys(rowTabs)) if (rowTabs[k] === id) delete rowTabs[k];
  });
}

/** Right-click → "Add link to Turnstone": append a row, or start a queue with it. */
function appendLinkRow(url, label) {
  if (!state.mode) {
    log(`No queue open — starting one from the context menu: ${url}`);
    loadMatrix([['Name', 'URL'], [label || url, url]],
      { name: 'Turnstone queue', ext: 'csv', mode: 'fallback' });
    toast(`Started a queue with ${label || url}`, 'success');
    return;
  }
  const width = Math.max(2, state.data.reduce((m, r) => Math.max(m, r.length), 0));
  const row = new Array(width).fill('');
  row[state.urlCol] = url;
  if (state.nameCol >= 0 && state.nameCol !== state.urlCol) row[state.nameCol] = label || url;
  const k = cardCount();                       // one past the last data row
  state.data.push(row);
  state.status[k] = 'incomplete';
  state.notes[k] = '';
  log(`Appended row ${k} from the context menu: ${url}`);
  renderCards();
  markDirty();
  toast(`Added to the queue: ${label || url}`, 'success');
}

/* Live adds arrive by message; anything queued while the panel was shut waits in
   chrome.storage. The listener is registered BEFORE the stash is read, so an add
   landing mid-load cannot fall between the two paths. */
if (EXT) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'add-link' && msg.url) appendLinkRow(msg.url);
  });
  chrome.storage.local.get('pendingLink', (res) => {
    const url = res && res.pendingLink;
    if (!url) return;
    chrome.storage.local.remove('pendingLink');
    log('Picked up a link that was queued while the panel was closed');
    appendLinkRow(url);
  });
}

/* --------------------------------- Boot ---------------------------------- */
(async function init() {
  log(`Turnstone initializing — FSA API: ${!!window.showOpenFilePicker}, XLSX: ${HAS_XLSX}, ZIP: ${HAS_INFLATE}, DOM: ${HAS_DOMPARSER}, layers: ${HAS_LAYERS}${HAS_LAYERS ? ` (PhoneLayer ${window.PhoneLayer.version})` : ''}, URL: ${location.href}`);
  applyTheme(document.documentElement.dataset.theme, false);

  // A build without SheetJS says so before the user drops a workbook on it.
  if (!HAS_XLSX_WRITE) els.btnTestXlsx.hidden = true;   // the test button builds a workbook to re-parse

  /* No edition pointer here: the panel is itself one of the editions, and it does
     not package the site that describes the others. */
  /* The advertised format list is generated from the format table the parsers
     themselves use, so a format can never be accepted-but-unadvertised, or
     advertised by a build that cannot open it. */
  els.dzFormats.textContent = ADVERTISED_FORMATS
    .filter(f => (HAS_XLSX || !/XLSX/.test(f)) && (HAS_ZIP || !/DOCX/.test(f)))
    .join(' · ');
  /* Every capability this build lacks is named in the same place, on the welcome
     panel, instead of being discovered by dropping a file on it. Collected into
     one list so a build missing two things still says both. */
  const capLines = [];
  if (!HAS_XLSX) {
    capLines.push('<b>CSV-only build</b> — no workbook support (XLSX/XLS/ODS). Everything else works: CSV, TSV, DOCX, email, Markdown, JSON, HTML and XML lists.');
    log('Workbook support unavailable in this build — welcome panel switched to CSV-only');
  } else if (!HAS_XLSX_WRITE) {
    capLines.push('<b>Read-only workbooks</b> — this build can open XLSX/XLS/ODS, but your edits are kept in the page and exported as CSV.');
    log('Workbook writer unavailable — workbooks import one-way, edits export as CSV');
  }
  if (!HAS_ZIP) {
    capLines.push(`<b>No DOCX</b> — this browser has no ${HAS_INFLATE ? '<code>DOMParser</code>' : '<code>DecompressionStream</code>'}, so Word documents cannot be unpacked. CSV, XLSX, Markdown, JSON, HTML and XML all still work.`);
    log(`DOCX support unavailable (${HAS_INFLATE ? 'no DOMParser' : 'no DecompressionStream'}) — DOCX refused`);
  }
  if (!HAS_LAYERS) {
    capLines.push('<b>Plain email and phone links</b> — MailLayer and PhoneLayer are not part of this build, so an address opens your system mail app and a number your system dialler.');
    log('Embedded layers unavailable in this build — mailto:/tel: stay native');
  }
  if (capLines.length) {
    els.capNotice.hidden = false;
    els.capNotice.innerHTML = capLines.join('<br>');
  }

  // Live-follow the OS light/dark preference while the user hasn't picked explicitly.
  if (window.matchMedia) {
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      try { if (localStorage.getItem('turnstone-theme')) return; } catch (_) {}
      applyTheme(e.matches ? 'light' : 'dark');
      log(`OS color-scheme changed → ${e.matches ? 'light' : 'dark'} (no explicit user preference)`);
    });
  }

  try {
    const rec = await idbGet('handles', 'active');
    if (rec) { log('Previous workspace found in IndexedDB → showing Restore item'); els.miRestore.hidden = false; }
    await renderRecents();
  } catch (e) { warn('IndexedDB unavailable — persistence limited to this page load', e); }

  /* Parameters come from the query string **and** the fragment. Ours (the list
     itself) live in the fragment, because a fragment is never sent to the server
     and is not subject to the host's request-line limit; `?file=` and friends stay
     in the query where they have always been. A fragment value wins on conflict. */
  const params = new Map(Object.entries(inlineParamsFrom(location.search, location.hash)));
  const param = (k) => params.get(k) || '';
  const fileParam = param('file') || param('url');
  const openFirst = param('open') === '1';
  /* `?link=` names the portal a link-free list is worked in, so a portal queue can
     be shared as one URL: `?file=queue.csv&link=https://portal/ticket/{Ticket ID}`.
     It is applied when the file loads, and remembered for that header afterwards. */
  bootLinkTemplate = param('link').trim();
  if (bootLinkTemplate) log(`link template in the URL → portal template: ${bootLinkTemplate}`);

  /* A workspace link: the list is *in* the URL, so there is nothing to fetch. This
     is the path an agent's link takes. It takes precedence over restore, and over
     ?file=, because a link that carries its own data is the most explicit thing a
     URL can say. */
  /* Editing the address bar from one workspace link to another is a *same-document*
     navigation: the browser only fires `hashchange`, the script never re-runs, and
     without this the second link would silently do nothing. Registering before the
     boot branch keeps it live on every path through this IIFE. */
  window.addEventListener('hashchange', async () => {
    const p = inlineParamsFrom('', location.hash);
    const key = p.zdata || p.data;
    if (!key || key === loadedInlineKey) return;
    log('Fragment changed → opening a different workspace link');
    bootLinkTemplate = String(p.link || '').trim();
    try { await loadInlineWorkspace(p); }
    catch (e) { err('Workspace link in the fragment could not be opened', e); toast(`That link could not be opened: ${e.message}`, 'error'); }
  });

  if (param('data') || param('zdata')) {
    try {
      await loadInlineWorkspace({
        data: param('data'), zdata: param('zdata'), format: param('format'), name: param('name'), sum: param('sum'),
      });
      if (openFirst && state.mode) {
        const link = rowLink(0);
        if (link) { log('?open=1 → auto-opening first task'); openUrlFor(0); }
        else warn('?open=1 requested but row 1 has no link (and no template composed one)');
      }
      /* `?build=1` opens the share-link builder — the entry point for anyone who came
         here to make a link rather than to work a list. Opened *after* the load so the
         panel starts from the list the link just delivered. */
      if (param('build') === '1') showBuildLink();
      return;
    } catch (e) {
      err('Workspace link could not be opened', e);
      toast(`That link could not be opened: ${e.message}`, 'error');
      /* Fall through rather than dead-end: the rest of the app still works, and the
         paste path is right there if the link was mangled in transit. */
    }
  }

  if (fileParam) {
    log(`?file=/?url= param detected → loading remote file (takes precedence over restore): ${fileParam}`);
    await loadFromUrl(fileParam);
    if (openFirst && state.mode) {
      const link = rowLink(0);
      if (link) { log('?open=1 → auto-opening first task'); openUrlFor(0); }
      else warn('?open=1 requested but row 1 has no link (and no template composed one)');
    }
  } else {
    log('No ?file=/?url= param — waiting for user to pick or restore a file');
  }
  if (param('build') === '1') showBuildLink();
})();

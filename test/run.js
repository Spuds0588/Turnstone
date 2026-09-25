#!/usr/bin/env node
/* Turnstone — the fast test layer.
 *
 *   node test/run.js            # everything
 *   node test/run.js markdown   # one section (substring match)
 *
 * No dependencies, no build step, no test framework: this repo has none of those
 * and does not want them. The tests run against the **real source** of app.html
 * rather than a copy, by evaluating the detection-and-parsing layer out of the
 * file and calling it directly — so a change that moves an anchor fails here
 * loudly instead of silently testing a stale duplicate.
 *
 * What belongs here: everything that needs no DOM. Which is more than it sounds,
 * because the DOCX *container* work (walking the ZIP, inflating one member) is
 * pure DataView + DecompressionStream and IS covered below. What does not belong
 * here: HTML, XML and the DOCX→matrix step, all of which go through DOMParser and
 * so can only be tested in a browser — that is test/fixtures.html, which sweeps
 * every supported format end to end. Between them, every format has a test.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const only = process.argv[2] || '';

let passed = 0, failed = 0, skipped = 0;
let section = '';
const failures = [];

const head = (name) => { section = name; console.log(`\n${name}`); };
const ok = (name, cond, extra = '') => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; failures.push(`${section} → ${name}`); console.log(`  FAIL  ${name}${extra ? `\n          ${extra}` : ''}`); }
};
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want),
  `got      ${JSON.stringify(got)}\n          expected ${JSON.stringify(want)}`);
const skip = (name, why) => { skipped++; console.log(`  skip  ${name} — ${why}`); };
const runs = (name) => !only || name.toLowerCase().includes(only.toLowerCase());

/* ---------------------------------------------------------------- app layer --- */

/** Evaluate app.html's detection + parsing layer in this process.
 *
 * The slice runs from the header regexes to the end of analyzeMatrix, which is the
 * whole format layer. Its browser-only dependencies arrive as parameters, so the
 * layer behaves here exactly as it does in the page: PapaParse and SheetJS are the
 * vendored builds the app itself loads, and `document`/`window` are stubs good
 * enough for the two helpers that merely read the current theme. */
function loadApp() {
  const src = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
  const start = src.indexOf('const HEADER_URL_RE =');
  const endMark = 'return { hasHeader, urlCol, nameCol, statusCol, notesCol, width, linkless: bestCount === 0 };';
  const end = src.indexOf(endMark, start) + endMark.length;
  if (start < 0 || end < endMark.length) {
    throw new Error('could not find the format layer in app.html — the anchor moved, so this suite would test nothing');
  }
  const body = src.slice(start, end) + '\n}\nreturn {\n'
    + '  FORMAT_INFO, EXT_FORMAT, CT_FORMAT, canWrite, isWritable, isWorkbookFormat,\n'
    + '  detectFormat, parseDetected, analyzeMatrix, isCompleteValue,\n'
    + '  isUrlValue, isEmailValue, isPhoneValue, linkKindOf, linkHrefOf,\n'
    + '  looksLikeMarkdown, parseMarkdownText, zipEntries, zipEntryText,\n'
    + '  layerAnchorAttrs, currentTheme, LAYER_ACCENT,\n'
    + '  applyUrlTemplate, templateProblem, templateFields, resolveTemplateField, portalLabel,\n'
    + '  looksLikeEml, looksLikeLabel, looksLikeLabelRow, plausibleList,\n'
    + '  parseEmlText, bytesToBinary, decodeQuotedPrintable, splitMimeParts, mimeHeaderFields, charsetDecode,\n'
    + '  bytesToBase64Url, base64UrlToBytes, deflateRawBytes, inflateRawBytes,\n'
    + '  inlineParamsFrom, decodeInlineList, buildInlineLink, inlineDigest, fnv1a32,\n'
    + '  INLINE_MAX_BYTES, INLINE_WARN_BYTES,\n'
    + '  HAS_XLSX, HAS_XLSX_WRITE, HAS_INFLATE, HAS_DOMPARSER, HAS_ZIP,\n'
    + '};';
  const logs = [];
  const make = new Function('XLSX', 'Papa', 'log', 'warn', 'document', 'window', 'location', body);
  const api = make(
    require(path.join(ROOT, 'vendor/xlsx.full.min.js')),
    require(path.join(ROOT, 'vendor/papaparse.min.js')),
    (m) => logs.push(String(m)),
    () => {},
    { documentElement: { dataset: {} } },
    {},
    /* The one global the format layer reads that is not a browser API: `buildInlineLink`
       defaults its base to the current page. Given here so a test can never pass by
       accidentally depending on a real address bar. */
    { origin: 'https://example.test', pathname: '/turnstone/app.html', href: 'https://example.test/turnstone/app.html' },
  );
  return { api, logs };
}

const { api, logs } = loadApp();
/** The reason for a decision is logged, not returned: detectFormat() hands back the
    format plus the file's hints, and the human-readable "why" goes to the app log. */
const lastReason = () => logs[logs.length - 1] || '';
if (!api.HAS_XLSX) throw new Error('SheetJS did not reach the layer — the vendored build is missing or broken');
/* HAS_ZIP is the *DOCX capability* (inflate + parse XML), so it is false here by
   design — Node has DecompressionStream but no DOMParser. The container work below
   needs only the first half, which is exactly why the two are named apart. */
if (!api.HAS_INFLATE) throw new Error('DecompressionStream is unavailable, so the DOCX container cannot be tested here');
if (api.HAS_ZIP !== (api.HAS_INFLATE && api.HAS_DOMPARSER)) throw new Error('HAS_ZIP no longer means "inflate + parse", so the capability gate has drifted');

const fixture = (name) => new Uint8Array(fs.readFileSync(path.join(ROOT, name)));
const asBuffer = (name) => fixture(name).buffer;
const decode = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');

/** The one target every fixture has to hit: 10 cards, 4 columns in CSV order,
 *  3 complete and 7 left. Asserting it in one place is what caught sample-links.xml
 *  being feed-shaped with no status column at all. */
const SHARED = { rows: 11, width: 4, urlCol: 1, nameCol: 0, statusCol: 2, notesCol: 3, complete: 3, visible: 7 };

function inspect(rows, a) {
  const body = rows.slice(a.hasHeader ? 1 : 0);
  const complete = a.statusCol >= 0 ? body.filter(r => api.isCompleteValue(r[a.statusCol])).length : 0;
  return {
    rows: rows.length, width: a.width, urlCol: a.urlCol, nameCol: a.nameCol,
    statusCol: a.statusCol, notesCol: a.notesCol, complete, visible: body.length - complete,
  };
}
const loadFixture = async (name) => {
  const buf = asBuffer(name);
  const det = api.detectFormat(buf, name);
  const parsed = await api.parseDetected(buf, det);
  return { det, parsed, seen: inspect(parsed.rows, api.analyzeMatrix(parsed.rows)) };
};

/* -------------------------------------------------------------------- tests --- */

(async function main() {

  if (runs('formats')) {
    head('Every format the app claims, in FORMAT_INFO and in the face of the user');
    const fmts = Object.keys(api.FORMAT_INFO);
    ok('FORMAT_INFO is not empty', fmts.length >= 10, fmts.join(', '));
    for (const f of fmts) {
      const info = api.FORMAT_INFO[f];
      ok(`${f}: has a label and a write-back verdict`, !!info.label && typeof info.writable === 'boolean',
        JSON.stringify(info));
    }
    /* Every alias and content-type the detector accepts must name a format that
       FORMAT_INFO knows — a typo here would silently fall through to CSV. */
    for (const [ext, f] of Object.entries(api.EXT_FORMAT)) {
      ok(`extension .${ext} → ${f} is a known format`, fmts.includes(f), `known: ${fmts.join(', ')}`);
    }
    for (const [re, f] of api.CT_FORMAT) {
      ok(`content-type ${re} → ${f} is a known format`, fmts.includes(f));
    }
    /* The write-back rule: never promise a save-back the format cannot deliver. */
    for (const f of ['csv', 'tsv', 'xlsx']) ok(`${f} is writable in place`, api.canWrite(f));
    for (const f of ['json', 'html', 'xml', 'pdf', 'docx', 'md', 'xls', 'xlsm', 'xlsb', 'ods']) {
      ok(`${f} is a one-way import`, !api.canWrite(f));
    }
  }

  if (runs('fixtures')) {
    head('Fixtures — every format Node can parse hits the shared target');
    /* html, xml and docx are absent on purpose: they need DOMParser, so the browser
       harness asserts them. This is the list that is testable without a DOM. */
    /* The third field is the *kind* of the link column. It decides where a card
       click goes — a real tab, the MailLayer composer, or the PhoneLayer picker —
       and it is the reason the contact fixtures exist: the primary link of the
       other nine is a page, of these two an address and a number. */
    for (const [name, format, kind] of [
      ['sample-links.csv', 'csv', 'url'], ['sample-links.tsv', 'tsv', 'url'], ['sample-links.json', 'json', 'url'],
      ['sample-links.xlsx', 'xlsx', 'url'], ['sample-links.md', 'md', 'url'], ['sample-links-table.md', 'md', 'url'],
      ['sample-links-email.csv', 'csv', 'email'], ['sample-links-phone.csv', 'csv', 'phone'],
    ]) {
      const { det, seen } = await loadFixture(name);
      ok(`${name}: detected as ${format}`, det.format === format, `got ${det.format}`);
      eq(`${name}: lands the shared target`, seen, SHARED);

      const { parsed } = await loadFixture(name);
      const a = api.analyzeMatrix(parsed.rows);
      const primary = String((parsed.rows[a.hasHeader ? 1 : 0] || [])[a.urlCol] ?? '');
      ok(`${name}: its link column is ${kind}, by value`, api.linkKindOf(primary) === kind,
        `got ${api.linkKindOf(primary)} from ${JSON.stringify(primary)}`);
      if (kind !== 'url') {
        const scheme = kind === 'email' ? 'mailto:' : 'tel:';
        ok(`${name}: so the card link resolves to ${scheme}…`, api.linkHrefOf(primary).startsWith(scheme), api.linkHrefOf(primary));
      }
    }
  }

  if (runs('workflows')) {
    head('Real-world workflows — the lists this kind of work actually arrives as');
    /* These answer "does Turnstone work on a real queue?", which the canonical
       fixture family could not: every one of its rows carries a URL in a column
       called URL, so a detector that only ever saw those nine files could still be
       wrong about everything that matters. Each list below comes from a shape that
       recurs in admin and back-office work, and each is awkward the way the real
       thing is — the identifier column comes first and the title is in the middle,
       the statuses are spelled the way the system spells them, and four of them
       hold no link anywhere at all. */
    const WORKFLOWS = [
      // file, format, width, nameHeader, statusHeader, complete, linkless
      ['sample-portal-tickets.csv',        'csv',  5, 'Summary',  'State',  3, true],
      ['sample-portal-triage.tsv',         'tsv',  6, 'Request',  'Status', 3, true],
      ['sample-invoice-approvals.xlsx',    'xlsx', 6, 'Vendor',   'Status', 3, true],
      ['sample-vendor-onboarding.csv',     'csv',  5, 'Vendor',   'Stage',  5, false],
      ['sample-compliance-renewals.csv',   'csv',  5, 'Item',     'Status', 3, false],
      ['sample-meeting-actions.md',        'md',   3, 'Name',     'Status', 3, false],
    ];
    for (const [name, format, width, nameHeader, statusHeader, complete, linkless] of WORKFLOWS) {
      const { det, parsed, seen } = await loadFixture(name);
      const a = api.analyzeMatrix(parsed.rows);
      const header = parsed.rows[0] || [];
      ok(`${name}: detected as ${format}`, det.format === format, `got ${det.format}`);
      eq(`${name}: ${width} columns, 10 data rows`, [seen.width, seen.rows - 1], [width, 10]);
      ok(`${name}: has a header row`, a.hasHeader);
      /* The headline finding from building these: a title column in the middle wins
         over the identifier in front of it. Getting this wrong titles every card
         with a ticket number. */
      eq(`${name}: the title column is "${nameHeader}", not the identifier`, String(header[a.nameCol]).trim(), nameHeader);
      /* …and the status column is found even when the system does not call it
         "Status": a vendor tracker says Stage, a pipeline says Phase. */
      eq(`${name}: the status column is "${statusHeader}"`, String(header[a.statusCol]).trim(), statusHeader);
      eq(`${name}: and counts ${complete} handled of 10`, [seen.complete, seen.visible], [complete, 10 - complete]);
      eq(`${name}: link-free list? (portal case)`, a.linkless, linkless);
    }

    /* The link column of the one list that has both links and addresses: a column
       of ten addresses adds up to less than a column of ten links, which is what
       keeps a vendor sheet's link column from being lost to its contact column. */
    {
      const { parsed } = await loadFixture('sample-vendor-onboarding.csv');
      const a = api.analyzeMatrix(parsed.rows);
      const header = parsed.rows[0] || [];
      const body = parsed.rows.slice(1);
      eq('a link column outranks a column of addresses', String(header[a.urlCol]).trim(), 'Onboarding Link');
      ok('…and every row of it is a page, not an address', body.every(r => api.linkKindOf(r[a.urlCol]) === 'url'));
      ok('…while the contact column still holds addresses', body.every(r => api.isEmailValue(r[4])),
        JSON.stringify(body[0][4]));
    }

    /* Money is not a phone number. Every amount in the approvals workbook with
       seven digits in it used to read as one, which was enough on its own to stop
       the file being recognized as a portal list — one false positive, one lost
       feature. */
    {
      const { det, parsed } = await loadFixture('sample-invoice-approvals.xlsx');
      const a = api.analyzeMatrix(parsed.rows);
      const amounts = parsed.rows.slice(1).map(r => r[2]);
      ok('the workbook keeps ten amounts', amounts.length === 10, amounts.join(', '));
      for (const v of amounts) {
        ok(`amount ${v} is not read as a phone number`, !api.isPhoneValue(v), `isPhoneValue(${JSON.stringify(v)}) was true`);
      }
      ok('a decimal amount never becomes the link column', String((parsed.rows[0] || [])[a.urlCol]).trim() !== 'Amount');
      ok('a real dotted phone number is still a phone number', api.isPhoneValue('555.123.4567'));
      ok('…and so is an international one', api.isPhoneValue('+44 20 7946 0958'));
      ok('…and a 7-digit bare number is still accepted', api.isPhoneValue('5551234'));
      ok('…but a thousands-separated amount is not', !api.isPhoneValue('12,480.75'));
      ok('…nor a plain integer amount with no separator… ', !api.isPhoneValue('1240.50'));
    }

    /* The renewals register is where a false positive would be most expensive:
       its dates are the whole point, and a date must never be read as a value. */
    {
      const { parsed } = await loadFixture('sample-compliance-renewals.csv');
      const body = parsed.rows.slice(1);
      ok('renewal dates stay dates', body.every(r => /^\d{4}-\d{2}-\d{2}$/.test(r[2])), JSON.stringify(body[0][2]));
      ok('…and none of them is read as a link', body.every(r => !api.linkKindOf(r[2])));
      ok('…nor as a phone number', body.every(r => !api.isPhoneValue(r[2])));
    }

    /* The owner and the due date of a Markdown action line survive inside the card
       title rather than becoming their own columns. That is a choice, not a gap:
       the parser keeps the whole action line intact, and splitting on whichever
       dash a particular author typed would be a guess about their note-taking. */
    {
      const { parsed } = await loadFixture('sample-meeting-actions.md');
      const first = parsed.rows[1] || [];
      ok('an action line keeps its owner and its date', /Priya/.test(first[0]) && /19 Sep/.test(first[0]), first[0]);
      ok('…and its link is a bare value, not markdown syntax', api.linkKindOf(first[1]) === 'url', first[1]);
      ok('…while the checkbox became the status', first[2] === 'complete', first[2]);
    }
  }

  if (runs('portal')) {
    head('Portal lists — composing a URL from the row');
    const header = ['Ticket', 'Summary', 'Priority', 'Assignee', 'State'];
    const row = ['INC0041821', 'Reset MFA for two new starters', 'High', 'Priya Raman', 'Resolved'];
    const t = (tpl, r = row, h = header) => api.applyUrlTemplate(tpl, r, h);
    eq('a placeholders is filled from the row', t('https://portal.example.com/incident/{Ticket}'),
      'https://portal.example.com/incident/INC0041821');
    eq('a value is percent-encoded into a path', t('https://p.example.com/q/{Summary}'),
      'https://p.example.com/q/Reset%20MFA%20for%20two%20new%20starters');
    eq('…and into a query value', t('https://p.example.com/find?q={Summary}&state={State}'),
      'https://p.example.com/find?q=Reset%20MFA%20for%20two%20new%20starters&state=Resolved');
    eq('`|raw` splices a value verbatim', t('https://p.example.com/{Summary|raw}'),
      'https://p.example.com/Reset MFA for two new starters');
    eq('a column can be addressed by position', t('https://p.example.com/{0}'), 'https://p.example.com/INC0041821');
    eq('a field name is matched case-insensitively', t('https://p.example.com/{ticket}'), 'https://p.example.com/INC0041821');
    eq('a constant template needs no placeholders', t('https://portal.example.com/queues/mine'),
      'https://portal.example.com/queues/mine');
    eq('a bare host is assumed to be https', t('portal.example.com/incident/{Ticket}'),
      'https://portal.example.com/incident/INC0041821');
    eq('an empty template composes nothing', t(''), '');
    eq('an unknown column composes nothing (rather than a broken URL)', t('https://p.example.com/{Region}'), '');
    /* An empty key in a path segment produces no link — `/incident/` is a link to
       the wrong page. The same emptiness in a query is harmless. */
    eq('a row with an empty key in the path has no link', t('https://p.example.com/{Ticket}', ['', 'x', 'y', 'z', 'w']), '');
    eq('an empty query value keeps the link', t('https://p.example.com/find?t={Ticket}&tag={Summary}', ['INC1', '', 'H', 'A', 'Open']),
      'https://p.example.com/find?t=INC1&tag=');
    /* The safety gate: a template is not allowed to produce a non-http href. */
    for (const evil of ['javascript:alert({Ticket})', 'data:text/html,{Ticket}', 'file:///{Ticket}', 'vbscript:{Ticket}']) {
      eq(`${JSON.stringify(evil)} produces no link at all`, t(evil), '');
    }
    eq('the placeholders in a template are reported for the UI', api.templateFields('a/{One}/b/{Two|raw}/c/{One}'), ['One', 'Two']);
    eq('a constant template reports none', api.templateFields('https://p.example.com/x'), []);
    /* Validation messages name the real problem, because the editor shows them. */
    ok('a template naming a missing column says which', /Region/.test(api.templateProblem('https://p.example.com/{Region}', header)));
    ok('…and lists the columns that do exist', /Ticket/.test(api.templateProblem('https://p.example.com/{Region}', header)));
    ok('a headerless file is told to use positions', /by position/.test(api.templateProblem('https://p.example.com/{Region}', [])));
    ok('a valid template has no problem', api.templateProblem('https://p.example.com/{Ticket}', header) === null);
    eq('the portal label is its host', api.portalLabel('https://portal.example.com/incident/{Ticket}'), 'portal.example.com');
    ok('…and an unparseable template still yields a label', !!api.portalLabel('not a url at all {') );

    /* End to end, on the real fixture: a link-free queue plus a template is a
       working list of links, and it stays link-free without one. */
    const tickets = (await loadFixture('sample-portal-tickets.csv')).parsed;
    const a = api.analyzeMatrix(tickets.rows);
    const body = tickets.rows.slice(1);
    const composed = body.map(r => api.applyUrlTemplate('https://portal.example.com/incident/{Ticket}', r, tickets.rows[0]));
    ok('every row of a portal list composes a URL', composed.every(u => /^https:\/\/portal\.example\.com\/incident\/[A-Z]+\d+$/.test(u)), composed[0]);
    ok('…and they are all different, because they carry the row key', new Set(composed).size === 10);
    eq('the ticket queue has no link of its own to fall back on', a.linkless, true);
  }

  if (runs('email')) {
    head('Email (.eml / .mht) — a queue that arrives as a message');
    const s = (t) => api.detectFormat(new TextEncoder().encode(t).buffer, 'noext');
    /* Detection: by extension, by content-type, and by shape. */
    eq('.eml is recognized by extension', api.detectFormat(new TextEncoder().encode('x').buffer, 'msg.eml').format, 'eml');
    eq('.mht too, since it is the same MIME container', api.detectFormat(new TextEncoder().encode('x').buffer, 'page.mht').format, 'eml');
    eq('message/rfc822 is recognized by content-type', api.detectFormat(new TextEncoder().encode('x').buffer, 'noext', 'message/rfc822').format, 'eml');
    const headerBlock = 'From: a@example.com\r\nTo: b@example.com\r\nSubject: Queue\r\nDate: Mon, 22 Sep 2026 09:00:00 +0100\r\nMIME-Version: 1.0\r\n\r\nbody\r\n';
    eq('an email with no extension is recognized by its header block', s(headerBlock).format, 'eml');
    ok('…with the reason logged as a content sniff', /content sniff/.test(lastReason()), lastReason());

    /* …and the files it must NOT steal. This is the risk of sniffing mail: a
       header block is just `Name: value`, which is also a plausible data row. */
    eq('a CSV whose columns are From and To is still CSV', s('From,To,Subject\n a@example.com,b@example.com,Hello\n').format, 'csv');
    eq('a CSV with a colon in the first field is still CSV', s('From: x,Subject: y\nbody\n').format, 'csv');
    eq('one header line and no blank line is not an email', s('Subject: hello\nmore text\n').format, 'csv');
    eq('a lone header line is not an email', s('Subject: hi\r\n\r\nbody\r\n').format, 'csv');
    eq('markdown is still markdown', s('- [ ] One — https://a.example\n').format, 'md');
    eq('JSON is still JSON', s('{"from":"a@example.com"}\n').format, 'json');
    ok('the header-block test needs two known fields', api.looksLikeEml('Subject: hi\r\nFrom: a@b.com\r\n\r\nbody') === true);
    ok('…refuses a block that never ends', api.looksLikeEml('Subject: hi\r\nFrom: a@b.com\r\n') === false);
    ok('…and refuses two header-ish lines with nothing after them', api.looksLikeEml('Subject: hi\r\nFrom: a@b.com\r\n\r\n') === false);

    /* The MIME layer: walking the boundary tree, and decoding what is inside. */
    /* The boundary walker directly, on a body with two parts and a terminator: the
       CRLF before each `--boundary` belongs to the delimiter, and the closing
       `--boundary--` ends the list. Getting either wrong silently drops a part. */
    const bodyParts = api.splitMimeParts('preamble\r\n--BOUND\r\nfirst part\r\n--BOUND\r\nsecond part\r\n--BOUND--\r\ntrailing junk', 'BOUND');
    eq('a multipart body splits into its parts', bodyParts.length, 2);
    eq('…keeping the first part intact', bodyParts[0], 'first part');
    eq('…and the second, without the terminator', bodyParts[1], 'second part');
    /* The preamble is not a part, and nothing after the terminator is either — so
       a mail client's "This is a multi-part message in MIME format." never becomes
       a row, and neither does anything a broken sender appends. */
    eq('the preamble is not a part', api.splitMimeParts('preamble\r\n--B\r\nonly\r\n--B--\r\n', 'B').length, 1);
    eq('nothing after the terminator is a part',
      api.splitMimeParts('--B\r\none\r\n--B--\r\njunk\r\n--B\r\ntwo\r\n--B--\r\n', 'B').length, 1);
    eq('a boundary that never closes still yields what it has', api.splitMimeParts('--B\r\na', 'B').length, 1);

    const fields = api.mimeHeaderFields('Subject: a very long\r\n subject line\r\nX-Priority: 1\r\n');
    eq('a folded header is rejoined', fields.get('subject'), 'a very long subject line');
    eq('…and each field is kept separately', fields.get('x-priority'), '1');

    /* Quoted-printable and charsets — the two things that quietly corrupt a body. */
    eq('quoted-printable escapes are decoded', api.decodeQuotedPrintable('Price =3D 45'), 'Price = 45');
    eq('…a soft line break is removed', api.decodeQuotedPrintable('one=\r\ntwo'), 'onetwo');
    /* Decoding is two steps on purpose: quoted-printable yields *bytes*, and the
       charset decides what those bytes say. `caf=C3=A9` is only café after both. */
    eq('…and multi-byte sequences survive both steps', api.charsetDecode(api.decodeQuotedPrintable('caf=C3=A9'), 'utf-8'), 'café');
    /* A byte above 0x7F must come back as exactly one character, whatever it is.
       What it *is* depends on the engine: this is the one place Node and a browser
       genuinely disagree — Node's `windows-1252` decoder returns U+0092 for the
       byte a browser returns U+2019 for (a right single quote, which is what
       Outlook means by it). So the suite asserts the byte survives the round trip,
       and the browser sweep asserts the quote. */
    eq('…a high byte survives as one character', [...api.charsetDecode('\u0092', 'windows-1252')].length, 1);
    eq('…and as a byte, not a replacement character', api.charsetDecode('\u0092', 'windows-1252').codePointAt(0) !== 0xFFFD, true);
    eq('…with no byte dropped from a mixed latin-1 body', api.charsetDecode('caf\u00e9 — £45', 'latin1').length, 10);
    eq('an unknown charset falls back to UTF-8 rather than throwing', api.charsetDecode('ok', 'x-nonsense'), 'ok');

    /* The valuable case: the list is not in the body at all, it is attached. */
    const attached = await loadFixture('sample-queue-email.eml');
    eq('an email whose body is prose and whose payload is attached', attached.det.format, 'eml');
    eq('…takes the list from the attachment, not the prose', attached.seen.rows, 11);
    eq('…with the attachment\'s own columns', attached.seen.width, 6);
    ok('…and the reason names the attachment', /attachment approvals\.csv/.test(attached.parsed.from), attached.parsed.from);
    eq('…and it is a portal list, like the sheet it came from', api.analyzeMatrix(attached.parsed.rows).linkless, true);

    /* A body that is prose is refused, however comma-shaped it looks. */
    const prose = 'From: a@example.com\r\nTo: b@example.com\r\nSubject: Lunch\r\nMIME-Version: 1.0\r\n\r\n'
      + 'Hi,\r\n\r\nShall we do Thursday instead? I can do any time after two, and I will\r\n'
      + 'book somewhere near the office if that suits. Let me know.\r\n\r\nThanks,\r\nSam\r\n';
    let proseErr = '';
    try { await api.parseDetected(new TextEncoder().encode(prose).buffer, { format: 'eml' }); }
    catch (e) { proseErr = e.message; }
    ok('an email of prose is refused with a reason, not read as a list', /no list in this email/.test(proseErr), proseErr);
    let emptyErr = '';
    try { await api.parseDetected(new TextEncoder().encode('From: a@b.com\r\nTo: c@d.com\r\n\r\n').buffer, { format: 'eml' }); }
    catch (e) { emptyErr = e.message; }
    ok('an empty email is refused with a reason', /no list in this email/.test(emptyErr), emptyErr);
  }

  if (runs('workspace links')) {
    head('Workspace links — a whole list carried inside a URL');
    const frag = (url) => url.slice(url.indexOf('#') + 1);
    const utf8 = (s) => new TextEncoder().encode(s);
    const throws = async (fn) => { try { await fn(); return ''; } catch (e) { return e.message; } };

    /* --- base64url: the alphabet has to survive a URL, a Markdown renderer and a
       copy-paste, which is why `-`/`_` are used and padding is dropped. ---------- */
    const bytes = new Uint8Array([0, 1, 2, 127, 128, 250, 251, 252, 253, 254, 255]);
    const b64 = api.bytesToBase64Url(bytes);
    ok('base64url uses only the URL-safe alphabet', /^[A-Za-z0-9_-]+$/.test(b64), b64);
    ok('…with no `=` padding to get mangled in transit', !b64.includes('='), b64);
    eq('base64url round-trips arbitrary bytes', Array.from(api.base64UrlToBytes(b64)), Array.from(bytes));
    /* Lenient on the way in, because `+` and `/` DO survive a lot of transports and a
       link that will not open over one character is worse than one that is lenient. */
    eq('the standard alphabet is accepted if something normalised it',
      Array.from(api.base64UrlToBytes(b64.replace(/-/g, '+').replace(/_/g, '/'))), Array.from(bytes));
    eq('…and so is padding', Array.from(api.base64UrlToBytes(b64 + '=')), Array.from(bytes));

    /* --- deflate-raw through the platform streams, no library ------------- */
    const long = 'Ticket,Summary,Priority,Assignee,State\n' + 'INC0041821,Reset MFA for two new starters,High,Priya Raman,Resolved\n'.repeat(400);
    const deflated = await api.deflateRawBytes(utf8(long));
    ok('deflate-raw genuinely shrinks a list', deflated.length < long.length / 5, `${deflated.length} vs ${long.length} bytes`);
    eq('…and inflates back byte-for-byte', new TextDecoder().decode(await api.inflateRawBytes(deflated)), long);

    /* --- where the parameters come from ---------------------------------- */
    eq('parameters are read from the query string', api.inlineParamsFrom('?file=q.csv&link=https://p/{T}', '').file, 'q.csv');
    eq('…and from the fragment', api.inlineParamsFrom('', '#data=a%2Cb').data, 'a,b');
    eq('the fragment wins when both name the same parameter', api.inlineParamsFrom('?data=fromquery', '#data=fromhash').data, 'fromhash');
    eq('a leading `?` or `#` is optional either way', api.inlineParamsFrom('link=x', '#open=1').open, '1');
    eq('an empty URL yields nothing rather than throwing', Object.keys(api.inlineParamsFrom('', '')).length, 0);
    eq('unrelated hash content is not mistaken for a list', api.inlineParamsFrom('', '#section-3').data, undefined);

    /* --- decoding -------------------------------------------------------- */
    eq('a plain payload comes back as text', (await api.decodeInlineList({ data: 'a,b\n1,2' })).text, 'a,b\n1,2');
    eq('…and reports how it was encoded', (await api.decodeInlineList({ data: 'x' })).encoding, 'data');
    eq('a compressed payload is inflated', (await api.decodeInlineList({ zdata: api.bytesToBase64Url(deflated) })).text, long);
    eq('…and reports that instead', (await api.decodeInlineList({ zdata: api.bytesToBase64Url(deflated) })).encoding, 'zdata');
    ok('the compressed form is what makes a long list fit in a URL',
      api.bytesToBase64Url(deflated).length < encodeURIComponent(long).length / 5,
      `${api.bytesToBase64Url(deflated).length} vs ${encodeURIComponent(long).length} chars`);

    /* --- and the ways it must fail: all of them say something actionable -- */
    ok('a link with no payload at all is refused', /no list/.test(await throws(() => api.decodeInlineList({}))));
    ok('a payload mangled to invalid base64 blames truncation',
      /truncated/.test(await throws(() => api.decodeInlineList({ zdata: '!!!not+base64!!!' }))));
    /* The engine's own wording for a broken stream is "Failed to fetch" (a Response
       whose body stream errored) or "unexpected end of file" — neither means
       anything to the person holding the link, so we say what actually happened. */
    const brokenStream = await throws(() => api.decodeInlineList({ zdata: api.bytesToBase64Url(utf8('this is not deflate data at all')) }));
    ok('valid base64 that is not a deflate stream explains itself',
      /could not be unpacked/.test(brokenStream) && /ask for it to be sent again/.test(brokenStream), brokenStream);
    ok('…and never leaks the engine\'s own wording',
      !/Failed to fetch|unexpected end of file/i.test(brokenStream), brokenStream);
    ok('a payload past the cap is refused by name, not by hanging',
      /too much for a URL/.test(await throws(() => api.decodeInlineList({ data: 'a'.repeat(api.INLINE_MAX_BYTES + 16) }))));

    /* --- building: which encoding, and does it come back? ---------------- */
    const shortList = 'Name,URL\nApple Newsroom,https://www.apple.com/newsroom/';
    const tiny = await api.buildInlineLink(shortList);
    eq('a tiny list stays plain — on ten rows the deflate header costs more than it saves', tiny.encoding, 'data');
    ok('a built link uses the fragment, never the query string', tiny.url.includes('#data=') && !tiny.url.includes('?'), tiny.url);
    const big = await api.buildInlineLink(long);
    eq('a long list is compressed', big.encoding, 'zdata');
    ok('…and the whole link is smaller than the plain form would have been',
      big.url.length < `https://example.test/turnstone/app.html#data=${encodeURIComponent(long)}`.length,
      `${big.url.length} vs ${`https://example.test/turnstone/app.html#data=${encodeURIComponent(long)}`.length}`);
    for (const [built, want, what] of [[tiny, shortList, 'plain'], [big, long, 'compressed']]) {
      const back = await api.decodeInlineList(api.inlineParamsFrom('', frag(built.url)));
      eq(`${what}: a built link decodes back to the same list`, back.text, want);
    }

    /* A portal queue is the interesting share: a link-free list *plus* the address
       its rows are worked at, in one URL. */
    const tpl = 'https://portal.example.com/incident/{Ticket}';
    const withTpl = await api.buildInlineLink(shortList, { params: { link: tpl, name: 'Q3 approvals' } });
    const p2 = api.inlineParamsFrom('', frag(withTpl.url));
    eq('a portal template rides along in the same link', p2.link, tpl);
    eq('…as does a workspace name', p2.name, 'Q3 approvals');
    eq('…and the list is still intact beside them', (await api.decodeInlineList(p2)).text, shortList);

    /* Percent-encoding is where a link like this actually breaks, so the adversarial
       case is the test that matters: `#` would end the fragment early in a lax parser,
       `&` would split the payload, `+` becomes a space under form decoding, and every
       non-ASCII character has to survive three encodings in a row. */
    const nasty = 'Name,URL,Notes\nAmpersand & hash #,https://example.com/a?b=1&c=2#frag,"A note with, a comma and ""quotes"""\nEm—dash…,https://example.com/…,Ünïcödé ✓ 37.5% 中文';
    const nb = await api.buildInlineLink(nasty);
    eq('a list full of URL-hostile characters survives intact',
      (await api.decodeInlineList(api.inlineParamsFrom('', frag(nb.url)))).text, nasty);
    ok('…including the `#` that would otherwise end the fragment',
      !frag(nb.url).slice(frag(nb.url).indexOf('=') + 1).includes('#'), frag(nb.url));

    /* --- integrity: the one failure that would otherwise be silent ---------
       A deflate stream cut at a block boundary inflates without error, so a link
       that lost its tail can decode to a shorter list that looks entirely
       plausible. No other failure mode here behaves that way, and a silently short
       queue is the worst thing this app could hand someone — so the link carries a
       length and checksum, and both directions are tested. */
    const sum = (t) => api.inlineDigest(new TextEncoder().encode(t));
    eq('a built link carries a checksum', api.inlineParamsFrom('', frag(tiny.url)).sum, sum(shortList));
    eq('…and decoding a good link reports it as verified',
      (await api.decodeInlineList(api.inlineParamsFrom('', frag(tiny.url)))).verified, true);
    eq('a link with no checksum is still opened — a hand-written one cannot have one',
      (await api.decodeInlineList({ data: 'a,b' })).verified, false);
    ok('a checksum that disagrees is refused rather than ignored',
      /not what was sent/.test(await throws(() => api.decodeInlineList({ data: 'a,b\n1,2', sum: 'zz.zz' }))));
    ok('…including when only the length differs',
      /not what was sent/.test(await throws(() => api.decodeInlineList({ data: 'a,b\n1,2', sum: `1.${sum('a,b\n1,2').split('.')[1]}` }))));

    /* The sweep: cut a compressed link at nineteen points and assert that not one
       of them yields a *different* list quietly. Each attempt may be refused or may
       come back byte-identical (a cut inside the final block can be lossless), but
       nothing in between is allowed to get through. */
    const bulk = 'Ticket,Summary,State,Owner\n'
      + 'INC0041821,Reset MFA for two new starters in the finance team,Resolved,Priya Raman\n'.repeat(4000);
    const bulkLink = await api.buildInlineLink(bulk);
    eq('a 4000-row list still compresses (this is the case the digest protects)', bulkLink.encoding, 'zdata');
    const bulkParams = api.inlineParamsFrom('', frag(bulkLink.url));
    let refused = 0, identical = 0, wrong = 0;
    for (let i = 1; i < 20; i++) {
      const cut = bulkParams.zdata.slice(0, Math.floor(bulkParams.zdata.length * i / 20));
      try {
        const r = await api.decodeInlineList({ zdata: cut, sum: bulkParams.sum });
        if (r.text === bulk) identical++; else wrong++;
      } catch (e) { refused++; }
    }
    eq('no cut of a compressed link loads a different list quietly', wrong, 0);
    eq('…every cut was either refused or came back byte-identical', refused + identical, 19);
    ok('…and the whole link is still a small fraction of the list it carries',
      bulkLink.url.length < bulk.length / 4, `${bulkLink.url.length} vs ${bulk.length} chars`);

    /* Past the warn threshold a link is still built — the caller is told it may not
       survive a chat client, which is advisory, not a refusal. */
    ok('a large list warns instead of refusing',
      /trim links this long/.test((await api.buildInlineLink('x'.repeat(api.INLINE_WARN_BYTES + 10))).warning));
    eq('…and a modest one says nothing at all', (await api.buildInlineLink(shortList)).warning, '');

    /* The end-to-end claim in one assertion per fixture: whatever is on disk can be
       carried in a URL and come back byte-for-byte. Eleven files, eleven encodings
       of the same queue plus the shapes a real one arrives as. */
    const CARRIABLE = [
      'sample-links.csv', 'sample-links.tsv', 'sample-links.json', 'sample-links.xml',
      'sample-links.html', 'sample-links.md', 'sample-links-table.md',
      'sample-links-email.csv', 'sample-links-phone.csv',
      'sample-portal-tickets.csv', 'sample-portal-triage.tsv', 'sample-meeting-actions.md',
    ];
    for (const name of CARRIABLE) {
      const text = decode(name);
      const built = await api.buildInlineLink(text);
      const back = await api.decodeInlineList(api.inlineParamsFrom('', frag(built.url)));
      eq(`${name}: carried in a URL and returned byte-for-byte (${built.encoding})`, back.text, text);
    }
  }

  if (runs('workbooks')) {
    head('Workbook containers with no committed fixture (xls / xlsm / xlsb / ods)');
    /* Generated from the CSV fixture on the fly with the same SheetJS the app uses,
       so the legacy, macro, binary and OpenDocument containers are all covered
       without four more binaries in the repo root. */
    const csvRows = (await api.parseDetected(asBuffer('sample-links.csv'), api.detectFormat(asBuffer('sample-links.csv'), 'sample-links.csv'))).rows;
    const wb = api.HAS_XLSX_WRITE ? require(path.join(ROOT, 'vendor/xlsx.full.min.js')) : null;
    ok('SheetJS can write, so the containers can be generated', typeof wb.write === 'function');
    for (const [bookType, ext, expect] of [
      ['xlsx', 'xlsx', 'xlsx'], ['xlsm', 'xlsm', 'xlsm'], ['xlsb', 'xlsb', 'xlsb'],
      ['xls', 'xls', 'xls'], ['ods', 'ods', 'ods'],
    ]) {
      let bytes;
      try {
        const fresh = wb.utils.book_new();
        wb.utils.book_append_sheet(fresh, wb.utils.aoa_to_sheet(csvRows), 'Links');
        bytes = wb.write(fresh, { bookType, type: 'array' });
      } catch (e) { skip(`${ext} container`, `SheetJS cannot write ${bookType}: ${e.message}`); continue; }
      const buf = bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes).buffer;
      const name = `generated.${ext}`;
      const det = api.detectFormat(buf, name);
      ok(`${name}: detected as ${expect}`, det.format === expect, `got ${det.format}`);
      const parsed = await api.parseDetected(buf, det);
      eq(`${name}: lands the shared target`, inspect(parsed.rows, api.analyzeMatrix(parsed.rows)), SHARED);
    }
  }

  if (runs('docx')) {
    head('DOCX container (the part that needs no DOM)');
    const buf = asBuffer('sample-links.docx');
    const entries = api.zipEntries(buf);
    ok('the container lists its parts', entries.size >= 3, `${entries.size} entries`);
    for (const part of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml']) {
      ok(`${part} is present`, entries.has(part));
    }
    const xml = await api.zipEntryText(buf, entries.get('word/document.xml'));
    ok('word/document.xml inflates to XML', /^<\?xml/.test(xml.trim()), xml.slice(0, 60));
    for (const needle of ['Apple Newsroom', 'Wikipedia Portal', 'Blocked in iframes']) {
      ok(`the document carries ${JSON.stringify(needle)}`, xml.includes(needle));
    }
    /* The fixture deliberately splits one URL across two runs; the DOM step joins
       them (browser harness), but the split has to actually be there to matter. */
    ok('the fixture really does split a value across two runs',
      xml.includes('<w:t xml:space="preserve">https://www.</w:t>') && xml.includes('<w:t xml:space="preserve">bbc.com/</w:t>'));
    ok('a Word file is detected from the ZIP member list, not the extension',
      api.detectFormat(buf, 'renamed.xlsx').format === 'docx');
    ok('and from no extension at all', api.detectFormat(buf, 'mystery.bin').format === 'docx');

    let threw = '';
    try { api.zipEntries(new TextEncoder().encode('not a zip').buffer); } catch (e) { threw = e.message; }
    ok('a non-ZIP is refused with a reason', /not a ZIP container/.test(threw), threw);
  }

  if (runs('sniff')) {
    head('Format sniffing — and the files it must not steal');
    const s = (t) => api.detectFormat(new TextEncoder().encode(t).buffer, 'noext');
    eq('a task list is markdown', s('- [ ] One — https://a.example\n').format, 'md');
    eq('a pipe table is markdown', s('| a | b |\n| --- | --- |\n| 1 | 2 |\n').format, 'md');
    eq('JSON is still JSON', s('[{"url":"https://a.example"}]\n').format, 'json');
    eq('HTML is still HTML', s('<!doctype html><table><tr><td>x</td></tr></table>\n').format, 'html');
    eq('XML is still XML', s('<?xml version="1.0"?><rss><item><link>https://a.example</link></item></rss>\n').format, 'xml');
    /* The two that matter most: neither may be claimed by markdown. */
    eq('a bullet list of URLs is NOT markdown', s('- https://a.example\n- https://b.example\n').format, 'csv');
    eq('one URL per line is NOT markdown', s('https://a.example\nhttps://b.example\n').format, 'csv');
    eq('a CSV is NOT markdown', s('Name,URL\nOne,https://a.example\n').format, 'csv');
    eq('a fenced task list is NOT a markdown signal', s('```\n- [ ] https://a.example\n```\n').format, 'csv');

    head('Hints the content cannot settle');
    const plain = new TextEncoder().encode('# Notes\n\nhttps://a.example\n').buffer;
    eq('an undecisive .md resolves by extension', api.detectFormat(plain, 'list.md').format, 'md');
    eq('…or by content type', api.detectFormat(plain, 'list', 'text/markdown').format, 'md');
    eq('.markdown / .mdown / .mkd all resolve', ['a.markdown', 'a.mdown', 'a.mkd'].map(n => api.detectFormat(plain, n).format), ['md', 'md', 'md']);
    eq('a .txt list of URLs stays delimited', api.detectFormat(new TextEncoder().encode('- https://a.example\n').buffer, 'list.txt').format, 'csv');
    /* A ZIP with no workbook and no Word part can only be trusted to its extension. */
    /* Content outranks the extension: a workbook renamed .csv is still a workbook. */
    eq('the ZIP magic outranks a wrong extension', api.detectFormat(asBuffer('sample-links.xlsx'), 'mislabelled.csv').format, 'xlsx');
    ok('…and says so in the log', /magic PK.*ZIP container/.test(lastReason()), lastReason());
    eq('a Word file is not stolen by a .csv name either', api.detectFormat(asBuffer('sample-links.docx'), 'mislabelled.csv').format, 'docx');
  }

  if (runs('markdown')) {
    head('Markdown — the shipped fixtures, both shapes');
    const task = api.parseMarkdownText(decode('sample-links.md'));
    eq('the task list is the CSV shape', task[0], ['Name', 'URL', 'Status', 'Notes']);
    eq('…with the CSV rows', task.length, 11);
    eq('…and the CSV values', task[1], ['Apple Newsroom', 'https://www.apple.com/newsroom/', 'incomplete', 'Q3 earnings page']);
    eq('a note keeps its own em dash', task[7][3], 'Blocked in iframes — use ↗');
    eq('blank cells stay blank', task[2], ['BBC Homepage', 'https://www.bbc.com/', 'complete', '']);
    const table = api.parseMarkdownText(decode('sample-links-table.md'));
    eq('the pipe table is the same shape', table[0], ['Name', 'URL', 'Status', 'Notes']);
    eq('…and the same rows', inspect(table, api.analyzeMatrix(table)), SHARED);

    head('Markdown — the shapes and the traps');
    const shapes = {
      'a bare URL list collapses to one column': [api.parseMarkdownText('- https://a.example\n- https://b.example\n'), [['URL'], ['https://a.example'], ['https://b.example']]],
      'a labelled link list leads with the label': [api.parseMarkdownText('- [Alpha](https://a.example/x)\n'), [['Name', 'URL'], ['Alpha', 'https://a.example/x']]],
      'a task with no link is still a task': [api.parseMarkdownText('- [ ] Buy milk\n'), [['Name', 'Status'], ['Buy milk', 'incomplete']]],
      'decoration is stripped': [api.parseMarkdownText('- [ ] **Bold** — <https://a.example> — `code` note\n'), [['Name', 'URL', 'Status', 'Notes'], ['Bold', 'https://a.example', 'incomplete', 'code note']]],
      'a bracketed link leaves no stray bracket': [api.parseMarkdownText('- [ ] Read the brief (https://brief.example/x)\n'), [['Name', 'URL', 'Status'], ['Read the brief', 'https://brief.example/x', 'incomplete']]],
      'an empty column is not invented': [api.parseMarkdownText('- [ ] One\n- [ ] Two\n'), [['Name', 'Status'], ['One', 'incomplete'], ['Two', 'incomplete']]],
      'numbered items work': [api.parseMarkdownText('1. [ ] One — https://a.example\n'), [['Name', 'URL', 'Status'], ['One', 'https://a.example', 'incomplete']]],
      'escaped pipes survive in a table cell': [api.parseMarkdownText('| A | B |\n| --- | --- |\n| x | https://b.example/a\\|b |\n'), [['A', 'B'], ['x', 'https://b.example/a|b']]],
      'alignment colons are tolerated': [api.parseMarkdownText('| A | B |\n| :--- | ---: |\n| 1 | 2 |\n'), [['A', 'B'], ['1', '2']]],
    };
    for (const [name, [got, want]] of Object.entries(shapes)) eq(name, got, want);

    head('Markdown — a number keeps its spaces');
    /* The bug the test caught: matching "non-whitespace after tel:" captured `tel:+1`
       and left `(555) 987-6543` in the note. */
    const phone = api.parseMarkdownText('- [x] Ring Bob — tel:+1 (555) 987-6543\n');
    eq('a tel: value arrives whole', phone[1][1], '+1 (555) 987-6543');
    eq('…and is still a phone number downstream', api.linkKindOf(phone[1][1]), 'phone');
    eq('an sms: body is not mistaken for a note', api.parseMarkdownText('- [ ] Text Ada — sms:+15551234567?body=Hi\n')[1][1], '+15551234567');
    eq('a mailto: query is dropped', api.parseMarkdownText('- [ ] Email Ada — mailto:ada@example.com?subject=Hi\n')[1][1], 'ada@example.com');
    eq('a bare address is a link, not text', api.parseMarkdownText('- [ ] Email Ada — ada@example.com\n')[1][1], 'ada@example.com');
    eq('…and links the same way in a table', api.linkKindOf(api.parseMarkdownText('| N |\n| --- |\n| ada@example.com |\n')[1][0]), 'email');

    head('Markdown — what must never be imported');
    eq('prose outside a list is ignored when a list exists',
      api.parseMarkdownText('See [this](https://no.example/prose).\n\n- [ ] Real — https://yes.example\n').length, 2);
    eq('fenced code is ignored', api.parseMarkdownText('```\n- [ ] Nope — https://no.example\n```\n\n- [ ] Yes — https://yes.example\n').length, 2);
    eq('headings are not rows', api.parseMarkdownText('# Heading\n\n- [ ] Yes — https://yes.example\n').length, 2);
    let threw = '';
    try { api.parseMarkdownText('# Only prose\n\nSome words, no links.\n'); } catch (e) { threw = e.message; }
    ok('a document with nothing to queue fails loudly', /nothing to queue/.test(threw), threw);
  }

  if (runs('values')) {
    head('Value detection — what counts as a link');
    ok('a scheme is a URL', api.isUrlValue('https://a.example'));
    ok('a bare domain is a URL', api.isUrlValue('example.com'));
    ok('a file name is not', !api.isUrlValue('setup.exe') && !api.isUrlValue('notes.txt'));
    ok('a plain address', api.isEmailValue('ada@example.com'));
    ok('…but not a numeric TLD', !api.isEmailValue('ada@example.12'));
    ok('a dashed number', api.isPhoneValue('555-123-4567'));
    ok('a formatted international number', api.isPhoneValue('+1 (555) 123-4567'));
    ok('a date is not a phone number', !api.isPhoneValue('2024-05-12') && !api.isPhoneValue('2024.05.12'));
    ok('a quantity is not a phone number', !api.isPhoneValue('1200'));
    ok('too few digits is not a phone number', !api.isPhoneValue('12345'));
    eq('kinds', ['https://a.example', 'ada@example.com', '555-123-4567', 'nope'].map(api.linkKindOf), ['url', 'email', 'phone', null]);
    eq('hrefs', ['ada@example.com', '+1 (555) 123-4567', 'https://a.example'].map(api.linkHrefOf),
      ['mailto:ada@example.com', 'tel:+15551234567', 'https://a.example']);
  }

  if (runs('analysis')) {
    head('Link-column choice — by value, never by header name');
    const A = (rows) => api.analyzeMatrix(rows);
    let a = A([['Company', 'Contact', 'Site'], ['Acme', 'ada@acme.com', 'https://acme.com'], ['Beta', 'bob@beta.io', 'https://beta.io']]);
    eq('a website outranks an address', [a.urlCol, a.nameCol], [2, 0]);
    a = A([['Company', 'Contact', 'Notes'], ['Acme', 'ada@acme.com', 'called'], ['Beta', 'bob@beta.io', '']]);
    eq('an address-only list still gets a link column', a.urlCol, 1);
    a = A([['Company', 'Phone'], ['Acme', '555-123-4567'], ['Beta', '+1 555 987 6543']]);
    eq('so does a phone-only list', a.urlCol, 1);
    a = A([['Task', 'URL', 'Notes'], ['One', 'https://one.example', 'see https://a.example and https://b.example'], ['Two', 'https://two.example', 'https://c.example']]);
    eq('a notes column full of links never outbids the link column', a.urlCol, 1);
    a = A([['Name', 'Due', 'Phone'], ['One', '2024-05-12', '555-123-4567'], ['Two', '2024-06-01', '555-987-6543']]);
    eq('dates do not become phone links', a.urlCol, 2);
    a = A([['ada@acme.com', 'Acme'], ['bob@beta.io', 'Beta']]);
    eq('a headerless address list', [a.hasHeader, a.urlCol], [false, 0]);
  }

  if (runs('refusals')) {
    head('Formats the app refuses on purpose, with the reason');
    const expectThrow = async (name, buf, re) => {
      let msg = '';
      try { await api.parseDetected(buf, api.detectFormat(buf, name)); } catch (e) { msg = e.message; }
      ok(`${name} is refused with a reason`, re.test(msg), msg || '(no error thrown)');
    };
    await expectThrow('a PDF', new TextEncoder().encode('%PDF-1.4 something').buffer, /PDF is not supported yet/);
    await expectThrow('legacy .doc', (() => {
      const b = new Uint8Array(1200);
      b.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 0);
      const n = 'WordDocument';
      for (let i = 0; i < n.length; i++) b[512 + i * 2] = n.charCodeAt(i);
      return b.buffer;
    })(), /Legacy \.doc .* is not supported/);
    /* OLE2 without the Word stream is still a workbook, not a Word file. */
    const xls = new Uint8Array(1200);
    xls.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 0);
    eq('OLE2 without a WordDocument stream is read as a legacy workbook',
      api.detectFormat(xls.buffer, 'old.xls').format, 'xls');
  }

  if (runs('layers')) {
    head('The embedded layers — what the app promises them, and what they promise us');
    /* PhoneLayer documents per-trigger theme + colour overrides; MailLayer takes no
       per-trigger options at all. The pair is vendored together under one
       `HAS_LAYERS`, so this is the whole coupling surface and it is cheap to pin. */
    const phone = api.layerAnchorAttrs('phone');
    ok('a phone link is stamped with PhoneLayer\'s theme',
      new RegExp(`data-phonelayer-theme="${api.currentTheme()}"`).test(phone), phone);
    ok('…and an accent from the app\'s own palette',
      phone.includes(`data-phonelayer-color="${api.LAYER_ACCENT[api.currentTheme()]}"`), phone);
    ok('an email link is stamped with nothing (MailLayer has no per-link options)',
      api.layerAnchorAttrs('email') === '' && api.layerAnchorAttrs('url') === '');

    const app = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
    ok('addresses and numbers in any column are links, not just the link column',
      app.includes('a.cell-link') && /const kind = c === state\.urlCol \? null : linkKindOf\(raw\)/.test(app));
  }

  if (runs('site')) {
    head('The site — crawl files, structured data, and the graph an agent walks');
    /* None of this is visible in a browser, which is exactly why it needs asserting:
       a page missing from the sitemap, a markdown twin that was advertised but never
       written, or a JSON-LD block with a stray comma all fail silently for a person
       and completely for a machine. assets/build-site.js owns those checks and runs
       them on itself — so running it here is the whole test. */
    const site = require(path.join(ROOT, 'assets/build-site.js'));
    let siteOut = '';
    let siteOk = true;
    try {
      siteOut = execSync('node assets/build-site.js --check', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      siteOk = false;
      siteOut = `${e.stdout || ''}${e.stderr || ''}`;
    }
    ok('sitemap.xml, robots.txt and every agent-facing link check out', siteOk,
      siteOut.trim().split('\n').slice(-5).join('\n          '));

    /* The social card: referenced by two pages, rendered by nobody browsing the site. */
    const card = fs.readFileSync(path.join(ROOT, 'assets/og-image.png'));
    ok('the social card is a real PNG',
      card.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
    eq('…at the 1200×630 every platform crops to', [card.readUInt32BE(16), card.readUInt32BE(20)], [1200, 630]);
    ok('…and is small enough to be fetched by a link preview', card.length < 300 * 1024, `${Math.round(card.length / 1024)} KB`);

    /* Canonicals must be unique. Two pages claiming the same URL is the one way a
       canonical tag does active harm, and it is what happens when a generated file is
       copied from its source without rewriting the head — which is how it nearly
       happened here. */
    const sitePages = site.pages();
    const canon = new Map();
    for (const p of sitePages) {
      const m = decode(p.file).match(/<link rel="canonical" href="([^"]+)"/);
      if (!m) { ok(`${p.file} declares a canonical URL`, false); continue; }
      if (canon.has(m[1])) ok(`…and ${p.file} does not claim the same URL as ${canon.get(m[1])}`, false, m[1]);
      canon.set(m[1], p.file);
    }
    eq('every page declares its own canonical URL', canon.size, sitePages.length);
    eq('…and the fixture page is not one of them', sitePages.some((p) => p.file === 'sample-links.html'), false);
    eq('the standalone build claims its own URL, not app.html\'s',
      canon.get('https://spuds0588.github.io/Turnstone/turnstone-standalone.html'), 'turnstone-standalone.html');

    /* Sharing a link into a chat app is the one moment a page has to look like a
       product rather than a URL, which is entirely og/twitter metadata. */
    const home = decode('index.html');
    ok('the landing page declares a social image',
      /property="og:image" content="https:\/\/[^"]+\.png"/.test(home) && /name="twitter:image"/.test(home));
    ok('…and a large-image card, so it is not rendered as a thumbnail',
      /name="twitter:card" content="summary_large_image"/.test(home));

    /* The bookmarklet runs on somebody else's page, so the host page's own URL must
       never be read as ours — neither its query string nor its fragment. The build
       refuses to produce a payload that does, and this says so independently. */
    for (const v of ['csv', 'core', 'full']) {
      const payload = decode(`ports/bookmarklet/dist/turnstone-bookmarklet-${v}.txt`);
      ok(`the ${v} bookmarklet never reads the host page's URL`,
        !/location\.(search|hash)/.test(payload), (/location\.(search|hash)/.exec(payload) || [''])[0]);
      ok(`…and builds a share link that points at the hosted app, not the host page`,
        payload.includes('https://spuds0588.github.io/Turnstone/app.html'));
    }

    /* The builder the workspace-link page embeds has to be the builder that exists. */
    ok('the workspace-link page embeds the real builder',
      /<iframe src="app\.html\?build=1"/.test(decode('workspace-link.html')));

    /* The one thing an agent genuinely cannot do here is work a browser side panel, and
       the versions page is where somebody would go to find that out. A claim that
       quietly disappears from a page is the kind of regression no browser shows you. */
    const versions = decode('versions.html');
    ok('the versions page says an agent cannot drive the extension',
      /Agents, and what each edition can be handed/.test(versions) && /Drive the panel/.test(versions),
      'the agent table is on the page');
    ok('…and that a file is what it can be handed instead',
      /A data or spreadsheet file/.test(versions));
    ok('…and the extension page says the same thing in its own words',
      /Be driven by an AI agent/.test(decode('extension.html')));
    ok('…and llms.txt sends an agent to the right edition',
      /file-based/.test(decode('llms.txt')) && /Do not try to drive the extension/.test(decode('llms.txt')));

    /* Every executable inline script in the app parses. The slice at the top of this
       file proves the *format layer* parses, but the boot code and the interface live
       outside it, and a syntax error there is a blank page — so it is worth one cheap
       assertion here. `application/ld+json` blocks are skipped: they are data, the
       browser never executes them, and feeding one to a JS parser fails on the
       quotation marks alone. */
    const exec = [...decode('app.html').matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter(([, attrs]) => !/\bsrc=/.test(attrs) && !/type="application\/ld\+json"/.test(attrs));
    let parseError = '';
    for (const [, , code] of exec) {
      try { new Function(code); } catch (e) { parseError = e.message; }
    }
    ok(`all ${exec.length} executable inline script(s) in app.html parse`, !parseError, parseError);
    ok('…and the JSON-LD blocks were skipped rather than counted', exec.length === 3, `found ${exec.length}`);
  }

  if (runs('vendor')) {
    head('Vendoring — pinned bytes, one copy per artifact, and no CDN anywhere');
    const { execFileSync } = require('child_process');
    const crypto = require('crypto');
    const app = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
    const vendorDoc = decode('vendor/README.md');
    const VENDORED = ['papaparse.min.js', 'xlsx.full.min.js', 'maillayer.js', 'phonelayer.js'];
    const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
    for (const f of VENDORED) {
      const h = sha(path.join('vendor', f));
      ok(`vendor/${f} matches the hash recorded in vendor/README.md`, vendorDoc.includes(h), h);
      execFileSync(process.execPath, ['--check', path.join(ROOT, 'vendor', f)]);   // throws on a syntax error
    }
    ok('vendor/README.md still records all four hashes separately',
      new Set(VENDORED.map(f => sha(path.join('vendor', f)))).size === 4);

    /* The extension packages its own copies; a rebuild that forgets one would ship
       a panel whose find/replace-mail links do nothing. */
    for (const f of VENDORED) {
      const dist = path.join('ports/extension/dist/vendor', f);
      ok(`the extension dist carries ${f}, byte-for-byte`,
        fs.existsSync(path.join(ROOT, dist)) && sha(dist) === sha(path.join('vendor', f)));
    }
    /* The standalone inlines them verbatim — a truncated inline is a runtime crash
       on a machine that has no network to fall back on. */
    const standalone = fs.readFileSync(path.join(ROOT, 'turnstone-standalone.html'), 'utf8');
    for (const f of ['maillayer.js', 'phonelayer.js']) {
      ok(`the standalone build inlines vendor/${f} byte-for-byte`,
        standalone.includes(fs.readFileSync(path.join(ROOT, 'vendor', f), 'utf8')));
    }
    /* The bookmarklet deliberately ships no layers (documented in vendor/README.md);
       if one ever leaks in, the payload grows and the capability notice turns false. */
    for (const v of ['csv', 'core', 'full']) {
      const payload = decode(`ports/bookmarklet/dist/turnstone-bookmarklet-${v}.txt`);
      ok(`the ${v} bookmarklet carries neither layer, as documented`,
        !payload.includes('maillayer-provider-modal') && !payload.includes('pl-overlay'));
    }
    ok('no artifact loads a library from a CDN',
      !/<script[^>]*src="https?:\/\//.test(app) && !/<script[^>]*src="https?:\/\//.test(standalone));
    ok('app.html loads no remote subresource at all',
      !/\ssrc="https?:\/\//.test(app), (/\ssrc="https?:\/\/[^"]*"/.exec(app) || [''])[0]);
    /* The one remote URL anywhere is MailLayer's own Gmail/Outlook icon, and our CSP
       is what keeps it from being requested. Both halves are asserted, because
       widening img-src "to make the picker pretty" is the tempting mistake. */
    const remote = [...new Set((standalone.match(/src="https?:\/\/[^"]*"/g) || []))];
    eq('the only off-origin URL in any artifact is MailLayer\'s two blocked icons', remote.length, 2);
    ok('…and the CSP refuses images from anywhere off-origin',
      /img-src[^;]*'self'/.test(app) && !/img-src[^;]*https:/.test(app));
  }

  /* ------------------------------------------------------------------ report --- */
  console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}`);
  if (failed) {
    console.log('\nfailures:');
    for (const f of failures) console.log(`  · ${f}`);
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(`\nrunner error: ${e.stack || e.message}`);
  process.exit(1);
});

#!/usr/bin/env node
/* Generate every fixture in the repo root, from one definition.
 *
 *   node assets/make-fixtures.js            # writes all of them
 *   node assets/make-fixtures.js --list     # print what it would write, change nothing
 *   node assets/make-fixtures.js canonical  # only the ones whose name matches a filter
 *   node assets/make-fixtures.js --check    # fail if any file on disk differs
 *
 * ---------------------------------------------------------------------------
 * Why one file
 * ---------------------------------------------------------------------------
 * These fixtures exist to answer two questions:
 *
 *   canonical   "does format X parse?"            — one queue, eleven containers
 *   workflows   "does this work on a real queue?" — the shapes admin work takes
 *
 * Both questions only work if the files agree with each other, and hand-kept
 * files do not. The drift that finally forced this file into existence was
 * small and typical: sample-links.xlsx was generated once by an external tool
 * and its Hacker News note was missing the "— use ↗" that the CSV, DOCX and
 * Markdown fixtures all carry. Nothing caught it, because the shared target
 * counts rows, columns, statuses and cards — not note text. Eleven files that
 * are *supposed* to be the same queue had quietly stopped being the same queue.
 *
 * So the queue is defined once, below, and every container renders from it.
 * A change to a row changes all eleven at once, `--check` proves the working
 * tree matches the definition, and `test/run.js` compares each fixture's parsed
 * matrix against this definition so a stale file fails the suite rather than
 * shipping.
 *
 * ---------------------------------------------------------------------------
 * Reproducibility
 * ---------------------------------------------------------------------------
 * This repository has no build tooling and no dependencies, so a ZIP (.docx,
 * .xlsx) is written by hand in assets/lib/minizip.js with a fixed member order
 * and a constant timestamp: two runs of this script produce byte-identical
 * output, and `--check` is therefore meaningful.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { zip } = require('./lib/minizip');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const LIST_ONLY = args.includes('--list');
const CHECK = args.includes('--check');
const filter = args.find(a => !a.startsWith('--')) || '';

/* ===========================================================================
   1. The canonical queue — the one list, in every container
   =========================================================================== */

const HEAD = ['Name', 'URL', 'Status', 'Notes'];

/** Ten tasks, three of them already complete. Every fixture below is this. */
const QUEUE_ROWS = [
  ['Apple Newsroom', 'https://www.apple.com/newsroom/', 'incomplete', 'Q3 earnings page'],
  ['BBC Homepage', 'https://www.bbc.com/', 'complete', ''],
  ['Changelog Nightly', 'https://changelog.com/nightly', 'incomplete', 'Skip the archive pages'],
  ['Comma, Inc. Blog', 'https://example.com/comma-blog', 'complete', 'Note with, commas, and "quotes"'],
  ['Demo Domain', 'https://example.com/', 'incomplete', ''],
  ['GitHub Trending', 'https://github.com/trending', 'incomplete', 'Check weekly'],
  ['Hacker News', 'https://news.ycombinator.com/', 'complete', 'Blocked in iframes — use ↗'],
  ['Sheets Example', 'https://example.com/sheet-demo', 'incomplete', ''],
  ['Turnstone Repo', 'https://github.com/', 'incomplete', ''],
  ['Wikipedia Portal', 'https://www.wikipedia.org/', 'incomplete', ''],
];
const QUEUE = [HEAD, ...QUEUE_ROWS];

/* The two contact lists: the same ten tasks and four columns, but the link
   column *is* an address or a number. They are what makes MailLayer/PhoneLayer
   testable end to end — every other fixture has a page there. The phone list
   deliberately carries six international formats, because normalising them is
   the thing that has to work. */
const EMAILS = [
  'newsroom@example.com', 'press@bbc.example.com', 'newsletter@changelog.com', 'hello@example.com',
  'team@example.com', 'support@github.com', 'tips@example.com', 'sheets@example.com',
  'spuds0588@users.noreply.github.com', 'social@example.com',
];
const PHONES = [
  '+1 415 555 0142', '020 7946 0958', '+44 20 7946 0958', '+1 (415) 555-0163',
  '+49 30 901820', '+61 2 5550 1234', '+1-415-555-0189', '+33 1 70 18 99 00',
  '+81 3 5555 0100', '+1 415 555 0110',
];
const withLink = (values) => QUEUE.map((row, i) => (i === 0 ? row.slice() : [row[0], values[i - 1], row[2], row[3]]));

/* ===========================================================================
   2. The workflow family — the shapes real work arrives in
   ===========================================================================
   Six lists assembled from the recurring shapes of back-office work, plus three
   ways a queue arrives with no file at all. Each is awkward the way the real
   thing is: the identifier column comes first and the title sits in the middle,
   statuses are spelled the way the system spells them, money is a real number,
   and four of them hold no link anywhere. */

/** A service-desk queue, straight out of the portal's own export. No links:
    the portal is the only place these rows exist. */
const TICKETS = [
  ['Ticket', 'Summary', 'Priority', 'Assignee', 'State'],
  ['INC0041821', 'Reset MFA for the two new Finance starters', 'High', 'Priya Raman', 'Resolved'],
  ['INC0042117', 'Mercury laptop will not charge after dock swap', 'Medium', 'Dan Okafor', 'Closed'],
  ['INC0042298', 'Shared mailbox not receiving external mail', 'High', 'Priya Raman', 'In Progress'],
  ['REQ0009134', 'New starter kit for J. Alvarez', 'Low', 'Marco Silvani', 'Open'],
  ['REQ0009201', 'Two monitors for the design pod', 'Low', 'Marco Silvani', 'Awaiting vendor'],
  ['INC0042352', 'Print queue stuck on the third floor', 'Medium', 'Dan Okafor', 'Resolved'],
  ['REQ0009244', 'Replace the failed badge reader at reception', 'High', 'Ada Berger', 'Open'],
  ['INC0042401', 'VPN drops every hour for the Leeds team', 'High', 'Ada Berger', 'New'],
  ['REQ0009302', 'Extra desk phone for the sales pod', 'Low', 'Marco Silvani', 'Open'],
  ['INC0042477', 'Outlook profile corrupt after the mailbox move', 'Medium', 'Dan Okafor', 'New'],
];

/** The same work as a hand-kept sheet rather than an export — tab-separated, an
    extra age column, and the statuses people actually type. */
const TRIAGE = [
  ['Ticket', 'Request', 'Queue', 'Assignee', 'Status', 'Age (days)'],
  ['INC0041821', 'MFA reset for two new starters', 'Identity', 'Priya Raman', 'Closed', '6'],
  ['INC0042117', 'Laptop will not charge after dock swap', 'Hardware', 'Dan Okafor', 'Resolved', '5'],
  ['INC0042298', 'Shared mailbox missing external mail', 'Messaging', 'Priya Raman', 'In progress', '4'],
  ['REQ0009134', 'New starter kit', 'Procurement', 'Marco Silvani', 'Open', '4'],
  ['REQ0009201', 'Two monitors for the design pod', 'Procurement', 'Marco Silvani', 'Waiting on supplier', '3'],
  ['INC0042352', 'Print queue stuck on floor 3', 'Printing', 'Dan Okafor', 'Resolved', '3'],
  ['REQ0009244', 'Badge reader dead at reception', 'Facilities', 'Ada Berger', 'Open', '2'],
  ['INC0042401', 'VPN drops hourly for the Leeds team', 'Network', 'Ada Berger', 'New', '1'],
  ['REQ0009302', 'Desk phone for the sales pod', 'Telephony', 'Marco Silvani', 'Open', '1'],
  ['INC0042477', 'Outlook profile corrupt after move', 'Messaging', 'Dan Okafor', 'New', '0'],
];

/** Accounts payable: a workbook, because that is what finance keeps, with money
    as real numbers and a date column beside a status column. */
const INVOICES = [
  ['Invoice #', 'Vendor', 'Amount', 'Approver', 'Status', 'Due'],
  ['INV-88231', 'Northwind Paper Co.', 1240.5, 'F. Adeyemi', 'Approved', '2026-10-02'],
  ['INV-88232', 'Calder Office Supplies', 388.99, 'F. Adeyemi', 'Approved', '2026-10-02'],
  ['INV-88240', 'Harrow Freight', 5760, 'M. Lindqvist', 'Pending approval', '2026-10-05'],
  ['INV-88241', 'Brightwell Catering', 918.2, 'M. Lindqvist', 'Paid', '2026-10-05'],
  ['INV-88249', 'Ordnance Tooling', 12480.75, 'R. Haddad', 'On hold — query raised', '2026-10-09'],
  ['INV-88250', 'Northwind Paper Co.', 1240.5, 'F. Adeyemi', 'Pending approval', '2026-10-09'],
  ['INV-88261', 'Selby Legal LLP', 3450, 'R. Haddad', 'Awaiting cost centre', '2026-10-12'],
  ['INV-88262', 'Kestrel IT Services', 8900, 'R. Haddad', 'Pending approval', '2026-10-12'],
  ['INV-88270', 'Halden Cleaning', 642.4, 'M. Lindqvist', 'Rejected — duplicate', '2026-10-16'],
  ['INV-88271', 'Ordnance Tooling', 2310, 'R. Haddad', 'Pending approval', '2026-10-16'],
];

/** Vendor onboarding, with the portal link in the sheet — so this one is a real
    link list, and its link column competes with a column full of addresses. */
const VENDORS = [
  ['Vendor', 'Onboarding Link', 'Stage', 'Owner', 'Contact'],
  ['Northwind Paper Co.', 'https://portal.example.com/vendor/4482', 'Approved', 'F. Adeyemi', 'ap@northwind.example'],
  ['Calder Office Supplies', 'https://portal.example.com/vendor/4483', 'Contract sent', 'F. Adeyemi', 'accounts@calder.example'],
  ['Harrow Freight', 'https://portal.example.com/vendor/4491', 'KYC in review', 'M. Lindqvist', 'finance@harrow.example'],
  ['Brightwell Catering', 'https://portal.example.com/vendor/4494', 'Approved', 'M. Lindqvist', 'hello@brightwell.example'],
  ['Ordnance Tooling', 'https://portal.example.com/vendor/4502', 'Bank details pending', 'R. Haddad', 'ar@ordnance.example'],
  ['Selby Legal LLP', 'https://portal.example.com/vendor/4510', 'Approved', 'R. Haddad', 'billing@selby.example'],
  ['Kestrel IT Services', 'https://portal.example.com/vendor/4517', 'Security review', 'R. Haddad', 'ops@kestrel.example'],
  ['Halden Cleaning', 'https://portal.example.com/vendor/4521', 'Contract sent', 'M. Lindqvist', 'admin@halden.example'],
  ['Wexford Print', 'https://portal.example.com/vendor/4526', 'Rejected', 'F. Adeyemi', 'quotes@wexford.example'],
  ['Aldgate Couriers', 'https://portal.example.com/vendor/4533', 'Approved', 'M. Lindqvist', 'dispatch@aldgate.example'],
];

/** A renewals register — where the date, not the status, is what the work hangs
    off, and where a lapsed item is a compliance finding. */
const RENEWALS = [
  ['Item', 'Renewal Link', 'Expires', 'Owner', 'Status'],
  ['Public liability insurance', 'https://portal.example.com/renewal/INS-2214', '2026-11-30', 'F. Adeyemi', 'Renewed'],
  ['Fire risk assessment', 'https://portal.example.com/renewal/FRA-0091', '2026-10-14', 'R. Haddad', 'In progress'],
  ['Gas safety certificate', 'https://portal.example.com/renewal/GAS-4471', '2026-10-01', 'R. Haddad', 'Booked'],
  ['Waste carrier licence', 'https://portal.example.com/renewal/WCL-1180', '2026-12-31', 'M. Lindqvist', 'Renewed'],
  ['Driving licence checks', 'https://portal.example.com/renewal/DLC-7712', '2026-10-20', 'M. Lindqvist', 'Awaiting staff'],
  ['LOLER inspection', 'https://portal.example.com/renewal/LOL-3308', '2026-09-29', 'R. Haddad', 'Booked'],
  ['Electrical installation cert', 'https://portal.example.com/renewal/EIC-2201', '2026-11-05', 'R. Haddad', 'In progress'],
  ['Health and safety policy review', 'https://portal.example.com/renewal/HSP-0064', '2026-12-15', 'F. Adeyemi', 'Verified'],
  ['Cyber insurance renewal', 'https://portal.example.com/renewal/CYB-9910', '2026-10-07', 'F. Adeyemi', 'Awaiting broker'],
  ['Company car tax renewal', 'https://portal.example.com/renewal/CCT-5520', '2026-11-19', 'M. Lindqvist', 'Booked'],
];

/** A meeting action log — the most common list of all, and the one that arrives
    as Markdown because that is what the notes were written in. */
const ACTIONS_MD = `# Action log — Q3 supplier review

Notes from the review, 14 September. Owners in the middle column, target dates last.
Anything ticked was closed out before the meeting.

- [x] Chase ACME Insurance for the renewed public liability certificate — Priya — 19 Sep — [ticket](https://portal.example.com/incident/INC0041821)
- [x] Confirm the two Finance starters have had their MFA reset — Dan — 19 Sep — [ticket](https://portal.example.com/incident/INC0042117)
- [ ] Get a second quote for the catering contract — Marco — 26 Sep — [brief](https://example.com/catering-brief.pdf)
- [ ] Ask Harrow Freight for the missing KYC pack — Marco — 26 Sep
- [ ] Book the gas safety inspection before the certificate lapses — Ada — 30 Sep — [portal](https://portal.example.com/renewal/GAS-4471)
- [ ] Agree the cost centre on the Selby Legal invoice — Farah — 30 Sep
- [ ] Follow up the Leeds VPN fault with the network team — Dan — 2 Oct — [ticket](https://portal.example.com/incident/INC0042401)
- [x] Replace the failed badge reader at reception — Ada — 21 Sep
- [ ] Draft the 2027 supplier review calendar — Farida — 9 Oct
- [ ] Confirm whether Wexford Print can meet the security review — Rami — 9 Oct — [vendor](https://portal.example.com/vendor/4526)
`;

/** The queue as an email with the sheet attached — the shape most forwards take,
    where the body says nothing useful and the payload is a base64 part. */
const ATTACHED_CSV_ROWS = INVOICES;

/* ===========================================================================
   3. Encoders
   =========================================================================== */

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Text content escapes less than an attribute value: a quote is only special
    between `"` and `'`, and a browser reads a literal one in a text node
    faithfully. Escaping it there would still parse, but it is not what a mail
    client or a spreadsheet export writes. */
const escText = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const colName = (i) => { let s = '', n = i; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };

/** RFC 4180: quote only what needs it, and double the quotes inside. */
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows) => rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
/** The tab-separated twin. No quoting: a tab-separated cell cannot hold a tab,
    and the workflow sheet relies on bare values round-tripping. */
const tsv = (rows) => rows.map(r => r.join('\t')).join('\n') + '\n';

/** A minimal but valid XLSX: inline strings, real numbers, no shared-string part.
    Hand-written for the same reason the DOCX is — no dependencies, no tooling —
    and detected by member list just like any other workbook. */
function xlsx(rows, sheetName) {
  const sheet = rows.map((row, r) => {
    const cells = row.map((v, c) => {
      const ref = `${colName(c)}${r + 1}`;
      if (v === '' || v === null || v === undefined) return '';
      if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  return zip(Object.entries({
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>
`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>
`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>
`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>
`,
  }));
}

/* A Word table, typed the way someone would type one — including the fact that
   Word splits text into runs whenever it is edited twice, which is why one URL
   below arrives as `https://www.` + `bbc.com/`. The importer has to join them. */
const DOCX_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const DOCX_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const wcell = (text) => `<w:tc><w:p><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p></w:tc>`;
const wcellSplit = (a, b) => `<w:tc><w:p><w:r><w:t xml:space="preserve">${esc(a)}</w:t></w:r>`
  + `<w:r><w:t xml:space="preserve">${esc(b)}</w:t></w:r></w:p></w:tc>`;

function docx(rows) {
  const body = rows.map((r, i) => (i === 2
    ? `<w:tr>${wcell(r[0])}${wcellSplit('https://www.', 'bbc.com/')}${wcell(r[2])}${wcell(r[3])}</w:tr>`
    : `<w:tr>${r.map(wcell).join('')}</w:tr>`)).join('\n');
  const documentXml = `${DOCX_DECL}
<w:document ${DOCX_NS}><w:body><w:tbl>
${body}
</w:tbl><w:p><w:r><w:t>Generated by assets/make-fixtures.js</w:t></w:r></w:p></w:body></w:document>
`;
  return zip(Object.entries({
    '[Content_Types].xml': `${DOCX_DECL}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
`,
    '_rels/.rels': `${DOCX_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
`,
    'word/document.xml': documentXml,
  }));
}

/* ---- MIME, for the email fixtures ---- */

/** Quoted-printable, as a mail client writes it: `=` escaped, anything outside
    printable ASCII as `=XX`, and long lines broken with a trailing `=`. This is
    the encoding that trips a naive reader, so the fixtures use it. */
function qp(text, soft = 76) {
  const out = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    let line = '';
    for (const ch of rawLine) {
      const code = ch.codePointAt(0);
      const piece = code === 61 ? '=3D'
        : (code < 32 || code > 126) ? '=' + code.toString(16).toUpperCase().padStart(2, '0')
        : ch;
      if (line.length + piece.length > soft - 1) { out.push(line + '='); line = ''; }
      line += piece;
    }
    out.push(line);
  }
  return out.join('\r\n');
}
const b64 = (buf, width = 76) => Buffer.from(buf).toString('base64').replace(new RegExp(`(.{${width}})`, 'g'), '$1\r\n');
const multipart = (boundary, parts) => parts.map(p => `--${boundary}\r\n${p}`).join('') + `--${boundary}--\r\n`;

/** An HTML body shaped like the one a mail client actually sends, with the kind
    of inline styling a pasted-from-a-system table arrives with. */
function emailHtmlTable(rows, title) {
  return `<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1252">
<style>body{font-family:Calibri,sans-serif;font-size:11pt}table{border-collapse:collapse}
td,th{border:1px solid #bfbfbf;padding:2pt 6pt}</style></head>
<body lang="EN-GB" style="word-wrap:break-word">
<p class="MsoNormal">Hi,<o:p></o:p></p>
<p class="MsoNormal">Here ${title}. Please work through it and reply when the list is clear.<o:p></o:p></p>
<table><thead><tr>${rows[0].map(h => `<th>${escText(h)}</th>`).join('')}</tr></thead>
<tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td>${escText(c)}</td>`).join('')}</tr>`).join('\n')}</tbody></table>
<p class="MsoNormal">Thanks,<br>Sam<o:p></o:p></p>
</body></html>`;
}

/* ===========================================================================
   4. The canonical containers — one queue, eleven renderings
   ===========================================================================
   Each renderer states the *deliberate* awkwardness it carries. Those quirks are
   the fixture's actual content: without them the file would only be testing that
   a parser can read a file this script itself just wrote. */

/** CSV — a quoted name with embedded commas and a note with commas *and* escaped
    double quotes, so the reader has to be a real RFC 4180 one. */
const asCsv = (rows) => csv(rows);

/** TSV — the same rows, tab-delimited. */
const asTsv = (rows) => tsv(rows);

/** JSON — an array of objects, so the columns come from **keys** rather than a
    header row. The keys are lowercase on purpose: the file has no header line at
    all, and the column names are whatever the objects happen to be called. */
function asJson(rows) {
  const keys = rows[0].map(h => String(h).toLowerCase());
  const objs = rows.slice(1).map(r => {
    const o = {};
    keys.forEach((k, i) => { o[k] = r[i] === undefined ? '' : r[i]; });
    return o;
  });
  return JSON.stringify(objs, null, 2) + '\n';
}

/** XML — a feed, because that is the shape XML lists actually come in. Child
    elements (not attributes) carry the columns, and their order is the CSV's,
    which is what makes it comparable with the others. */
function asXml(rows) {
  const item = (r) => `    <item>
      <title>${esc(r[0])}</title>
      <link>${esc(r[1])}</link>
      <status>${esc(r[2])}</status>
      <notes>${esc(r[3])}</notes>
    </item>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- A feed-shaped link list — the same ten tasks as sample-links.csv, so every
     importer can be checked against one shared target: 10 cards, 4 columns in the
     order Name / URL / Status / Notes, 7 visible and 3 already complete.

     Child elements (not attributes) carry the columns, and their order is the CSV's
     column order, which is what makes this fixture comparable with the others. The
     importer tabulates the repeated <item> elements into one row each. -->
<rss version="2.0">
  <channel>
    <title>Turnstone sample link list (RSS)</title>
    <link>https://spuds0588.github.io/Turnstone/</link>
    <description>Ten pages to work through.</description>
${rows.slice(1).map(item).join('\n')}
  </channel>
</rss>
`;
}

/** HTML — a real table, reached through DOMParser. Two deliberate traps: a **nav
    list above the table** (the importer must pick the table and ignore three
    `<a href>`s that look exactly like data), and the URL cell wrapped in an
    anchor rather than bare text. */
function asHtml(rows) {
  const tr = (r) => `      <tr><td>${escText(r[0])}</td>`
    + `<td><a href="${esc(r[1])}">${escText(r[1])}</a></td>`
    + `<td>${escText(r[2])}</td><td>${escText(r[3])}</td></tr>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Turnstone sample link list (HTML table)</title>
</head>
<body>
  <!-- A nav list sits ABOVE the table on purpose: the importer must pick the
       table and ignore these navigation links. -->
  <nav>
    <a href="https://example.com/nav-1">Home</a>
    <a href="https://example.com/nav-2">About</a>
    <a href="https://example.com/nav-3">Contact</a>
  </nav>

  <h1>Q3 link audit</h1>
  <table>
    <thead>
      <tr><th>Name</th><th>URL</th><th>Status</th><th>Notes</th></tr>
    </thead>
    <tbody>
${rows.slice(1).map(tr).join('\n')}
    </tbody>
  </table>
</body>
</html>
`;
}

/** Markdown as a GitHub-style task list — the checkbox becomes the status, the
    text before the link the name, the text after it the note. Two deliberate
    traps: a prose link *outside* the list and a link inside a code fence, both of
    which must be ignored. */
function asMarkdown(rows) {
  const item = (r) => `- [${r[2] === 'complete' ? 'x' : ' '}] ${r[0]} — ${r[1]}${r[3] ? ` — ${r[3]}` : ''}`;
  return `# Sample link queue

The same 10 tasks as \`sample-links.csv\`, written as a GitHub-style task list — the
shape a queue usually lives in once it is kept in a README. Nothing outside the list
should be imported: prose [like this link](https://example.com/prose-is-not-a-task)
is not a task, and neither is a link inside a fence:

\`\`\`
https://example.com/in-a-code-fence
\`\`\`

Checkbox state becomes each card's status, the text before the link becomes the task
name, and whatever follows it becomes the note.

${rows.slice(1).map(item).join('\n')}
`;
}

/** Markdown as a pipe table — the other shape in the same parser, and a different
    code path through it. */
function asMarkdownTable(rows) {
  const cell = (v) => String(v ?? '').replace(/\|/g, '\\|');
  /* One space inside each pipe, so an empty cell leaves `| |` rather than the
     `|  |` a naive join produces — the same bytes a table typed by hand has. */
  const row = (cs) => '|' + cs.map(c => (c === '' ? ' ' : ` ${c} `)).join('|') + '|';
  return `# Sample link queue — as a pipe table

The same 10 tasks as \`sample-links.csv\`, written as a GitHub-flavoured pipe table
instead of a task list. Same target, different shape: 10 cards, 4 columns, 7 visible
and 3 already complete, exactly like every other fixture in the repo root.

${row(rows[0].map(cell))}
| --- | --- | --- | --- |
${rows.slice(1).map(r => row(r.map(cell))).join('\n')}
`;
}

/** The queue as an email: a table in the body, quoted-printable, with the plain
    copy of itself alongside it in a multipart/alternative. Which part wins is
    part of what is asserted. */
function digestEml() {
  const B = '----=_NextPart_Turnstone_0001';
  const html = emailHtmlTable(QUEUE, 'is the reading list for this week');
  const plain = QUEUE.map(r => r.join('  ')).join('\r\n');
  return `From: Sam Okonjo <sam.okonjo@example.com>\r
To: Priya Raman <priya.raman@example.com>\r
Subject: This week's reading list\r
Date: Mon, 22 Sep 2026 09:14:22 +0100\r
MIME-Version: 1.0\r
Content-Type: multipart/alternative; boundary="${B}"\r
\r
${multipart(B, [
    `Content-Type: text/plain; charset="utf-8"\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n${qp(plain)}\r\n`,
    `Content-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n${qp(html)}\r\n`,
  ])}`;
}

/** A prose forward whose payload is the attached sheet — the shape where the body
    says nothing useful and the list only exists as a base64 part. */
function attachedEml() {
  const B = '----=_NextPart_Turnstone_0002';
  return `From: Farah Adeyemi <farah.adeyemi@example.com>\r
To: Accounts Payable <ap@example.com>\r
Subject: Payment run — approvals needed before Friday\r
Date: Tue, 23 Sep 2026 16:02:07 +0100\r
MIME-Version: 1.0\r
Content-Type: multipart/mixed; boundary="${B}"\r
\r
${multipart(B, [
    `Content-Type: text/plain; charset="utf-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\nHi,\r\n\r\nThe queue for this week's run is attached. Ten items, four of them\r\nalready cleared. I need the rest signed off before Friday please.\r\n\r\nThanks,\r\nFarah\r\n`,
    `Content-Type: text/csv; name="approvals.csv"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="approvals.csv"\r\n\r\n${b64(csv(ATTACHED_CSV_ROWS))}\r\n`,
  ])}`;
}

/** A page saved from a portal that has no export button — `Save page as → Web
    Archive`, which is the same MIME container as an email. */
function savedPageMht() {
  const B = '----=_NextPart_Turnstone_0003';
  const html = `<!doctype html>
<html><head><title>My queues — Service Desk</title>
<style>td{padding:4px 8px;border-bottom:1px solid #ddd}</style></head><body>
<h1>My queues</h1>
<table><tr>${TICKETS[0].map(h => `<th>${escText(h)}</th>`).join('')}</tr>
${TICKETS.slice(1).map(r => `<tr>${r.map(c => `<td>${escText(c)}</td>`).join('')}</tr>`).join('\n')}
</table></body></html>`;
  return `MIME-Version: 1.0\r
Content-Type: multipart/related; boundary="${B}"; type="text/html"\r
Subject: My queues\r
X-MimeOLE: Produced By Turnstone fixtures\r
\r
${multipart(B, [
    `Content-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: quoted-printable\r\nContent-Location: file:///C:/saved/queues.htm\r\n\r\n${qp(html)}\r\n`,
  ])}`;
}

/* ===========================================================================
   5. What gets written
   =========================================================================== */

const FILES = [
  /* --- the canonical queue, in eleven containers --- */
  ['sample-links.csv', () => asCsv(QUEUE), 'CSV: the reference shape every other fixture is compared against'],
  ['sample-links.tsv', () => asTsv(QUEUE), 'TSV: the same rows, tab-delimited'],
  ['sample-links.json', () => asJson(QUEUE), 'JSON: columns come from object keys, not a header row'],
  ['sample-links.xml', () => asXml(QUEUE), 'XML: a feed, so the repeated <item> elements are the rows'],
  ['sample-links.html', () => asHtml(QUEUE), 'HTML: a real table, with a nav list above it that must be ignored'],
  ['sample-links.xlsx', () => xlsx(QUEUE, 'Links'), 'XLSX: a real workbook in a hand-written ZIP, sheet "Links"'],
  ['sample-links.docx', () => docx(QUEUE), 'DOCX: a Word table where one URL is split across two runs'],
  ['sample-links.md', () => asMarkdown(QUEUE), 'Markdown: a task list, with prose and a code fence to ignore'],
  ['sample-links-table.md', () => asMarkdownTable(QUEUE), 'Markdown: the same queue as a pipe table'],
  ['sample-links-email.csv', () => asCsv(withLink(EMAILS)), 'CSV: the link column IS an address'],
  ['sample-links-phone.csv', () => asCsv(withLink(PHONES)), 'CSV: the link column IS a number, in six formats'],
  ['sample-inbox-digest.eml', digestEml, 'email: the queue as a quoted-printable HTML table in the body'],
  ['sample-queue-email.eml', attachedEml, 'email: a prose body with the queue attached as base64 CSV'],
  ['sample-saved-queue.mht', savedPageMht, 'email container: a page kept from a portal with no export'],

  /* --- the workflow family --- */
  ['sample-portal-tickets.csv', () => asCsv(TICKETS), 'no link anywhere: the portal case, title column mid-table'],
  ['sample-portal-triage.tsv', () => asTsv(TRIAGE), 'the same work kept by hand, tab-separated, with an age column'],
  ['sample-invoice-approvals.xlsx', () => xlsx(INVOICES, 'Approvals'), 'a workbook with real numbers and a date column'],
  ['sample-vendor-onboarding.csv', () => asCsv(VENDORS), 'a link column competing with a column of addresses'],
  ['sample-compliance-renewals.csv', () => asCsv(RENEWALS), 'renewal dates as the thing the work hangs off'],
  ['sample-meeting-actions.md', () => ACTIONS_MD, 'a Markdown action log with owners and dates'],
];

const selected = FILES.filter(([name]) => !filter || name.includes(filter));
if (!selected.length) {
  console.error(`nothing matches "${filter}" — known fixtures: ${FILES.map(([n]) => n).join(', ')}`);
  process.exit(1);
}

let changed = 0, same = 0, bytes = 0;
for (const [name, make, why] of selected) {
  const out = make();
  const buf = Buffer.isBuffer(out) ? out : Buffer.from(out, 'utf8');
  const dest = path.join(ROOT, name);
  const before = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  bytes += buf.length;
  const identical = before && before.equals(buf);
  if (CHECK) {
    if (!identical) { changed++; console.log(`  STALE  ${name}`); }
    else same++;
    continue;
  }
  if (!LIST_ONLY) fs.writeFileSync(dest, buf);
  const note = identical ? 'unchanged' : before ? 'rewritten' : 'new';
  console.log(`  ${LIST_ONLY ? 'would write' : 'wrote'} ${name.padEnd(32)} ${String(buf.length).padStart(7)} b  ${note}`);
  console.log(`          ${why}`);
}

if (CHECK) {
  console.log(`\n${same} up to date, ${changed} stale${changed ? ' — rerun without --check' : ''}`);
  process.exit(changed ? 1 : 0);
}
console.log(`\n${selected.length} fixture(s), ${(bytes / 1024).toFixed(1)} KB${filter ? ` (filtered by "${filter}")` : ''}`);
console.log(`
Every fixture comes from the definitions at the top of this file, so the eleven
containers of the canonical queue cannot drift apart again — which is exactly how
sample-links.xlsx came to be the one whose Hacker News note was missing the
"— use ↗" every other container carried.

  node assets/make-fixtures.js --check     # fail if the working tree has drifted
  node assets/make-fixtures.js canonical   # one group, by name filter
`);

/* SheetJS stand-in — read-only XLSX support with zero dependencies.
 *
 * Implements exactly the API surface app.html consumes:
 *   XLSX.read(buf, { type:'array' })                  -> Promise<{ SheetNames, Sheets, version }>
 *   XLSX.read(buf, { type:'array', bookSheets: true }) -> Promise<{ SheetNames }>
 *   XLSX.utils.sheet_to_json(ws, { header:1 })          -> string[][]
 *
 * `XLSX.write` is deliberately absent, so the app reports HAS_XLSX_WRITE=false,
 * treats workbooks as one-way imports and hides XLSX export — the locked-scope
 * rule that a build must never promise a write-back it cannot deliver.
 *
 * How it works without SheetJS: an .xlsx file is a ZIP of XML. The ZIP is walked
 * through its central directory, each member inflated with the browser's own
 * DecompressionStream('deflate-raw'), and the sheet/shared-string XML read with
 * DOMParser. No eval, no blob-script injection, no network — which is what makes
 * this variant survivable under a strict page CSP.
 *
 * Deliberately not supported (throws a readable reason instead): .xls (BIFF8),
 * .xlsb, .ods, and cell number formats (dates arrive as their stored serial).
 */
var XLSX = (function () {
  var ENTRY_SIG = 0x04034b50, CD_SIG = 0x02014b50, EOCD_SIG = 0x06054b50;
  var REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  function u16(dv, o) { return dv.getUint16(o, true); }
  function u32(dv, o) { return dv.getUint32(o, true); }

  /** Locate the End Of Central Directory record by scanning back from the tail. */
  function findEocd(dv) {
    var min = Math.max(0, dv.byteLength - 65557 - 22);
    for (var i = dv.byteLength - 22; i >= min; i--) {
      if (u32(dv, i) === EOCD_SIG) return i;
    }
    return -1;
  }

  /** name -> central-directory entry (offset/size/method). */
  function readCentralDirectory(buf) {
    var dv = new DataView(buf);
    var eocd = findEocd(dv);
    if (eocd < 0) throw new Error('not a ZIP container (no end-of-central-directory record) — not an .xlsx file?');
    var count = u16(dv, eocd + 10);
    var offset = u32(dv, eocd + 16);
    var entries = {};
    for (var n = 0; n < count; n++) {
      if (u32(dv, offset) !== CD_SIG) break;
      var method = u16(dv, offset + 10);
      var compSize = u32(dv, offset + 20);
      var nameLen = u16(dv, offset + 28);
      var extraLen = u16(dv, offset + 30);
      var commentLen = u16(dv, offset + 32);
      var localOffset = u32(dv, offset + 42);
      var name = new TextDecoder('utf-8').decode(new Uint8Array(buf, offset + 46, nameLen));
      entries[name] = { method: method, compSize: compSize, localOffset: localOffset };
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  /** Inflate (stored or deflate) one member to text. */
  async function readEntryText(buf, entry) {
    var dv = new DataView(buf);
    if (u32(dv, entry.localOffset) !== ENTRY_SIG) throw new Error('corrupt ZIP member header');
    var nameLen = u16(dv, entry.localOffset + 26);
    var extraLen = u16(dv, entry.localOffset + 28);
    var start = entry.localOffset + 30 + nameLen + extraLen;
    var bytes = new Uint8Array(buf, start, entry.compSize);
    if (entry.method === 0) return new TextDecoder('utf-8').decode(bytes);
    if (entry.method !== 8) throw new Error('unsupported ZIP compression method ' + entry.method);
    if (typeof DecompressionStream !== 'function') {
      throw new Error('this browser cannot inflate XLSX parts (no DecompressionStream) — use the full build or export to CSV');
    }
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new TextDecoder('utf-8').decode(await new Response(stream).arrayBuffer());
  }

  function parseXml(text, label) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    var bad = doc.querySelector('parsererror');
    if (bad) throw new Error('could not read ' + label + ' XML');
    return doc;
  }

  /** "BC12" -> 54 (zero-based column index). */
  function colIndex(ref) {
    var letters = String(ref || '').match(/^[A-Za-z]+/);
    if (!letters) return 0;
    var s = letters[0].toUpperCase(), n = 0;
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }

  /** Every <t> under a shared-string <si>, so rich text runs concatenate. */
  function sharedStringsOf(text) {
    if (text == null) return [];
    var doc = parseXml(text, 'sharedStrings');
    return Array.prototype.map.call(doc.getElementsByTagName('si'), function (si) {
      return Array.prototype.map.call(si.getElementsByTagName('t'), function (t) { return t.textContent; }).join('');
    });
  }

  function relationshipTargets(text) {
    var doc = parseXml(text, 'workbook relationships');
    var map = {};
    Array.prototype.forEach.call(doc.getElementsByTagName('Relationship'), function (rel) {
      map[rel.getAttribute('Id')] = rel.getAttribute('Target');
    });
    return map;
  }

  /** Sheet name -> worksheet part path, in workbook order. */
  function sheetParts(workbookXml, rels) {
    var doc = parseXml(workbookXml, 'workbook');
    var sheets = doc.getElementsByTagName('sheet');
    return Array.prototype.map.call(sheets, function (s) {
      var rid = s.getAttributeNS(REL_NS, 'id') || s.getAttribute('r:id');
      var target = rels[rid] || '';
      if (/^\//.test(target)) target = target.slice(1);            // absolute package path
      else if (target) target = 'xl/' + target.replace(/^\.\//, '');
      return { name: s.getAttribute('name') || 'Sheet1', path: target };
    });
  }

  /** One worksheet -> dense 2D array of strings (or numbers-as-written). */
  function gridFromSheet(xml, strings) {
    var doc = parseXml(xml, 'worksheet');
    var rows = doc.getElementsByTagName('row');
    var grid = [], width = 0;
    Array.prototype.forEach.call(rows, function (row) {
      var rowIndex = parseInt(row.getAttribute('r'), 10);
      if (isNaN(rowIndex)) rowIndex = grid.length + 1;
      var out = [];
      Array.prototype.forEach.call(row.getElementsByTagName('c'), function (cell) {
        var at = colIndex(cell.getAttribute('r'));
        var type = cell.getAttribute('t') || 'n';
        var value = '';
        if (type === 'inlineStr') {
          var is = cell.getElementsByTagName('is')[0];
          value = is ? Array.prototype.map.call(is.getElementsByTagName('t'), function (t) { return t.textContent; }).join('') : '';
        } else {
          var v = cell.getElementsByTagName('v')[0];
          var raw = v ? v.textContent : '';
          if (type === 's') value = strings[parseInt(raw, 10)] || '';
          else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE';
          else value = raw;
        }
        out[at] = value;
        if (at + 1 > width) width = at + 1;
      });
      while (grid.length < rowIndex - 1) grid.push([]);            // honour sparse rows
      grid[rowIndex - 1] = out;
    });
    for (var r = 0; r < grid.length; r++) {
      var row = grid[r] || [];
      for (var c = 0; c < width; c++) if (row[c] === undefined) row[c] = '';
      row.length = width;
      grid[r] = row;
    }
    return grid;
  }

  function utils() {
    return {
      /** The slice app.html uses: { header: 1, raw: false, defval: '' }. */
      sheet_to_json: function (ws, opts) {
        opts = opts || {};
        var defval = opts.defval === undefined ? '' : opts.defval;
        return (ws.rows || []).map(function (row) {
          return row.map(function (cell) { return cell === undefined || cell === null ? defval : cell; });
        });
      },
    };
  }

  async function read(buf, opts) {
    opts = opts || {};
    var head = new Uint8Array(buf, 0, Math.min(8, buf.byteLength));
    if (head[0] === 0xD0 && head[1] === 0xCF && head[2] === 0x11 && head[3] === 0xE0) {
      throw new Error('legacy .xls (BIFF8) needs the full build — re-save it as .xlsx or CSV');
    }
    var entries = readCentralDirectory(buf);
    if (!entries['xl/workbook.xml']) {
      if (entries['content.xml']) throw new Error('.ods workbooks need the full build — re-save as .xlsx or CSV');
      if (entries['xl/workbook.bin']) throw new Error('.xlsb workbooks need the full build — re-save as .xlsx or CSV');
      throw new Error('no xl/workbook.xml inside the archive — not a readable .xlsx file');
    }
    var parts = sheetParts(await readEntryText(buf, entries['xl/workbook.xml']),
      entries['xl/_rels/workbook.xml.rels'] ? relationshipTargets(await readEntryText(buf, entries['xl/_rels/workbook.xml.rels'])) : {});
    var names = parts.map(function (p) { return p.name; });
    if (opts.bookSheets) return { SheetNames: names };

    var strings = sharedStringsOf(entries['xl/sharedStrings.xml'] ? await readEntryText(buf, entries['xl/sharedStrings.xml']) : null);
    var Sheets = {};
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var entry = entries[p.path] || entries['xl/worksheets/sheet' + (i + 1) + '.xml'];
      if (!entry) continue;
      Sheets[p.name] = { rows: gridFromSheet(await readEntryText(buf, entry), strings) };
    }
    return { SheetNames: names, Sheets: Sheets, version: 'turnstone-mini', mini: true };
  }

  return { read: read, utils: utils(), mini: true };
})();

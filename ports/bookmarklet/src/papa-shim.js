/* PapaParse stand-in — the exact slice of the API app.html consumes.
 *
 *   Papa.parse(text, { skipEmptyLines: 'greedy', delimiter }) -> { data, errors, meta: { delimiter } }
 *   Papa.unparse(matrix, { delimiter })                        -> string
 *
 * Real RFC-4180 behaviour (quoted fields, doubled quotes, embedded commas and
 * newlines, CRLF, BOM) plus delimiter sniffing, in ~2 KB and with no dependency.
 * That is what lets the zero-library bookmarklet keep full CSV/TSV support —
 * the hosted app loads the real PapaParse through vendor/ instead.
 */
var Papa = (function () {
  var CANDIDATES = [',', '\t', ';', '|'];

  /** Delimiter counts on a line, ignoring anything inside quotes. */
  function countOutsideQuotes(line, delim) {
    var n = 0, quoted = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (quoted) {
        if (ch === '"') {
          if (line[i + 1] === '"') i++;
          else quoted = false;
        }
      } else if (ch === '"') quoted = true;
      else if (ch === delim) n++;
    }
    return n;
  }

  /** Pick the delimiter that splits the most lines into the same number of fields. */
  function sniff(text) {
    var lines = text.split(/\r?\n/).slice(0, 30).filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return ',';
    var best = ',', bestScore = 0;
    for (var c = 0; c < CANDIDATES.length; c++) {
      var d = CANDIDATES[c];
      var counts = lines.map(function (l) { return countOutsideQuotes(l, d); });
      var sorted = counts.slice().sort(function (a, b) { return a - b; });
      var median = sorted[Math.floor(sorted.length / 2)];
      if (median < 1) continue;                                     // delim never appears
      var agree = counts.filter(function (n) { return n === median; }).length / counts.length;
      var score = median * agree;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  /** RFC-4180 state machine. Unterminated quotes are an error, not a crash. */
  function splitRows(text, delim, errors) {
    var rows = [], row = [], field = '', quoted = false, i = 0;
    var sawField = false;
    while (i < text.length) {
      var ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          quoted = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"' && field === '') { quoted = true; sawField = true; i++; continue; }
      if (ch === delim) { row.push(field); field = ''; sawField = true; i++; continue; }
      if (ch === '\r') { i++; continue; }                            // CRLF or lone CR
      if (ch === '\n') {
        if (field !== '' || sawField || row.length) { row.push(field); rows.push(row); }
        row = []; field = ''; sawField = false; i++; continue;
      }
      field += ch; sawField = true; i++;
    }
    if (quoted) errors.push({ type: 'Quotes', message: 'Unterminated quoted field', row: rows.length });
    if (field !== '' || sawField || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function parse(text, opts) {
    opts = opts || {};
    var errors = [];
    var delim = opts.delimiter || sniff(text);
    var data = splitRows(String(text == null ? '' : text), delim, errors);
    if (opts.skipEmptyLines) {
      data = data.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
    }
    return { data: data, errors: errors, meta: { delimiter: delim } };
  }

  function needsQuotes(s, delim) {
    return s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0
      || s.indexOf(delim) >= 0 || s.charAt(0) === ' ' || s.charAt(s.length - 1) === ' ';
  }

  function unparse(rows, opts) {
    var delim = (opts && opts.delimiter) || ',';
    return rows.map(function (row) {
      return row.map(function (cell) {
        var s = cell == null ? '' : String(cell);
        return needsQuotes(s, delim) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(delim);
    }).join('\n');
  }

  return {
    parse: parse,
    unparse: unparse,
    shim: true,                       // app/payload can log which implementation is live
  };
})();

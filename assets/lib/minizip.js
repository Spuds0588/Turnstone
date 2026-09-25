'use strict';
/* A minimum viable ZIP writer, by hand.
 *
 * This repository has no build tooling and no runtime dependencies, so a fixture
 * that happens to be a ZIP (.docx, .xlsx) cannot be produced with `zip` or with a
 * package. Instead it is written here, directly to the specification:
 *
 *   - DEFLATE comes from node's own zlib (`deflateRawSync`) — no shelling out;
 *   - member order is fixed and every timestamp is the constant 2020-01-01, so
 *     two runs of a generator produce byte-identical output and the fixture can
 *     be regenerated (and re-diffed) at any time;
 *   - only what is needed is implemented: deflate, no directory entries, no
 *     zip64, no encryption, no comments.
 *
 * `entries` is an array of [name, contents] pairs where contents is a string
 * (utf8) or a Buffer.
 */

const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Build the archive. Deterministic: fixed member order, constant timestamps. */
function zip(entries) {
  const DOS_TIME = 0;                          // 00:00:00
  const DOS_DATE = (40 << 9) | (1 << 5) | 1;   // 2020-01-01
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, contents] of entries) {
    const raw = Buffer.isBuffer(contents) ? contents : Buffer.from(String(contents), 'utf8');
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(8, 8);           // method: deflate
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);          // extra length
    locals.push(local, nameBytes, deflated);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);        // version made by
    central.writeUInt16LE(20, 6);        // version needed
    central.writeUInt16LE(0, 8);         // flags
    central.writeUInt16LE(8, 10);        // method
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);        // extra
    central.writeUInt16LE(0, 32);        // comment
    central.writeUInt16LE(0, 34);        // disk
    central.writeUInt16LE(0, 36);        // internal attrs
    central.writeUInt32LE(0, 38);        // external attrs
    central.writeUInt32LE(offset, 42);   // local header offset
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + deflated.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

module.exports = { zip, crc32 };

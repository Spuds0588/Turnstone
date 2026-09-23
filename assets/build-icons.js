#!/usr/bin/env node
/* Turnstone icon generator — rasterizes assets/logo.svg into the PNG sizes the
   web app and the future ports need, with a hand-rolled SVG rasterizer and PNG
   encoder (no dependencies).

   Usage: node assets/build-icons.js

   Inputs : assets/logo.svg (master)
   Outputs: assets/icon-192.png, assets/icon-512.png, assets/icon-maskable-512.png,
            ../icon-192.png, ../icon-512.png (repo-root copies the PWA precaches)

   Rasterizer notes:
   - The logo is deliberately generator-friendly: one filled circle + one stroked
     polyline + an offset shadow copy of it. We scan-sample the SVG geometry
     directly (point-in-circle, distance-to-segment for the stroke) rather than
     parsing paths generically — when the master logo changes shape, update the
     STONE + CHECK constants below to match.
   - Anti-aliasing via 4x supersampling per pixel; gamma kept linear for simplicity.
*/

'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---- geometry mirrored from assets/logo.svg (viewBox 512x512) ---- */
const CX = 256, CY = 256, R = 248;          // stone
const RIM = 7 / 2;                          // rim stroke half-width
const CHECK = [                             // engraved check polyline
  [148, 268], [232, 352], [368, 180],
];
const W = 52 / 2;                           // check stroke half-width
const SHADOW = [2, 2];                      // engraving shadow offset

/* colors: stone gradient (radial, top-left highlight) + rim + check/shadow */
const stoneStops = [                        // [offset, [r,g,b]]
  [0.00, [207, 207, 207]],
  [0.72, [168, 168, 168]],
  [1.00, [143, 143, 143]],
];
const RIM_C = [124, 124, 124];
const CHECK_C = [74, 74, 74];
const SHADOW_C = [111, 111, 111];

function stoneColor(px, py) {
  const dx = px - (CX - 0.12 * 2 * R), dy = py - (CY - 0.18 * 2 * R); // cx=.38 cy=.32
  const t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / (0.85 * 2 * R));
  for (let i = 1; i < stoneStops.length; i++) {
    if (t <= stoneStops[i][0]) {
      const [t0, c0] = stoneStops[i - 1], [t1, c1] = stoneStops[i];
      const f = (t - t0) / (t1 - t0);
      return [0, 1, 2].map((k) => Math.round(c0[k] + f * (c1[k] - c0[k])));
    }
  }
  return stoneStops[stoneStops.length - 1][1];
}

function distToSeg(px, py, [ax, ay], [bx, by]) {
  const abx = bx - ax, aby = by - ay, apx = px - ax, apy = py - ay;
  const len2 = abx * abx + aby * aby;
  const t = len2 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / len2)) : 0;
  const dx = px - (ax + t * abx), dy = py - (ay + t * aby);
  return Math.sqrt(dx * dx + dy * dy);
}

/* coverage of the check strokes at a point (shadow layer first, main on top) */
function checkCover(px, py) {
  const cov = (off) => {
    let inside = false;
    for (let i = 0; i < CHECK.length - 1; i++) {
      if (distToSeg(px - off[0], py - off[1], CHECK[i], CHECK[i + 1]) <= W) { inside = true; break; }
    }
    return inside;
  };
  if (cov(SHADOW)) return { layer: SHADOW_C };
  if (cov([0, 0])) return { layer: CHECK_C };
  return null;
}

/* rasterize at `size` with 4x supersampling */
function rasterize(size) {
  const img = new Uint8Array(size * size * 4);
  const S = 4, SS = S * S;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let aSum = 0, rSum = 0, gSum = 0, bSum = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          /* map pixel (+ sub-sample) to viewBox space */
          const vx = ((x + (sx + 0.5) / S) / size) * 512;
          const vy = ((y + (sy + 0.5) / S) / size) * 512;
          let col = null, alpha = 0;
          const inStone = (vx - CX) ** 2 + (vy - CY) ** 2 <= R * R;
          const rim = Math.abs(Math.sqrt((vx - CX) ** 2 + (vy - CY) ** 2) - R) <= RIM;
          const chk = checkCover(vx, vy);
          if (chk) { col = chk.layer; alpha = 1; }            // engraved check (over stone)
          else if (inStone) { col = stoneColor(vx, vy); alpha = 1; }
          else if (rim) { col = RIM_C; alpha = 1; }
          if (col && alpha) {
            aSum += 1; rSum += col[0]; gSum += col[1]; bSum += col[2];
          }
        }
      }
      const i = (y * size + x) * 4;
      if (aSum) {
        img[i] = Math.round(rSum / aSum);
        img[i + 1] = Math.round(gSum / aSum);
        img[i + 2] = Math.round(bSum / aSum);
        img[i + 3] = Math.round((aSum / SS) * 255);
      }
    }
  }
  return img;
}

/* ---- minimal PNG encoder (RGBA, no filter) ---- */
function crc32(buf) {
  let c, table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; /* 8-bit RGBA */
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; /* filter: none */
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* maskable variant: stone scaled into the safe zone (80%), transparent corners */
function maskable(img, size) {
  const out = new Uint8Array(size * size * 4);
  const src = 512, scale = 0.8;
  const off = (size - size * scale) / 2;
  const inv = src / (size * scale);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const vx = (x - off) * inv, vy = (y - off) * inv;
      if (vx < 0 || vy < 0 || vx >= src || vy >= src) continue;
      const si = ((vy | 0) * src + (vx | 0)) * 4;
      const di = (y * size + x) * 4;
      out[di] = img[si]; out[di + 1] = img[si + 1]; out[di + 2] = img[si + 2]; out[di + 3] = img[si + 3];
    }
  }
  return out;
}

/* ---- build ---- */
const dir = __dirname;
for (const size of [192, 512]) {
  const png = encodePNG(rasterize(size), size);
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), png);
  fs.writeFileSync(path.join(dir, '..', `icon-${size}.png`), png); // PWA precache copies
  console.log(`icon-${size}.png  ${(png.length / 1024).toFixed(1)} KB`);
}
const m = rasterize(512);
fs.writeFileSync(path.join(dir, 'icon-maskable-512.png'), encodePNG(maskable(m, 512), 512));
console.log('icon-maskable-512.png written (stone at 80% safe zone)');

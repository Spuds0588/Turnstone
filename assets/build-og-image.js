#!/usr/bin/env node
/* Turnstone — the social card.
 *
 *   node assets/build-og-image.js
 *
 * Why it exists: without an `og:image`, every link to this project posted into Slack,
 * Teams, LinkedIn, Discord or X renders as a bare line of text. The card is the thing
 * that makes a shared link look like a product rather than a URL.
 *
 * It is generated rather than drawn in an editor for the same reason everything else
 * here is: the logo can change, and a hand-exported PNG would quietly stop matching it.
 * The rasterizer and the PNG encoder are the ones the icons already use, so the stone
 * on this card is literally the same stone, at a different size.
 *
 * No text on it, deliberately. Drawing a wordmark would mean hand-authoring glyph
 * outlines, and every platform that renders this card also renders `og:title` and
 * `og:description` as real text beside it — a logo card plus real text is the usual
 * and better arrangement.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { rasterize, encodePNG } = require('./build-icons.js');

const W = 1200, H = 630;          // the size every platform crops to
const BG_TOP = [0x0f, 0x11, 0x15];
const BG_BOTTOM = [0x12, 0x16, 0x1e];
const GLOW = [0x7a, 0xa2, 0xff];  // the app's own accent
const STONE = 300;

const img = new Uint8Array(W * H * 4);

/* Background: a vertical gradient, then a soft accent glow behind the logo so the
   card has a light source instead of being a flat rectangle. */
const cx = W / 2, cy = H / 2 - 6;
for (let y = 0; y < H; y++) {
  const t = y / (H - 1);
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    img[i] = Math.round(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t);
    img[i + 1] = Math.round(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t);
    img[i + 2] = Math.round(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t);
    img[i + 3] = 255;
    const d = Math.hypot(x - cx, y - cy);
    const glow = Math.max(0, 1 - d / 430) ** 2 * 0.16;
    if (glow > 0) {
      for (let c = 0; c < 3; c++) img[i + c] = Math.min(255, Math.round(img[i + c] * (1 - glow) + GLOW[c] * glow));
    }
  }
}

/* The stone, alpha-composited over the background. */
const stone = rasterize(STONE);
const ox = Math.round(cx - STONE / 2), oy = Math.round(cy - STONE / 2);
for (let y = 0; y < STONE; y++) {
  for (let x = 0; x < STONE; x++) {
    const si = (y * STONE + x) * 4;
    const a = stone[si + 3] / 255;
    if (!a) continue;
    const di = ((oy + y) * W + ox + x) * 4;
    for (let c = 0; c < 3; c++) img[di + c] = Math.round(stone[si + c] * a + img[di + c] * (1 - a));
  }
}

const png = encodePNG(img, W, H);
const out = path.join(__dirname, 'og-image.png');
fs.writeFileSync(out, png);
console.log(`og-image.png  ${W}×${H}  ${(png.length / 1024).toFixed(1)} KB`);

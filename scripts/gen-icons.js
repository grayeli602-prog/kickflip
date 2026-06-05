// Generates icons/icon-192.png and icons/icon-512.png using pure Node.js
// No external dependencies required
// Run: node scripts/gen-icons.js

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(__dir, '..', 'icons'), { recursive: true });

function makePNG(size) {
  const width = size, height = size;
  // RGBA pixels
  const pixels = new Uint8Array(width * height * 4);

  // Fill background: #1a1a2e
  for (let i = 0; i < width * height; i++) {
    pixels[i*4+0] = 0x1a; pixels[i*4+1] = 0x1a;
    pixels[i*4+2] = 0x2e; pixels[i*4+3] = 0xff;
  }

  // Helper: fill rect with color
  function rect(x, y, w, h, r, g, b) {
    for (let py = y; py < y+h; py++) for (let px = x; px < x+w; px++) {
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      const idx = (py * width + px) * 4;
      pixels[idx] = r; pixels[idx+1] = g; pixels[idx+2] = b; pixels[idx+3] = 255;
    }
  }

  const s = size / 512;
  const p = (v) => Math.round(v * s);

  // Deck - maple brown
  rect(p(90), p(190), p(332), p(90), 0x8B, 0x69, 0x14);
  // Grip tape
  rect(p(90), p(190), p(332), p(25), 0x11, 0x11, 0x11);
  // Trucks
  rect(p(120), p(278), p(90), p(18), 0x55, 0x55, 0x55);
  rect(p(302), p(278), p(90), p(18), 0x55, 0x55, 0x55);
  // Wheels (small squares as circles)
  const wSize = p(22);
  for (const [wx, wy] of [[p(130),p(298)],[p(190),p(298)],[p(302),p(298)],[p(362),p(298)]]) {
    rect(wx, wy, wSize, wSize, 0x88, 0x88, 0x88);
  }
  // Neon yellow stripe (graphic on deck)
  rect(p(140), p(215), p(232), p(10), 0xe0, 0xff, 0x00);
  // "KF" text approximated as rectangles (K shape)
  const tx = p(150), ty = p(230), ch = p(40), cw = p(8);
  rect(tx, ty, cw, ch, 0xe0, 0xff, 0x00); // K left bar
  rect(tx+cw, ty, cw*3, cw, 0xe0, 0xff, 0x00); // K top arm
  rect(tx+cw, ty+ch/2-cw/2, cw*3, cw, 0xe0, 0xff, 0x00); // K mid
  rect(tx+cw, ty+ch-cw, cw*3, cw, 0xe0, 0xff, 0x00); // K bot arm
  const fx = p(220);
  rect(fx, ty, cw, ch, 0xe0, 0xff, 0x00); // F left
  rect(fx, ty, p(28), cw, 0xe0, 0xff, 0x00); // F top
  rect(fx, ty+ch/2-cw/2, p(20), cw, 0xe0, 0xff, 0x00); // F mid

  // Build PNG binary
  const pngSig = Buffer.from([137,80,78,71,13,10,26,10]);

  function chunk(type, data) {
    const tBuf = Buffer.from(type, 'ascii');
    const dBuf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const crcBuf = Buffer.alloc(4);
    let crc = 0xffffffff;
    const poly = 0xedb88320;
    for (const b of [...tBuf, ...dBuf]) {
      crc ^= b;
      for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? poly : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    crcBuf.writeUInt32BE(crc, 0);
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(dBuf.length, 0);
    return Buffer.concat([lenBuf, tBuf, dBuf, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB (we'll output RGB not RGBA to simplify)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build scanlines (filter byte 0 + RGB)
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (1 + width * 3) + 1 + x * 3;
      raw[di] = pixels[si]; raw[di+1] = pixels[si+1]; raw[di+2] = pixels[si+2];
    }
  }

  const idat = deflateSync(raw, { level: 6 });

  return Buffer.concat([
    pngSig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync(join(__dir, '..', 'icons', 'icon-192.png'), makePNG(192));
writeFileSync(join(__dir, '..', 'icons', 'icon-512.png'), makePNG(512));
console.log('Icons generated in icons/');

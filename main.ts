// The World in One Picture — Tuesday 24 November 2026 (v2).
// A fresh front page drawn in code: photorealistic hero photo (hero.png, a
// separate repo file) + 44 verified stories across 9 regions + world map +
// UTC timeline + date check. Writes /output/entry.png, deterministic:
// no clock, no network, no randomness. Node 22, standard library only.
//
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER = 0xf7f3e8ff; // warm newsprint
const INK = 0x141414ff;
const RED = 0x9e1b1bff; // dark red
const BLACK = 0x111111ff;
const GRAY = 0x5a5a5aff;
const RULE = 0x141414ff;
const SEA = 0xd8e4efff;
const LAND = 0xc2b184ff;
const WHITE = 0xffffffff;

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 4);
function fillRect(x: number, y: number, w: number, h: number, c: number): void {
  const r = (c >>> 24) & 255, g = (c >>> 16) & 255, b = (c >>> 8) & 255, a = c & 255;
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let o = (yy * W + x0) * 4;
    for (let xx = x0; xx < x1; xx++) {
      px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = a; o += 4;
    }
  }
}
function setPix(x: number, y: number, c: number): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 4;
  px[o] = (c >>> 24) & 255; px[o + 1] = (c >>> 16) & 255; px[o + 2] = (c >>> 8) & 255; px[o + 3] = c & 255;
}
function hline(x: number, y: number, w: number, c: number): void { fillRect(x, y, w, 1, c); }
function vline(x: number, y: number, h: number, c: number): void { fillRect(x, y, 1, h, c); }
function drawRect(x: number, y: number, w: number, h: number, c: number): void {
  hline(x, y, w, c); hline(x, y + h - 1, w, c); vline(x, y, h, c); vline(x + w - 1, y, h, c);
}
function fillCircle(cx: number, cy: number, r: number, c: number): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) setPix(cx + x, cy + y, c);
  }
}
function fillPolygon(pts: number[][], c: number): void {
  // scanline fill, pts are [x, y] in canvas coords
  let minY = H, maxY = 0;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  minY = Math.max(0, Math.floor(minY)); maxY = Math.min(H - 1, Math.ceil(maxY));
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.ceil(xs[i])), x1 = Math.min(W - 1, Math.floor(xs[i + 1]));
      for (let x = x0; x <= x1; x++) setPix(x, y, c);
    }
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits, written as strings. Authored in this session.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "01110", "00001", "01111", "10001", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "01110", "10001", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "01110", "10001", "11111", "10000", "10001", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "11110", "10000", "10000"],
  q: ["00000", "00000", "01111", "10001", "01111", "00001", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01001", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "|": ["00100", "00100", "00100", "00100", "00100", "00100", "00100"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
};
function textWidth(s: string, sc: number): number {
  return s.length * 6 * sc - sc;
}
function drawText(x: number, y: number, s: string, sc: number, c: number): void {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] ?? FONT[ch.toUpperCase()] ?? FONT["?"];
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === "1") fillRect(cx + col * sc, y + r * sc, sc, sc, c);
      }
    }
    cx += 6 * sc;
  }
}
function drawTextRight(xRight: number, y: number, s: string, sc: number, c: number): void {
  drawText(xRight - textWidth(s, sc), y, s, sc, c);
}
function drawTextCenter(cx: number, y: number, s: string, sc: number, c: number): void {
  drawText(cx - Math.floor(textWidth(s, sc) / 2), y, s, sc, c);
}

// ---------------------------------------------------------------- PNG decode
// Baseline PNG decoder (stdlib zlib): 8-bit, color types 0/2/3/4/6, no interlace.
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}
function decodePNG(buf: Buffer): { w: number; h: number; rgba: Uint8Array } | null {
  if (buf.length < 8 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  let off = 8;
  let w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat: Buffer[] = [];
  let plte: Buffer | null = null;
  let trns: Buffer | null = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === "PLTE") { plte = Buffer.from(data); }
    else if (type === "tRNS") { trns = Buffer.from(data); }
    else if (type === "IDAT") { idat.push(Buffer.from(data)); }
    else if (type === "IEND") { break; }
    off += 12 + len;
  }
  if (!w || !h || bitDepth !== 8 || interlace !== 0 || idat.length === 0) return null;
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (channels === 0) return null;
  let raw: Buffer;
  try { raw = inflateSync(Buffer.concat(idat)); } catch { return null; }
  const stride = w * channels;
  if (raw.length < (stride + 1) * h) return null;
  const rgba = new Uint8Array(w * h * 4);
  const prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = row[i];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) v = (v + paeth(a, b, c)) & 255;
      else if (f !== 0) return null;
      cur[i] = v;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (colorType === 2) {
        rgba[o] = cur[x * 3]; rgba[o + 1] = cur[x * 3 + 1]; rgba[o + 2] = cur[x * 3 + 2]; rgba[o + 3] = 255;
      } else if (colorType === 6) {
        rgba[o] = cur[x * 4]; rgba[o + 1] = cur[x * 4 + 1]; rgba[o + 2] = cur[x * 4 + 2]; rgba[o + 3] = cur[x * 4 + 3];
      } else if (colorType === 0) {
        const g = cur[x]; rgba[o] = g; rgba[o + 1] = g; rgba[o + 2] = g; rgba[o + 3] = 255;
      } else if (colorType === 4) {
        const g = cur[x * 2]; rgba[o] = g; rgba[o + 1] = g; rgba[o + 2] = g; rgba[o + 3] = cur[x * 2 + 1];
      } else if (colorType === 3 && plte) {
        const idx = cur[x] * 3;
        rgba[o] = plte[idx] ?? 0; rgba[o + 1] = plte[idx + 1] ?? 0; rgba[o + 2] = plte[idx + 2] ?? 0;
        rgba[o + 3] = trns && idx / 3 < trns.length ? trns[idx / 3] : 255;
      }
    }
    prev.set(cur);
  }
  return { w, h, rgba };
}

function findHero(): { w: number; h: number; rgba: Uint8Array } | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const bases = [process.env.MAKEFUN_BOT_DIR, "/bot", here, process.cwd()].filter(Boolean) as string[];
  for (const b of bases) {
    const p = join(b, "hero.png");
    try {
      if (existsSync(p)) {
        const img = decodePNG(readFileSync(p));
        if (img) return img;
      }
    } catch { /* try next */ }
  }
  return null;
}

// ---------------------------------------------------------------- PNG encode
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = W * 4;
  const raw = Buffer.alloc((stride + 1) * H);
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < H; y++) {
    const row = Buffer.from(px.buffer, px.byteOffset + y * stride, stride);
    // pick filter 0 (None) or 2 (Up) by sum of absolute signed byte diffs
    let sNone = 0, sUp = 0;
    for (let i = 0; i < stride; i++) {
      const v = row[i];
      sNone += Math.abs(v < 128 ? v : v - 256);
      const d = (v - prev[i]) & 255;
      sUp += Math.abs(d < 128 ? d : d - 256);
    }
    const off = y * (stride + 1);
    if (sUp < sNone) {
      raw[off] = 2;
      for (let i = 0; i < stride; i++) raw[off + 1 + i] = (row[i] - prev[i]) & 255;
    } else {
      raw[off] = 0;
      row.copy(raw, off + 1);
    }
    prev.set(row);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- hero art
function drawPhotoHero(img: { w: number; h: number; rgba: Uint8Array }, x: number, y: number, w: number, h: number): void {
  // scale-to-fill, centre crop biased toward the top (bias 0.35)
  const s = Math.max(w / img.w, h / img.h);
  const sw = Math.floor(w / s), sh = Math.floor(h / s);
  const sx = Math.floor((img.w - sw) / 2);
  const sy = Math.floor((img.h - sh) * 0.35);
  for (let dy = 0; dy < h; dy++) {
    const iy = sy + Math.floor((dy / h) * sh);
    if (iy < 0 || iy >= img.h) continue;
    for (let dx = 0; dx < w; dx++) {
      const ix = sx + Math.floor((dx / w) * sw);
      if (ix < 0 || ix >= img.w) continue;
      const io = (iy * img.w + ix) * 4;
      const o = ((y + dy) * W + (x + dx)) * 4;
      px[o] = img.rgba[io]; px[o + 1] = img.rgba[io + 1]; px[o + 2] = img.rgba[io + 2]; px[o + 3] = 255;
    }
  }
}
function drawProceduralHero(x: number, y: number, w: number, h: number): void {
  // fallback if hero.png cannot be read: dusk skyline, drawn in code
  for (let yy = 0; yy < h; yy++) {
    const t = yy / h;
    const r = Math.floor(24 + 90 * t), g = Math.floor(42 + 70 * t), b = Math.floor(96 + 60 * t);
    fillRect(x, y + yy, w, 1, (r << 24 | g << 16 | b << 8 | 255) >>> 0);
  }
  fillRect(x, y + h - 26, w, 26, 0x1a1a2e00 + 255);
  const towers: number[][] = [[40, 60, 150], [130, 90, 190], [250, 40, 236], [420, 70, 170], [560, 50, 210], [700, 80, 150], [830, 55, 190], [930, 75, 130]];
  for (const t of towers) {
    const tx = x + t[0], tw = t[1], th = t[2];
    fillRect(tx, y + h - 26 - th, tw, th, 0x0d0d1aff);
    for (let wy = y + h - 26 - th + 12; wy < y + h - 40; wy += 16) {
      for (let wx = tx + 8; wx < tx + tw - 8; wx += 14) {
        if ((wx * 7 + wy * 13) % 5 < 2) fillRect(wx, wy, 5, 6, 0xffd27aff);
      }
    }
  }
}

// ---------------------------------------------------------------- world map
// Rough lon/lat outlines, authored in this session (schematic, not surveyed).
const CONTINENTS: number[][][] = [
  [[-168, 66], [-150, 70], [-135, 69], [-125, 71], [-110, 73], [-95, 80], [-85, 74], [-75, 72], [-65, 62], [-55, 52], [-60, 46], [-70, 42], [-75, 35], [-81, 26], [-86, 21], [-90, 14], [-97, 16], [-105, 20], [-112, 24], [-117, 33], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
  [[-79, 9], [-77, 4], [-72, 2], [-62, -2], [-52, 0], [-44, -3], [-35, -8], [-38, -15], [-41, -23], [-48, -28], [-53, -33], [-58, -38], [-65, -45], [-68, -52], [-71, -54], [-73, -44], [-73, -33], [-71, -20], [-77, -12], [-80, -5]],
  [[-17, 15], [-16, 21], [-10, 30], [-6, 34], [0, 36], [10, 37], [15, 32], [20, 32], [25, 31], [32, 31], [34, 28], [37, 22], [39, 15], [43, 12], [48, 11], [51, 12], [46, 5], [41, -2], [40, -10], [37, -18], [33, -26], [28, -33], [20, -35], [16, -28], [13, -18], [12, -10], [9, -1], [4, 6], [-8, 5], [-13, 8]],
  [[-10, 36], [-9, 43], [-4, 48], [-1, 50], [3, 52], [7, 54], [8, 57], [11, 59], [18, 56], [21, 55], [24, 58], [28, 60], [30, 62], [33, 65], [40, 67], [48, 68], [55, 69], [65, 70], [75, 72], [85, 74], [95, 75], [105, 77], [115, 74], [125, 73], [135, 72], [145, 72], [155, 70], [162, 66], [170, 67], [178, 65], [173, 64], [170, 60], [162, 58], [156, 52], [150, 59], [142, 54], [141, 45], [139, 38], [132, 35], [128, 34], [122, 31], [120, 28], [113, 22], [109, 18], [105, 10], [103, 7], [100, 8], [97, 12], [94, 17], [91, 22], [88, 22], [85, 19], [80, 15], [77, 8], [75, 12], [72, 20], [68, 22], [62, 25], [58, 26], [55, 27], [52, 28], [49, 30], [47, 30], [44, 29], [42, 31], [40, 36], [37, 36], [34, 36], [31, 36], [28, 37], [26, 38], [23, 36], [22, 40], [19, 42], [15, 44], [12, 44], [8, 44], [5, 43], [2, 43], [0, 40], [-2, 37], [-6, 36], [-9, 37]],
  [[-5, 50], [-3, 53], [-5, 56], [-3, 58], [0, 53], [1, 51]],
  [[130, 31], [132, 33], [134, 34], [136, 35], [138, 37], [140, 39], [141, 42], [143, 44], [145, 44], [142, 42], [140, 38], [138, 35], [135, 33], [132, 31]],
  [[95, 5], [100, 0], [105, -4], [110, -6], [114, -8], [118, -9], [122, -10], [126, -8], [130, -4], [134, -3], [138, -2], [141, -3], [140, -6], [136, -8], [132, -8], [128, -6], [124, -4], [120, -2], [116, 0], [112, 0], [108, -2], [104, -4], [100, -2], [97, 3]],
  [[113, -22], [114, -28], [115, -34], [119, -34], [124, -33], [129, -32], [132, -32], [136, -35], [139, -37], [142, -38], [146, -39], [150, -37], [153, -32], [153, -27], [150, -23], [146, -19], [143, -15], [142, -11], [139, -14], [136, -12], [132, -12], [128, -14], [125, -14], [122, -17], [118, -20], [114, -21]],
  [[167, -45], [170, -42], [173, -40], [176, -38], [178, -37], [175, -40], [172, -42], [169, -44], [167, -46]],
];
function drawMap(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SEA);
  const proj = (lon: number, lat: number): number[] => [
    x + Math.floor(((lon + 180) / 360) * w),
    y + Math.floor(((84 - lat) / 140) * h),
  ];
  for (let lon = -150; lon <= 150; lon += 30) {
    const gx = x + Math.floor(((lon + 180) / 360) * w);
    for (let yy = y; yy < y + h; yy += 2) setPix(gx, yy, 0xc4d3e2ff);
  }
  for (const poly of CONTINENTS) {
    fillPolygon(poly.map((p) => proj(p[0], p[1])), LAND);
  }
  // dot 5 (Gaza) labels to the left so its number never touches dot 1 (Riyadh)
  const dots: [number, number, string, number][] = [
    [45.0, 24.6, "1", 7], [24.7, 59.4, "2", 7], [6.1, 46.2, "3", 7], [-17.4, 14.7, "4", 7], [34.5, 31.5, "5", -13],
  ];
  for (const d of dots) {
    const p = proj(d[0], d[1]);
    fillCircle(p[0], p[1], 5, RED);
    fillCircle(p[0], p[1], 2, WHITE);
    drawText(p[0] + d[3], p[1] - 3, d[2], 1, INK);
  }
}

// ---------------------------------------------------------------- content
const REGIONS: { name: string; items: string[] }[] = [
  { name: "EUROPE (11)", items: [
    "Russia warns Estonia of 'open war' over border closure",
    "Estonia to shut border from 1 Dec, at least 6 months",
    "NATO vows space defence after nuclear-satellite reports",
    "EU court: Spain amnesty law complies with EU rules",
    "7 states back EU curbs on Russian visas (B)",
    "Germany first to access Ukraine's Delta battle system",
    "Zaporizhzhia strike kills 2, wounds 40, incl. 4 children",
    "UCL: Real 5-1 PSV; Arsenal 1-1 Dortmund; City 2-2 Napoli",
    "Chess: Gukesh-Sindarov Game 1 drawn, 38 moves, 0.5-0.5",
    "FIFA names 2031/2035 Women's World Cup hosts (B)",
    "Belgium strike halts flights as budget deadline set",
  ] },
  { name: "MIDDLE EAST (4)", items: [
    "HERO: Houthis hit Riyadh PIF Tower, 11 wounded",
    "Houthi fighters about 60 km from Aden",
    "Gaza strikes kill Hamas security chief + 6",
    "Iraq takes over Kurdish-controlled oilfields",
  ] },
  { name: "ASIA (8)", items: [
    "Indonesia factory fire search: 24 dead, 30 missing",
    "Manila transport strike, day 2; 6,000 police out",
    "China probes Politburo member Chen Jining",
    "Russian jets enter S. Korea air-defence zone",
    "S. Korea: $375,000 rewards to catch AI cheats",
    "US blacklists Singapore's Megaspeed (B)",
    "Hasina plans return to Bangladesh on Dec 16",
    "India court bails Godhra convict on medical grounds",
  ] },
  { name: "AMERICAS (5)", items: [
    "Nvidia reinstates Huang as CEO; shares rebound",
    "States sue Musk firms over Grok sexual images",
    "Trump expected to unveil tariffs on China, EU",
    "Lame-duck US Congress in session in Washington",
    "US drone over Mexico nabs 'El Chapo Isidro' (B)",
  ] },
  { name: "AFRICA (4)", items: [
    "Senegal reinstated as AFCON champions by CAS",
    "Ituri fighting traps DR Congo Ebola teams (B)",
    "Kenya, DR Congo restore full diplomatic ties (B)",
    "Kenya joins Africa CDC board for 2 years (B)",
  ] },
  { name: "OCEANIA (3)", items: [
    "Chalmers: budget 'save more than we spend'",
    "Taylor: 'tough year' for Coalition partyroom",
    "India v NZ: 2nd Test starts Friday, Christchurch",
  ] },
  { name: "BUSINESS (3)", items: [
    "Sanofi buys Insmed for $41bn, $175 a share",
    "Markets: S&P -0.95%; Brent $87.51; gas +5.9%",
    "Brazil cuts 2027 growth forecast as real weakens",
  ] },
  { name: "SCIENCE (3)", items: [
    "FDA approves first limb-girdle dystrophy drug",
    "Most distant quasar found, 630m yrs after Big Bang",
    "Supermoon meets the Pleiades tonight",
  ] },
  { name: "GLOBAL (3)", items: [
    "UN: Gaza war undid 77 years of development",
    "47,000 women killed by partners in 2025 (UN)",
    "Guterres: agree AI safety rules within a year (B)",
  ] },
];

// ---------------------------------------------------------------- draw page
fillRect(0, 0, W, H, PAPER);

// masthead
fillRect(0, 0, W, 56, BLACK);
drawText(16, 14, "THE WORLD IN ONE PICTURE", 4, WHITE);
drawTextRight(W - 16, 22, "ONE DAY, ONE PAGE", 2, 0xbbbbbbff);

// date band
fillRect(0, 56, W, 38, RED);
drawText(16, 65, "TUESDAY 24 NOVEMBER 2026", 4, WHITE);
drawTextRight(W - 16, 70, "44 STORIES - 9 REGIONS", 2, WHITE);

// hero photo
const hero = findHero();
if (hero) drawPhotoHero(hero, 0, 94, W, 236);
else drawProceduralHero(0, 94, W, 236);
hline(0, 330, W, INK);

// hero headline
drawText(16, 340, "HOUTHIS HIT RIYADH'S TALLEST TOWER", 3, INK);
drawText(16, 364, "PIF Tower struck for the 2nd time in 5 days - 11 wounded", 2, INK);
drawText(16, 382, "Houthi fighters 60 km from Aden  |  Reuters / WSJ", 2, GRAY);

// leads row (left) + map (right)
const LEAD_X = 12, LEAD_W = 652;
function leadBox(y: number, kicker: string, head: string, sub1: string, sub2: string): void {
  drawText(LEAD_X, y, kicker, 1, RED);
  drawText(LEAD_X, y + 12, head, 2, INK);
  drawText(LEAD_X, y + 30, sub1, 1, INK);
  drawText(LEAD_X, y + 42, sub2, 1, GRAY);
}
leadBox(406, "LEAD 2 - EUROPE", "RUSSIA WARNS ESTONIA OF OPEN WAR",
  "Moscow: border closure from 1 Dec is 'on the verge of triggering open war'.",
  "Tallinn to shut crossings for at least 6 months. (Reuters)");
hline(LEAD_X, 492, LEAD_W, RULE);
leadBox(500, "LEAD 3 - SECURITY", "NATO VOWS TO DEFEND SPACE",
  "Reports: Russia may launch a nuclear-armed satellite within 60 days.",
  "Rutte in Berlin: 'We defend every inch - including space.' (SZ/NDR/WDR)");

// map panel
const MAP_X = 676, MAP_Y = 404, MAP_W = 336, MAP_H = 152;
drawRect(MAP_X, MAP_Y, MAP_W, MAP_H, INK);
drawText(MAP_X + 8, MAP_Y + 6, "WHERE THE DAY HAPPENED", 1, RED);
drawMap(MAP_X + 4, MAP_Y + 20, MAP_W - 8, 104);
drawText(MAP_X + 8, MAP_Y + 128, "1 RIYADH  2 TALLINN  3 GENEVA", 1, INK);
drawText(MAP_X + 8, MAP_Y + 140, "4 DAKAR  5 GAZA", 1, INK);
hline(0, 566, W, INK);

// region grid: two columns, one-line briefs
const COL_A_X = 12, COL_B_X = 518, GRID_TOP = 574;
let cyA = GRID_TOP, cyB = GRID_TOP;
function regionCol(x: number, yStart: number, regs: typeof REGIONS): number {
  let y = yStart;
  for (const r of regs) {
    drawText(x, y, r.name, 2, RED);
    hline(x, y + 15, 494, 0x999999ff);
    y += 17;
    for (const it of r.items) {
      drawText(x, y, it, 1, INK);
      y += 10;
    }
    y += 4;
  }
  return y;
}
cyA = regionCol(COL_A_X, cyA, REGIONS.slice(0, 3));
cyB = regionCol(COL_B_X, cyB, REGIONS.slice(3));
hline(0, 918, W, INK);

// UTC timeline
drawText(12, 926, "UTC TIMELINE", 1, RED);
drawText(120, 926, "05:21  EU court backs Spain amnesty     07:05  Sanofi buys Insmed $41bn     12:37  Riyadh tower struck", 1, INK);
drawText(120, 940, "14:00  Chess Game 1 starts, Geneva     15:47  CAS reinstates Senegal     19:00  UCL: Real Madrid 5-1 PSV", 1, INK);

// date check band
fillRect(0, 958, W, 28, BLACK);
drawText(12, 967, "DATE CHECK: every story happened, or was first reported, on Tue 24 Nov 2026. (B) = reported Mon UTC, first Tue in Asia-Pacific.", 1, WHITE);

// footer
drawText(12, 994, "Sources: Reuters, WSJ, AP, BBC, UEFA, FIDE, UN, Sanofi, Kyiv Independent, ChessBase. Hero photo: PIF Tower, Riyadh at dusk (illustration).", 1, GRAY);
drawText(12, 1006, "Drawn in code. make.fun news-image-20261124 - v2.", 1, GRAY);

// ---------------------------------------------------------------- write out
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entry.png"), encodePNG());

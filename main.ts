// news-image-20261126 — "The World in One Day"
// A one-day newspaper front page for Thursday 26 November 2026, drawn from
// scratch: pixel buffer + hand-written 5x8 bitmap font + hand-rolled PNG
// encoder (IHDR/IDAT/IEND with CRC-32, deflate via node:zlib). Node 22
// standard library only, no network, fully deterministic: the date is a
// fixed string, there is no clock, no randomness, no file input. Two runs
// write byte-identical entry.png.
//
// Facts come only from the verified research brief for this day:
// 3 heroes, 6 mid stories, 8 briefs, 16 micros, and a CLAIMED vs CONFIRMED
// honesty box. Casualty and market figures are exactly as the brief sets
// them (Sudan 19/20, Cairo at least 31/21 preliminary, Nasdaq close -0.6%
// after -4.6% intraday, Nvidia close -3.9% after -8.7% intraday).

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ------------------------------------------------------------------ CRC-32
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ------------------------------------------------------------------ PNG out
function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(width: number, height: number, rgb: Buffer): Buffer {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: None
    rgb.copy(raw, y * stride + 1, y * width * 3, (y + 1) * width * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ canvas
const W = 1024;
const H = 1024;
const img = Buffer.alloc(W * H * 3);

type RGB = [number, number, number];
function hex(s: string): RGB {
  return [
    parseInt(s.slice(1, 3), 16),
    parseInt(s.slice(3, 5), 16),
    parseInt(s.slice(5, 7), 16),
  ];
}

const PAPER = hex("#F7F2E7");
const INK = hex("#191512");
const MUTED = hex("#5C5347");
const RED = hex("#B3261E");
const GREEN = hex("#1E7A34");
const AMBER = hex("#B45309");
const BLUE = hex("#1F3A5F");
const GOLD = hex("#C98A1B");
const WHITE = hex("#FFFFFF");
const LINE = hex("#191512");

function setPx(x: number, y: number, c: RGB): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const o = (yi * W + xi) * 3;
  img[o] = c[0];
  img[o + 1] = c[1];
  img[o + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w));
  const y1 = Math.min(H, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    let o = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      img[o] = c[0];
      img[o + 1] = c[1];
      img[o + 2] = c[2];
      o += 3;
    }
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPx(x, y, c);
    }
  }
}

function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  const r2 = r * r;
  const rIn = Math.max(0, r - t);
  const rIn2 = rIn * rIn;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(H - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2 && d2 >= rIn2) setPx(x, y, c);
    }
  }
}

// Bresenham line, thickness in pixels (square brush).
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, thick = 1): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = Math.round(x0);
  let y = Math.round(y0);
  const half = Math.floor(thick / 2);
  for (;;) {
    for (let a = -half; a <= half; a++)
      for (let b = -half; b <= half; b++) setPx(x + a, y + b, c);
    if (x === Math.round(x1) && y === Math.round(y1)) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

// Scanline polygon fill (points: [x, y] pairs, non-self-intersecting).
function fillPoly(points: number[][], c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      fillRect(Math.ceil(xs[k]), y, Math.floor(xs[k + 1]) - Math.ceil(xs[k]) + 1, 1, c);
    }
  }
}

// ------------------------------------------------------- 5x8 bitmap font
// Each glyph: 8 rows, 5 bits each, bit 4 = leftmost column. Row 7 is the
// descender row (g, j, p, q, y). Cap height is 7 rows; scale = px / 7.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11, 0],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e, 0],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e, 0],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e, 0],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f, 0],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10, 0],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f, 0],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11, 0],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e, 0],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c, 0],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11, 0],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f, 0],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11, 0],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11, 0],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e, 0],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10, 0],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d, 0],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11, 0],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e, 0],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e, 0],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04, 0],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11, 0],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11, 0],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04, 0],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f, 0],
  a: [0, 0, 0x0e, 0x01, 0x0f, 0x11, 0x0f, 0],
  b: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x1e, 0],
  c: [0, 0, 0x0e, 0x11, 0x10, 0x11, 0x0e, 0],
  d: [0x01, 0x01, 0x0f, 0x11, 0x11, 0x11, 0x0f, 0],
  e: [0, 0, 0x0e, 0x11, 0x1f, 0x10, 0x0e, 0],
  f: [0x06, 0x09, 0x08, 0x1e, 0x08, 0x08, 0x08, 0],
  g: [0, 0, 0x0e, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  h: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x11, 0],
  i: [0, 0x04, 0, 0x0c, 0x04, 0x04, 0x0e, 0],
  j: [0x02, 0, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12, 0],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e, 0],
  m: [0, 0, 0x1a, 0x15, 0x15, 0x15, 0x15, 0],
  n: [0, 0, 0x1e, 0x11, 0x11, 0x11, 0x11, 0],
  o: [0, 0, 0x0e, 0x11, 0x11, 0x11, 0x0e, 0],
  p: [0, 0, 0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10],
  q: [0, 0, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x01],
  r: [0, 0, 0x16, 0x19, 0x10, 0x10, 0x10, 0],
  s: [0, 0, 0x0f, 0x10, 0x0e, 0x01, 0x1e, 0],
  t: [0x04, 0x04, 0x1f, 0x04, 0x04, 0x04, 0x03, 0],
  u: [0, 0, 0x11, 0x11, 0x11, 0x13, 0x0d, 0],
  v: [0, 0, 0x11, 0x11, 0x11, 0x0a, 0x04, 0],
  w: [0, 0, 0x11, 0x11, 0x15, 0x15, 0x1b, 0],
  x: [0, 0, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0],
  y: [0, 0, 0x11, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  z: [0, 0, 0x1f, 0x02, 0x04, 0x08, 0x1f, 0],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e, 0],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e, 0],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f, 0],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e, 0],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02, 0],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e, 0],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e, 0],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08, 0],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e, 0],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c, 0],
  " ": [0, 0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0, 0x0c, 0],
  ",": [0, 0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0, 0x04, 0, 0, 0x04, 0, 0],
  ";": [0, 0, 0x04, 0, 0, 0x04, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0, 0],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04, 0],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04, 0],
  "-": [0, 0, 0, 0x0e, 0, 0, 0, 0],
  "—": [0, 0, 0, 0x1f, 0, 0, 0, 0],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02, 0],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08, 0],
  "/": [0x01, 0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13, 0],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04, 0],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d, 0],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0, 0],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0, 0],
  "·": [0, 0, 0, 0, 0x04, 0, 0, 0],
  "~": [0, 0, 0, 0x0e, 0x15, 0, 0, 0],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08, 0],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02, 0],
};

// ------------------------------------------------------------------ text
// px = cap height in pixels (7 glyph rows). scale = px / 7, advance = 6*scale.
const problems: string[] = [];
const allStrings: string[] = [];

function registerText(s: string): void {
  allStrings.push(s);
}

function checkGlyphs(): void {
  for (const s of allStrings) {
    for (const ch of s) {
      if (!(ch in FONT)) problems.push(`MISSING GLYPH for ${JSON.stringify(ch)} in ${JSON.stringify(s)}`);
    }
  }
}

function textWidth(text: string, px: number): number {
  const scale = px / 7;
  return text.length === 0 ? 0 : text.length * 6 * scale - scale;
}

function drawChar(x: number, y: number, ch: string, px: number, c: RGB, bold: boolean): void {
  const g = FONT[ch];
  if (!g) return;
  const scale = px / 7;
  const w = Math.max(1, Math.round(5 * scale));
  const h = Math.max(1, Math.round(8 * scale));
  const passes = bold ? [0, 1] : [0];
  for (const dx of passes) {
    for (let py = 0; py < h; py++) {
      const row = g[Math.min(7, Math.floor(py / scale))];
      if (!row) continue;
      for (let px0 = 0; px0 < w; px0++) {
        const col = Math.min(4, Math.floor(px0 / scale));
        if (row & (1 << (4 - col))) setPx(x + px0 + dx, y + py, c);
      }
    }
  }
}

// Draw one line left-aligned at (x, y). y is the cap top.
function drawText(x: number, y: number, text: string, px: number, c: RGB, bold = false): number {
  const scale = px / 7;
  let cx = x;
  for (const ch of text) {
    drawChar(Math.round(cx), Math.round(y), ch, px, c, bold);
    cx += 6 * scale;
  }
  return cx - x;
}

function drawTextCentered(cx: number, y: number, text: string, px: number, c: RGB, bold = false): void {
  const w = textWidth(text, px);
  drawText(Math.round(cx - w / 2), y, text, px, c, bold);
}

// Greedy word wrap. Returns the lines that fit maxW.
function wrapText(text: string, maxW: number, px: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, px) <= maxW || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// Draw a wrapped paragraph. Records a problem (and draws only maxLines)
// when the text needs more lines than allowed.
function drawPara(
  x: number,
  y: number,
  maxW: number,
  text: string,
  px: number,
  c: RGB,
  maxLines: number,
  lineH: number,
  bold = false,
): number {
  const lines = wrapText(text, maxW, px);
  if (lines.length > maxLines) {
    problems.push(`TRUNCATED (${lines.length} lines > ${maxLines}): ${JSON.stringify(text)}`);
  }
  const n = Math.min(lines.length, maxLines);
  for (let i = 0; i < n; i++) {
    drawText(x, Math.round(y + i * lineH), lines[i], px, c, bold);
  }
  return n * lineH;
}

// Draw one line; record a problem if it is wider than maxW.
function drawLineFit(
  x: number,
  y: number,
  maxW: number,
  text: string,
  px: number,
  c: RGB,
  bold = false,
): void {
  const w = textWidth(text, px);
  if (w > maxW) problems.push(`TOO WIDE (${Math.round(w)}px > ${Math.round(maxW)}px): ${JSON.stringify(text)}`);
  drawText(x, y, text, px, c, bold);
}

// Small coloured label chip with white text.
function chip(x: number, y: number, label: string, bg: RGB, px = 11): number {
  const pad = 6;
  const w = textWidth(label, px) + pad * 2;
  fillRect(x, y, w, px + 7, bg);
  drawText(x + pad, y + 3, label, px, WHITE, true);
  return w;
}

function rule(x: number, y: number, w: number, c: RGB = LINE, t = 1): void {
  fillRect(x, y, w, t, c);
}

// ------------------------------------------------------------ hero scenes
// Flat-vector scenes, drawn with the same primitives as everything else.

function sceneNuclear(x: number, y: number, w: number, h: number): void {
  const bg = hex("#232733");
  const bg2 = hex("#2E3342");
  const steel = hex("#3A4152");
  const steel2 = hex("#4A5266");
  const dark = hex("#14161D");
  const yellow = hex("#F2C230");
  fillRect(x, y, w, h, bg);
  fillRect(x, y + h - 26, w, 26, bg2);
  // wall panels
  for (let i = 1; i < 5; i++) line(x + (w * i) / 5, y + 6, x + (w * i) / 5, y + h - 26, steel, 1);
  // centrifuge hall: two rows of cylinders, centre-left
  for (let r = 0; r < 2; r++) {
    const cy = y + 18 + r * 34;
    for (let i = 0; i < 5; i++) {
      const cx = x + 26 + i * 30;
      fillRect(cx - 7, cy, 14, 30, steel);
      fillCircle(cx, cy, 7, steel2);
      fillCircle(cx, cy, 3, dark);
    }
  }
  // radiation trefoil on a dark disc, right of the hall
  const tx = x + w - 78;
  const ty = y + 34;
  fillCircle(tx, ty, 26, dark);
  ring(tx, ty, 26, 2, yellow);
  for (let k = 0; k < 3; k++) {
    const a = (-Math.PI / 2 + (k * 2 * Math.PI) / 3);
    fillCircle(tx + Math.cos(a) * 13, ty + Math.sin(a) * 13, 9, yellow);
  }
  fillCircle(tx, ty, 6, yellow);
  // Hwasan-31 tactical warhead on a cradle, far right
  const wx = x + w - 26;
  const wy = y + h - 26;
  fillPoly(
    [[wx - 8, wy - 44], [wx, wy - 58], [wx + 8, wy - 44], [wx + 8, wy], [wx - 8, wy]],
    hex("#8A8F9E"),
  );
  fillRect(wx - 8, wy - 30, 16, 4, yellow);
  fillRect(wx - 14, wy - 2, 28, 3, steel2);
  // inspector silhouette at a console, bottom-left (light grey, visible)
  const figure = hex("#8A8F9E");
  fillCircle(x + 34, y + h - 52, 7, figure);
  fillPoly([[x + 24, y + h - 44], [x + 44, y + h - 44], [x + 50, y + h - 26], [x + 18, y + h - 26]], figure);
  fillRect(x + 56, y + h - 38, 34, 5, steel2);
  fillRect(x + 56, y + h - 33, 4, 7, steel2);
  fillRect(x + 86, y + h - 33, 4, 7, steel2);
}

function sceneRefinery(x: number, y: number, w: number, h: number): void {
  const sky = hex("#EFA94A");
  const sky2 = hex("#E8873A");
  const ground = hex("#2B2320");
  const dark = hex("#241D1A");
  const smoke1 = hex("#6E6258");
  const smoke2 = hex("#8A7F74");
  fillRect(x, y, w, h, sky);
  fillRect(x, y + h - 20, w, 20, ground);
  // sun
  fillCircle(x + w - 52, y + 24, 15, hex("#F7D774"));
  // smoke plumes rising from the tallest column
  fillCircle(x + 96, y + 12, 10, smoke2);
  fillCircle(x + 88, y + 24, 13, smoke1);
  fillCircle(x + 98, y + 38, 11, smoke2);
  fillCircle(x + 90, y + 52, 9, smoke1);
  // distillation columns (left cluster)
  fillRect(x + 78, y + 46, 16, h - 46 - 20, dark);
  fillPoly([[x + 78, y + 46], [x + 86, y + 34], [x + 94, y + 46]], dark);
  fillRect(x + 104, y + 58, 12, h - 58 - 20, dark);
  fillPoly([[x + 104, y + 58], [x + 110, y + 48], [x + 116, y + 58]], dark);
  fillRect(x + 52, y + 66, 12, h - 66 - 20, dark);
  // storage tanks (right cluster)
  fillRect(x + 150, y + 62, 52, h - 62 - 20, dark);
  fillCircle(x + 176, y + 62, 26, dark);
  fillRect(x + 214, y + 70, 40, h - 70 - 20, dark);
  fillCircle(x + 234, y + 70, 20, dark);
  // connecting pipes
  fillRect(x + 40, y + h - 34, w - 80, 4, dark);
  fillRect(x + 120, y + h - 44, 4, 14, dark);
  // flare stack with flame
  fillRect(x + 268, y + 40, 6, h - 40 - 20, dark);
  fillPoly([[x + 264, y + 40], [x + 277, y + 40], [x + 271, y + 26]], hex("#E85D1F"));
  fillPoly([[x + 267, y + 40], [x + 274, y + 40], [x + 271, y + 31]], hex("#F7D774"));
  // drone, upper-middle, with dashed interception line (clear of the tag)
  const dx = x + w - 150;
  const dy = y + 14;
  fillRect(dx - 7, dy - 2, 14, 4, dark);
  line(dx - 12, dy - 6, dx + 12, dy - 6, dark, 1);
  line(dx - 12, dy + 6, dx + 12, dy + 6, dark, 1);
  fillCircle(dx - 12, dy - 6, 2, dark);
  fillCircle(dx + 12, dy - 6, 2, dark);
  fillCircle(dx - 12, dy + 6, 2, dark);
  fillCircle(dx + 12, dy + 6, 2, dark);
  for (let i = 0; i < 6; i++) {
    fillRect(dx + 12 + i * 7, dy + 22 + i * 5, 4, 2, RED);
  }
  line(dx + 44, dy + 52, dx + 52, dy + 44, RED, 2);
  line(dx + 52, dy + 52, dx + 44, dy + 44, RED, 2);
  void sky2;
}

function sceneMarket(x: number, y: number, w: number, h: number): void {
  const bg = hex("#DCE6EF");
  const tower = hex("#1F3A5F");
  const tower2 = hex("#2C4E79");
  const win = hex("#F2C230");
  fillRect(x, y, w, h, bg);
  // (numbers live in the headline and fact below; the scene stays clean)
  // skyscraper silhouettes along the bottom (max 40 tall)
  const heights = [26, 36, 22, 40, 30, 20, 34];
  let bx = x + 8;
  for (let i = 0; i < heights.length; i++) {
    const bw = 26;
    const bh = heights[i];
    fillRect(bx, y + h - bh, bw, bh, i % 2 === 0 ? tower : tower2);
    for (let wy = y + h - bh + 6; wy < y + h - 6; wy += 11) {
      for (let wx = bx + 5; wx < bx + bw - 5; wx += 9) {
        if ((wx + wy) % 3 === 0) fillRect(wx, wy, 3, 4, win);
      }
    }
    bx += bw + 6;
  }
  // chart: plunge in red, recovery in green, above the skyline
  const pts: number[][] = [
    [x + 14, y + 22],
    [x + 62, y + 26],
    [x + 104, y + 40],
    [x + 138, y + 54],
    [x + 168, y + 58],
    [x + 206, y + 46],
    [x + 244, y + 36],
    [x + 284, y + 30],
  ];
  for (let i = 0; i + 1 < pts.length; i++) {
    const c = i < 4 ? RED : GREEN;
    line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, 3);
  }
  for (const p of pts) fillCircle(p[0], p[1], 3, INK);
  // small red down arrow beside the plunge
  fillPoly(
    [[x + 152, y + 56], [x + 144, y + 44], [x + 149, y + 44], [x + 149, y + 32], [x + 155, y + 32], [x + 155, y + 44], [x + 160, y + 44]],
    RED,
  );
}

// ------------------------------------------------------------------ content
// Every string below is from the verified research brief for 26 Nov 2026.
// Nothing is invented: claims stay labelled CLAIMED, intraday figures stay
// labelled intraday, and the brief's chosen figures are used (Sudan 19/20,
// Cairo at least 31/21 preliminary, Nasdaq close -0.6% / intraday -4.6%).

interface Hero {
  chip: string;
  chipBg: RGB;
  tag: string;
  tagBg: RGB;
  scene: (x: number, y: number, w: number, h: number) => void;
  headline: string;
  fact: string;
  dateline: string;
}

const HEROES: Hero[] = [
  {
    chip: "ASIA",
    chipBg: BLUE,
    tag: "CONFIRMED",
    tagBg: GREEN,
    scene: sceneNuclear,
    headline: "Kim orders tactical nukes wider",
    fact: "KCNA reports Kim inspected nuclear sites and ordered production expanded.",
    dateline: "First reported 26 Nov · KCNA",
  },
  {
    chip: "MIDDLE EAST",
    chipBg: AMBER,
    tag: "CLAIMED",
    tagBg: RED,
    scene: sceneRefinery,
    headline: "Houthis claim Saudi refinery hit",
    fact: "Claimed hit on Ras Tanura; 4 drones downed, no casualties; Brent $93.60.",
    dateline: "First reported 25 Nov · Reuters",
  },
  {
    chip: "MARKETS",
    chipBg: hex("#2C4E79"),
    tag: "CONFIRMED",
    tagBg: GREEN,
    scene: sceneMarket,
    headline: "Nasdaq dives 4.6%, then recovers",
    fact: "Nasdaq -4.6% intraday, closed -0.6%; Trump tariffs target 14 nations.",
    dateline: "First reported 25 Nov · AP",
  },
];

interface Mid {
  chip: string;
  chipBg: RGB;
  headline: string;
  fact: string;
}

const MIDS: Mid[] = [
  { chip: "WAR · UKRAINE", chipBg: RED, headline: "Russia's records: 490,334 dead", fact: "Rosstat leak: 490,334 dead; modelled toll over 720,000." },
  { chip: "SPACE · CHINA", chipBg: BLUE, headline: "Pakistan's first astronaut flies", fact: "Shenzhou-24 docks at Tiangong with Zeeshan Ali aboard." },
  { chip: "SCIENCE · ESA", chipBg: hex("#2C4E79"), headline: "Hera finds giant Dimorphos crater", fact: "Hera images show DART left a stadium-sized crater." },
  { chip: "GAZA", chipBg: AMBER, headline: "Hamas security chief killed", fact: "Abu al-Auf, wife and daughters die in Shati." },
  { chip: "EGYPT", chipBg: hex("#7A4A21"), headline: "31 killed in Cairo tanker fire", fact: "Tanker overturns, fire hits 27 vehicles; 31 dead." },
  { chip: "SUDAN", chipBg: hex("#5B3A6E"), headline: "19 killed in Blue Nile strikes", fact: "RSF drones hit Damazin and Roseires; 19 dead, 20 hurt." },
];

interface Brief {
  headline: string;
  fact: string;
}

const BRIEFS: Brief[] = [
  { headline: "FCC clears SpaceX orbital data centres", fact: "Up to 1m satellites; a first for US space data." },
  { headline: "Solomons pick Australia over China", fact: "$740m over 10 years; no foreign military bases." },
  { headline: "Venezuela reveals $237.5bn debt pile", fact: "Debt 242% of GDP; bonds rose about 4 cents." },
  { headline: "Bangladesh garment pay rises 36%", fact: "Minimum wage 12,500 to 17,000 taka a month." },
  { headline: "Netanyahu bribery case: drop urged", fact: "A recommendation, not a ruling; Case 4000." },
  { headline: "Colombia: 10 years on, 36% delivered", fact: "Only 36% of 578 peace deal terms fully met." },
  { headline: "Miss Universe crowns first married mother", fact: "Barreto of Puerto Rico wins in San Juan." },
  { headline: "Iran claims tankers hit mines in Hormuz", fact: "Unverified; UKMTO disputes the mine claim." },
];

const MICROS: string[] = [
  "Ukraine hits Savasleyka air base — 5 jets out",
  "Murmansk governor jailed in graft probe",
  "Ramaphosa wins Farmgate reprieve",
  "At least 30 killed in Nigeria's Niger state",
  "Lukashenko offers to fly Zelensky to Moscow",
  "Duran Duran's Andy Taylor dies at 65",
  "Cartagena siege ends, all hostages freed",
  "97 Grameen Bank branches firebombed",
  "Norway voids three North Sea oil licences",
  "DRC Ebola: 11,042 cases, 5,387 dead",
  "BepiColombo now orbits Mercury",
  "Petrobras bets $122bn on oil",
  "EU summit opens in Brussels",
  "US economy: GDP +4.3%, inflation hotter",
  "Lebanon to open a second airport",
  "California braces for Thanksgiving king tides",
];

const HONESTY_LEFT = [
  "Iran claims tankers hit mines in Hormuz — unverified; UKMTO disputes it.",
  "Houthis claim Ras Tanura was hit and burned — Saudi: 4 drones downed; damage unconfirmed.",
];
const HONESTY_RIGHT = [
  "Nasdaq closed -0.6% after -4.6% intraday; Nvidia closed -3.9% after -8.7%.",
  "Russia: 490,334 dead (Rosstat leak); Sudan 19 dead, Cairo at least 31 (preliminary).",
];

const MASTHEAD_TITLE = "THE WORLD IN ONE DAY";
const MASTHEAD_DATE = "Thursday 26 November 2026";
const MASTHEAD_SUB = "33 stories from every region · Asia · Middle East · Americas · Europe · Africa";
const FOOTER_SOURCES =
  "Sources: Reuters · AP · CNN · BBC · Xinhua · ESA · WHO · DFAT · Le Monde · NRC · Al Jazeera · People · Zacks · SpacePolicyOnline · Colombia Reports · PTI · BusinessWorld · Kitco · BBN Times · France24 · CounterVortex/JURIST · C54 News · Devdiscourse";
const FOOTER_NOTE =
  "Events first reported 26 Nov 2026 unless dated · Preliminary counts may rise · Drawn by program";

function registerAllStrings(): void {
  registerText(MASTHEAD_TITLE);
  registerText(MASTHEAD_DATE);
  registerText(MASTHEAD_SUB);
  registerText(FOOTER_SOURCES);
  registerText(FOOTER_NOTE);
  for (const h of HEROES) {
    registerText(h.chip);
    registerText(h.tag);
    registerText(h.headline);
    registerText(h.fact);
    registerText(h.dateline);
  }
  for (const m of MIDS) {
    registerText(m.chip);
    registerText(m.headline);
    registerText(m.fact);
  }
  for (const b of BRIEFS) {
    registerText(b.headline);
    registerText(b.fact);
  }
  for (const s of MICROS) registerText(s);
  for (const s of HONESTY_LEFT) registerText(s);
  for (const s of HONESTY_RIGHT) registerText(s);
  registerText("IN BRIEF");
  registerText("ALSO TODAY");
  registerText("CLAIMED — NOT YET CONFIRMED");
  registerText("CONFIRMED — AS REPORTED");
}

// ------------------------------------------------------------------ layout
const MX = 16; // margin
const CW = 992; // content width
const GAP = 4;

function drawMasthead(): void {
  // small globe, top-left
  const gx = 34;
  const gy = 30;
  ring(gx, gy, 15, 2, INK);
  line(gx - 15, gy, gx + 15, gy, INK, 1);
  line(gx, gy - 15, gx, gy + 15, INK, 1);
  fillCircle(gx - 6, gy - 6, 2, INK);
  fillCircle(gx + 7, gy + 5, 2, INK);
  drawTextCentered(512, 5, MASTHEAD_TITLE, 34, INK, true);
  rule(MX, 47, CW, INK, 2);
  drawTextCentered(512, 52, MASTHEAD_DATE, 24, RED, true);
  drawTextCentered(512, 81, MASTHEAD_SUB, 11, MUTED, false);
  fillRect(MX, 97, CW, 2, INK);
}

function drawHeroes(y: number): void {
  const widths = [322, 322, 320];
  const xs = [MX, MX + 322 + 14, MX + 322 + 14 + 322 + 14];
  for (let i = 0; i < 3; i++) {
    const h = HEROES[i];
    const x = xs[i];
    const w = widths[i];
    // card border
    fillRect(x, y, w, 284, INK);
    fillRect(x + 1, y + 1, w - 2, 282, WHITE);
    // scene
    h.scene(x + 1, y + 1, w - 2, 102);
    const cw = chip(x + 9, y + 9, h.chip, h.chipBg, 11);
    void cw;
    const tagW = textWidth(h.tag, 11) + 12;
    fillRect(x + w - 9 - tagW, y + 9, tagW, 18, h.tagBg);
    drawText(x + w - 9 - tagW + 6, y + 12, h.tag, 11, WHITE, true);
    // headline 29px, up to 3 lines
    drawPara(x + 10, y + 109, w - 20, h.headline, 29, INK, 3, 36, true);
    // fact 13px, up to 3 lines
    drawPara(x + 10, y + 217, w - 20, h.fact, 13, INK, 3, 16, false);
    // dateline
    drawLineFit(x + 10, y + 267, w - 20, h.dateline, 11, MUTED, false);
  }
}

function drawMids(y: number): void {
  const widths = [322, 322, 320];
  const xs = [MX, MX + 322 + 14, MX + 322 + 14 + 322 + 14];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const m = MIDS[r * 3 + c];
      const x = xs[c];
      const w = widths[c];
      const cy = y + r * 113;
      // category colour bar on the left
      fillRect(x, cy + 6, 4, 101, m.chipBg);
      chip(x + 10, cy + 6, m.chip, m.chipBg, 11);
      drawPara(x + 10, cy + 28, w - 20, m.headline, 20, INK, 2, 24, true);
      drawPara(x + 10, cy + 78, w - 20, m.fact, 12, INK, 2, 14, false);
    }
    if (r === 0) rule(MX, y + 109, CW, hex("#C9BFA9"), 1);
  }
}

function sectionBar(y: number, label: string): void {
  fillRect(MX, y, CW, 14, INK);
  drawText(MX + 8, y + 2, label, 11, WHITE, true);
}

function drawBriefs(y: number): void {
  sectionBar(y, "IN BRIEF");
  const colW = 239;
  const xs = [MX, MX + 239 + 12, MX + 239 + 12 + 239 + 12, MX + 239 + 12 + 239 + 12 + 239 + 12];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const b = BRIEFS[r * 4 + c];
      const x = xs[c];
      const cy = y + 14 + r * 65;
      fillRect(x, cy + 3, 5, 5, RED);
      drawPara(x + 10, cy, colW - 12, b.headline, 13, INK, 2, 16, true);
      drawPara(x + 10, cy + 33, colW - 12, b.fact, 11, MUTED, 2, 14, false);
    }
  }
}

function drawMicros(y: number): void {
  sectionBar(y, "ALSO TODAY");
  const colW = 239;
  const xs = [MX, MX + 239 + 12, MX + 239 + 12 + 239 + 12, MX + 239 + 12 + 239 + 12 + 239 + 12];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const s = MICROS[r * 4 + c];
      const x = xs[c];
      const cy = y + 14 + r * 30;
      fillRect(x, cy + 4, 4, 4, INK);
      drawPara(x + 10, cy, colW - 12, s, 11, INK, 2, 13, false);
    }
  }
}

function drawHonesty(y: number): void {
  // outer box
  fillRect(MX, y, CW, 84, INK);
  fillRect(MX + 1, y + 1, CW - 2, 82, hex("#FDF8EE"));
  // divider between the two halves
  fillRect(511, y + 8, 1, 68, hex("#C9BFA9"));
  drawText(MX + 10, y + 8, "CLAIMED — NOT YET CONFIRMED", 13, RED, true);
  drawText(522, y + 8, "CONFIRMED — AS REPORTED", 13, GREEN, true);
  let ly = y + 27;
  for (const s of HONESTY_LEFT) {
    fillRect(MX + 10, ly + 4, 4, 4, RED);
    drawPara(MX + 20, ly, 460, s, 11, INK, 2, 13, false);
    ly += 28;
  }
  let ry = y + 27;
  for (const s of HONESTY_RIGHT) {
    fillRect(522, ry + 4, 4, 4, GREEN);
    drawPara(532, ry, 460, s, 11, INK, 2, 13, false);
    ry += 28;
  }
}

function drawFooter(y: number): void {
  rule(MX, y, CW, INK, 1);
  drawPara(MX, y + 2, CW, FOOTER_SOURCES, 9, MUTED, 2, 11, false);
  drawLineFit(MX, y + 24, CW, FOOTER_NOTE, 10, MUTED, false);
}

// ------------------------------------------------------------------ main
function main(): void {
  registerAllStrings();
  checkGlyphs();

  // paper
  fillRect(0, 0, W, H, PAPER);

  drawMasthead(); // 0..96
  drawHeroes(100); // 100..384
  drawMids(388); // 388..608
  drawBriefs(612); // 612..756
  drawMicros(760); // 760..896
  drawHonesty(900); // 900..984
  drawFooter(988); // 988..1024

  if (problems.length > 0) {
    for (const p of problems) console.error("PROBLEM: " + p);
    console.error(`FAILED: ${problems.length} problem(s), no truncations allowed`);
    process.exit(1);
  }

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.png");
  const png = encodePNG(W, H, img);
  fs.writeFileSync(outPath, png);
  console.log(`OK entry.png ${png.length} bytes 1024x1024 no truncations`);
  console.log(`wrote ${outPath}`);
}

main();

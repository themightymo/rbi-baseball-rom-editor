// Team helmets from the TEAM DATA screen, decoded straight from the ROM so the app
// ships no team artwork. Each helmet is a 2×2 block of background tiles, optionally
// with a group of sprites layered on (some drawn behind the background) for the logo.
// Offsets are file offsets for a ROM *with* an iNES header, like tsbRoster.ts.

import { fileOffset } from "@/lib/tsbRoster";

// 5 bytes per team: TL, TR, BL, BR background tiles, then (sprite group << 2) | bg palette.
const HELMET_RECORDS = 0x23bc6;
// Start of each sprite group within HELMET_SPRITES (group n uses [n-1, n)).
const SPRITE_GROUP_OFFSETS = 0x23c52;
// 4 bytes per sprite: dy, tile, attributes (OAM format), dx.
const HELMET_SPRITES = 0x23c61;
// Screen palettes, 4 colours each (colour 0 unused).
const SPRITE_PALETTES = 0x1a840;
const BG_PALETTES = 0x1a150;
// The screen's pattern table: CHR-ROM 4 KB page 0x1E.
const PATTERN_TABLE = 0x5e010;

import { NES_RGB } from "@/core/nes/palette";
export { NES_RGB } from "@/core/nes/palette";

const signed = (b: number) => (b > 127 ? b - 256 : b);

/** 2-bit pixel value at (x, y) of a tile in the screen's pattern table. */
function tilePixel(rom: Uint8Array, base: number, tile: number, x: number, y: number) {
  const o = base + tile * 16 + y;
  const bit = 7 - x;
  return (((rom[o] ?? 0) >> bit) & 1) | ((((rom[o + 8] ?? 0) >> bit) & 1) << 1);
}

/**
 * Decodes one team's 16×16 helmet. Returns 256 NES colour indices (row-major),
 * with -1 for transparent pixels.
 */
export function decodeHelmet(rom: Uint8Array, hasINES: boolean, team: number): Int8Array {
  const at = (o: number) => rom[fileOffset(o, hasINES)] ?? 0;
  const chr = fileOffset(PATTERN_TABLE, hasINES);
  const rec = HELMET_RECORDS + team * 5;
  const flags = at(rec + 4);
  const bgPal = flags & 3;
  const group = flags >> 2;

  // Background layer: 2-bit values, 0 = transparent.
  const bg = new Uint8Array(256);
  for (let k = 0; k < 4; k++) {
    const tile = at(rec + k);
    const ox = (k % 2) * 8;
    const oy = (k >> 1) * 8;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) bg[(oy + y) * 16 + ox + x] = tilePixel(rom, chr, tile, x, y);
  }

  const out = new Int8Array(256).fill(-1);
  for (let i = 0; i < 256; i++) {
    if (bg[i]) out[i] = at(BG_PALETTES + bgPal * 4 + bg[i]!);
  }
  if (!group) return out;

  // Sprites: the lowest-numbered sprite wins, and a "behind" sprite only shows
  // through transparent background pixels — same as the NES PPU.
  const start = at(SPRITE_GROUP_OFFSETS + group - 1);
  const end = at(SPRITE_GROUP_OFFSETS + group);
  const taken = new Uint8Array(256);
  for (let s = start; s < end; s += 4) {
    const dy = signed(at(HELMET_SPRITES + s));
    const tile = at(HELMET_SPRITES + s + 1);
    const attr = at(HELMET_SPRITES + s + 2);
    const dx = signed(at(HELMET_SPRITES + s + 3));
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const v = tilePixel(rom, chr, tile, attr & 0x40 ? 7 - x : x, attr & 0x80 ? 7 - y : y);
        const px = dx + x;
        const py = dy + y;
        if (!v || px < 0 || px > 15 || py < 0 || py > 15) continue;
        const i = py * 16 + px;
        if (taken[i]) continue;
        taken[i] = 1;
        if (attr & 0x20 && bg[i]) continue;
        out[i] = at(SPRITE_PALETTES + (attr & 3) * 4 + v);
      }
    }
  }
  return out;
}

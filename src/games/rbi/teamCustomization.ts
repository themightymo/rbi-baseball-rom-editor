import { getNesRomLayout } from "../../core/nes/addressing.ts";
import { isNesColorIndex } from "../../core/nes/palette.ts";
import { crc32 } from "../../lib/checksum.ts";

export const RBI_UNIFORM_TABLES = [0x31ab, 0x9ea8] as const;
export const RBI_UNIFORM_RECORD_LENGTH = 3;

export interface RbiUniformColors {
  capAndBat: number;
  skin: number;
  jerseyAndPants: number;
}

const FONT: Record<string, readonly string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
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
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
};

const DEFAULT_ABBREVIATIONS = ["CA", "BO", "DE", "MN", "HO", "NY", "SL", "SF", "AM", "NA"];

function glyphRows(letter: string): Uint8Array {
  const rows = new Uint8Array(8);
  for (const [y, row] of (FONT[letter] ?? FONT.A).entries()) {
    for (let x = 0; x < row.length; x++) if (row[x] === "1") rows[y] |= 1 << (6 - x);
  }
  return rows;
}

function iconOffsets(chrStart: number, team: number): number[][] {
  let first = 0x0ac0;
  for (let index = 0; index < team; index++) first += index % 2 ? 48 : 16;
  const second = team < 8 ? 0x1800 + team * 64 : 0x1810 + (team - 8) * 64;
  let third = 0x50a0;
  for (let index = 0; index < team; index++) third += index % 2 ? 48 : 16;
  let fourth = 0x74c0;
  for (let index = 0; index < team; index++) {
    if (index === 5) fourth = 0x7740;
    else fourth += index % 2 ? 48 : 16;
  }
  return [first, second, third, fourth].map((base) => [chrStart + base, chrStart + base + 32]);
}

/** Fingerprint everything except fields this editor is explicitly allowed to change. */
export function rbiEditorStablePayloadCrc32(rom: Uint8Array): string | null {
  const layout = getNesRomLayout(rom);
  if (!layout) return null;
  const payload = rom.slice(layout.prgStart, layout.chrEnd);
  payload.fill(0, 0, 0x0a00);
  for (const table of RBI_UNIFORM_TABLES) payload.fill(0, table, table + 30);
  for (let team = 0; team < 10; team++) {
    for (const pair of iconOffsets(layout.chrStart, team)) {
      for (const offset of pair)
        payload.fill(0, offset - layout.prgStart, offset - layout.prgStart + 16);
    }
  }
  return crc32(payload);
}

export function readRbiUniformColors(rom: Uint8Array, team: number): RbiUniformColors {
  const layout = getNesRomLayout(rom);
  if (!layout || team < 0 || team >= 10) throw new RangeError("RBI team index is invalid.");
  const offset = layout.prgStart + RBI_UNIFORM_TABLES[0] + team * RBI_UNIFORM_RECORD_LENGTH;
  return {
    capAndBat: rom[offset]!,
    skin: rom[offset + 1]!,
    jerseyAndPants: rom[offset + 2]!,
  };
}

export function writeRbiUniformColors(
  rom: Uint8Array,
  team: number,
  colors: Pick<RbiUniformColors, "capAndBat" | "jerseyAndPants">,
): Uint8Array {
  if (!isNesColorIndex(colors.capAndBat) || !isNesColorIndex(colors.jerseyAndPants)) {
    throw new RangeError("Uniform colors must be NES palette indices from 0 to 63.");
  }
  const layout = getNesRomLayout(rom);
  if (!layout || team < 0 || team >= 10) throw new RangeError("RBI team index is invalid.");
  const next = new Uint8Array(rom);
  for (const table of RBI_UNIFORM_TABLES) {
    const offset = layout.prgStart + table + team * RBI_UNIFORM_RECORD_LENGTH;
    next[offset] = colors.capAndBat;
    next[offset + 2] = colors.jerseyAndPants;
  }
  return next;
}

export function readRbiTeamAbbreviation(rom: Uint8Array, team: number): string {
  const layout = getNesRomLayout(rom);
  if (!layout || team < 0 || team >= 10) return DEFAULT_ABBREVIATIONS[team] ?? "??";
  const offsets = iconOffsets(layout.chrStart, team)[0]!;
  const letters = offsets.map((offset) => {
    const rows = rom.slice(offset + 8, offset + 16);
    return Object.keys(FONT).find((letter) => glyphRows(letter).every((row, i) => row === rows[i]));
  });
  return letters.every(Boolean) ? letters.join("") : DEFAULT_ABBREVIATIONS[team]!;
}

export function writeRbiTeamAbbreviation(
  rom: Uint8Array,
  team: number,
  abbreviation: string,
): Uint8Array {
  const value = abbreviation.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) throw new Error("Team name must be exactly two letters (A–Z).");
  const layout = getNesRomLayout(rom);
  if (!layout || team < 0 || team >= 10) throw new RangeError("RBI team index is invalid.");
  const next = new Uint8Array(rom);
  for (const [copy, pair] of iconOffsets(layout.chrStart, team).entries()) {
    for (const [letterIndex, offset] of pair.entries()) {
      const rows = glyphRows(value[letterIndex]!);
      const low =
        copy === 0
          ? Uint8Array.from(rows, (row) => row ^ 0xff)
          : copy === 2
            ? new Uint8Array(8).fill(0xff)
            : new Uint8Array(8);
      const high = copy === 2 ? Uint8Array.from(rows, (row) => row ^ 0xff) : rows;
      next.set(low, offset);
      next.set(high, offset + 8);
    }
  }
  return next;
}

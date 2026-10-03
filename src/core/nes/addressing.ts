import { parseINES, type INESInfo } from "./ines.ts";

export interface NesRomLayout {
  ines: INESInfo;
  prgStart: number;
  prgEnd: number;
  chrStart: number;
  chrEnd: number;
}

export function getNesRomLayout(rom: Uint8Array): NesRomLayout | null {
  const ines = parseINES(rom);
  if (!ines || !ines.valid) return null;
  const prgStart = ines.headerSize + (ines.hasTrainer ? 512 : 0);
  const prgEnd = prgStart + ines.prgSize;
  return { ines, prgStart, prgEnd, chrStart: prgEnd, chrEnd: prgEnd + ines.chrSize };
}

export function fileOffsetToPrgOffset(layout: NesRomLayout, fileOffset: number): number | null {
  return fileOffset >= layout.prgStart && fileOffset < layout.prgEnd
    ? fileOffset - layout.prgStart
    : null;
}

/**
 * Returns a CPU address only when the mapping is static without knowing mapper state.
 * Mapper 0 is linear. Mapper 206 fixes its last two 8 KiB banks at $C000-$FFFF.
 * Mapper 4 always fixes its last 8 KiB bank at $E000-$FFFF.
 */
export function fileOffsetToCpuAddress(layout: NesRomLayout, fileOffset: number): number | null {
  const prgOffset = fileOffsetToPrgOffset(layout, fileOffset);
  if (prgOffset === null) return null;

  if (layout.ines.mapper === 0) {
    if (layout.ines.prgSize === 32 * 1024) return 0x8000 + prgOffset;
  }

  if (layout.ines.mapper === 206 && prgOffset >= layout.ines.prgSize - 16 * 1024) {
    return 0xc000 + (prgOffset - (layout.ines.prgSize - 16 * 1024));
  }

  if (layout.ines.mapper === 4 && prgOffset >= layout.ines.prgSize - 8 * 1024) {
    return 0xe000 + (prgOffset - (layout.ines.prgSize - 8 * 1024));
  }

  return null;
}

export function parseOffset(value: string): number | null {
  const input = value.trim();
  if (!input) return null;
  const isExplicitHex = /^0x/i.test(input);
  const isBareHex = /[a-f]/i.test(input);
  if (!/^(?:0x)?[0-9a-f]+$/i.test(input)) return null;
  const parsed = Number.parseInt(input.replace(/^0x/i, ""), isExplicitHex || isBareHex ? 16 : 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function hex(value: number, width = 6): string {
  return `0x${value.toString(16).toUpperCase().padStart(width, "0")}`;
}

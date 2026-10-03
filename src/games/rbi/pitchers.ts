import { decodeRbiName } from "./encoding.ts";
import type { RbiHandedness, RbiPitcher, RbiPitcherDelivery } from "./types.ts";

export const RBI_PITCHER_RECORD_LENGTH = 16;
export const RBI_PITCHER_STAMINA_OFFSET = 13;

const VERIFIED_WITT_RECORD = Uint8Array.of(
  0x0c,
  0x20,
  0x30,
  0x3b,
  0x3b,
  0x24,
  0x24,
  0x40,
  0xb8,
  0x90,
  0xa0,
  0xba,
  0x97,
  0x32,
  0x73,
  0x8c,
);

export function hasVerifiedWittRecord(rom: Uint8Array, offset = 0xd0): boolean {
  if (offset < 0 || offset + VERIFIED_WITT_RECORD.length > rom.length) return false;
  return VERIFIED_WITT_RECORD.every((byte, index) => rom[offset + index] === byte);
}

export function decodePitcherStyle(value: number): {
  drop: number;
  throws: RbiHandedness;
  delivery: RbiPitcherDelivery;
} {
  const style = value & 0x0f;
  if (style > 3) throw new RangeError(`Unknown RBI pitcher style nibble: 0x${style.toString(16)}`);
  return {
    drop: value >>> 4,
    throws: (style & 1) === 1 ? "L" : "R",
    delivery: (style & 2) === 2 ? "sidearm" : "standard",
  };
}

export function decodePitcherEra(value: number): number {
  return value + 100;
}

export function decodePitcherCurves(value: number): { left: number; right: number } {
  return { left: value >>> 4, right: value & 0x0f };
}

export function parsePitcher(rom: Uint8Array, offset: number, teamId: number): RbiPitcher {
  if (!Number.isInteger(offset) || offset < 0 || offset + RBI_PITCHER_RECORD_LENGTH > rom.length) {
    throw new RangeError("RBI pitcher record is outside the ROM.");
  }
  const rawBytes = rom.slice(offset, offset + RBI_PITCHER_RECORD_LENGTH);
  const style = decodePitcherStyle(rawBytes[7]);
  const curves = decodePitcherCurves(rawBytes[12]);
  return {
    teamId,
    rosterSlot: rawBytes[0],
    name: decodeRbiName(rawBytes.subarray(1, 7)),
    throws: style.throws,
    delivery: style.delivery,
    earnedRunAverage: decodePitcherEra(rawBytes[8]),
    drop: style.drop,
    leftCurve: curves.left,
    rightCurve: curves.right,
    slowPitchVelocity: rawBytes[9],
    normalPitchVelocity: rawBytes[10],
    fastPitchVelocity: rawBytes[11],
    stamina: rawBytes[13],
    unknown1: rawBytes[14],
    unknown2: rawBytes[15],
    offset,
    rawBytes,
  };
}

export function encodePitcherStamina(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError("RBI pitcher stamina must be an integer from 0 to 255.");
  }
  return Uint8Array.of(value);
}

/** Returns a new ROM; the input and every byte outside Stamina remain unchanged. */
export function writePitcherStamina(
  rom: Uint8Array,
  recordOffset: number,
  value: number,
): Uint8Array {
  if (
    !Number.isInteger(recordOffset) ||
    recordOffset < 0 ||
    recordOffset + RBI_PITCHER_RECORD_LENGTH > rom.length
  ) {
    throw new RangeError("RBI pitcher record is outside the ROM.");
  }
  const next = new Uint8Array(rom);
  next.set(encodePitcherStamina(value), recordOffset + RBI_PITCHER_STAMINA_OFFSET);
  return next;
}

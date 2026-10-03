import { decodeRbiName, encodeRbiName } from "./encoding.ts";
import type { RbiBatter, RbiHandedness } from "./types.ts";

export const RBI_BATTER_RECORD_LENGTH = 16;
export const RBI_BATTER_POWER_OFFSET = 11;
export const RBI_BATTER_GAMEPLAY_LIMITS = {
  contact: { min: 0, max: 40 },
  power: { min: 640, max: 975 },
  speed: { min: 118, max: 148 },
} as const;

export type RbiBatterChanges = Partial<
  Pick<RbiBatter, "name" | "bats" | "battingAverage" | "homeRuns" | "contact" | "power" | "speed">
>;

const VERIFIED_JACKSN_RECORD = Uint8Array.of(
  0x03,
  0x13,
  0x28,
  0x2a,
  0x32,
  0x3a,
  0x35,
  0x01,
  0x7d,
  0x27,
  0x17,
  0xb1,
  0x03,
  0x80,
  0x00,
  0x00,
);

export function hasVerifiedJacksonRecord(rom: Uint8Array, offset = 0x40): boolean {
  if (offset < 0 || offset + VERIFIED_JACKSN_RECORD.length > rom.length) return false;
  return VERIFIED_JACKSN_RECORD.every((byte, index) => rom[offset + index] === byte);
}

export function decodeBatterPower(lowByte: number, highByte: number): number {
  return lowByte | (highByte << 8);
}

export function encodeBatterPower(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError("RBI batter power must be an integer from 0 to 65535.");
  }
  return Uint8Array.of(value & 0xff, value >>> 8);
}

export function decodeBatterHandedness(value: number): RbiHandedness {
  if (value === 0) return "R";
  if (value === 1) return "L";
  throw new RangeError(`Unknown RBI batter handedness byte: 0x${value.toString(16)}`);
}

export function decodeBattingAverage(value: number): number {
  return value + 150;
}

export function parseBatter(rom: Uint8Array, offset: number, teamId: number): RbiBatter {
  if (!Number.isInteger(offset) || offset < 0 || offset + RBI_BATTER_RECORD_LENGTH > rom.length) {
    throw new RangeError("RBI batter record is outside the ROM.");
  }
  const rawBytes = rom.slice(offset, offset + RBI_BATTER_RECORD_LENGTH);
  return {
    teamId,
    rosterSlot: rawBytes[0],
    name: decodeRbiName(rawBytes.subarray(1, 7)),
    bats: decodeBatterHandedness(rawBytes[7]),
    battingAverage: decodeBattingAverage(rawBytes[8]),
    homeRuns: rawBytes[9],
    contact: rawBytes[10],
    power: decodeBatterPower(rawBytes[11], rawBytes[12]),
    speed: rawBytes[13],
    unknown: [rawBytes[14], rawBytes[15]],
    offset,
    rawBytes,
  };
}

/** Returns a new ROM; the input and every byte outside Power remain unchanged. */
export function writeBatterPower(rom: Uint8Array, recordOffset: number, value: number): Uint8Array {
  if (
    !Number.isInteger(recordOffset) ||
    recordOffset < 0 ||
    recordOffset + RBI_BATTER_RECORD_LENGTH > rom.length
  ) {
    throw new RangeError("RBI batter record is outside the ROM.");
  }
  const next = new Uint8Array(rom);
  next.set(encodeBatterPower(value), recordOffset + RBI_BATTER_POWER_OFFSET);
  return next;
}

/** Writes only confirmed batter fields; roster slot and unknown bytes are never exposed here. */
export function writeBatterFields(
  rom: Uint8Array,
  recordOffset: number,
  changes: RbiBatterChanges,
): Uint8Array {
  if (
    !Number.isInteger(recordOffset) ||
    recordOffset < 0 ||
    recordOffset + RBI_BATTER_RECORD_LENGTH > rom.length
  ) {
    throw new RangeError("RBI batter record is outside the ROM.");
  }
  const next = new Uint8Array(rom);
  if (changes.name !== undefined) next.set(encodeRbiName(changes.name), recordOffset + 1);
  if (changes.bats !== undefined) next[recordOffset + 7] = changes.bats === "L" ? 1 : 0;
  if (changes.battingAverage !== undefined) {
    assertByte(changes.battingAverage - 150, "RBI batting average", 150);
    next[recordOffset + 8] = changes.battingAverage - 150;
  }
  if (changes.homeRuns !== undefined) {
    assertByte(changes.homeRuns, "RBI home runs");
    next[recordOffset + 9] = changes.homeRuns;
  }
  if (changes.contact !== undefined) {
    assertRange(
      changes.contact,
      "RBI batter contact",
      RBI_BATTER_GAMEPLAY_LIMITS.contact.min,
      RBI_BATTER_GAMEPLAY_LIMITS.contact.max,
    );
    next[recordOffset + 10] = changes.contact;
  }
  if (changes.power !== undefined) {
    assertRange(
      changes.power,
      "RBI batter power",
      RBI_BATTER_GAMEPLAY_LIMITS.power.min,
      RBI_BATTER_GAMEPLAY_LIMITS.power.max,
    );
    next.set(encodeBatterPower(changes.power), recordOffset + RBI_BATTER_POWER_OFFSET);
  }
  if (changes.speed !== undefined) {
    assertRange(
      changes.speed,
      "RBI batter speed",
      RBI_BATTER_GAMEPLAY_LIMITS.speed.min,
      RBI_BATTER_GAMEPLAY_LIMITS.speed.max,
    );
    next[recordOffset + 13] = changes.speed;
  }
  return next;
}

function assertRange(value: number, label: string, minimum: number, maximum: number): void {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
}

function assertByte(value: number, label: string, displayOffset = 0): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(
      `${label} must be an integer from ${displayOffset} to ${displayOffset + 255}.`,
    );
  }
}

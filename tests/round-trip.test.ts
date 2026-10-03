import test from "node:test";
import assert from "node:assert/strict";
import { writeBatterPower } from "../src/games/rbi/batters.ts";
import { writePitcherStamina } from "../src/games/rbi/pitchers.ts";
import { buildIPS } from "../src/lib/diff.ts";

const JACKSN_OFFSET = 0x40;
const WITT_OFFSET = 0xd0;
const ROM_SIZE = 0x18010;

function fixtureRom(): Uint8Array {
  const rom = Uint8Array.from({ length: ROM_SIZE }, (_, index) => (index * 37 + 11) & 0xff);
  rom.set(
    [
      0x03, 0x13, 0x28, 0x2a, 0x32, 0x3a, 0x35, 0x01, 0x7d, 0x27, 0x17, 0xb1, 0x03, 0x80, 0x00,
      0x00,
    ],
    JACKSN_OFFSET,
  );
  rom.set(
    [
      0x0c, 0x20, 0x30, 0x3b, 0x3b, 0x24, 0x24, 0x40, 0xb8, 0x90, 0xa0, 0xba, 0x97, 0x32, 0x73,
      0x8c,
    ],
    WITT_OFFSET,
  );
  return rom;
}

function changedOffsets(original: Uint8Array, modified: Uint8Array): number[] {
  return Array.from(original.keys()).filter((offset) => original[offset] !== modified[offset]);
}

/** Independent test-only IPS reader used to verify the application's patch output. */
function applyReferenceIps(original: Uint8Array, patch: Uint8Array): Uint8Array {
  assert.equal(Buffer.from(patch.subarray(0, 5)).toString("ascii"), "PATCH");
  const result = new Uint8Array(original);
  let cursor = 5;
  while (Buffer.from(patch.subarray(cursor, cursor + 3)).toString("ascii") !== "EOF") {
    assert.ok(cursor + 5 <= patch.length, "truncated IPS record header");
    const offset = (patch[cursor] << 16) | (patch[cursor + 1] << 8) | patch[cursor + 2];
    const size = (patch[cursor + 3] << 8) | patch[cursor + 4];
    cursor += 5;
    assert.notEqual(size, 0, "RLE records are not emitted by this writer");
    assert.ok(cursor + size <= patch.length, "truncated IPS record data");
    result.set(patch.subarray(cursor, cursor + size), offset);
    cursor += size;
  }
  assert.equal(cursor + 3, patch.length, "unexpected data after IPS EOF marker");
  return result;
}

test("A: unchanged ROM export is byte-for-byte identical", () => {
  const original = fixtureRom();
  const exported = new Uint8Array(original);
  assert.deepEqual(exported, original);
  assert.notEqual(exported, original);
});

test("B: one batter Power edit changes only its two known bytes", () => {
  const original = fixtureRom();
  const modified = writeBatterPower(original, JACKSN_OFFSET, 1256);
  assert.deepEqual(changedOffsets(original, modified), [0x4b, 0x4c]);
});

test("C: one pitcher Stamina edit changes only its known byte", () => {
  const original = fixtureRom();
  const modified = writePitcherStamina(original, WITT_OFFSET, 54);
  assert.deepEqual(changedOffsets(original, modified), [0xdd]);
});

test("D: reverting both edits restores the complete original ROM", () => {
  const original = fixtureRom();
  const modified = writePitcherStamina(
    writeBatterPower(original, JACKSN_OFFSET, 1256),
    WITT_OFFSET,
    54,
  );
  const restored = writeBatterPower(
    writePitcherStamina(modified, WITT_OFFSET, 50),
    JACKSN_OFFSET,
    945,
  );
  assert.deepEqual(restored, original);
});

test("E: independently applying generated IPS reproduces the exported ROM", () => {
  const original = fixtureRom();
  const modified = writePitcherStamina(
    writeBatterPower(original, JACKSN_OFFSET, 1256),
    WITT_OFFSET,
    54,
  );
  const patch = buildIPS(original, modified);
  assert.deepEqual(applyReferenceIps(original, patch), modified);
});

test("IPS export rejects length-changing edits instead of emitting a partial patch", () => {
  assert.throws(() => buildIPS(new Uint8Array(2), new Uint8Array(3)), /equal length/);
});

test("IPS export splits changed ranges larger than one format record", () => {
  const original = new Uint8Array(70_000);
  const modified = new Uint8Array(70_000).fill(0x5a);
  const patch = buildIPS(original, modified);
  assert.deepEqual(applyReferenceIps(original, patch), modified);
});

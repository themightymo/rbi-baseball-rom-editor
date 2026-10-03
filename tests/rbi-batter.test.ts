import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeBatterPower,
  decodeBattingAverage,
  encodeBatterPower,
  hasVerifiedJacksonRecord,
  parseBatter,
  writeBatterFields,
  writeBatterPower,
} from "../src/games/rbi/batters.ts";

const JACKSON_OFFSET = 0x40;
const JACKSON_RECORD = Uint8Array.from([
  0x03, 0x13, 0x28, 0x2a, 0x32, 0x3a, 0x35, 0x01, 0x7d, 0x27, 0x17, 0xb1, 0x03, 0x80, 0x00, 0x00,
]);

function fixtureRom() {
  const rom = new Uint8Array(0x80).fill(0xaa);
  rom.set(JACKSON_RECORD, JACKSON_OFFSET);
  return rom;
}

test("decodes the verified California Jacksn record", () => {
  const rom = fixtureRom();
  assert.equal(hasVerifiedJacksonRecord(rom), true);
  const batter = parseBatter(rom, JACKSON_OFFSET, 0);
  assert.deepEqual(
    {
      teamId: batter.teamId,
      rosterSlot: batter.rosterSlot,
      name: batter.name,
      bats: batter.bats,
      battingAverage: batter.battingAverage,
      homeRuns: batter.homeRuns,
      contact: batter.contact,
      power: batter.power,
      speed: batter.speed,
      unknown: batter.unknown,
      offset: batter.offset,
    },
    {
      teamId: 0,
      rosterSlot: 3,
      name: "Jacksn",
      bats: "L",
      battingAverage: 275,
      homeRuns: 39,
      contact: 23,
      power: 945,
      speed: 128,
      unknown: [0, 0],
      offset: JACKSON_OFFSET,
    },
  );
  assert.deepEqual(batter.rawBytes, JACKSON_RECORD);
});

test("power is symmetric little-endian data", () => {
  assert.equal(decodeBatterPower(0xb1, 0x03), 945);
  assert.deepEqual(encodeBatterPower(945), Uint8Array.of(0xb1, 0x03));
});

test("average decoding reproduces all twelve published California values", () => {
  const stored = [0x6c, 0x6a, 0x8c, 0x7d, 0x75, 0x76, 0x63, 0x65, 0x86, 0x7a, 0x63, 0x64];
  const published = [258, 256, 290, 275, 267, 268, 249, 251, 284, 272, 249, 250];
  assert.deepEqual(stored.map(decodeBattingAverage), published);
});

test("changing Power changes exactly its two record bytes", () => {
  const original = fixtureRom();
  const changed = writeBatterPower(original, JACKSON_OFFSET, 1256);
  const changedOffsets = Array.from(original.keys()).filter(
    (offset) => original[offset] !== changed[offset],
  );
  assert.deepEqual(changedOffsets, [0x4b, 0x4c]);
  assert.deepEqual(changed.subarray(0x4b, 0x4d), Uint8Array.of(0xe8, 0x04));
  assert.deepEqual(original.subarray(0x4b, 0x4d), Uint8Array.of(0xb1, 0x03));
});

test("changing Power back restores every original byte", () => {
  const original = fixtureRom();
  const changed = writeBatterPower(original, JACKSON_OFFSET, 1256);
  const restored = writeBatterPower(changed, JACKSON_OFFSET, 945);
  assert.deepEqual(restored, original);
});

test("writes every confirmed batter field without touching slot or unknown bytes", () => {
  const original = fixtureRom();
  const changed = writeBatterFields(original, JACKSON_OFFSET, {
    name: "J.Rice",
    bats: "R",
    battingAverage: 300,
    homeRuns: 40,
    contact: 12,
    power: 1000,
    speed: 140,
  });
  const batter = parseBatter(changed, JACKSON_OFFSET, 0);
  assert.deepEqual(
    {
      name: batter.name,
      bats: batter.bats,
      battingAverage: batter.battingAverage,
      homeRuns: batter.homeRuns,
      contact: batter.contact,
      power: batter.power,
      speed: batter.speed,
    },
    {
      name: "J.Rice",
      bats: "R",
      battingAverage: 300,
      homeRuns: 40,
      contact: 12,
      power: 1000,
      speed: 140,
    },
  );
  assert.equal(changed[JACKSON_OFFSET], original[JACKSON_OFFSET]);
  assert.deepEqual(changed.subarray(JACKSON_OFFSET + 14, JACKSON_OFFSET + 16), Uint8Array.of(0, 0));
  assert.deepEqual(original.subarray(JACKSON_OFFSET, JACKSON_OFFSET + 16), JACKSON_RECORD);
});

test("rejects invalid batter values and unsupported name glyphs", () => {
  const original = fixtureRom();
  assert.throws(
    () => writeBatterFields(original, JACKSON_OFFSET, { battingAverage: 406 }),
    /150 to 405/,
  );
  assert.throws(() => writeBatterFields(original, JACKSON_OFFSET, { speed: -1 }), /0 to 255/);
  assert.throws(
    () => writeBatterFields(original, JACKSON_OFFSET, { name: "TOOLONG" }),
    /at most 6/,
  );
  assert.throws(() => writeBatterFields(original, JACKSON_OFFSET, { name: "José" }), /not in/);
});

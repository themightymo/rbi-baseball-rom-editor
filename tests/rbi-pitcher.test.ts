import test from "node:test";
import assert from "node:assert/strict";
import {
  decodePitcherCurves,
  decodePitcherEra,
  decodePitcherStyle,
  encodePitcherStamina,
  hasVerifiedWittRecord,
  parsePitcher,
  writePitcherFields,
  writePitcherStamina,
} from "../src/games/rbi/pitchers.ts";

const WITT_OFFSET = 0xd0;
const WITT_RECORD = Uint8Array.from([
  0x0c, 0x20, 0x30, 0x3b, 0x3b, 0x24, 0x24, 0x40, 0xb8, 0x90, 0xa0, 0xba, 0x97, 0x32, 0x73, 0x8c,
]);

function fixtureRom() {
  const rom = new Uint8Array(0x120).fill(0xaa);
  rom.set(WITT_RECORD, WITT_OFFSET);
  return rom;
}

test("decodes the verified California Witt record", () => {
  const rom = fixtureRom();
  assert.equal(hasVerifiedWittRecord(rom), true);
  const pitcher = parsePitcher(rom, WITT_OFFSET, 0);
  assert.deepEqual(
    {
      teamId: pitcher.teamId,
      rosterSlot: pitcher.rosterSlot,
      name: pitcher.name,
      throws: pitcher.throws,
      delivery: pitcher.delivery,
      earnedRunAverage: pitcher.earnedRunAverage,
      drop: pitcher.drop,
      leftCurve: pitcher.leftCurve,
      rightCurve: pitcher.rightCurve,
      slowPitchVelocity: pitcher.slowPitchVelocity,
      normalPitchVelocity: pitcher.normalPitchVelocity,
      fastPitchVelocity: pitcher.fastPitchVelocity,
      stamina: pitcher.stamina,
      unknown1: pitcher.unknown1,
      unknown2: pitcher.unknown2,
      offset: pitcher.offset,
    },
    {
      teamId: 0,
      rosterSlot: 12,
      name: "Witt",
      throws: "R",
      delivery: "standard",
      earnedRunAverage: 284,
      drop: 4,
      leftCurve: 9,
      rightCurve: 7,
      slowPitchVelocity: 144,
      normalPitchVelocity: 160,
      fastPitchVelocity: 186,
      stamina: 50,
      unknown1: 115,
      unknown2: 140,
      offset: WITT_OFFSET,
    },
  );
  assert.deepEqual(pitcher.rawBytes, WITT_RECORD);
});

test("decodes verified style, ERA, and packed curve fields", () => {
  assert.deepEqual(decodePitcherStyle(0x40), { drop: 4, throws: "R", delivery: "standard" });
  assert.deepEqual(decodePitcherStyle(0x91), { drop: 9, throws: "L", delivery: "standard" });
  assert.deepEqual(decodePitcherStyle(0x82), { drop: 8, throws: "R", delivery: "sidearm" });
  assert.deepEqual(decodePitcherStyle(0x63), { drop: 6, throws: "L", delivery: "sidearm" });
  assert.equal(decodePitcherEra(0xb8), 284);
  assert.deepEqual(decodePitcherCurves(0x97), { left: 9, right: 7 });
});

test("changing Stamina changes only its one record byte", () => {
  const original = fixtureRom();
  const changed = writePitcherStamina(original, WITT_OFFSET, 54);
  const changedOffsets = Array.from(original.keys()).filter(
    (offset) => original[offset] !== changed[offset],
  );
  assert.deepEqual(changedOffsets, [0xdd]);
  assert.deepEqual(encodePitcherStamina(54), Uint8Array.of(0x36));
  assert.equal(original[0xdd], 0x32);
  assert.equal(changed[0xdd], 0x36);
});

test("changing Stamina back restores every original byte", () => {
  const original = fixtureRom();
  const changed = writePitcherStamina(original, WITT_OFFSET, 54);
  const restored = writePitcherStamina(changed, WITT_OFFSET, 50);
  assert.deepEqual(restored, original);
});

test("writes every confirmed pitcher field without touching slot or unknown bytes", () => {
  const original = fixtureRom();
  const changed = writePitcherFields(original, WITT_OFFSET, {
    name: "J.Key",
    throws: "L",
    delivery: "sidearm",
    earnedRunAverage: 276,
    drop: 9,
    leftCurve: 10,
    rightCurve: 5,
    slowPitchVelocity: 157,
    normalPitchVelocity: 169,
    fastPitchVelocity: 188,
    stamina: 40,
  });
  const pitcher = parsePitcher(changed, WITT_OFFSET, 0);
  assert.deepEqual(
    {
      name: pitcher.name,
      throws: pitcher.throws,
      delivery: pitcher.delivery,
      earnedRunAverage: pitcher.earnedRunAverage,
      drop: pitcher.drop,
      leftCurve: pitcher.leftCurve,
      rightCurve: pitcher.rightCurve,
      slowPitchVelocity: pitcher.slowPitchVelocity,
      normalPitchVelocity: pitcher.normalPitchVelocity,
      fastPitchVelocity: pitcher.fastPitchVelocity,
      stamina: pitcher.stamina,
    },
    {
      name: "J.Key",
      throws: "L",
      delivery: "sidearm",
      earnedRunAverage: 276,
      drop: 9,
      leftCurve: 10,
      rightCurve: 5,
      slowPitchVelocity: 157,
      normalPitchVelocity: 169,
      fastPitchVelocity: 188,
      stamina: 40,
    },
  );
  assert.equal(changed[WITT_OFFSET], original[WITT_OFFSET]);
  assert.deepEqual(changed.subarray(WITT_OFFSET + 14, WITT_OFFSET + 16), Uint8Array.of(0x73, 0x8c));
  assert.deepEqual(original.subarray(WITT_OFFSET, WITT_OFFSET + 16), WITT_RECORD);
});

test("partial packed-field writes preserve the other pitcher values", () => {
  const original = fixtureRom();
  const changed = writePitcherFields(original, WITT_OFFSET, { delivery: "sidearm", rightCurve: 2 });
  const pitcher = parsePitcher(changed, WITT_OFFSET, 0);
  assert.deepEqual(
    {
      throws: pitcher.throws,
      delivery: pitcher.delivery,
      drop: pitcher.drop,
      leftCurve: pitcher.leftCurve,
      rightCurve: pitcher.rightCurve,
    },
    { throws: "R", delivery: "sidearm", drop: 4, leftCurve: 9, rightCurve: 2 },
  );
});

test("rejects invalid pitcher values", () => {
  const original = fixtureRom();
  assert.throws(
    () => writePitcherFields(original, WITT_OFFSET, { earnedRunAverage: 356 }),
    /100 to 355/,
  );
  assert.throws(() => writePitcherFields(original, WITT_OFFSET, { drop: 16 }), /0 to 15/);
  assert.throws(
    () => writePitcherFields(original, WITT_OFFSET, { fastPitchVelocity: 256 }),
    /0 to 255/,
  );
});

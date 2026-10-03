import test from "node:test";
import assert from "node:assert/strict";
import { parseCaliforniaTeam } from "../src/games/rbi/teams.ts";

const BATTERS = [
  ["Pettis", "L", 258, 5, 20, 759, 140],
  ["DCincs", "R", 256, 26, 26, 885, 124],
  ["Joyner", "L", 290, 22, 14, 864, 130],
  ["Jacksn", "L", 275, 39, 23, 945, 128],
  ["Dwning", "R", 267, 20, 20, 867, 124],
  ["Grich", "R", 268, 9, 21, 819, 124],
  ["Schfld", "R", 249, 13, 28, 861, 130],
  ["Boone", "R", 251, 7, 24, 831, 120],
  ["Burlsn", "R", 284, 5, 17, 789, 134],
  ["Hendrk", "R", 272, 14, 20, 849, 124],
  ["Wilfng", "L", 249, 3, 29, 816, 132],
  ["Jones", "L", 250, 17, 32, 891, 128],
] as const;

const PITCHERS = [
  ["Witt", "R", "standard", 284, 4, 9, 7, 144, 160, 186, 50, 115, 140],
  ["Sutton", "R", "standard", 118, 5, 8, 5, 141, 166, 178, 50, 113, 143],
  ["Corbet", "R", "standard", 110, 8, 6, 5, 138, 162, 173, 15, 114, 142],
  ["Moore", "R", "standard", 297, 2, 4, 2, 149, 170, 197, 13, 116, 139],
] as const;

function encodeName(name: string): number[] {
  return Array.from(name.padEnd(6, " "), (character) => {
    if (character === " ") return 0x24;
    const code = character.charCodeAt(0);
    return code >= 0x41 && code <= 0x5a ? 0x0a + code - 0x41 : 0x28 + code - 0x61;
  });
}

function californiaFixture(): Uint8Array {
  const rom = new Uint8Array(0x110);
  for (const [slot, batter] of BATTERS.entries()) {
    const [name, bats, average, homeRuns, contact, power, speed] = batter;
    rom.set(
      [
        slot,
        ...encodeName(name),
        bats === "L" ? 1 : 0,
        average - 150,
        homeRuns,
        contact,
        power & 0xff,
        power >>> 8,
        speed,
        0,
        0,
      ],
      0x10 + slot * 16,
    );
  }
  for (const [index, pitcher] of PITCHERS.entries()) {
    const [
      name,
      throws,
      delivery,
      era,
      drop,
      leftCurve,
      rightCurve,
      slow,
      normal,
      fast,
      stamina,
      unknown1,
      unknown2,
    ] = pitcher;
    const slot = 12 + index;
    const style = (throws === "L" ? 1 : 0) | (delivery === "sidearm" ? 2 : 0);
    rom.set(
      [
        slot,
        ...encodeName(name),
        (drop << 4) | style,
        era - 100,
        slow,
        normal,
        fast,
        (leftCurve << 4) | rightCurve,
        stamina,
        unknown1,
        unknown2,
      ],
      0x10 + slot * 16,
    );
  }
  return rom;
}

test("parses all sixteen California records without crossing boundaries", () => {
  const team = parseCaliforniaTeam(californiaFixture());
  assert.equal(team.id, 0);
  assert.equal(team.name, "California");
  assert.equal(team.abbreviation, "Ca");
  assert.equal(team.offset, 0x10);
  assert.equal(team.rawBytes.length, 0x100);
  assert.equal(team.batters.length, 12);
  assert.equal(team.pitchers.length, 4);
  assert.deepEqual(
    team.batters.map(({ name }) => name),
    BATTERS.map(([name]) => name),
  );
  assert.deepEqual(
    team.pitchers.map(({ name }) => name),
    PITCHERS.map(([name]) => name),
  );
  assert.deepEqual(
    [...team.batters, ...team.pitchers].map(({ rosterSlot, offset }) => [rosterSlot, offset]),
    Array.from({ length: 16 }, (_, slot) => [slot, 0x10 + slot * 16]),
  );
});

test("every decoded California value matches the published reference", () => {
  const team = parseCaliforniaTeam(californiaFixture());
  assert.deepEqual(
    team.batters.map((batter) => [
      batter.name,
      batter.bats,
      batter.battingAverage,
      batter.homeRuns,
      batter.contact,
      batter.power,
      batter.speed,
    ]),
    BATTERS,
  );
  assert.deepEqual(
    team.batters.map(({ unknown }) => unknown),
    Array.from({ length: 12 }, () => [0, 0]),
  );
  assert.deepEqual(
    team.pitchers.map((pitcher) => [
      pitcher.name,
      pitcher.throws,
      pitcher.delivery,
      pitcher.earnedRunAverage,
      pitcher.drop,
      pitcher.leftCurve,
      pitcher.rightCurve,
      pitcher.slowPitchVelocity,
      pitcher.normalPitchVelocity,
      pitcher.fastPitchVelocity,
      pitcher.stamina,
      pitcher.unknown1,
      pitcher.unknown2,
    ]),
    PITCHERS,
  );
});

test("rejects a record-boundary mismatch instead of shifting the roster", () => {
  const rom = californiaFixture();
  rom[0x20] = 7;
  assert.throws(() => parseCaliforniaTeam(rom), /expected slot 1, found 7/);
});

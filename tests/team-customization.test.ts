import assert from "node:assert/strict";
import test from "node:test";
import {
  RBI_UNIFORM_TABLES,
  readRbiTeamAbbreviation,
  readRbiUniformColors,
  writeRbiTeamAbbreviation,
  writeRbiUniformColors,
} from "../src/games/rbi/teamCustomization.ts";

function rom(): Uint8Array {
  const bytes = new Uint8Array(16 + 64 * 1024 + 32 * 1024);
  bytes.set([0x4e, 0x45, 0x53, 0x1a, 4, 4]);
  return bytes;
}

test("uniform colors update both mirrored RBI tables and preserve skin color", () => {
  const source = rom();
  const team = 3;
  for (const table of RBI_UNIFORM_TABLES) {
    const offset = 16 + table + team * 3;
    source.set([0x02, 0x26, 0x10], offset);
  }
  const next = writeRbiUniformColors(source, team, { capAndBat: 0x16, jerseyAndPants: 0x20 });
  assert.deepEqual(readRbiUniformColors(next, team), {
    capAndBat: 0x16,
    skin: 0x26,
    jerseyAndPants: 0x20,
  });
  for (const table of RBI_UNIFORM_TABLES) {
    assert.deepEqual(
      [...next.slice(16 + table + team * 3, 16 + table + team * 3 + 3)],
      [0x16, 0x26, 0x20],
    );
  }
  assert.equal(source[16 + RBI_UNIFORM_TABLES[0] + team * 3], 0x02);
});

test("two-letter team names round trip through all in-game CHR copies", () => {
  const source = rom();
  const next = writeRbiTeamAbbreviation(source, 7, "RB");
  assert.equal(readRbiTeamAbbreviation(next, 7), "RB");
  assert.notDeepEqual(next, source);
  assert.throws(() => writeRbiTeamAbbreviation(source, 0, "RBI"), /exactly two letters/);
});

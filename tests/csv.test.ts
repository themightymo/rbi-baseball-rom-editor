import assert from "node:assert/strict";
import test from "node:test";
import { exportRbiRosterCsv, importRbiRosterCsv } from "../src/games/rbi/csv.ts";
import {
  RBI_BATTERS_PER_TEAM,
  RBI_TEAM_COUNT,
  RBI_TEAM_DATA_OFFSET,
  RBI_TEAM_RECORD_LENGTH,
} from "../src/games/rbi/teams.ts";

function makeRosterRom(): Uint8Array {
  const rom = new Uint8Array(RBI_TEAM_DATA_OFFSET + RBI_TEAM_COUNT * RBI_TEAM_RECORD_LENGTH);
  for (let team = 0; team < RBI_TEAM_COUNT; team++) {
    const teamOffset = RBI_TEAM_DATA_OFFSET + team * RBI_TEAM_RECORD_LENGTH;
    for (let slot = 0; slot < 16; slot++) {
      const offset = teamOffset + slot * 16;
      rom[offset] = slot;
      rom.fill(0x0a, offset + 1, offset + 7); // AAAAAA
      if (slot < RBI_BATTERS_PER_TEAM) {
        rom[offset + 7] = slot & 1;
        rom[offset + 8] = 100;
        rom[offset + 9] = 10;
        rom[offset + 10] = 20;
        rom[offset + 11] = 0xe8;
        rom[offset + 12] = 0x03;
        rom[offset + 13] = 120;
      } else {
        rom[offset + 7] = 0x40;
        rom[offset + 8] = 100;
        rom[offset + 9] = 140;
        rom[offset + 10] = 160;
        rom[offset + 11] = 180;
        rom[offset + 12] = 0x76;
        rom[offset + 13] = 50;
        rom[offset + 14] = 115;
        rom[offset + 15] = 140;
      }
    }
  }
  return rom;
}

function editCell(csv: string, dataRow: number, column: string, value: string): string {
  const lines = csv.trimEnd().split("\r\n");
  const header = lines[0].split(",");
  const columnIndex = header.indexOf(column);
  assert.notEqual(columnIndex, -1);
  const cells = lines[dataRow].split(",");
  cells[columnIndex] = value;
  lines[dataRow] = cells.join(",");
  return `${lines.join("\r\n")}\r\n`;
}

test("exports and imports the complete 160-row roster symmetrically", () => {
  const rom = makeRosterRom();
  const csv = exportRbiRosterCsv(rom);
  assert.equal(csv.trimEnd().split("\r\n").length, 161);
  assert.match(csv, /^team,type,slot,name,bats,avg,/);
  assert.match(csv, /California,batter,0,AAAAAA,R,.250/);
  assert.match(csv, /California,pitcher,12,AAAAAA,,,/);

  const result = importRbiRosterCsv(rom, csv);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.appliedRows, 160);
    assert.deepEqual(result.rom, rom);
  }
});

test("applies a valid CSV edit only to its confirmed field bytes", () => {
  const rom = makeRosterRom();
  const csv = editCell(exportRbiRosterCsv(rom), 1, "power", "1256");
  const result = importRbiRosterCsv(rom, csv);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const changed = [...result.rom.keys()].filter((offset) => result.rom[offset] !== rom[offset]);
  assert.deepEqual(changed, [0x1c]);
  assert.deepEqual([...result.rom.subarray(0x1b, 0x1d)], [0xe8, 0x04]);
});

test("reports row errors and returns no partially modified ROM", () => {
  const rom = makeRosterRom();
  const snapshot = new Uint8Array(rom);
  let csv = editCell(exportRbiRosterCsv(rom), 1, "power", "1256");
  csv = editCell(csv, 2, "speed", "999");
  const result = importRbiRosterCsv(rom, csv);
  assert.equal(result.ok, false);
  assert.equal(result.rom, null);
  assert.equal(result.appliedRows, 0);
  assert.ok(result.errors.some((error) => error.row === 3 && error.field === "speed"));
  assert.deepEqual(rom, snapshot);
});

test("rejects edits to explicit unknown bytes", () => {
  const rom = makeRosterRom();
  const csv = editCell(exportRbiRosterCsv(rom), 13, "unknown_1", "116");
  const result = importRbiRosterCsv(rom, csv);
  assert.equal(result.ok, false);
  assert.ok(
    !result.ok &&
      result.errors.some((error) => error.field === "unknown_1" && /read-only/.test(error.message)),
  );
});

test("requires every team and slot exactly once", () => {
  const rom = makeRosterRom();
  const lines = exportRbiRosterCsv(rom).trimEnd().split("\r\n");
  lines.splice(1, 1);
  const result = importRbiRosterCsv(rom, `${lines.join("\r\n")}\r\n`);
  assert.equal(result.ok, false);
  assert.ok(
    !result.ok && result.errors.some((error) => /Missing California slot 0/.test(error.message)),
  );
});

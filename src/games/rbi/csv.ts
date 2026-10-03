import { writeBatterFields } from "./batters.ts";
import { writePitcherFields } from "./pitchers.ts";
import {
  parseRbiTeams,
  RBI_BATTERS_PER_TEAM,
  RBI_PITCHERS_PER_TEAM,
  RBI_TEAM_DATA_OFFSET,
} from "./teams.ts";
import type { RbiTeam } from "./types.ts";

export const RBI_CSV_COLUMNS = [
  "team",
  "type",
  "slot",
  "name",
  "bats",
  "avg",
  "hr",
  "contact",
  "power",
  "speed",
  "throws",
  "delivery",
  "era",
  "drop",
  "left_curve",
  "right_curve",
  "slow_velocity",
  "normal_velocity",
  "fast_velocity",
  "stamina",
  "unknown_1",
  "unknown_2",
] as const;

export interface RbiCsvError {
  row: number;
  field?: string;
  message: string;
}

export type RbiCsvImportResult =
  | { ok: true; rom: Uint8Array; appliedRows: number; errors: readonly [] }
  | { ok: false; rom: null; appliedRows: 0; errors: readonly RbiCsvError[] };

export function exportRbiRosterCsv(rom: Uint8Array, teamDataOffset = RBI_TEAM_DATA_OFFSET): string {
  const teams = parseRbiTeams(rom, teamDataOffset);
  const rows: string[][] = [Array.from(RBI_CSV_COLUMNS)];
  for (const team of teams) {
    for (const batter of team.batters) {
      rows.push([
        team.name,
        "batter",
        String(batter.rosterSlot),
        batter.name,
        batter.bats,
        `.${batter.battingAverage.toString().padStart(3, "0")}`,
        String(batter.homeRuns),
        String(batter.contact),
        String(batter.power),
        String(batter.speed),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        String(batter.unknown[0]),
        String(batter.unknown[1]),
      ]);
    }
    for (const pitcher of team.pitchers) {
      rows.push([
        team.name,
        "pitcher",
        String(pitcher.rosterSlot),
        pitcher.name,
        "",
        "",
        "",
        "",
        "",
        "",
        pitcher.throws,
        pitcher.delivery,
        (pitcher.earnedRunAverage / 100).toFixed(2),
        String(pitcher.drop),
        String(pitcher.leftCurve),
        String(pitcher.rightCurve),
        String(pitcher.slowPitchVelocity),
        String(pitcher.normalPitchVelocity),
        String(pitcher.fastPitchVelocity),
        String(pitcher.stamina),
        String(pitcher.unknown1),
        String(pitcher.unknown2),
      ]);
    }
  }
  return `${rows.map((row) => row.map(quoteCsv).join(",")).join("\r\n")}\r\n`;
}

export function importRbiRosterCsv(
  rom: Uint8Array,
  csv: string,
  teamDataOffset = RBI_TEAM_DATA_OFFSET,
): RbiCsvImportResult {
  let parsed: ParsedCsv;
  try {
    parsed = parseCsv(csv);
  } catch (error) {
    return failure(1, error instanceof Error ? error.message : "Invalid CSV.");
  }
  if (parsed.rows.length === 0) return failure(1, "CSV is empty.");
  if (!sameRow(parsed.rows[0].values, RBI_CSV_COLUMNS)) {
    return failure(1, `Header must exactly match: ${RBI_CSV_COLUMNS.join(",")}`);
  }

  let teams: RbiTeam[];
  try {
    teams = parseRbiTeams(rom, teamDataOffset);
  } catch (error) {
    return failure(
      0,
      error instanceof Error ? error.message : "The RBI roster could not be parsed.",
    );
  }

  const errors: RbiCsvError[] = [];
  const seen = new Set<string>();
  let next: Uint8Array = new Uint8Array(rom);
  for (const parsedRow of parsed.rows.slice(1)) {
    const rowNumber = parsedRow.line;
    const values = parsedRow.values;
    if (values.length !== RBI_CSV_COLUMNS.length) {
      errors.push({
        row: rowNumber,
        message: `Expected ${RBI_CSV_COLUMNS.length} columns, found ${values.length}.`,
      });
      continue;
    }
    const row = Object.fromEntries(RBI_CSV_COLUMNS.map((column, index) => [column, values[index]]));
    const team = teams.find((candidate) => candidate.name === row.team);
    if (!team) {
      errors.push({ row: rowNumber, field: "team", message: `Unknown team "${row.team}".` });
      continue;
    }
    if (row.type !== "batter" && row.type !== "pitcher") {
      errors.push({ row: rowNumber, field: "type", message: "Type must be batter or pitcher." });
      continue;
    }
    const slot = readInteger(row.slot, "slot", rowNumber, 0, 15, errors);
    if (slot === null) continue;
    const key = `${team.id}:${slot}`;
    if (seen.has(key)) {
      errors.push({ row: rowNumber, field: "slot", message: "Duplicate team and slot." });
      continue;
    }
    seen.add(key);

    const expectedType = slot < RBI_BATTERS_PER_TEAM ? "batter" : "pitcher";
    if (row.type !== expectedType) {
      errors.push({
        row: rowNumber,
        field: "type",
        message: `Slot ${slot} must be a ${expectedType}.`,
      });
      continue;
    }

    if (row.type === "batter") {
      const player = team.batters[slot];
      const bats = row.bats === "L" || row.bats === "R" ? row.bats : null;
      if (!bats) errors.push({ row: rowNumber, field: "bats", message: "Bats must be L or R." });
      requireEmpty(row, PITCHER_ONLY_COLUMNS, rowNumber, errors);
      const battingAverage = readAverage(row.avg, rowNumber, errors);
      const homeRuns = readInteger(row.hr, "hr", rowNumber, 0, 255, errors);
      const contact = readInteger(row.contact, "contact", rowNumber, 0, 255, errors);
      const power = readInteger(row.power, "power", rowNumber, 0, 65535, errors);
      const speed = readInteger(row.speed, "speed", rowNumber, 0, 255, errors);
      validateUnknown(row.unknown_1, player.unknown[0], "unknown_1", rowNumber, errors);
      validateUnknown(row.unknown_2, player.unknown[1], "unknown_2", rowNumber, errors);
      if ([bats, battingAverage, homeRuns, contact, power, speed].some((value) => value === null)) {
        continue;
      }
      try {
        next = writeBatterFields(next, player.offset, {
          name: row.name,
          bats: bats!,
          battingAverage: battingAverage!,
          homeRuns: homeRuns!,
          contact: contact!,
          power: power!,
          speed: speed!,
        });
      } catch (error) {
        errors.push({
          row: rowNumber,
          field: "name",
          message: error instanceof Error ? error.message : "Invalid batter fields.",
        });
      }
    } else {
      const player = team.pitchers[slot - RBI_BATTERS_PER_TEAM];
      const throws = row.throws === "L" || row.throws === "R" ? row.throws : null;
      const delivery =
        row.delivery === "standard" || row.delivery === "sidearm" ? row.delivery : null;
      if (!throws)
        errors.push({ row: rowNumber, field: "throws", message: "Throws must be L or R." });
      if (!delivery)
        errors.push({
          row: rowNumber,
          field: "delivery",
          message: "Delivery must be standard or sidearm.",
        });
      requireEmpty(row, BATTER_ONLY_COLUMNS, rowNumber, errors);
      const earnedRunAverage = readEra(row.era, rowNumber, errors);
      const drop = readInteger(row.drop, "drop", rowNumber, 0, 15, errors);
      const leftCurve = readInteger(row.left_curve, "left_curve", rowNumber, 0, 15, errors);
      const rightCurve = readInteger(row.right_curve, "right_curve", rowNumber, 0, 15, errors);
      const slowPitchVelocity = readInteger(
        row.slow_velocity,
        "slow_velocity",
        rowNumber,
        0,
        255,
        errors,
      );
      const normalPitchVelocity = readInteger(
        row.normal_velocity,
        "normal_velocity",
        rowNumber,
        0,
        255,
        errors,
      );
      const fastPitchVelocity = readInteger(
        row.fast_velocity,
        "fast_velocity",
        rowNumber,
        0,
        255,
        errors,
      );
      const stamina = readInteger(row.stamina, "stamina", rowNumber, 0, 255, errors);
      validateUnknown(row.unknown_1, player.unknown1, "unknown_1", rowNumber, errors);
      validateUnknown(row.unknown_2, player.unknown2, "unknown_2", rowNumber, errors);
      if (
        [
          throws,
          delivery,
          earnedRunAverage,
          drop,
          leftCurve,
          rightCurve,
          slowPitchVelocity,
          normalPitchVelocity,
          fastPitchVelocity,
          stamina,
        ].some((value) => value === null)
      ) {
        continue;
      }
      try {
        next = writePitcherFields(next, player.offset, {
          name: row.name,
          throws: throws!,
          delivery: delivery!,
          earnedRunAverage: earnedRunAverage!,
          drop: drop!,
          leftCurve: leftCurve!,
          rightCurve: rightCurve!,
          slowPitchVelocity: slowPitchVelocity!,
          normalPitchVelocity: normalPitchVelocity!,
          fastPitchVelocity: fastPitchVelocity!,
          stamina: stamina!,
        });
      } catch (error) {
        errors.push({
          row: rowNumber,
          field: "name",
          message: error instanceof Error ? error.message : "Invalid pitcher fields.",
        });
      }
    }
  }

  const expectedRows = teams.length * (RBI_BATTERS_PER_TEAM + RBI_PITCHERS_PER_TEAM);
  for (const team of teams) {
    for (let slot = 0; slot < RBI_BATTERS_PER_TEAM + RBI_PITCHERS_PER_TEAM; slot++) {
      if (!seen.has(`${team.id}:${slot}`)) {
        errors.push({ row: 0, message: `Missing ${team.name} slot ${slot}.` });
      }
    }
  }
  if (parsed.rows.length - 1 !== expectedRows) {
    errors.push({
      row: 0,
      message: `A complete roster must contain exactly ${expectedRows} data rows.`,
    });
  }
  return errors.length > 0
    ? { ok: false, rom: null, appliedRows: 0, errors }
    : { ok: true, rom: next, appliedRows: expectedRows, errors: [] };
}

const BATTER_ONLY_COLUMNS = ["bats", "avg", "hr", "contact", "power", "speed"] as const;
const PITCHER_ONLY_COLUMNS = [
  "throws",
  "delivery",
  "era",
  "drop",
  "left_curve",
  "right_curve",
  "slow_velocity",
  "normal_velocity",
  "fast_velocity",
  "stamina",
] as const;

function requireEmpty(
  row: Record<string, string>,
  fields: readonly string[],
  rowNumber: number,
  errors: RbiCsvError[],
) {
  for (const field of fields) {
    if (row[field] !== "") errors.push({ row: rowNumber, field, message: "Must be blank." });
  }
}

function validateUnknown(
  value: string,
  expected: number,
  field: string,
  row: number,
  errors: RbiCsvError[],
) {
  const parsed = readInteger(value, field, row, 0, 255, errors);
  if (parsed !== null && parsed !== expected) {
    errors.push({ row, field, message: `Unknown bytes are read-only; expected ${expected}.` });
  }
}

function readInteger(
  value: string,
  field: string,
  row: number,
  min: number,
  max: number,
  errors: RbiCsvError[],
): number | null {
  if (!/^-?\d+$/.test(value)) {
    errors.push({ row, field, message: `Must be an integer from ${min} to ${max}.` });
    return null;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    errors.push({ row, field, message: `Must be an integer from ${min} to ${max}.` });
    return null;
  }
  return parsed;
}

function readAverage(value: string, row: number, errors: RbiCsvError[]): number | null {
  const match = /^(?:0)?\.(\d{3})$/.exec(value);
  if (!match) {
    errors.push({ row, field: "avg", message: "Average must use .NNN format." });
    return null;
  }
  const parsed = Number(match[1]);
  if (parsed < 150 || parsed > 405) {
    errors.push({ row, field: "avg", message: "Average must be from .150 to .405." });
    return null;
  }
  return parsed;
}

function readEra(value: string, row: number, errors: RbiCsvError[]): number | null {
  const match = /^(\d)\.(\d{2})$/.exec(value);
  const parsed = match ? Number(match[1]) * 100 + Number(match[2]) : -1;
  if (parsed < 100 || parsed > 355) {
    errors.push({ row, field: "era", message: "ERA must use N.NN format from 1.00 to 3.55." });
    return null;
  }
  return parsed;
}

function quoteCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

interface ParsedCsvRow {
  line: number;
  values: string[];
}
interface ParsedCsv {
  rows: ParsedCsvRow[];
}

function parseCsv(csv: string): ParsedCsv {
  const rows: ParsedCsvRow[] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  for (let index = 0; index < csv.length; index++) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        if (character === "\n") line++;
        field += character;
      }
    } else if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") index++;
      row.push(field);
      if (!(row.length === 1 && row[0] === "")) rows.push({ line: rowLine, values: row });
      row = [];
      field = "";
      line++;
      rowLine = line;
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error(`Unclosed quoted field starting near row ${rowLine}.`);
  row.push(field);
  if (!(row.length === 1 && row[0] === "")) rows.push({ line: rowLine, values: row });
  return { rows };
}

function sameRow(actual: readonly string[], expected: readonly string[]): boolean {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  );
}

function failure(row: number, message: string): RbiCsvImportResult {
  return { ok: false, rom: null, appliedRows: 0, errors: [{ row, message }] };
}

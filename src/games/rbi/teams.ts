import { parseBatter, RBI_BATTER_RECORD_LENGTH } from "./batters.ts";
import { parsePitcher, RBI_PITCHER_RECORD_LENGTH } from "./pitchers.ts";
import type { RbiTeam } from "./types.ts";

export const RBI_TEAM_DATA_OFFSET = 0x10;
export const RBI_TEAM_RECORD_LENGTH = 0x100;
export const RBI_BATTERS_PER_TEAM = 12;
export const RBI_PITCHERS_PER_TEAM = 4;

export const RBI_TEAM_DEFINITIONS = [
  { name: "California", abbreviation: "Ca" },
  { name: "Boston", abbreviation: "Bo" },
  { name: "Detroit", abbreviation: "De" },
  { name: "Minnesota", abbreviation: "Mn" },
  { name: "Houston", abbreviation: "Ho" },
  { name: "New York", abbreviation: "NY" },
  { name: "St. Louis", abbreviation: "SL" },
  { name: "San Francisco", abbreviation: "SF" },
  { name: "American League All-Stars", abbreviation: "Am" },
  { name: "National League All-Stars", abbreviation: "Na" },
] as const;

export const RBI_TEAM_COUNT = RBI_TEAM_DEFINITIONS.length;
export const CALIFORNIA_TEAM_ID = 0;
export const CALIFORNIA_TEAM_OFFSET = RBI_TEAM_DATA_OFFSET;

export function teamOffset(teamId: number): number {
  if (!Number.isInteger(teamId) || teamId < 0 || teamId >= RBI_TEAM_COUNT) {
    throw new RangeError(`RBI team ID must be an integer from 0 to ${RBI_TEAM_COUNT - 1}.`);
  }
  return RBI_TEAM_DATA_OFFSET + teamId * RBI_TEAM_RECORD_LENGTH;
}

export function parseRbiTeam(rom: Uint8Array, teamId: number): RbiTeam {
  const definition = RBI_TEAM_DEFINITIONS[teamId];
  const offset = teamOffset(teamId);
  const end = offset + RBI_TEAM_RECORD_LENGTH;
  if (!definition || end > rom.length) {
    throw new RangeError(`RBI team ${teamId} block is outside the ROM.`);
  }

  const batters = Array.from({ length: RBI_BATTERS_PER_TEAM }, (_, index) =>
    parseBatter(rom, offset + index * RBI_BATTER_RECORD_LENGTH, teamId),
  );
  const pitcherStart = offset + RBI_BATTERS_PER_TEAM * RBI_BATTER_RECORD_LENGTH;
  const pitchers = Array.from({ length: RBI_PITCHERS_PER_TEAM }, (_, index) =>
    parsePitcher(rom, pitcherStart + index * RBI_PITCHER_RECORD_LENGTH, teamId),
  );

  for (const [expectedSlot, player] of [...batters, ...pitchers].entries()) {
    if (player.rosterSlot !== expectedSlot) {
      throw new Error(
        `${definition.name} record boundary mismatch: expected slot ${expectedSlot}, found ${player.rosterSlot} at 0x${player.offset.toString(16).toUpperCase()}.`,
      );
    }
    if (player.name.includes("?")) {
      throw new Error(
        `${definition.name} player at slot ${expectedSlot} contains an unknown name glyph.`,
      );
    }
  }

  return {
    id: teamId,
    name: definition.name,
    abbreviation: definition.abbreviation,
    offset,
    rawBytes: rom.slice(offset, end),
    batters,
    pitchers,
  };
}

/** Parses in ROM order and stops immediately at the first invalid team block. */
export function parseRbiTeams(rom: Uint8Array): RbiTeam[] {
  return RBI_TEAM_DEFINITIONS.map((_, teamId) => parseRbiTeam(rom, teamId));
}

export function parseCaliforniaTeam(rom: Uint8Array): RbiTeam {
  return parseRbiTeam(rom, CALIFORNIA_TEAM_ID);
}

import { parseBatter, RBI_BATTER_RECORD_LENGTH } from "./batters.ts";
import { parsePitcher, RBI_PITCHER_RECORD_LENGTH } from "./pitchers.ts";
import type { RbiTeam } from "./types.ts";

export const CALIFORNIA_TEAM_ID = 0;
export const CALIFORNIA_TEAM_OFFSET = 0x10;
export const RBI_TEAM_RECORD_LENGTH = 0x100;
export const RBI_BATTERS_PER_TEAM = 12;
export const RBI_PITCHERS_PER_TEAM = 4;

export function parseCaliforniaTeam(rom: Uint8Array): RbiTeam {
  const end = CALIFORNIA_TEAM_OFFSET + RBI_TEAM_RECORD_LENGTH;
  if (rom.length < end) throw new RangeError("California team block is outside the ROM.");

  const batters = Array.from({ length: RBI_BATTERS_PER_TEAM }, (_, index) =>
    parseBatter(rom, CALIFORNIA_TEAM_OFFSET + index * RBI_BATTER_RECORD_LENGTH, CALIFORNIA_TEAM_ID),
  );
  const pitcherStart = CALIFORNIA_TEAM_OFFSET + RBI_BATTERS_PER_TEAM * RBI_BATTER_RECORD_LENGTH;
  const pitchers = Array.from({ length: RBI_PITCHERS_PER_TEAM }, (_, index) =>
    parsePitcher(rom, pitcherStart + index * RBI_PITCHER_RECORD_LENGTH, CALIFORNIA_TEAM_ID),
  );
  const players = [...batters, ...pitchers];

  for (const [expectedSlot, player] of players.entries()) {
    if (player.rosterSlot !== expectedSlot) {
      throw new Error(
        `California record boundary mismatch: expected slot ${expectedSlot}, found ${player.rosterSlot} at 0x${player.offset.toString(16).toUpperCase()}.`,
      );
    }
    if (player.name.includes("?")) {
      throw new Error(`California player at slot ${expectedSlot} contains an unknown name glyph.`);
    }
  }

  return {
    id: CALIFORNIA_TEAM_ID,
    name: "California",
    abbreviation: "Ca",
    offset: CALIFORNIA_TEAM_OFFSET,
    rawBytes: rom.slice(CALIFORNIA_TEAM_OFFSET, end),
    batters,
    pitchers,
  };
}

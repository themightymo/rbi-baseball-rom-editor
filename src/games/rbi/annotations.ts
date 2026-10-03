import type { RomAnnotation } from "@/core/rom/annotations";
import { parseDetectedRbiTeams } from "@/games/rbi/teams";

/** Show labels only when every RBI team block passes structural parsing. */
export function getRbiAnnotations(rom: Uint8Array | null): readonly RomAnnotation[] {
  if (!rom) return [];
  try {
    const teams = parseDetectedRbiTeams(rom);
    const annotations: RomAnnotation[] = [];
    for (const team of teams) {
      annotations.push({
        start: team.offset,
        length: team.rawBytes.length,
        label: `${team.name} player data`,
        confidence: "confirmed",
      });
      for (const batter of team.batters) {
        annotations.push({
          start: batter.offset,
          length: batter.rawBytes.length,
          label: `${team.abbreviation} batter ${batter.rosterSlot}: ${batter.name}`,
          confidence: "confirmed",
        });
      }
      for (const pitcher of team.pitchers) {
        annotations.push({
          start: pitcher.offset,
          length: pitcher.rawBytes.length,
          label: `${team.abbreviation} pitcher ${pitcher.rosterSlot}: ${pitcher.name}`,
          confidence: "confirmed",
        });
      }
    }
    annotations.push(
      { start: 0x4b, length: 1, label: "Jacksn Power low byte", confidence: "confirmed" },
      { start: 0x4c, length: 1, label: "Jacksn Power high byte", confidence: "confirmed" },
      { start: 0xdd, length: 1, label: "Witt Stamina", confidence: "confirmed" },
      { start: 0xde, length: 1, label: "Witt Unknown 1", confidence: "confirmed" },
      { start: 0xdf, length: 1, label: "Witt Unknown 2", confidence: "confirmed" },
      { start: 0x1466, length: 6, label: "End paper name field 1", confidence: "confirmed" },
      { start: 0x146d, length: 7, label: "End paper name field 2", confidence: "confirmed" },
      { start: 0x1474, length: 4, label: "End paper name field 3", confidence: "confirmed" },
    );
    return annotations;
  } catch {
    return [];
  }
}

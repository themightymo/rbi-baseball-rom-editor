import type { RomAnnotation } from "@/core/rom/annotations";
import { hasVerifiedJacksonRecord } from "@/games/rbi/batters";
import { hasVerifiedWittRecord } from "@/games/rbi/pitchers";

const JACKSON_ANNOTATIONS: readonly RomAnnotation[] = [
  {
    start: 0x40,
    length: 16,
    label: "California batter record: JACKSN",
    confidence: "confirmed",
  },
  { start: 0x4b, length: 1, label: "JACKSN Power low byte", confidence: "confirmed" },
  { start: 0x4c, length: 1, label: "JACKSN Power high byte", confidence: "confirmed" },
];

const WITT_ANNOTATIONS: readonly RomAnnotation[] = [
  {
    start: 0xd0,
    length: 16,
    label: "California pitcher record: WITT",
    confidence: "confirmed",
  },
  { start: 0xdd, length: 1, label: "WITT Stamina", confidence: "confirmed" },
  { start: 0xde, length: 1, label: "WITT Unknown 1", confidence: "confirmed" },
  { start: 0xdf, length: 1, label: "WITT Unknown 2", confidence: "confirmed" },
];

/** Show labels only when their complete verified source record is present. */
export function getRbiAnnotations(rom: Uint8Array | null): readonly RomAnnotation[] {
  if (!rom) return [];
  return [
    ...(hasVerifiedJacksonRecord(rom) ? JACKSON_ANNOTATIONS : []),
    ...(hasVerifiedWittRecord(rom) ? WITT_ANNOTATIONS : []),
  ];
}

import type { RomAnnotation } from "@/core/rom/annotations";
import { hasVerifiedJacksonRecord } from "@/games/rbi/batters";

/** Add entries only after their RBI-specific meaning and boundaries are verified. */
export const RBI_ANNOTATIONS: readonly RomAnnotation[] = [
  {
    start: 0x40,
    length: 16,
    label: "California batter record: JACKSN",
    confidence: "confirmed",
  },
  { start: 0x4b, length: 1, label: "JACKSN Power low byte", confidence: "confirmed" },
  { start: 0x4c, length: 1, label: "JACKSN Power high byte", confidence: "confirmed" },
];

/** Show Phase 3 labels only when the complete verified record is present. */
export function getRbiAnnotations(rom: Uint8Array | null): readonly RomAnnotation[] {
  return rom && hasVerifiedJacksonRecord(rom) ? RBI_ANNOTATIONS : [];
}

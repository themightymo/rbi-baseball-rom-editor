import { getNesRomLayout } from "../../core/nes/addressing.ts";

export interface RbiProfileRegion {
  /** Offset from the beginning of the containing iNES PRG or CHR region. */
  baseOffset: number | null;
}

export interface RbiRomProfile {
  id: string;
  label: string;
  family: "original" | "stuffed" | "overstuffed" | "historical-hack";
  support: "supported" | "unsupported";
  /** Complete PRG+CHR fingerprint. Null means the family must not be auto-detected. */
  payloadCrc32: string | null;
  prgCrc32: string | null;
  chrCrc32: string | null;
  canonicalMapper: number | null;
  acceptedMappers: readonly number[];
  prgSize: number | null;
  chrSize: number | null;
  expectedFileSizes: readonly number[];
  playerData: RbiProfileRegion;
  teamData: RbiProfileRegion;
  chr: RbiProfileRegion;
  notes?: string;
}

const ORIGINAL_LAYOUT = {
  family: "original" as const,
  support: "supported" as const,
  canonicalMapper: 206,
  // Mapper 4 appears in common legacy iNES headers for the byte-exact licensed payload.
  acceptedMappers: [206, 4] as const,
  prgSize: 64 * 1024,
  chrSize: 32 * 1024,
  expectedFileSizes: [98_320, 98_448] as const,
  chrCrc32: "C36B03AE",
  playerData: { baseOffset: 0 },
  teamData: { baseOffset: 0 },
  chr: { baseOffset: 0 },
};

/** Only complete payload fingerprints participate in automatic detection. */
export const RBI_ROM_PROFILES: readonly RbiRomProfile[] = [
  {
    ...ORIGINAL_LAYOUT,
    id: "rbi-usa-licensed",
    label: "Original licensed (gray cartridge payload)",
    payloadCrc32: "3C5C81D4",
    prgCrc32: "42607A97",
  },
  {
    ...ORIGINAL_LAYOUT,
    id: "rbi-usa-unlicensed",
    label: "Original unlicensed (black cartridge payload)",
    payloadCrc32: "2E326A1D",
    prgCrc32: "203D32B5",
  },
  {
    ...ORIGINAL_LAYOUT,
    id: "rbi-usa-supplied-modified",
    label: "Verified supplied modified US image",
    family: "historical-hack",
    payloadCrc32: "C987A275",
    prgCrc32: "24FAA2AF",
    canonicalMapper: 4,
    acceptedMappers: [4],
    expectedFileSizes: [98_320],
    notes:
      "Exact supplied image; its complete roster table and CHR match the licensed payload, while 17 isolated PRG bytes differ outside player data.",
  },
  {
    id: "rbi-stuffed-licensed-family",
    label: "Stuffed licensed family (unverified image)",
    family: "stuffed",
    support: "unsupported",
    payloadCrc32: null,
    prgCrc32: null,
    chrCrc32: null,
    canonicalMapper: null,
    acceptedMappers: [],
    prgSize: null,
    chrSize: null,
    expectedFileSizes: [],
    playerData: { baseOffset: null },
    teamData: { baseOffset: null },
    chr: { baseOffset: null },
    notes:
      "Published descriptions say its player data moved, but do not identify a checksum or exact offset.",
  },
  {
    id: "rbi-overstuffed-licensed-family",
    label: "Overstuffed licensed family (unverified image)",
    family: "overstuffed",
    support: "unsupported",
    payloadCrc32: null,
    prgCrc32: null,
    chrCrc32: null,
    canonicalMapper: null,
    acceptedMappers: [],
    prgSize: null,
    chrSize: null,
    expectedFileSizes: [196_924],
    playerData: { baseOffset: 0x10000 },
    teamData: { baseOffset: 0x10000 },
    chr: { baseOffset: 0 },
    notes:
      "Community documentation reports two player-data copies and identifies the copy at PRG +0x10000 as editable.",
  },
  {
    id: "rbi-overstuffed-unlicensed-family",
    label: "Overstuffed unlicensed family (unverified image)",
    family: "overstuffed",
    support: "unsupported",
    payloadCrc32: null,
    prgCrc32: null,
    chrCrc32: null,
    canonicalMapper: null,
    acceptedMappers: [],
    prgSize: null,
    chrSize: null,
    expectedFileSizes: [262_160],
    playerData: { baseOffset: 0x10000 },
    teamData: { baseOffset: 0x10000 },
    chr: { baseOffset: 0 },
    notes:
      "Community documentation reports two player-data copies and identifies the copy at PRG +0x10000 as editable.",
  },
  {
    id: "rbi-historical-hack-family",
    label: "Historical ten-team hack (unverified image)",
    family: "historical-hack",
    support: "unsupported",
    payloadCrc32: null,
    prgCrc32: null,
    chrCrc32: null,
    canonicalMapper: null,
    acceptedMappers: [],
    prgSize: null,
    chrSize: null,
    expectedFileSizes: [],
    playerData: { baseOffset: null },
    teamData: { baseOffset: null },
    chr: { baseOffset: null },
    notes:
      "Historical hacks may descend from clean or expanded images and require individual fingerprints.",
  },
] as const;

export function getRbiProfile(profileId: string): RbiRomProfile | null {
  return RBI_ROM_PROFILES.find((profile) => profile.id === profileId) ?? null;
}

export interface ResolvedRbiProfileOffsets {
  playerData: number;
  teamData: number;
  chr: number;
}

export function resolveRbiProfileOffsets(
  rom: Uint8Array,
  profile: RbiRomProfile,
): ResolvedRbiProfileOffsets | null {
  const layout = getNesRomLayout(rom);
  const playerBase = profile.playerData.baseOffset;
  const teamBase = profile.teamData.baseOffset;
  const chrBase = profile.chr.baseOffset;
  if (!layout || playerBase === null || teamBase === null || chrBase === null) return null;
  if (playerBase >= layout.ines.prgSize || teamBase >= layout.ines.prgSize) return null;
  if (chrBase > layout.ines.chrSize) return null;
  return {
    playerData: layout.prgStart + playerBase,
    teamData: layout.prgStart + teamBase,
    chr: layout.chrStart + chrBase,
  };
}

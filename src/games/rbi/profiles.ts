export interface RbiRomProfile {
  id: string;
  label: string;
  support: "supported" | "unsupported";
  payloadCrc32: string;
  prgCrc32: string;
  chrCrc32: string;
  mapper: number;
  prgSize: number;
  chrSize: number;
}

const COMMON = {
  support: "supported" as const,
  mapper: 206,
  prgSize: 64 * 1024,
  chrSize: 32 * 1024,
  chrCrc32: "C36B03AE",
};

/** CRC values are for cartridge data, excluding the 16-byte iNES header. */
export const RBI_ROM_PROFILES: readonly RbiRomProfile[] = [
  {
    ...COMMON,
    id: "rbi-usa-licensed",
    label: "Clean original (licensed gray cartridge)",
    payloadCrc32: "3C5C81D4",
    prgCrc32: "42607A97",
  },
  {
    ...COMMON,
    id: "rbi-usa-unlicensed",
    label: "Clean original (unlicensed black cartridge)",
    payloadCrc32: "2E326A1D",
    prgCrc32: "203D32B5",
  },
] as const;

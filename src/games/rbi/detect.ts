import { crc32 } from "@/lib/checksum";
import { parseINES } from "@/core/nes/ines";
import { RBI_ROM_PROFILES } from "@/games/rbi/profiles";

export interface RbiDetectionResult {
  isRbi: boolean;
  confidence: "exact" | "high" | "possible" | "unknown";
  profileId?: string;
  profileLabel?: string;
  supported: boolean;
  romSize: number;
  mapper?: number;
  prgSize?: number;
  chrSize?: number;
  payloadCrc32?: string;
  warnings: string[];
}

export function detectRbiRom(rom: Uint8Array): RbiDetectionResult {
  const ines = parseINES(rom);
  const base: RbiDetectionResult = {
    isRbi: false,
    confidence: "unknown",
    supported: false,
    romSize: rom.length,
    mapper: ines?.mapper,
    prgSize: ines?.prgSize,
    chrSize: ines?.chrSize,
    warnings: [],
  };

  if (!ines) {
    return { ...base, warnings: ["No standard iNES header was found."] };
  }
  if (!ines.valid) {
    return { ...base, warnings: ["The file is shorter than its iNES header declares."] };
  }

  const dataStart = ines.headerSize + (ines.hasTrainer ? 512 : 0);
  const payloadEnd = dataStart + ines.prgSize + ines.chrSize;
  const payloadCrc32 = crc32(rom.subarray(dataStart, payloadEnd));
  const prgCrc32 = crc32(rom.subarray(dataStart, dataStart + ines.prgSize));
  const chrCrc32 = crc32(rom.subarray(dataStart + ines.prgSize, payloadEnd));
  const exact = RBI_ROM_PROFILES.find(
    (profile) =>
      profile.payloadCrc32 === payloadCrc32 &&
      profile.mapper === ines.mapper &&
      profile.prgSize === ines.prgSize &&
      profile.chrSize === ines.chrSize,
  );

  if (exact) {
    const warnings =
      rom.length === ines.expectedFileSize
        ? []
        : [
            `The file has ${rom.length - ines.expectedFileSize} trailing byte(s); cartridge data still matches the clean dump.`,
          ];
    return {
      ...base,
      isRbi: true,
      confidence: "exact",
      profileId: exact.id,
      profileLabel: exact.label,
      supported: exact.support === "supported",
      payloadCrc32,
      warnings,
    };
  }

  const layoutMatches = RBI_ROM_PROFILES.some(
    (profile) =>
      profile.mapper === ines.mapper &&
      profile.prgSize === ines.prgSize &&
      profile.chrSize === ines.chrSize,
  );
  const chrMatches = RBI_ROM_PROFILES.some((profile) => profile.chrCrc32 === chrCrc32);
  const prgMatch = RBI_ROM_PROFILES.find((profile) => profile.prgCrc32 === prgCrc32);

  if (layoutMatches && chrMatches) {
    return {
      ...base,
      isRbi: true,
      confidence: "high",
      profileId: prgMatch?.id,
      profileLabel: prgMatch?.label ?? "Modified or header-variant RBI Baseball",
      payloadCrc32,
      warnings: [
        "The RBI graphics and cartridge layout match, but the complete ROM checksum is not a known clean dump. Roster editing remains disabled.",
      ],
    };
  }

  if (layoutMatches) {
    return {
      ...base,
      confidence: "possible",
      payloadCrc32,
      warnings: [
        "The cartridge layout is compatible with RBI Baseball, but its data signatures do not match. Size and mapper alone are not enough to identify the game.",
      ],
    };
  }

  return {
    ...base,
    payloadCrc32,
    warnings: ["This ROM does not match a currently known RBI Baseball layout."],
  };
}

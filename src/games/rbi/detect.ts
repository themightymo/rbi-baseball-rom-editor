import { crc32 } from "../../lib/checksum.ts";
import { parseINES } from "../../core/nes/ines.ts";
import { RBI_ROM_PROFILES, type RbiRomProfile } from "./profiles.ts";
import { rbiEditorStablePayloadCrc32 } from "./teamCustomization.ts";

export interface RbiProfileFingerprint {
  payloadCrc32: string;
  mapper: number;
  prgSize: number;
  chrSize: number;
}

export interface RbiEditedRosterFingerprint extends RbiProfileFingerprint {
  postRosterPrgCrc32: string;
  chrCrc32: string;
}

export function matchEditedRosterRbiProfile(
  fingerprint: RbiEditedRosterFingerprint,
): RbiRomProfile | null {
  return (
    RBI_ROM_PROFILES.find(
      (profile) =>
        profile.support === "supported" &&
        profile.postRosterPrgCrc32 !== null &&
        profile.postRosterPrgCrc32 === fingerprint.postRosterPrgCrc32 &&
        profile.chrCrc32 === fingerprint.chrCrc32 &&
        profile.acceptedMappers.includes(fingerprint.mapper) &&
        profile.prgSize === fingerprint.prgSize &&
        profile.chrSize === fingerprint.chrSize,
    ) ?? null
  );
}

const RBI_TEAM_COUNT = 10;
const RBI_PLAYERS_PER_TEAM = 16;
const RBI_PLAYER_RECORD_LENGTH = 16;
const RBI_ROSTER_LENGTH = RBI_TEAM_COUNT * RBI_PLAYERS_PER_TEAM * RBI_PLAYER_RECORD_LENGTH;

function hasRbiRosterRecordBoundaries(rom: Uint8Array, prgStart: number): boolean {
  for (let team = 0; team < RBI_TEAM_COUNT; team++) {
    for (let slot = 0; slot < RBI_PLAYERS_PER_TEAM; slot++) {
      const offset = prgStart + team * 0x100 + slot * RBI_PLAYER_RECORD_LENGTH;
      if (rom[offset] !== slot) return false;
    }
  }
  return true;
}

export function matchExactRbiProfile(fingerprint: RbiProfileFingerprint): RbiRomProfile | null {
  return (
    RBI_ROM_PROFILES.find(
      (profile) =>
        profile.payloadCrc32 !== null &&
        profile.payloadCrc32 === fingerprint.payloadCrc32 &&
        profile.acceptedMappers.includes(fingerprint.mapper) &&
        profile.prgSize === fingerprint.prgSize &&
        profile.chrSize === fingerprint.chrSize,
    ) ?? null
  );
}

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
  const exact = matchExactRbiProfile({
    payloadCrc32,
    mapper: ines.mapper,
    prgSize: ines.prgSize,
    chrSize: ines.chrSize,
  });

  if (exact) {
    const warnings: string[] = [];
    if (exact.canonicalMapper !== null && ines.mapper !== exact.canonicalMapper) {
      warnings.push(
        `The complete cartridge payload is exact, but this legacy header declares mapper ${ines.mapper}; the canonical cartridge mapper is ${exact.canonicalMapper}.`,
      );
    }
    if (rom.length !== ines.expectedFileSize) {
      warnings.push(
        `The file has ${rom.length - ines.expectedFileSize} trailing byte(s); cartridge data still matches the clean dump.`,
      );
    }
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

  const stablePayloadCrc32 = rbiEditorStablePayloadCrc32(rom);
  const editorDerivative = RBI_ROM_PROFILES.find(
    (profile) =>
      profile.support === "supported" &&
      profile.editorStablePayloadCrc32 !== null &&
      profile.editorStablePayloadCrc32 === stablePayloadCrc32 &&
      profile.acceptedMappers.includes(ines.mapper) &&
      profile.prgSize === ines.prgSize &&
      profile.chrSize === ines.chrSize,
  );
  if (editorDerivative && hasRbiRosterRecordBoundaries(rom, dataStart)) {
    return {
      ...base,
      isRbi: true,
      confidence: "high",
      profileId: editorDerivative.id,
      profileLabel: `${editorDerivative.label} (edited)`,
      supported: true,
      payloadCrc32,
      warnings: ["This ROM contains supported edits made to a verified RBI Baseball profile."],
    };
  }

  const editedRosterProfile = matchEditedRosterRbiProfile({
    payloadCrc32,
    postRosterPrgCrc32: crc32(
      rom.subarray(dataStart + RBI_ROSTER_LENGTH, dataStart + ines.prgSize),
    ),
    chrCrc32,
    mapper: ines.mapper,
    prgSize: ines.prgSize,
    chrSize: ines.chrSize,
  });
  if (editedRosterProfile && hasRbiRosterRecordBoundaries(rom, dataStart)) {
    return {
      ...base,
      isRbi: true,
      confidence: "high",
      profileId: editedRosterProfile.id,
      profileLabel: `${editedRosterProfile.label} (edited roster)`,
      supported: true,
      payloadCrc32,
      warnings: ["This ROM is an edited-roster derivative of a supported RBI Baseball profile."],
    };
  }

  const layoutMatches = RBI_ROM_PROFILES.some(
    (profile) =>
      profile.payloadCrc32 !== null &&
      profile.acceptedMappers.includes(ines.mapper) &&
      profile.prgSize === ines.prgSize &&
      profile.chrSize === ines.chrSize,
  );
  const chrMatches = RBI_ROM_PROFILES.some(
    (profile) => profile.chrCrc32 !== null && profile.chrCrc32 === chrCrc32,
  );
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

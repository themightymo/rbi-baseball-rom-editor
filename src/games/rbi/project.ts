import { crc32 } from "../../lib/checksum.ts";
import { detectRbiRom } from "./detect.ts";

export interface RbiProjectEdit {
  offset: number;
  original: number;
  value: number;
}

export interface RbiProjectFile {
  game: "rbi-baseball";
  version: 1;
  sourceRomCrc32: string;
  profile: string | null;
  edits: RbiProjectEdit[];
}

export function buildRbiProject(
  originalRom: Uint8Array,
  edits: ReadonlyMap<number, number>,
): RbiProjectFile {
  const detection = detectRbiRom(originalRom);
  return {
    game: "rbi-baseball",
    version: 1,
    sourceRomCrc32: crc32(originalRom),
    profile: detection.profileId ?? null,
    edits: Array.from(edits, ([offset, value]) => ({
      offset,
      original: originalRom[offset],
      value,
    })).sort((a, b) => a.offset - b.offset),
  };
}

export function applyRbiProject(sourceRom: Uint8Array, candidate: unknown): Uint8Array {
  const project = parseProject(candidate);
  const sourceProfile = detectRbiRom(sourceRom).profileId ?? null;
  if (crc32(sourceRom) !== project.sourceRomCrc32) {
    throw new Error("Project source CRC32 does not match the loaded ROM.");
  }
  if (project.profile !== sourceProfile) {
    throw new Error("Project RBI profile does not match the loaded ROM.");
  }
  const next = new Uint8Array(sourceRom);
  for (const edit of project.edits) {
    if (!Number.isInteger(edit.offset) || edit.offset < 0 || edit.offset >= sourceRom.length) {
      throw new RangeError(`Project edit offset ${edit.offset} is outside the ROM.`);
    }
    assertByte(edit.original, "Project original byte");
    assertByte(edit.value, "Project modified byte");
    if (sourceRom[edit.offset] !== edit.original) {
      throw new Error(
        `Project original byte does not match at offset 0x${edit.offset.toString(16).toUpperCase()}.`,
      );
    }
    next[edit.offset] = edit.value;
  }
  return next;
}

function parseProject(candidate: unknown): RbiProjectFile {
  if (!candidate || typeof candidate !== "object") throw new Error("Invalid RBI project file.");
  const project = candidate as Partial<RbiProjectFile>;
  if (project.game !== "rbi-baseball" || project.version !== 1 || !Array.isArray(project.edits)) {
    throw new Error("Unsupported RBI project file.");
  }
  if (typeof project.sourceRomCrc32 !== "string")
    throw new Error("Project source CRC32 is missing.");
  if (project.profile !== null && typeof project.profile !== "string") {
    throw new Error("Project profile is invalid.");
  }
  return project as RbiProjectFile;
}

function assertByte(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(`${label} must be an integer from 0 to 255.`);
  }
}

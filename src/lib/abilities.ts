// Player ability ("ratings") data for Tecmo Super Bowl (NES).
// Face IDs that point to real face scripts in Bank 15.
// 0x53–0x80 all map to PLAYER_FACE_SCRIPT_BAD_PTR and produce no face.
export const VALID_FACE_RANGE1 = Array.from({ length: 0x53 }, (_, i) => i);           // 0x00–0x52
export const VALID_FACE_RANGE2 = Array.from({ length: 0xD4 - 0x81 + 1 }, (_, i) => i + 0x81); // 0x81–0xD4
export const VALID_FACE_SET = new Set([...VALID_FACE_RANGE1, ...VALID_FACE_RANGE2]);

export function isValidFaceId(id: number) { return VALID_FACE_SET.has(id); }

// ─── Constants ────────────────────────────────────────────────────────────────

export const TSB_ATTRIBUTE_SCALE = [6, 13, 19, 25, 31, 38, 44, 50, 56, 63, 69, 75, 81, 88, 94, 100];

export type PosType = "qb" | "skill" | "ol" | "def" | "kick";
export type GroupId = "qb" | "skill" | "oline" | "defense" | "special";

export interface PosDef { id: string; label: string; type: PosType }

export const POSITIONS: PosDef[] = [
  { id: "qb1",  label: "QB1",  type: "qb" },
  { id: "qb2",  label: "QB2",  type: "qb" },
  { id: "rb1",  label: "RB1",  type: "skill" },
  { id: "rb2",  label: "RB2",  type: "skill" },
  { id: "rb3",  label: "RB3",  type: "skill" },
  { id: "rb4",  label: "RB4",  type: "skill" },
  { id: "wr1",  label: "WR1",  type: "skill" },
  { id: "wr2",  label: "WR2",  type: "skill" },
  { id: "wr3",  label: "WR3",  type: "skill" },
  { id: "wr4",  label: "WR4",  type: "skill" },
  { id: "te1",  label: "TE1",  type: "skill" },
  { id: "te2",  label: "TE2",  type: "skill" },
  { id: "c",    label: "C",    type: "ol" },
  { id: "lg",   label: "LG",   type: "ol" },
  { id: "rg",   label: "RG",   type: "ol" },
  { id: "lt",   label: "LT",   type: "ol" },
  { id: "rt",   label: "RT",   type: "ol" },
  { id: "re",   label: "RE",   type: "def" },
  { id: "nt",   label: "NT",   type: "def" },
  { id: "le",   label: "LE",   type: "def" },
  { id: "rolb", label: "ROLB", type: "def" },
  { id: "rilb", label: "RILB", type: "def" },
  { id: "lilb", label: "LILB", type: "def" },
  { id: "lolb", label: "LOLB", type: "def" },
  { id: "rcb",  label: "RCB",  type: "def" },
  { id: "lcb",  label: "LCB",  type: "def" },
  { id: "fs",   label: "FS",   type: "def" },
  { id: "ss",   label: "SS",   type: "def" },
  { id: "k",    label: "K",    type: "kick" },
  { id: "p",    label: "P",    type: "kick" },
];

// Byte counts per position type
export const BYTES: Record<PosType, number> = { qb: 5, skill: 4, ol: 3, def: 4, kick: 4 };

// Total: 2×5 + 10×4 + 5×3 + 11×4 + 2×4 = 117
export const TEAM_BYTES = 117;
export const TEAM_COUNT = 28;

// Byte offset of each position within a team's abilities block
export const POS_OFFSETS: number[] = (() => {
  const offsets: number[] = [];
  let off = 0;
  for (const p of POSITIONS) {
    offsets.push(off);
    off += BYTES[p.type];
  }
  return offsets;
})();

// Buffalo Bills QB1 signature: RP=69, RS=25, MS=13, HP=13, face=0x52, PS=56, PC=81, PA=81, APB=81
export const DETECT_PATTERN = [0xa3, 0x11, 0x52, 0x8c, 0xcc];
// Buffalo is the first team in the abilities block (index 0).
// Teams 0-1 showed all 0xFF (=100) with index 2, confirming no valid data exists before Buffalo.
export const BUFFALO_INDEX = 0;

export const LS_KEY = "tecmo.abilitiesconfig.v1";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function detectBase(rom: Uint8Array): number | null {
  for (let i = 0; i <= rom.length - DETECT_PATTERN.length; i++) {
    if (DETECT_PATTERN.every((b, j) => rom[i + j] === b)) {
      const base = i - BUFFALO_INDEX * TEAM_BYTES;
      if (base >= 0 && base + TEAM_COUNT * TEAM_BYTES <= rom.length) return base;
    }
  }
  return null;
}

export function getPlayerBytes(rom: Uint8Array, base: number, teamIdx: number, posIdx: number): Uint8Array {
  const start = base + teamIdx * TEAM_BYTES + POS_OFFSETS[posIdx];
  return rom.slice(start, start + BYTES[POSITIONS[posIdx].type]);
}

export function nibble(bytes: Uint8Array, byteIdx: number, hi: boolean): number {
  const b = bytes[byteIdx] ?? 0;
  return hi ? (b >> 4) & 0xf : b & 0xf;
}

export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Face portrait images from the open-source tsbtools project
export const FACE_IMG_BASE = "https://raw.githubusercontent.com/BAD-AL/tsbtools/HEAD/TSBProjects/Java/TSBToolSupreme_netbeans/src/tsbtool_gui/facepackage/";
export function faceImgUrl(id: number) {
  return `${FACE_IMG_BASE}${id.toString(16).toUpperCase().padStart(2, "0")}.BMP`;
}
export function hexId(id: number) { return id.toString(16).toUpperCase().padStart(2, "0"); }

/** Offset of one player's ability record. */
export function playerAbilityOffset(base: number, teamIdx: number, posIdx: number) {
  return base + teamIdx * TEAM_BYTES + POS_OFFSETS[posIdx];
}

/** Returns the byte with one nibble (0–15) replaced. */
export function withNibble(b: number, hi: boolean, value: number) {
  return hi ? ((value & 0xf) << 4) | (b & 0x0f) : (b & 0xf0) | (value & 0xf);
}

export function readStoredBase(): number | null {
  try { const s = localStorage.getItem(LS_KEY); return s ? parseInt(s) : null; } catch { return null; }
}

export function writeStoredBase(offset: number | null) {
  try {
    if (offset === null) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, String(offset));
  } catch { /* storage unavailable */ }
}

/**
 * Where the ability block starts. Prefers a manually stored offset unless it's stale (the
 * signature isn't where it should be) and the real one can be auto-detected.
 */
export function resolveBase(originalRom: Uint8Array, storedBase: number | null, detectedBase: number | null) {
  const storedValid =
    storedBase !== null &&
    DETECT_PATTERN.every((b, j) => (originalRom[storedBase + BUFFALO_INDEX * TEAM_BYTES + j] ?? -1) === b);
  return storedBase !== null && (storedValid || detectedBase === null) ? storedBase : detectedBase;
}

export const GROUP_OF: Record<PosType, GroupId> = { qb: "qb", skill: "skill", ol: "oline", def: "defense", kick: "special" };

/** Which position-group tab a roster slot (0–29) lives on. */
export function groupForPosition(posIdx: number): GroupId {
  return GROUP_OF[POSITIONS[posIdx]?.type ?? "qb"];
}

// Team-level roster data for Tecmo Super Bowl (NES): positions, returners, formation.
// Offsets below are file offsets for a ROM *with* an iNES header (as used by tsbtools);
// subtract 0x10 for a headerless ROM.

export const POSITION_NAMES = [
  "QB1", "QB2", "RB1", "RB2", "RB3", "RB4", "WR1", "WR2", "WR3", "WR4", "TE1", "TE2",
  "C", "LG", "RG", "LT", "RT",
  "RE", "NT", "LE", "ROLB", "RILB", "LILB", "LOLB", "RCB", "LCB", "FS", "SS",
  "K", "P",
] as const;

export type PositionName = (typeof POSITION_NAMES)[number];

export const posIndex = (p: PositionName) => POSITION_NAMES.indexOf(p);

// Team order matches the ROM's pointer tables (Buffalo first).
export const TEAM_NAMES = [
  // AFC East (0–4)
  "Buffalo Bills", "Indianapolis Colts", "Miami Dolphins", "New England Patriots", "New York Jets",
  // AFC Central (5–8)
  "Cincinnati Bengals", "Cleveland Browns", "Houston Oilers", "Pittsburgh Steelers",
  // AFC West (9–13)
  "Denver Broncos", "Kansas City Chiefs", "Los Angeles Raiders", "San Diego Chargers", "Seattle Seahawks",
  // NFC East (14–18)
  "Washington Redskins", "New York Giants", "Philadelphia Eagles", "Phoenix Cardinals", "Dallas Cowboys",
  // NFC Central (19–23)
  "Chicago Bears", "Detroit Lions", "Green Bay Packers", "Minnesota Vikings", "Tampa Bay Buccaneers",
  // NFC West (24–27)
  "San Francisco 49ers", "Los Angeles Rams", "New Orleans Saints", "Atlanta Falcons",
];

export const fileOffset = (headeredOffset: number, hasINES: boolean) =>
  hasINES ? headeredOffset : headeredOffset - 0x10;

// One byte per team: high nibble = kick returner, low nibble = punt returner,
// each an index into POSITION_NAMES. The game keeps a second copy at 0x239D3.
const RETURNERS = 0x328d3;

export function readReturners(rom: Uint8Array, hasINES: boolean, team: number) {
  const b = rom[fileOffset(RETURNERS, hasINES) + team] ?? 0;
  return { kr: (b >> 4) & 0xf, pr: b & 0xf };
}

export type Formation = "2RB_2WR_1TE" | "1RB_3WR_1TE" | "1RB_4WR";

// Per-team formation table. The stock ROM ignores it (every team runs 2RB/2WR/1TE);
// it only takes effect once tsbtools' formation hack is installed, which replaces
// the 0xA0 at 0x21642.
const FORMATION_HACK = 0x21642;
const FORMATIONS = 0x21fe0;

export function readFormation(rom: Uint8Array, hasINES: boolean, team: number): Formation {
  if ((rom[fileOffset(FORMATION_HACK, hasINES)] ?? 0xa0) === 0xa0) return "2RB_2WR_1TE";
  switch (rom[fileOffset(FORMATIONS, hasINES) + team]) {
    case 0x01: return "1RB_4WR";
    case 0x02: return "1RB_3WR_1TE";
    default: return "2RB_2WR_1TE";
  }
}

export const FORMATION_LABEL: Record<Formation, string> = {
  "2RB_2WR_1TE": "2 RB · 2 WR · 1 TE",
  "1RB_3WR_1TE": "1 RB · 3 WR · 1 TE",
  "1RB_4WR": "1 RB · 4 WR",
};

const STARTERS: Record<Formation, PositionName[]> = {
  "2RB_2WR_1TE": ["QB1", "RB1", "RB2", "WR1", "WR2", "TE1"],
  "1RB_3WR_1TE": ["QB1", "RB1", "WR1", "WR2", "WR3", "TE1"],
  "1RB_4WR": ["QB1", "RB1", "WR1", "WR2", "WR3", "WR4"],
};

const SKILL: PositionName[] = [
  "QB1", "QB2", "RB1", "RB2", "RB3", "RB4", "WR1", "WR2", "WR3", "WR4", "TE1", "TE2",
];

/** Offensive skill players split into starters and "team area" (bench), as the game shows them. */
export function splitStarters(formation: Formation) {
  const starters = STARTERS[formation];
  return { starters, bench: SKILL.filter((p) => !starters.includes(p)) };
}

// Background colour of each team's in-game player screen, as NES palette entries
// (FCEUX palette). Oilers ($01), Eagles ($09) and Raiders ($00) are sampled from the game;
// the rest are approximations from team colours — adjust if you spot one that's off.
const NES: Record<number, string> = {
  0x00: "#737373", 0x01: "#24188e", 0x02: "#0000a8", 0x03: "#44009c", 0x04: "#8c0074",
  0x05: "#a80010", 0x06: "#a40000", 0x07: "#7c0800", 0x08: "#402c00", 0x09: "#004500",
  0x0a: "#005000", 0x0b: "#003c14", 0x0c: "#183c5c",
};
const TEAM_SCREEN_COLOR = [
  0x02, 0x01, 0x0c, 0x02, 0x09, // AFC East: Bills, Colts, Dolphins, Patriots, Jets
  0x07, 0x08, 0x01, 0x08,       // AFC Central: Bengals, Browns, Oilers, Steelers
  0x07, 0x06, 0x00, 0x01, 0x0c, // AFC West: Broncos, Chiefs, Raiders, Chargers, Seahawks
  0x04, 0x02, 0x09, 0x05, 0x01, // NFC East: Redskins, Giants, Eagles, Cardinals, Cowboys
  0x0c, 0x02, 0x0a, 0x03, 0x07, // NFC Central: Bears, Lions, Packers, Vikings, Buccaneers
  0x06, 0x02, 0x08, 0x05,       // NFC West: 49ers, Rams, Saints, Falcons
];
export const teamScreenColor = (team: number) => NES[TEAM_SCREEN_COLOR[team] ?? 0x01]!;

// Abbreviations as the game's TEAM DATA screen prints them (always 4 tiles wide).
export const TEAM_ABBR = [
  "BUF.", "IND.", "MIA.", "N.E.", "NYJ.",
  "CIN.", "CLE.", "HOU.", "PIT.",
  "DEN.", "K.C.", "L.A.", "S.D.", "SEA.",
  "WAS.", "NYG.", "PHI.", "PHX.", "DAL.",
  "CHI.", "DET.", "G.B.", "MIN.", "T.B.",
  "S.F.", "RAM.", "N.O.", "ATL.",
];

/** Team indices grouped the way the TEAM DATA screen lays them out: conference → division column. */
export const CONFERENCES = [
  { name: "AFC", divisions: [[0, 1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12, 13]] },
  { name: "NFC", divisions: [[14, 15, 16, 17, 18], [19, 20, 21, 22, 23], [24, 25, 26, 27]] },
];


// ─── All-Star (Pro Bowl) teams ────────────────────────────────────────────────
// The two All-Star teams have no players of their own: each of their 30 roster slots
// is a 2-byte reference (team index, roster slot) to a player on a regular team, so
// the All-Stars always share that player's name, number and ratings. AFC comes first,
// then NFC. (Per tsbtools; see tecmobowl.org "editing pro bowl rosters".)
const ALL_STARS = 0x32853;

export const AFC_ALL_STARS = 28;
export const NFC_ALL_STARS = 29;
export const ALL_STAR_TEAMS = [AFC_ALL_STARS, NFC_ALL_STARS];
export const isAllStarTeam = (team: number) => team >= AFC_ALL_STARS;

const ALL_STAR_NAMES = ["AFC All Stars", "NFC All Stars"];
const ALL_STAR_ABBR = ["AFC.", "NFC."];

/** Display name for any team index, including the All-Star teams. */
export const teamName = (team: number) =>
  TEAM_NAMES[team] ?? ALL_STAR_NAMES[team - AFC_ALL_STARS] ?? `Team ${team + 1}`;
export const teamAbbr = (team: number) =>
  TEAM_ABBR[team] ?? ALL_STAR_ABBR[team - AFC_ALL_STARS] ?? "";

export const allStarSlotOffset = (hasINES: boolean, allStarTeam: number, slot: number) =>
  fileOffset(ALL_STARS + (allStarTeam - AFC_ALL_STARS) * 60 + slot * 2, hasINES);

export interface PlayerRef { team: number; slot: number }

/**
 * The regular-team player who actually fills (team, slot). For a regular team that's
 * the player themself; for an All-Star team it follows the ROM's reference.
 */
export function resolvePlayer(rom: Uint8Array, hasINES: boolean, team: number, slot: number): PlayerRef {
  if (!isAllStarTeam(team)) return { team, slot };
  const o = allStarSlotOffset(hasINES, team, slot);
  const src = { team: rom[o] ?? 0, slot: rom[o + 1] ?? 0 };
  // Guard against junk in hacked ROMs so callers can always index a real team.
  return src.team < TEAM_NAMES.length && src.slot < POSITION_NAMES.length ? src : { team: 0, slot };
}


// ─── Team city / nickname strings ─────────────────────────────────────────────
// A table of 120 little-endian CPU pointers into a block of packed, unterminated
// strings: each string ends where the next pointer begins, and the last pointer is an
// end sentinel. Entries 0–27 are abbreviations, 32–59 cities and 64–91 nicknames (then
// AFC/NFC, quarter labels, menu words…). The strings sit in the bank mapped at
// $8000–$BFFF, followed by unused $FF padding up to the end of the bank, so renaming a
// team repacks every string and rewrites the pointers.
const TEAM_TEXT_POINTERS = 0x1fc10;
const TEAM_TEXT_COUNT = 120;
const TEAM_TEXT_CPU_TO_FILE = 0x14010; // $8000 → 0x1C010 (headered)
const TEAM_TEXT_BANK_END = 0x20010; // $C000
const CITY_BASE = 32;
const NICKNAME_BASE = 64;

export type TeamTextField = "city" | "nickname";

/** Longest stock values (SAN FRANCISCO, BUCCANEERS); longer ones can spill off game screens. */
export const TEAM_TEXT_MAX: Record<TeamTextField, number> = { city: 13, nickname: 10 };

/** Characters the game's font has tiles for. */
export const TEAM_TEXT_ALLOWED = /^[A-Z0-9 .]*$/;

interface TeamTextTable {
  strings: Uint8Array[];
  /** Headered file offset of the first string. */
  start: number;
}

function readTeamTextTable(rom: Uint8Array, hasINES: boolean): TeamTextTable | null {
  const table = fileOffset(TEAM_TEXT_POINTERS, hasINES);
  if (table + TEAM_TEXT_COUNT * 2 > rom.length) return null;
  const ptrs: number[] = [];
  for (let i = 0; i < TEAM_TEXT_COUNT; i++) {
    const cpu = rom[table + i * 2]! | (rom[table + i * 2 + 1]! << 8);
    const file = cpu + TEAM_TEXT_CPU_TO_FILE;
    // Pointers must stay in the bank and never go backwards; otherwise this isn't the table.
    if (cpu < 0x8000 || file > TEAM_TEXT_BANK_END || (i > 0 && file < ptrs[i - 1]!)) return null;
    ptrs.push(file);
  }
  const strings: Uint8Array[] = [];
  for (let i = 0; i < TEAM_TEXT_COUNT - 1; i++) {
    strings.push(rom.slice(fileOffset(ptrs[i]!, hasINES), fileOffset(ptrs[i + 1]!, hasINES)));
  }
  return { strings, start: ptrs[0]! };
}

/** End of usable space: the original end sentinel plus any unused $FF bytes after it. */
function teamTextLimit(original: Uint8Array, hasINES: boolean): number {
  const table = fileOffset(TEAM_TEXT_POINTERS, hasINES) + (TEAM_TEXT_COUNT - 1) * 2;
  let end = original[table]! | (original[table + 1]! << 8);
  end += TEAM_TEXT_CPU_TO_FILE;
  while (end < TEAM_TEXT_BANK_END && original[fileOffset(end, hasINES)] === 0xff) end++;
  return end;
}

const ascii = (b: Uint8Array) => String.fromCharCode(...b);

export interface TeamText {
  city: string[];
  nickname: string[];
}

/** City and nickname for each of the 28 regular teams, or null if the table isn't found. */
export function readTeamText(rom: Uint8Array, hasINES: boolean): TeamText | null {
  const t = readTeamTextTable(rom, hasINES);
  if (!t) return null;
  const pick = (base: number) =>
    TEAM_NAMES.map((_, i) => ascii(t.strings[base + i]!).trim());
  return { city: pick(CITY_BASE), nickname: pick(NICKNAME_BASE) };
}

/** Bytes still free in the string block for renames. */
export function teamTextFreeBytes(rom: Uint8Array, original: Uint8Array, hasINES: boolean) {
  const t = readTeamTextTable(rom, hasINES);
  if (!t) return 0;
  const used = t.strings.reduce((n, s) => n + s.length, 0);
  return teamTextLimit(original, hasINES) - t.start - used;
}

/**
 * Builds the patch that renames one team's city and nickname: a contiguous run of bytes
 * starting at `offset` covering the pointers and the repacked strings. Returns an error
 * message instead if the new text doesn't fit.
 */
export function writeTeamText(
  rom: Uint8Array,
  original: Uint8Array,
  hasINES: boolean,
  team: number,
  city: string,
  nickname: string,
): { offset: number; bytes: Uint8Array } | string {
  const t = readTeamTextTable(rom, hasINES);
  if (!t) return "Couldn't find the team name table in this ROM.";
  const strings = [...t.strings];
  strings[CITY_BASE + team] = Uint8Array.from(city, (c) => c.charCodeAt(0));
  strings[NICKNAME_BASE + team] = Uint8Array.from(nickname, (c) => c.charCodeAt(0));

  const limit = teamTextLimit(original, hasINES);
  const used = strings.reduce((n, s) => n + s.length, 0);
  if (t.start + used > limit) {
    return `Not enough room in the ROM: shorten by ${t.start + used - limit} letter(s) (here or on another team).`;
  }

  // Lay out pointers + strings, padding freed space with $FF, then keep only the span
  // that actually changed so the edit list stays tidy.
  const from = fileOffset(TEAM_TEXT_POINTERS, hasINES);
  const to = fileOffset(limit, hasINES);
  const next = rom.slice(from, to);
  const strBase = fileOffset(t.start, hasINES) - from;
  next.fill(0xff, strBase);
  let pos = t.start;
  strings.forEach((s, i) => {
    const cpu = pos - TEAM_TEXT_CPU_TO_FILE;
    next[i * 2] = cpu & 0xff;
    next[i * 2 + 1] = cpu >> 8;
    next.set(s, fileOffset(pos, hasINES) - from);
    pos += s.length;
  });
  const endCpu = pos - TEAM_TEXT_CPU_TO_FILE;
  next[(TEAM_TEXT_COUNT - 1) * 2] = endCpu & 0xff;
  next[(TEAM_TEXT_COUNT - 1) * 2 + 1] = endCpu >> 8;

  let lo = 0;
  let hi = next.length;
  while (lo < hi && next[lo] === rom[from + lo]) lo++;
  while (hi > lo && next[hi - 1] === rom[from + hi - 1]) hi--;
  return { offset: from + lo, bytes: next.slice(lo, hi) };
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s.])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());

/** "Buffalo Bills" from the ROM's text, falling back to the stock name. */
export function teamNameFrom(text: TeamText | null, team: number) {
  if (!text || isAllStarTeam(team) || !text.city[team]) return teamName(team);
  return titleCase(`${text.city[team]} ${text.nickname[team]}`);
}

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

const fileOffset = (headeredOffset: number, hasINES: boolean) =>
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

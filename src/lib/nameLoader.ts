const TEAM_COUNT = 28;
const SLOTS_PER_TEAM = 30;
const CPU_TO_FILE_INES = 0x7ff0;
const CPU_TO_FILE_RAW = 0x8000;

function readU16LE(rom: Uint8Array, offset: number): number {
  return (rom[offset] ?? 0) | ((rom[offset + 1] ?? 0) << 8);
}

export function bcdToDec(bcd: number): number {
  return ((bcd >> 4) & 0xf) * 10 + (bcd & 0xf);
}

export function decToBcd(n: number): number {
  n = Math.max(0, Math.min(99, n));
  return ((Math.floor(n / 10) & 0xf) << 4) | ((n % 10) & 0xf);
}

export function splitName(raw: string): { first: string; last: string } {
  let seenLower = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === ".") return { first: raw.slice(0, i + 1), last: raw.slice(i + 1) };
    if (c >= "a" && c <= "z") {
      seenLower = true;
      continue;
    }
    if (c >= "A" && c <= "Z" && seenLower) return { first: raw.slice(0, i), last: raw.slice(i) };
  }
  return { first: "", last: raw };
}

export interface PlayerName {
  first: string;
  last: string;
}

export interface Player {
  slot: number;
  jerseyBcd: number;
  jersey: number;
  first: string; // from originalRom
  last: string; // from originalRom
  offset: number; // file offset of jersey byte
  nameLength: number;
}

export interface TeamData {
  index: number;
  players: Player[];
}

// Full player load with ROM offsets — needed for editing.
export function loadTeams(rom: Uint8Array, hasINES: boolean): TeamData[] | string {
  const cpuToFile = hasINES ? CPU_TO_FILE_INES : CPU_TO_FILE_RAW;
  const prgStart = hasINES ? 0x10 : 0x00;

  if (prgStart + TEAM_COUNT * 2 > rom.length) return "ROM too small to contain team pointer table.";

  const teamOffsets: number[] = [];
  for (let t = 0; t < TEAM_COUNT; t++) {
    const cpu = readU16LE(rom, prgStart + t * 2);
    const file = cpu - cpuToFile;
    if (file < 0 || file >= rom.length)
      return `Invalid team pointer for team ${t}: CPU 0x${cpu.toString(16)} → file 0x${file.toString(16)}`;
    teamOffsets.push(file);
  }

  // Player pointer tables are contiguous (28 × 30 pointers, then one end sentinel), so a
  // player's record always ends where the next pointer in the list begins — including the
  // last player of each team, whose "next" is the following team's first player.
  const teams: TeamData[] = [];
  for (let t = 0; t < TEAM_COUNT; t++) {
    const tableOffset = teamOffsets[t]!;
    const nextTableOffset =
      t < TEAM_COUNT - 1 ? teamOffsets[t + 1]! : tableOffset + SLOTS_PER_TEAM * 2;
    const slotCount = Math.max(0, Math.floor((nextTableOffset - tableOffset) / 2));

    const players: Player[] = [];
    for (let s = 0; s < slotCount; s++) {
      const offset = readU16LE(rom, tableOffset + s * 2) - cpuToFile;
      const nextOffset = readU16LE(rom, tableOffset + (s + 1) * 2) - cpuToFile;
      if (offset < 0 || nextOffset <= offset || nextOffset > rom.length) continue;
      const nameLength = nextOffset - offset - 1;

      const jerseyBcd = rom[offset]!;
      const rawName = String.fromCharCode(...rom.slice(offset + 1, offset + 1 + nameLength));
      const { first, last } = splitName(rawName);
      players.push({
        slot: s,
        jerseyBcd,
        jersey: bcdToDec(jerseyBcd),
        first,
        last,
        offset,
        nameLength,
      });
    }
    teams.push({ index: t, players });
  }
  return teams;
}

// Lightweight name-only load (no offsets) — kept for any future lightweight consumers.
export function loadPlayerNames(rom: Uint8Array, hasINES: boolean): PlayerName[][] | null {
  const result = loadTeams(rom, hasINES);
  if (typeof result === "string") return null;
  return result.map((t) => t.players.map((p) => ({ first: p.first, last: p.last })));
}

// ─── Variable-length name editing ─────────────────────────────────────────────
//
// Records sit back to back, so a name can only grow if everything after it moves. We
// rewrite the whole block and its pointers on every change, keeping it inside the space
// the stock ROM used: renaming one player borrows bytes freed by shortening others.

/** Longest name in the stock ROM (e.g. "vinnyTESTAVERDE"), so every screen is known to fit it. */
export const MAX_NAME_CHARS = 15;
/** Longest stock last name ("MERRIWEATHER"). */
export const MAX_LAST_CHARS = 12;

const POINTER_COUNT = TEAM_COUNT * SLOTS_PER_TEAM + 1; // + end sentinel
const FILLER = 0xff; // what the stock ROM has after the last name

/** File offsets of the name block: pointer table, first record, and the end it must fit within. */
export interface NamePool {
  tableOffset: number;
  start: number;
  end: number;
}

/** Read from the unedited ROM so the pool's size never changes during a session. */
export function namePool(rom: Uint8Array, hasINES: boolean): NamePool | null {
  const cpuToFile = hasINES ? CPU_TO_FILE_INES : CPU_TO_FILE_RAW;
  const tableOffset = readU16LE(rom, hasINES ? 0x10 : 0x00) - cpuToFile;
  if (tableOffset < 0 || tableOffset + POINTER_COUNT * 2 > rom.length) return null;
  const start = readU16LE(rom, tableOffset) - cpuToFile;
  const end = readU16LE(rom, tableOffset + (POINTER_COUNT - 1) * 2) - cpuToFile;
  if (start < tableOffset + POINTER_COUNT * 2 || end <= start || end > rom.length) return null;
  return { tableOffset, start, end };
}

/** Bytes the current records take up (jersey + name each). */
export function namePoolUsed(rom: Uint8Array, hasINES: boolean, pool: NamePool): number {
  const cpuToFile = hasINES ? CPU_TO_FILE_INES : CPU_TO_FILE_RAW;
  return readU16LE(rom, pool.tableOffset + (POINTER_COUNT - 1) * 2) - cpuToFile - pool.start;
}

export function encodeName(first: string, last: string): string {
  return first.toLowerCase() + last.toUpperCase();
}

/**
 * Rebuilds the pointer table and name block with one player's name replaced. Returns the
 * bytes to write at `pool.tableOffset`, or an error if the names no longer fit.
 */
export function repackName(
  rom: Uint8Array,
  hasINES: boolean,
  pool: NamePool,
  team: number,
  slot: number,
  first: string,
  last: string,
): Uint8Array | string {
  const cpuToFile = hasINES ? CPU_TO_FILE_INES : CPU_TO_FILE_RAW;
  const target = team * SLOTS_PER_TEAM + slot;
  const name = encodeName(first, last);

  const records: Uint8Array[] = [];
  for (let i = 0; i < POINTER_COUNT - 1; i++) {
    const offset = readU16LE(rom, pool.tableOffset + i * 2) - cpuToFile;
    const next = readU16LE(rom, pool.tableOffset + (i + 1) * 2) - cpuToFile;
    if (offset < pool.start || next <= offset || next > pool.end)
      return "The name block in this ROM isn't laid out as expected.";
    if (i !== target) {
      records.push(rom.slice(offset, next));
      continue;
    }
    const rec = new Uint8Array(1 + name.length);
    rec[0] = rom[offset]!; // jersey
    for (let c = 0; c < name.length; c++) rec[1 + c] = name.charCodeAt(c) & 0xff;
    records.push(rec);
  }

  const used = records.reduce((n, r) => n + r.length, 0);
  if (pool.start + used > pool.end)
    return `Out of name space by ${pool.start + used - pool.end} letters.`;

  const out = rom.slice(pool.tableOffset, pool.end); // keeps anything between table and records
  out.fill(FILLER, pool.start - pool.tableOffset);
  let at = pool.start;
  records.forEach((rec, i) => {
    out.set(rec, at - pool.tableOffset);
    const cpu = at + cpuToFile;
    out[i * 2] = cpu & 0xff;
    out[i * 2 + 1] = cpu >> 8;
    at += rec.length;
  });
  const sentinel = at + cpuToFile;
  out[(POINTER_COUNT - 1) * 2] = sentinel & 0xff;
  out[(POINTER_COUNT - 1) * 2 + 1] = sentinel >> 8;
  return out;
}

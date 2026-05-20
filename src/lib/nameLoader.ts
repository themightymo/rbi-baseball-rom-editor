const TEAM_COUNT = 28;
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
  return ((Math.floor(n / 10) & 0xf) << 4) | (n % 10 & 0xf);
}

export function splitName(raw: string): { first: string; last: string } {
  let seenLower = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === ".") return { first: raw.slice(0, i + 1), last: raw.slice(i + 1) };
    if (c >= "a" && c <= "z") { seenLower = true; continue; }
    if (c >= "A" && c <= "Z" && seenLower) return { first: raw.slice(0, i), last: raw.slice(i) };
  }
  return { first: "", last: raw };
}

export interface PlayerName { first: string; last: string }

export interface Player {
  slot: number;
  jerseyBcd: number;
  jersey: number;
  first: string;   // from originalRom
  last: string;    // from originalRom
  offset: number;  // file offset of jersey byte
  nameLength: number;
}

export interface TeamData {
  index: number;
  players: Player[];
}

// Full player load with ROM offsets — needed for editing.
export function loadTeams(rom: Uint8Array, hasINES: boolean): TeamData[] | string {
  const cpuToFile = hasINES ? CPU_TO_FILE_INES : CPU_TO_FILE_RAW;
  const prgStart  = hasINES ? 0x10 : 0x00;

  if (prgStart + TEAM_COUNT * 2 > rom.length) return "ROM too small to contain team pointer table.";

  const teamOffsets: number[] = [];
  for (let t = 0; t < TEAM_COUNT; t++) {
    const cpu  = readU16LE(rom, prgStart + t * 2);
    const file = cpu - cpuToFile;
    if (file < 0 || file >= rom.length)
      return `Invalid team pointer for team ${t}: CPU 0x${cpu.toString(16)} → file 0x${file.toString(16)}`;
    teamOffsets.push(file);
  }

  const teams: TeamData[] = [];
  for (let t = 0; t < TEAM_COUNT; t++) {
    const tableOffset     = teamOffsets[t]!;
    const nextTableOffset = t < TEAM_COUNT - 1 ? teamOffsets[t + 1]! : tableOffset + 30;
    const slotCount       = Math.max(0, Math.floor((nextTableOffset - tableOffset) / 2));

    const playerOffsets: number[] = [];
    for (let s = 0; s < slotCount; s++) {
      const cpu  = readU16LE(rom, tableOffset + s * 2);
      const file = cpu - cpuToFile;
      if (file >= 0 && file < rom.length) playerOffsets.push(file);
    }

    const players: Player[] = [];
    for (let s = 0; s < playerOffsets.length; s++) {
      const offset      = playerOffsets[s]!;
      const nextOffset  = s < playerOffsets.length - 1 ? playerOffsets[s + 1]! : offset + 15;
      const recordLength = Math.max(1, nextOffset - offset);
      const nameLength   = recordLength - 1;
      if (offset + recordLength > rom.length) continue;

      const jerseyBcd = rom[offset]!;
      const rawName   = String.fromCharCode(...rom.slice(offset + 1, offset + 1 + nameLength));
      const { first, last } = splitName(rawName);
      players.push({ slot: s, jerseyBcd, jersey: bcdToDec(jerseyBcd), first, last, offset, nameLength });
    }
    teams.push({ index: t, players });
  }
  return teams;
}

// Lightweight name-only load (no offsets) — kept for any future lightweight consumers.
export function loadPlayerNames(rom: Uint8Array, hasINES: boolean): PlayerName[][] | null {
  const result = loadTeams(rom, hasINES);
  if (typeof result === "string") return null;
  return result.map(t => t.players.map(p => ({ first: p.first, last: p.last })));
}

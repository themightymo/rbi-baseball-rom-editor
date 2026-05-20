const TEAM_COUNT = 28;
const CPU_TO_FILE_INES = 0x7ff0;
const CPU_TO_FILE_RAW = 0x8000;

function readU16LE(rom: Uint8Array, offset: number): number {
  return (rom[offset] ?? 0) | ((rom[offset + 1] ?? 0) << 8);
}

function bcdToDec(bcd: number): number {
  return ((bcd >> 4) & 0xf) * 10 + (bcd & 0xf);
}

function splitName(raw: string): { first: string; last: string } {
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

// Returns 28 teams × N players, each player's name in position-slot order
// (slot 0 = QB1, 1 = QB2, 2 = RB1, …). Returns null on invalid ROM.
export function loadPlayerNames(rom: Uint8Array, hasINES: boolean): PlayerName[][] | null {
  const cpuToFile = hasINES ? CPU_TO_FILE_INES : CPU_TO_FILE_RAW;
  const prgStart  = hasINES ? 0x10 : 0x00;

  if (prgStart + TEAM_COUNT * 2 > rom.length) return null;

  const teamOffsets: number[] = [];
  for (let t = 0; t < TEAM_COUNT; t++) {
    const cpu  = readU16LE(rom, prgStart + t * 2);
    const file = cpu - cpuToFile;
    if (file < 0 || file >= rom.length) return null;
    teamOffsets.push(file);
  }

  return teamOffsets.map((tableOffset, t) => {
    const nextTable  = t < TEAM_COUNT - 1 ? teamOffsets[t + 1]! : tableOffset + 30;
    const slotCount  = Math.max(0, Math.floor((nextTable - tableOffset) / 2));

    const playerOffsets: number[] = [];
    for (let s = 0; s < slotCount; s++) {
      const cpu  = readU16LE(rom, tableOffset + s * 2);
      const file = cpu - cpuToFile;
      if (file >= 0 && file < rom.length) playerOffsets.push(file);
    }

    return playerOffsets.map((offset, s) => {
      const next       = s < playerOffsets.length - 1 ? playerOffsets[s + 1]! : offset + 15;
      const nameLength = Math.max(0, next - offset - 1);
      if (offset + 1 + nameLength > rom.length) return { first: "", last: "" };
      // skip jersey byte (offset+0), read name bytes
      const rawName = String.fromCharCode(...rom.slice(offset + 1, offset + 1 + nameLength));
      const { first, last } = splitName(rawName);
      return { first: first.trimEnd(), last: last.trimEnd() };
    });
  });
}

export { bcdToDec };

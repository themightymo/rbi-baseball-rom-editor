import { useMemo } from "react";
import { useRom } from "@/lib/romStore";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

// ─── TSB ROM constants ────────────────────────────────────────────────────────

const TEAM_COUNT = 28;
// Team pointer table starts at the very beginning of PRG-ROM.
// With iNES header the PRG starts at file offset 0x10 (CPU 0x8000).
// Without header it starts at file offset 0x00 (CPU 0x8000).
// cpu_addr - CPU_TO_FILE = file_offset
const CPU_TO_FILE_INES = 0x7ff0;
const CPU_TO_FILE_RAW = 0x8000;

// ─── ROM utilities ────────────────────────────────────────────────────────────

function readU16LE(rom: Uint8Array, offset: number): number {
  return (rom[offset] ?? 0) | ((rom[offset + 1] ?? 0) << 8);
}

function bcdToDec(bcd: number): number {
  return ((bcd >> 4) & 0xf) * 10 + (bcd & 0xf);
}

function decToBcd(n: number): number {
  n = Math.max(0, Math.min(99, n));
  return ((Math.floor(n / 10) & 0xf) << 4) | (n % 10 & 0xf);
}

// Split "thurmanTHOMAS" → { first: "thurman", last: "THOMAS" }
// Matches the game's TRANSFER_NAME_TO_BUFFER logic:
// - Lowercase bytes = first name
// - First uppercase byte (after seeing lowercase) starts the last name
// - Period ends the first name without inserting an extra space
function splitName(raw: string): { first: string; last: string } {
  let seenLower = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === ".") return { first: raw.slice(0, i + 1), last: raw.slice(i + 1) };
    if (c >= "a" && c <= "z") { seenLower = true; continue; }
    if (c >= "A" && c <= "Z" && seenLower) {
      return { first: raw.slice(0, i), last: raw.slice(i) };
    }
  }
  return { first: "", last: raw };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  slot: number;
  jerseyBcd: number;
  jersey: number;
  first: string;   // lowercase as stored in ROM
  last: string;    // UPPERCASE as stored in ROM
  offset: number;  // file offset of jersey byte
  nameLength: number; // bytes for name only (record length - 1)
}

interface TeamData {
  index: number;
  players: Player[];
}

// ─── Pointer-based loader ─────────────────────────────────────────────────────

function loadTeams(rom: Uint8Array, hasINES: boolean): TeamData[] | string {
  const cpuToFile = hasINES ? CPU_TO_FILE_INES : CPU_TO_FILE_RAW;
  const prgStart = hasINES ? 0x10 : 0x00;

  // 28 team pointers at start of PRG-ROM
  const teamTableStart = prgStart;
  if (teamTableStart + TEAM_COUNT * 2 > rom.length) {
    return "ROM too small to contain team pointer table.";
  }

  const teamOffsets: number[] = [];
  for (let t = 0; t < TEAM_COUNT; t++) {
    const cpu = readU16LE(rom, teamTableStart + t * 2);
    const file = cpu - cpuToFile;
    if (file < 0 || file >= rom.length) return `Invalid team pointer for team ${t}: CPU 0x${cpu.toString(16)} → file 0x${file.toString(16)}`;
    teamOffsets.push(file);
  }

  const teams: TeamData[] = [];

  for (let t = 0; t < TEAM_COUNT; t++) {
    const tableOffset = teamOffsets[t];
    // Number of player slots = (nextTeamTable - thisTeamTable) / 2
    const nextTableOffset = t < TEAM_COUNT - 1 ? teamOffsets[t + 1] : tableOffset + 30;
    const slotCount = Math.max(0, Math.floor((nextTableOffset - tableOffset) / 2));

    const playerOffsets: number[] = [];
    for (let s = 0; s < slotCount; s++) {
      const cpu = readU16LE(rom, tableOffset + s * 2);
      const file = cpu - cpuToFile;
      if (file < 0 || file >= rom.length) continue;
      playerOffsets.push(file);
    }

    const players: Player[] = [];
    for (let s = 0; s < playerOffsets.length; s++) {
      const offset = playerOffsets[s];
      const nextOffset = s < playerOffsets.length - 1 ? playerOffsets[s + 1] : offset + 15;
      const recordLength = Math.max(1, nextOffset - offset);
      const nameLength = recordLength - 1;

      if (offset + recordLength > rom.length) continue;

      const jerseyBcd = rom[offset];
      const jersey = bcdToDec(jerseyBcd);
      const rawBytes = rom.slice(offset + 1, offset + 1 + nameLength);
      const rawName = String.fromCharCode(...rawBytes);
      const { first, last } = splitName(rawName);

      players.push({ slot: s, jerseyBcd, jersey, first, last, offset, nameLength });
    }

    teams.push({ index: t, players });
  }

  return teams;
}

// ─── Team name lookup ─────────────────────────────────────────────────────────

const TEAM_NAMES = [
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

// ─── Main component ───────────────────────────────────────────────────────────

export function PlayerNameEditor() {
  const { rom, originalRom, hasINES, setBytes } = useRom();

  // Load teams from original ROM (stable offsets)
  const result = useMemo(() => {
    if (!originalRom) return null;
    return loadTeams(originalRom, hasINES);
  }, [originalRom, hasINES]);

  const teams = Array.isArray(result) ? result : null;
  const loadError = typeof result === "string" ? result : null;

  // For each player, read current name from live ROM at same offsets
  function getCurrent(p: Player) {
    if (!rom) return { first: p.first, last: p.last, jersey: p.jersey };
    const jerseyBcd = rom[p.offset];
    const rawBytes = rom.slice(p.offset + 1, p.offset + 1 + p.nameLength);
    const rawName = String.fromCharCode(...rawBytes);
    const { first, last } = splitName(rawName);
    return { first: first.trimEnd(), last: last.trimEnd(), jersey: bcdToDec(jerseyBcd) };
  }

  function writeName(p: Player, newFirst: string, newLast: string) {
    if (!rom) return;
    const combined = newFirst.toLowerCase() + newLast.toUpperCase();
    const bytes = new Uint8Array(p.nameLength).fill(0x20);
    for (let i = 0; i < Math.min(p.nameLength, combined.length); i++) {
      bytes[i] = combined.charCodeAt(i) & 0xff;
    }
    setBytes(p.offset + 1, bytes);
  }

  function writeJersey(p: Player, n: number) {
    setBytes(p.offset, new Uint8Array([decToBcd(n)]));
  }

  if (!rom) return null;

  if (loadError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-destructive">
          Couldn't find the player rosters in this ROM.
        </p>
        <p className="mt-1 text-muted-foreground">
          This editor expects an unmodified-layout NTSC Tecmo Super Bowl ROM. Heavily hacked
          ROMs may need the Advanced tools. <span className="font-mono text-xs">({loadError})</span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Teams */}
      <Accordion type="multiple" className="rounded-lg border bg-card overflow-hidden">
        {teams?.map((team) => {
          const changedCount = team.players.filter((p) => {
            const cur = getCurrent(p);
            return cur.first !== p.first || cur.last !== p.last || cur.jersey !== p.jersey;
          }).length;
          return (
          <AccordionItem key={team.index} value={`team-${team.index}`} className="border-b last:border-b-0">
            <AccordionTrigger className="px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:no-underline hover:bg-muted/50">
              <span className="flex items-center gap-2">
                {TEAM_NAMES[team.index] ?? `Team ${team.index + 1}`}
                {changedCount > 0 && (
                  <span className="rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-600 dark:text-yellow-400">
                    {changedCount} edited
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-14 px-3 py-2">Jersey</th>
                  <th className="px-2 py-2">First Name</th>
                  <th className="px-2 py-2">Last Name</th>
                </tr>
              </thead>
              <tbody>
                {team.players.map((p) => {
                  const cur = getCurrent(p);
                  const fnChanged = cur.first !== p.first;
                  const lnChanged = cur.last !== p.last;
                  const jerseyChanged = cur.jersey !== p.jersey;
                  const maxFirst = p.nameLength - cur.last.length;
                  const maxLast = p.nameLength - cur.first.length;
                  return (
                    <tr key={p.slot} className="border-t hover:bg-accent/20">
                      <td className="px-3 py-1">
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          className={`h-8 w-12 text-center font-mono text-xs ${jerseyChanged ? "border-yellow-500" : ""}`}
                          value={cur.jersey}
                          onChange={(e) => writeJersey(p, parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className={`h-9 border-2 font-mono text-sm font-semibold ${fnChanged ? "border-yellow-500" : "border-input"}`}
                          value={cur.first}
                          maxLength={maxFirst}
                          onChange={(e) => writeName(p, e.target.value, cur.last)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          className={`h-9 border-2 font-mono text-sm font-semibold ${lnChanged ? "border-yellow-500" : "border-input"}`}
                          value={cur.last}
                          maxLength={maxLast}
                          onChange={(e) => writeName(p, cur.first, e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </AccordionContent>
          </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

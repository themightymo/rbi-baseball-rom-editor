import { useMemo } from "react";
import { useRom } from "@/lib/romStore";
import { bcdToDec, loadTeams, splitName, type TeamData } from "@/lib/nameLoader";
import {
  FORMATION_LABEL,
  POSITION_NAMES,
  TEAM_NAMES,
  posIndex,
  readFormation,
  readReturners,
  splitStarters,
  type PositionName,
} from "@/lib/tsbRoster";
import { TeamSelect } from "@/components/TeamSelect";

interface Props {
  teamIdx: number;
  onTeamChange: (i: number) => void;
  /** Called with a roster slot (0–29) when a player is clicked. */
  onEditPlayer: (posIdx: number) => void;
}

interface Slot {
  label: string;
  positions: PositionName[];
}

// Group consecutive positions that share a label (RB1, RB2 → "RB"), like the game screen.
function slotsFor(positions: PositionName[]): Slot[] {
  const out: Slot[] = [];
  for (const p of positions) {
    const label = p.replace(/\d$/, "");
    const last = out[out.length - 1];
    if (last?.label === label) last.positions.push(p);
    else out.push({ label, positions: [p] });
  }
  return out;
}

const OL: PositionName[] = ["C", "LG", "RG", "LT", "RT"];
const DL: PositionName[] = ["RE", "NT", "LE"];
const LB: PositionName[] = ["ROLB", "RILB", "LILB", "LOLB"];
const DB: PositionName[] = ["RCB", "LCB", "FS", "SS"];
const KP: PositionName[] = ["K", "P"];

export function TeamRosterView({ teamIdx, onTeamChange, onEditPlayer }: Props) {
  const { rom, originalRom, hasINES } = useRom();

  const teams = useMemo((): TeamData[] | null => {
    if (!originalRom) return null;
    const r = loadTeams(originalRom, hasINES);
    return Array.isArray(r) ? r : null;
  }, [originalRom, hasINES]);

  if (!rom) return null;
  if (!teams) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Couldn't find the team rosters in this ROM.
      </div>
    );
  }

  const players = teams[teamIdx]?.players ?? [];
  const formation = readFormation(rom, hasINES, teamIdx);
  const { starters, bench } = splitStarters(formation);
  const { kr, pr } = readReturners(rom, hasINES, teamIdx);

  // Names and numbers come from the live ROM so edits made elsewhere show up here.
  const playerAt = (posIdx: number) => {
    const p = players.find((pl) => pl.slot === posIdx);
    if (!p) return null;
    const raw = String.fromCharCode(...rom.slice(p.offset + 1, p.offset + 1 + p.nameLength));
    const { first, last } = splitName(raw);
    return { first: first.trimEnd(), last: last.trimEnd(), jersey: bcdToDec(rom[p.offset] ?? 0) };
  };

  const Name = ({ posIdx }: { posIdx: number }) => {
    const pl = playerAt(posIdx);
    if (!pl) return <span className="text-white/40">—</span>;
    return (
      <button
        onClick={() => onEditPlayer(posIdx)}
        title={`${pl.first} ${pl.last} · #${pl.jersey} · ${POSITION_NAMES[posIdx]} — click to open`}
        className="group flex w-full items-baseline gap-2 rounded px-1 text-left hover:bg-white/10"
      >
        <span className="font-bold tracking-wider group-hover:text-[#8fe08f]">
          {pl.last.toUpperCase() || pl.first.toUpperCase()}
        </span>
        <span className="text-[10px] text-white/50">#{pl.jersey}</span>
      </button>
    );
  };

  const Rows = ({ slots }: { slots: Slot[] }) => (
    <div className="space-y-2">
      {slots.map((s, i) => (
        <div key={i} className="grid grid-cols-[3.25rem_1fr] items-start">
          <span className="pt-px font-bold tracking-wider text-white/80">{s.label}</span>
          <div className="space-y-0.5">
            {s.positions.map((p) => (
              <Name key={p} posIdx={posIndex(p)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // Individual positions keep their own label (C, LG, RE, ROLB…).
  const single = (ps: PositionName[]) => ps.map((p) => ({ label: p, positions: [p] }));

  const returnerSlots = [
    { label: "KR", idx: kr },
    { label: "PR", idx: pr },
  ];

  return (
    <div className="space-y-3">
      <TeamSelect teamIdx={teamIdx} onTeamChange={onTeamChange} />

      {/* Game-style screen */}
      <div className="overflow-hidden rounded-lg border-4 border-black bg-black font-mono text-sm text-white shadow-lg">
        <div className="flex flex-wrap items-baseline justify-between gap-2 bg-[#3c9c3c] px-4 py-2">
          <h2 className="text-lg font-bold uppercase tracking-widest">{TEAM_NAMES[teamIdx]}</h2>
          <span className="text-xs font-bold uppercase tracking-wider text-white/90">
            {FORMATION_LABEL[formation]}
          </span>
        </div>

        <div className="space-y-4 p-3 sm:p-4">
          <Heading>Offense</Heading>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-3">
              <Panel title="Starters">
                <Rows slots={slotsFor(starters)} />
              </Panel>
              <Panel title="Returners">
                <div className="space-y-0.5">
                  {returnerSlots.map((r) => (
                    <div key={r.label} className="grid grid-cols-[3.25rem_1fr] items-baseline">
                      <span className="font-bold tracking-wider text-white/80">{r.label}</span>
                      <div className="flex items-baseline gap-2">
                        <Name posIdx={r.idx} />
                        <span className="shrink-0 text-[10px] text-white/40">
                          {POSITION_NAMES[r.idx]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
            <div className="space-y-3">
              <Panel title="Team Area">
                <Rows slots={slotsFor(bench)} />
              </Panel>
              <Panel title="Offensive Line">
                <Rows slots={single(OL)} />
              </Panel>
            </div>
          </div>

          <Heading>Defense</Heading>
          <div className="grid gap-3 md:grid-cols-3">
            <Panel title="Line">
              <Rows slots={single(DL)} />
            </Panel>
            <Panel title="Linebackers">
              <Rows slots={single(LB)} />
            </Panel>
            <Panel title="Secondary">
              <Rows slots={single(DB)} />
            </Panel>
          </div>

          <Heading>Special Teams</Heading>
          <div className="grid gap-3 md:grid-cols-3">
            <Panel title="Kickers">
              <Rows slots={single(KP)} />
            </Panel>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        This is the default lineup stored in the ROM. Lineup changes you make inside the game are
        kept in the game's save file, not the ROM. Click any player to open their player card.
      </p>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#8fe08f]">{children}</div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border-2 border-white px-3 pb-3 pt-2">
      <h3 className="mb-2 font-bold uppercase tracking-wider">{title}</h3>
      {children}
    </section>
  );
}

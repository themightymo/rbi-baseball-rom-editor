import { useMemo, useState } from "react";
import { useRom } from "@/lib/romStore";
import { parseRbiTeams } from "@/games/rbi/teams";
import { detectRbiRom } from "@/games/rbi/detect";
import { writeBatterFields, type RbiBatterChanges } from "@/games/rbi/batters";
import { writePitcherFields, type RbiPitcherChanges } from "@/games/rbi/pitchers";
import type { RbiBatter, RbiPitcher } from "@/games/rbi/types";

type View = "batters" | "pitchers" | "all";

export function RbiAdvancedRosterEditor() {
  const { rom, originalRom, setBytes } = useRom();
  const [view, setView] = useState<View>("batters");
  const teams = useMemo(() => {
    try {
      return rom ? parseRbiTeams(rom) : null;
    } catch {
      return null;
    }
  }, [rom]);
  const originals = useMemo(() => {
    try {
      return originalRom ? parseRbiTeams(originalRom) : null;
    } catch {
      return null;
    }
  }, [originalRom]);
  const editable = originalRom ? detectRbiRom(originalRom).supported : false;
  if (!rom || !teams || !originals)
    return (
      <p className="nes-window p-4 text-xs text-warning">
        A complete supported RBI roster is required.
      </p>
    );

  const writeBatter = (player: RbiBatter, changes: RbiBatterChanges) => {
    if (!editable) return;
    const next = writeBatterFields(rom, player.offset, changes);
    setBytes(player.offset, next.subarray(player.offset, player.offset + 16));
  };
  const writePitcher = (player: RbiPitcher, changes: RbiPitcherChanges) => {
    if (!editable) return;
    const next = writePitcherFields(rom, player.offset, changes);
    setBytes(player.offset, next.subarray(player.offset, player.offset + 16));
  };

  return (
    <section className="nes-window p-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-[#fc74b4] pb-3">
        <div>
          <h2 className="text-sm">Advanced roster editor</h2>
          <p className="mt-1 text-[8px] text-muted-foreground">
            Yellow cells differ from the originally loaded ROM.
          </p>
        </div>
        <div className="flex gap-1">
          {(["batters", "pitchers", "all"] as const).map((candidate) => (
            <button
              type="button"
              key={candidate}
              onClick={() => setView(candidate)}
              className={`border px-3 py-2 text-[8px] ${view === candidate ? "border-[#fcd800] text-[#fcd800]" : "border-white/50"}`}
            >
              {candidate}
            </button>
          ))}
        </div>
      </div>
      {!editable && (
        <p className="mt-3 border border-warning p-2 text-[8px] text-warning">
          Read-only: the original ROM profile is not enabled for editing.
        </p>
      )}
      <div className="mt-4 max-h-[65vh] overflow-auto">
        {view === "batters" && (
          <BatterTable
            teams={teams}
            originals={originals}
            editable={editable}
            write={writeBatter}
          />
        )}
        {view === "pitchers" && (
          <PitcherTable
            teams={teams}
            originals={originals}
            editable={editable}
            write={writePitcher}
          />
        )}
        {view === "all" && <AllPlayersTable teams={teams} />}
      </div>
    </section>
  );
}

function BatterTable({
  teams,
  originals,
  editable,
  write,
}: {
  teams: ReturnType<typeof parseRbiTeams>;
  originals: ReturnType<typeof parseRbiTeams>;
  editable: boolean;
  write: (player: RbiBatter, changes: RbiBatterChanges) => void;
}) {
  return (
    <table className="w-full min-w-[900px] text-left text-[8px]">
      <Header labels={["Team", "Slot", "Name", "Bats", "AVG", "HR", "Contact", "Power", "Speed"]} />
      <tbody>
        {teams.flatMap((team) =>
          team.batters.map((player) => {
            const original = originals[team.id].batters[player.rosterSlot];
            return (
              <tr key={`${team.id}:${player.rosterSlot}`} className="border-t border-white/20">
                <Cell>{team.abbreviation}</Cell>
                <Cell>{player.rosterSlot}</Cell>
                <EditCell changed={player.name !== original.name}>
                  <input
                    value={player.name}
                    maxLength={6}
                    disabled={!editable}
                    onChange={(event) => {
                      try {
                        write(player, { name: event.target.value });
                      } catch {
                        /* invalid glyph */
                      }
                    }}
                  />
                </EditCell>
                <EditCell changed={player.bats !== original.bats}>
                  <select
                    value={player.bats}
                    disabled={!editable}
                    onChange={(event) => write(player, { bats: event.target.value as "L" | "R" })}
                  >
                    <option>R</option>
                    <option>L</option>
                  </select>
                </EditCell>
                <Numeric
                  value={player.battingAverage}
                  changed={player.battingAverage !== original.battingAverage}
                  disabled={!editable}
                  min={150}
                  max={405}
                  write={(battingAverage) => write(player, { battingAverage })}
                />
                <Numeric
                  value={player.homeRuns}
                  changed={player.homeRuns !== original.homeRuns}
                  disabled={!editable}
                  write={(homeRuns) => write(player, { homeRuns })}
                />
                <Numeric
                  value={player.contact}
                  changed={player.contact !== original.contact}
                  disabled={!editable}
                  write={(contact) => write(player, { contact })}
                />
                <Numeric
                  value={player.power}
                  changed={player.power !== original.power}
                  disabled={!editable}
                  max={65535}
                  write={(power) => write(player, { power })}
                />
                <Numeric
                  value={player.speed}
                  changed={player.speed !== original.speed}
                  disabled={!editable}
                  write={(speed) => write(player, { speed })}
                />
              </tr>
            );
          }),
        )}
      </tbody>
    </table>
  );
}

function PitcherTable({
  teams,
  originals,
  editable,
  write,
}: {
  teams: ReturnType<typeof parseRbiTeams>;
  originals: ReturnType<typeof parseRbiTeams>;
  editable: boolean;
  write: (player: RbiPitcher, changes: RbiPitcherChanges) => void;
}) {
  return (
    <table className="w-full min-w-[1200px] text-left text-[8px]">
      <Header
        labels={[
          "Team",
          "Slot",
          "Name",
          "Throws",
          "Delivery",
          "ERA",
          "Drop",
          "L Curve",
          "R Curve",
          "Slow",
          "Normal",
          "Fast",
          "Stamina",
        ]}
      />
      <tbody>
        {teams.flatMap((team) =>
          team.pitchers.map((player, index) => {
            const original = originals[team.id].pitchers[index];
            return (
              <tr key={`${team.id}:${player.rosterSlot}`} className="border-t border-white/20">
                <Cell>{team.abbreviation}</Cell>
                <Cell>{player.rosterSlot}</Cell>
                <EditCell changed={player.name !== original.name}>
                  <input
                    value={player.name}
                    maxLength={6}
                    disabled={!editable}
                    onChange={(event) => {
                      try {
                        write(player, { name: event.target.value });
                      } catch {
                        /* invalid glyph */
                      }
                    }}
                  />
                </EditCell>
                <EditCell changed={player.throws !== original.throws}>
                  <select
                    value={player.throws}
                    disabled={!editable}
                    onChange={(event) => write(player, { throws: event.target.value as "L" | "R" })}
                  >
                    <option>R</option>
                    <option>L</option>
                  </select>
                </EditCell>
                <EditCell changed={player.delivery !== original.delivery}>
                  <select
                    value={player.delivery}
                    disabled={!editable}
                    onChange={(event) =>
                      write(player, { delivery: event.target.value as "standard" | "sidearm" })
                    }
                  >
                    <option value="standard">Standard</option>
                    <option value="sidearm">Sidearm</option>
                  </select>
                </EditCell>
                <Numeric
                  value={player.earnedRunAverage}
                  changed={player.earnedRunAverage !== original.earnedRunAverage}
                  disabled={!editable}
                  min={100}
                  max={355}
                  write={(earnedRunAverage) => write(player, { earnedRunAverage })}
                />
                <Numeric
                  value={player.drop}
                  changed={player.drop !== original.drop}
                  disabled={!editable}
                  max={15}
                  write={(drop) => write(player, { drop })}
                />
                <Numeric
                  value={player.leftCurve}
                  changed={player.leftCurve !== original.leftCurve}
                  disabled={!editable}
                  max={15}
                  write={(leftCurve) => write(player, { leftCurve })}
                />
                <Numeric
                  value={player.rightCurve}
                  changed={player.rightCurve !== original.rightCurve}
                  disabled={!editable}
                  max={15}
                  write={(rightCurve) => write(player, { rightCurve })}
                />
                <Numeric
                  value={player.slowPitchVelocity}
                  changed={player.slowPitchVelocity !== original.slowPitchVelocity}
                  disabled={!editable}
                  write={(slowPitchVelocity) => write(player, { slowPitchVelocity })}
                />
                <Numeric
                  value={player.normalPitchVelocity}
                  changed={player.normalPitchVelocity !== original.normalPitchVelocity}
                  disabled={!editable}
                  write={(normalPitchVelocity) => write(player, { normalPitchVelocity })}
                />
                <Numeric
                  value={player.fastPitchVelocity}
                  changed={player.fastPitchVelocity !== original.fastPitchVelocity}
                  disabled={!editable}
                  write={(fastPitchVelocity) => write(player, { fastPitchVelocity })}
                />
                <Numeric
                  value={player.stamina}
                  changed={player.stamina !== original.stamina}
                  disabled={!editable}
                  write={(stamina) => write(player, { stamina })}
                />
              </tr>
            );
          }),
        )}
      </tbody>
    </table>
  );
}

function AllPlayersTable({ teams }: { teams: ReturnType<typeof parseRbiTeams> }) {
  return (
    <table className="w-full min-w-[600px] text-left text-[8px]">
      <Header labels={["Team", "Type", "Slot", "Name", "Hand", "Primary rating"]} />
      <tbody>
        {teams.flatMap((team) =>
          [
            ...team.batters.map((p) => [
              team.abbreviation,
              "Batter",
              p.rosterSlot,
              p.name,
              p.bats,
              `Power ${p.power}`,
            ]),
            ...team.pitchers.map((p) => [
              team.abbreviation,
              "Pitcher",
              p.rosterSlot,
              p.name,
              p.throws,
              `Stamina ${p.stamina}`,
            ]),
          ].map((row) => (
            <tr key={`${team.id}:${row[1]}:${row[2]}`} className="border-t border-white/20">
              {row.map((value, index) => (
                <Cell key={index}>{value}</Cell>
              ))}
            </tr>
          )),
        )}
      </tbody>
    </table>
  );
}

function Header({ labels }: { labels: string[] }) {
  return (
    <thead className="sticky top-0 bg-black">
      <tr>
        {labels.map((label) => (
          <th key={label} className="p-2 text-muted-foreground">
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}
function Cell({ children }: { children: React.ReactNode }) {
  return <td className="p-2">{children}</td>;
}
function EditCell({ changed, children }: { changed: boolean; children: React.ReactNode }) {
  return (
    <td
      className={`p-1 [&_input]:w-20 [&_input]:bg-transparent [&_select]:bg-black ${changed ? "bg-[#fcd800]/20 text-[#fcd800]" : ""}`}
    >
      {children}
    </td>
  );
}
function Numeric({
  value,
  changed,
  disabled,
  min = 0,
  max = 255,
  write,
}: {
  value: number;
  changed: boolean;
  disabled: boolean;
  min?: number;
  max?: number;
  write: (value: number) => void;
}) {
  return (
    <EditCell changed={changed}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isInteger(next) && next >= min && next <= max) write(next);
        }}
      />
    </EditCell>
  );
}

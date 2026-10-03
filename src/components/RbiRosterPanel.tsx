import { useMemo, useState } from "react";
import { useRom } from "@/lib/romStore";
import { parseRbiTeams } from "@/games/rbi/teams";

export function RbiRosterPanel() {
  const { rom } = useRom();
  const [selectedTeam, setSelectedTeam] = useState(0);
  const result = useMemo(() => {
    if (!rom) return null;
    try {
      return { teams: parseRbiTeams(rom), error: null };
    } catch (error) {
      return { teams: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [rom]);

  if (!result) return null;
  if (!result.teams) {
    return (
      <section className="nes-window p-4">
        <h2 className="text-sm">RBI rosters</h2>
        <p className="mt-2 text-xs text-destructive">Parsing stopped: {result.error}</p>
      </section>
    );
  }

  const team = result.teams[selectedTeam] ?? result.teams[0];
  return (
    <section className="nes-window space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm">Decoded RBI rosters</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ten ROM-native team blocks; unknown bytes are shown without interpretation.
          </p>
        </div>
        <label className="text-xs text-muted-foreground">
          Team
          <select
            className="ml-2 border bg-background px-2 py-1 text-foreground"
            value={team.id}
            onChange={(event) => setSelectedTeam(Number(event.target.value))}
          >
            {result.teams.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.abbreviation} — {candidate.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <RosterTable
        title="Batters"
        headings={["Slot", "Name", "Bats", "AVG", "HR", "Contact", "Power", "Speed", "Unknown"]}
        rows={team.batters.map((player) => [
          player.rosterSlot,
          player.name,
          player.bats,
          `.${player.battingAverage.toString().padStart(3, "0")}`,
          player.homeRuns,
          player.contact,
          player.power,
          player.speed,
          player.unknown.map(hexByte).join(" "),
        ])}
      />
      <RosterTable
        title="Pitchers"
        headings={[
          "Slot",
          "Name",
          "Throws",
          "Delivery",
          "ERA",
          "Drop",
          "L/R curve",
          "Slow/Normal/Fast",
          "Stamina",
          "Unknown 1/2",
        ]}
        rows={team.pitchers.map((player) => [
          player.rosterSlot,
          player.name,
          player.throws,
          player.delivery,
          (player.earnedRunAverage / 100).toFixed(2),
          player.drop,
          `${player.leftCurve}/${player.rightCurve}`,
          `${player.slowPitchVelocity}/${player.normalPitchVelocity}/${player.fastPitchVelocity}`,
          player.stamina,
          `${hexByte(player.unknown1)} ${hexByte(player.unknown2)}`,
        ])}
      />
    </section>
  );
}

function RosterTable({
  title,
  headings,
  rows,
}: {
  title: string;
  headings: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <div className="overflow-x-auto">
      <h3 className="mb-2 text-xs text-muted-foreground">{title}</h3>
      <table className="w-full min-w-max border-collapse text-left font-mono text-xs">
        <thead>
          <tr className="border-b">
            {headings.map((heading) => (
              <th key={heading} className="px-2 py-1 font-normal text-muted-foreground">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row[0]}:${row[1]}`} className="border-b border-border/50">
              {row.map((value, index) => (
                <td key={index} className="px-2 py-1">
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hexByte(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

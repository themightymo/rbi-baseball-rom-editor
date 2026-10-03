import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRom } from "@/lib/romStore";
import { detectRbiRom } from "@/games/rbi/detect";
import { detectedRbiTeamDataOffset, parseRbiTeams } from "@/games/rbi/teams";
import { suggestBatterRatings, suggestPitcherRatings } from "@/games/rbi/ratings";
import { writeBatterFields } from "@/games/rbi/batters";
import { writePitcherFields } from "@/games/rbi/pitchers";

type Mode = "batter" | "pitcher";
type Draft = Record<string, string>;

const BATTER_INPUTS = [
  ["atBats", "At-bats"],
  ["hits", "Hits"],
  ["homeRuns", "Home runs"],
  ["stolenBases", "Stolen bases"],
] as const;
const PITCHER_INPUTS = [
  ["inningsPitched", "Innings pitched (decimal)"],
  ["appearances", "Appearances"],
  ["earnedRuns", "Earned runs"],
  ["strikeouts", "Strikeouts"],
  ["walks", "Walks"],
  ["fastballMph", "Fastball MPH"],
] as const;

export function RbiRatingsGenerator() {
  const { rom, originalRom, setBytes } = useRom();
  const [mode, setMode] = useState<Mode>("batter");
  const [teamId, setTeamId] = useState(0);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [stats, setStats] = useState<Draft>({});
  const [suggestions, setSuggestions] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supported = originalRom ? detectRbiRom(originalRom).supported : false;
  const teamDataOffset = useMemo(() => {
    if (!originalRom || !supported) return null;
    try {
      return detectedRbiTeamDataOffset(originalRom);
    } catch {
      return null;
    }
  }, [originalRom, supported]);
  const teams = useMemo(() => {
    if (!rom || teamDataOffset === null) return null;
    try {
      return parseRbiTeams(rom, teamDataOffset);
    } catch {
      return null;
    }
  }, [rom, teamDataOffset]);

  if (!rom || !teams || teamDataOffset === null) {
    return (
      <section className="nes-window p-4 text-xs text-warning">
        Ratings Lab requires an exact, supported RBI payload profile.
      </section>
    );
  }

  const team = teams[teamId] ?? teams[0];
  const players = mode === "batter" ? team.batters : team.pitchers;
  const player = players[playerIndex] ?? players[0];
  const inputFields = mode === "batter" ? BATTER_INPUTS : PITCHER_INPUTS;

  const resetWorkflow = (nextMode?: Mode) => {
    if (nextMode) setMode(nextMode);
    setPlayerIndex(0);
    setStats({});
    setSuggestions(null);
    setMessage(null);
  };

  const generate = () => {
    try {
      const suggestion =
        mode === "batter"
          ? suggestBatterRatings({
              atBats: integer(stats.atBats),
              hits: integer(stats.hits),
              homeRuns: integer(stats.homeRuns),
              stolenBases: integer(stats.stolenBases),
            })
          : suggestPitcherRatings({
              inningsPitched: number(stats.inningsPitched),
              appearances: integer(stats.appearances),
              earnedRuns: integer(stats.earnedRuns),
              strikeouts: integer(stats.strikeouts),
              walks: integer(stats.walks),
              fastballMph: number(stats.fastballMph),
            });
      setSuggestions(
        Object.fromEntries(Object.entries(suggestion).map(([key, value]) => [key, String(value)])),
      );
      setMessage("Suggestions generated. Review and adjust them before applying.");
    } catch (error) {
      setSuggestions(null);
      setMessage(error instanceof Error ? error.message : "The stat line is invalid.");
    }
  };

  const apply = () => {
    if (!suggestions || !player) return;
    try {
      if (mode === "batter" && "battingAverage" in player) {
        const next = writeBatterFields(rom, player.offset, {
          battingAverage: integer(suggestions.battingAverage),
          homeRuns: integer(suggestions.homeRuns),
          contact: integer(suggestions.contact),
          power: integer(suggestions.power),
          speed: integer(suggestions.speed),
        });
        setBytes(player.offset, next.subarray(player.offset, player.offset + 16));
      } else if (mode === "pitcher" && "earnedRunAverage" in player) {
        const next = writePitcherFields(rom, player.offset, {
          earnedRunAverage: integer(suggestions.earnedRunAverage),
          drop: integer(suggestions.drop),
          leftCurve: integer(suggestions.leftCurve),
          rightCurve: integer(suggestions.rightCurve),
          slowPitchVelocity: integer(suggestions.slowPitchVelocity),
          normalPitchVelocity: integer(suggestions.normalPitchVelocity),
          fastPitchVelocity: integer(suggestions.fastPitchVelocity),
          stamina: integer(suggestions.stamina),
        });
        setBytes(player.offset, next.subarray(player.offset, player.offset + 16));
      }
      setMessage(`Applied the reviewed recommendations to ${player.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A reviewed value is invalid.");
    }
  };

  return (
    <section className="nes-window p-4">
      <h2 className="text-sm font-semibold">Ratings Lab</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Convert a real stat line into transparent RBI-style recommendations. These are heuristics,
        not original-game formulas or canonical ratings. Nothing is written until you review,
        manually adjust, and apply the result.
      </p>
      {mode === "batter" && (
        <p className="mt-2 border-l-2 border-[#fcd800] pl-3 text-[9px] leading-relaxed text-muted-foreground">
          Contact follows batting average · Power follows home runs · Speed follows stolen bases.
          Stolen bases are a recommendation input only; RBI does not have a confirmed stored
          stolen-base field.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(["batter", "pitcher"] as const).map((candidate) => (
          <Button
            key={candidate}
            type="button"
            size="sm"
            variant={mode === candidate ? "default" : "outline"}
            onClick={() => resetWorkflow(candidate)}
          >
            {candidate}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Team"
          value={team.id}
          onChange={(value) => {
            setTeamId(value);
            resetWorkflow();
          }}
          options={teams.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
        />
        <SelectField
          label={mode === "batter" ? "Batter" : "Pitcher"}
          value={playerIndex}
          onChange={(value) => {
            setPlayerIndex(value);
            setSuggestions(null);
            setMessage(null);
          }}
          options={players.map((candidate, index) => ({
            value: index,
            label: `${candidate.rosterSlot}: ${candidate.name}`,
          }))}
        />
      </div>

      <h3 className="mt-5 text-xs font-semibold uppercase">Real stat line</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {inputFields.map(([key, label]) => (
          <NumberField
            key={key}
            label={label}
            value={stats[key] ?? ""}
            step={key === "inningsPitched" || key === "fastballMph" ? "any" : "1"}
            onChange={(value) => setStats((current) => ({ ...current, [key]: value }))}
          />
        ))}
      </div>
      <Button className="mt-4" type="button" onClick={generate}>
        Generate suggestions
      </Button>

      {suggestions && (
        <div className="mt-5 border-t-2 border-[#fc74b4] pt-4">
          <h3 className="text-xs font-semibold uppercase">Suggested ratings — review and adjust</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(suggestions).map(([key, value]) => (
              <NumberField
                key={key}
                label={`Suggested ${ratingLabel(key)}`}
                value={value}
                step="1"
                onChange={(nextValue) =>
                  setSuggestions((current) =>
                    current ? { ...current, [key]: nextValue } : current,
                  )
                }
              />
            ))}
          </div>
          <Button className="mt-4" type="button" onClick={apply}>
            Apply reviewed ratings to {player.name}
          </Button>
        </div>
      )}
      {message && <p className="mt-3 text-xs text-highlight">{message}</p>}
    </section>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: string;
  step: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs">
      {label}
      <Input
        className="mt-1 font-mono"
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-xs">
      {label}
      <select
        className="mt-1 h-9 w-full rounded-md border border-input bg-secondary px-3 font-mono text-sm"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function integer(value: string | undefined): number {
  const parsed = Number(value);
  if (value === undefined || value.trim() === "" || !Number.isInteger(parsed)) {
    throw new RangeError("Complete every field with a valid integer.");
  }
  return parsed;
}

function number(value: string | undefined): number {
  const parsed = Number(value);
  if (value === undefined || value.trim() === "" || !Number.isFinite(parsed)) {
    throw new RangeError("Complete every field with a valid number.");
  }
  return parsed;
}

function ratingLabel(key: string): string {
  return key.replaceAll(/([A-Z])/g, " $1").toLowerCase();
}

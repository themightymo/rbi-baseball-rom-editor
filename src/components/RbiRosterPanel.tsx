import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRom } from "@/lib/romStore";
import { parseRbiTeams } from "@/games/rbi/teams";
import type { RbiBatter, RbiPitcher } from "@/games/rbi/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type RbiPlayer = RbiBatter | RbiPitcher;

export function RbiRosterPanel() {
  const { rom } = useRom();
  const [selectedTeam, setSelectedTeam] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<RbiPlayer | null>(null);
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

  const teams = result.teams;
  const team = teams[selectedTeam] ?? teams[0];
  const chooseTeam = (teamId: number) => {
    setSelectedTeam((teamId + teams.length) % teams.length);
    setSelectedPlayer(null);
  };

  return (
    <section className="overflow-hidden border-2 border-white bg-black">
      <header className="border-b-[3px] border-[#fc74b4] bg-[#0956e7] px-4 py-4 text-center">
        <p className="text-[8px] tracking-[0.3em] text-white/80">SELECT TEAM</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            type="button"
            className="p-2 text-white hover:text-[#fcd800] focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Previous team"
            onClick={() => chooseTeam(team.id - 1)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-64">
            <p className="text-2xl text-[#fcd800]">{team.abbreviation}</p>
            <h2 className="mt-2 text-sm text-white">{team.name}</h2>
          </div>
          <button
            type="button"
            className="p-2 text-white hover:text-[#fcd800] focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Next team"
            onClick={() => chooseTeam(team.id + 1)}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Teams">
          {teams.map((candidate) => (
            <button
              type="button"
              key={candidate.id}
              aria-label={candidate.name}
              aria-pressed={candidate.id === team.id}
              onClick={() => chooseTeam(candidate.id)}
              className={`min-w-10 border px-2 py-1 text-[8px] ${
                candidate.id === team.id
                  ? "border-[#fcd800] bg-black text-[#fcd800]"
                  : "border-white/50 bg-[#0744b8] text-white hover:border-white"
              }`}
            >
              {candidate.abbreviation}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-6 p-4 lg:grid-cols-[1.35fr_0.85fr]">
        <RosterGroup
          title="Starting lineup"
          players={team.batters.slice(0, 8)}
          onSelect={setSelectedPlayer}
          numbered
        />
        <div className="space-y-6">
          <RosterGroup title="Bench" players={team.batters.slice(8)} onSelect={setSelectedPlayer} />
          <RosterGroup title="Pitchers" players={team.pitchers} onSelect={setSelectedPlayer} />
        </div>
      </div>

      <p className="border-t border-white/40 px-4 py-3 text-center text-[8px] text-muted-foreground">
        Select a player to inspect their ROM-backed ratings
      </p>

      <Dialog
        open={selectedPlayer !== null}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
      >
        <DialogContent className="max-w-lg border-2 border-white bg-black">
          {selectedPlayer && <PlayerPreview player={selectedPlayer} teamName={team.name} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function RosterGroup({
  title,
  players,
  onSelect,
  numbered = false,
}: {
  title: string;
  players: RbiPlayer[];
  onSelect: (player: RbiPlayer) => void;
  numbered?: boolean;
}) {
  return (
    <section>
      <h3 className="nes-rule mb-2 pb-2 text-xs text-[#fc74b4]">{title}</h3>
      <ol className="space-y-1">
        {players.map((player, index) => (
          <li key={player.rosterSlot}>
            <button
              type="button"
              onClick={() => onSelect(player)}
              className="group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-2 border border-transparent px-2 py-2 text-left hover:border-white hover:bg-[#181818] focus-visible:border-[#fcd800] focus-visible:outline-none"
            >
              <span className="text-[8px] text-muted-foreground">
                {numbered ? index + 1 : player.rosterSlot}
              </span>
              <span className="text-xs group-hover:text-[#fcd800]">{player.name}</span>
              <span className="text-[8px] text-muted-foreground">
                {isBatter(player)
                  ? `${player.bats}  .${player.battingAverage.toString().padStart(3, "0")}  ${player.homeRuns} HR`
                  : `${player.throws}${player.delivery === "sidearm" ? "S" : ""}  ${(player.earnedRunAverage / 100).toFixed(2)}`}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function PlayerPreview({ player, teamName }: { player: RbiPlayer; teamName: string }) {
  return (
    <>
      <DialogHeader>
        <p className="text-[8px] text-[#fc74b4]">{teamName}</p>
        <DialogTitle className="text-lg text-[#fcd800]">{player.name}</DialogTitle>
      </DialogHeader>
      {isBatter(player) ? (
        <div className="grid grid-cols-2 gap-4 text-xs">
          <Stat label="Bats" value={player.bats} />
          <Stat label="Average" value={`.${player.battingAverage.toString().padStart(3, "0")}`} />
          <Stat label="Home runs" value={player.homeRuns} />
          <Stat label="Contact" value={player.contact} />
          <Stat label="Power" value={player.power} />
          <Stat label="Speed" value={player.speed} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 text-xs">
          <Stat label="Throws" value={player.throws} />
          <Stat label="Delivery" value={player.delivery} />
          <Stat label="ERA" value={(player.earnedRunAverage / 100).toFixed(2)} />
          <Stat label="Drop" value={player.drop} />
          <Stat label="Left curve" value={player.leftCurve} />
          <Stat label="Right curve" value={player.rightCurve} />
          <Stat label="Slow pitch" value={player.slowPitchVelocity} />
          <Stat label="Normal pitch" value={player.normalPitchVelocity} />
          <Stat label="Fast pitch" value={player.fastPitchVelocity} />
          <Stat label="Stamina" value={player.stamina} />
        </div>
      )}
      <p className="text-[8px] leading-relaxed text-muted-foreground">
        Read-only roster card. Editing controls are introduced in the next phase.
      </p>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-b border-white/30 pb-2">
      <p className="text-[8px] text-muted-foreground">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

function isBatter(player: RbiPlayer): player is RbiBatter {
  return "homeRuns" in player;
}

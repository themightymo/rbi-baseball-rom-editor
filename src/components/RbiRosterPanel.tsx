import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRom } from "@/lib/romStore";
import { detectedRbiTeamDataOffset, parseRbiTeams, RBI_TEAM_DATA_OFFSET } from "@/games/rbi/teams";
import type { RbiBatter, RbiPitcher } from "@/games/rbi/types";
import { writeBatterFields, type RbiBatterChanges } from "@/games/rbi/batters";
import { writePitcherFields, type RbiPitcherChanges } from "@/games/rbi/pitchers";
import { detectRbiRom } from "@/games/rbi/detect";
import { RbiBatterCard } from "@/components/RbiBatterCard";
import { RbiPitcherCard } from "@/components/RbiPitcherCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type RbiPlayer = RbiBatter | RbiPitcher;
interface PlayerSelection {
  type: "batter" | "pitcher";
  teamId: number;
  rosterSlot: number;
}

export function RbiRosterPanel() {
  const { rom, originalRom, setBytes } = useRom();
  const [selectedTeam, setSelectedTeam] = useState(0);
  const [selection, setSelection] = useState<PlayerSelection | null>(null);
  const teamDataOffset = useMemo(() => {
    if (!originalRom) return null;
    try {
      return detectedRbiTeamDataOffset(originalRom);
    } catch {
      return null;
    }
  }, [originalRom]);
  const rosterOffset = teamDataOffset ?? RBI_TEAM_DATA_OFFSET;
  const result = useMemo(() => {
    if (!rom) return null;
    try {
      return { teams: parseRbiTeams(rom, rosterOffset), error: null };
    } catch (error) {
      return { teams: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [rom, rosterOffset]);
  const originalTeams = useMemo(() => {
    if (!originalRom) return null;
    try {
      return parseRbiTeams(originalRom, rosterOffset);
    } catch {
      return null;
    }
  }, [originalRom, rosterOffset]);
  const editable = useMemo(
    () => (originalRom ? detectRbiRom(originalRom).supported : false),
    [originalRom],
  );

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
  const selectedPlayer = selection ? findPlayer(teams, selection) : null;
  const originalPlayer = selection && originalTeams ? findPlayer(originalTeams, selection) : null;
  const chooseTeam = (teamId: number) => {
    setSelectedTeam((teamId + teams.length) % teams.length);
    setSelection(null);
  };
  const selectPlayer = (player: RbiPlayer) =>
    setSelection({
      type: isBatter(player) ? "batter" : "pitcher",
      teamId: player.teamId,
      rosterSlot: player.rosterSlot,
    });
  const changeBatter = (changes: RbiBatterChanges) => {
    if (!rom || !selectedPlayer || !isBatter(selectedPlayer) || !editable) return;
    const changed = writeBatterFields(rom, selectedPlayer.offset, changes);
    setBytes(
      selectedPlayer.offset,
      changed.subarray(selectedPlayer.offset, selectedPlayer.offset + 16),
    );
  };
  const changePitcher = (changes: RbiPitcherChanges) => {
    if (!rom || !selectedPlayer || isBatter(selectedPlayer) || !editable) return;
    const changed = writePitcherFields(rom, selectedPlayer.offset, changes);
    setBytes(
      selectedPlayer.offset,
      changed.subarray(selectedPlayer.offset, selectedPlayer.offset + 16),
    );
  };

  return (
    <section className="overflow-hidden border-2 border-white bg-black">
      <header className="border-b-[3px] border-[#fc74b4] bg-[#0956e7] px-4 py-4 text-center">
        <p className="text-[8px] tracking-[0.3em] text-white/80">SELECT TEAM</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <TeamArrow label="Previous team" onClick={() => chooseTeam(team.id - 1)}>
            <ChevronLeft className="size-5" />
          </TeamArrow>
          <div className="min-w-64">
            <p className="text-2xl text-[#fcd800]">{team.abbreviation}</p>
            <h2 className="mt-2 text-sm text-white">{team.name}</h2>
          </div>
          <TeamArrow label="Next team" onClick={() => chooseTeam(team.id + 1)}>
            <ChevronRight className="size-5" />
          </TeamArrow>
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
          onSelect={selectPlayer}
          numbered
        />
        <div className="space-y-6">
          <RosterGroup title="Bench" players={team.batters.slice(8)} onSelect={selectPlayer} />
          <RosterGroup title="Pitchers" players={team.pitchers} onSelect={selectPlayer} />
        </div>
      </div>

      <p className="border-t border-white/40 px-4 py-3 text-center text-[8px] text-muted-foreground">
        Select a player to inspect their ROM-backed ratings
      </p>

      <Dialog open={selection !== null} onOpenChange={(open) => !open && setSelection(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-2 border-white bg-black">
          {selectedPlayer &&
          originalPlayer &&
          isBatter(selectedPlayer) &&
          isBatter(originalPlayer) ? (
            <>
              <PlayerHeading teamName={team.name} playerName={selectedPlayer.name} />
              <RbiBatterCard
                player={selectedPlayer}
                original={originalPlayer}
                editable={editable}
                onChange={changeBatter}
              />
            </>
          ) : selectedPlayer &&
            originalPlayer &&
            !isBatter(selectedPlayer) &&
            !isBatter(originalPlayer) ? (
            <>
              <PlayerHeading teamName={team.name} playerName={selectedPlayer.name} />
              <RbiPitcherCard
                player={selectedPlayer}
                original={originalPlayer}
                editable={editable}
                onChange={changePitcher}
              />
            </>
          ) : selectedPlayer ? (
            <PlayerPreview player={selectedPlayer} teamName={team.name} />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TeamArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="p-2 text-white hover:text-[#fcd800] focus-visible:outline-2 focus-visible:outline-white"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
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
      <PlayerHeading teamName={teamName} playerName={player.name} />
      {!isBatter(player) && (
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
        Pitcher editing controls are introduced in the next phase.
      </p>
    </>
  );
}

function PlayerHeading({ teamName, playerName }: { teamName: string; playerName: string }) {
  return (
    <DialogHeader>
      <p className="text-[8px] text-[#fc74b4]">{teamName}</p>
      <DialogTitle className="text-lg text-[#fcd800]">{playerName}</DialogTitle>
    </DialogHeader>
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

function findPlayer(
  teams: ReturnType<typeof parseRbiTeams>,
  selection: PlayerSelection,
): RbiPlayer | undefined {
  const team = teams[selection.teamId];
  const players = selection.type === "batter" ? team?.batters : team?.pitchers;
  return players?.find((player) => player.rosterSlot === selection.rosterSlot);
}

function isBatter(player: RbiPlayer): player is RbiBatter {
  return "homeRuns" in player;
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RomProvider, useRom } from "@/lib/romStore";
import { RomDropZone, RomToolbar } from "@/components/RomUploader";
import { PlayerNameEditor } from "@/components/PlayerNameEditor";
import { PlayerAbilitiesEditor } from "@/components/PlayerAbilitiesEditor";
import type { GroupId } from "@/lib/abilities";
import { TeamRosterView } from "@/components/TeamRosterView";
import { isAllStarTeam } from "@/lib/tsbRoster";
import { PlayerCard } from "@/components/PlayerCard";
import { ExportPanel } from "@/components/ExportPanel";
import { AdvancedTools } from "@/components/AdvancedTools";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gamepad2, Users, SlidersHorizontal, Hash, Save, Wrench } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <RomProvider>
      <Shell />
    </RomProvider>
  );
}

function Shell() {
  const { rom } = useRom();
  const [tab, setTab] = useState("roster");
  // Shared between the roster view and the player editor so clicking a player jumps to them.
  const [teamIdx, setTeamIdxState] = useState(0);
  // The Edit Players table only works on regular teams, so it keeps the last one picked
  // while the roster view shows an All-Star team.
  const [editTeam, setEditTeam] = useState(0);
  const setTeamIdx = (t: number) => {
    setTeamIdxState(t);
    if (!isAllStarTeam(t)) setEditTeam(t);
  };
  const [group, setGroup] = useState<GroupId>("qb");
  const [card, setCard] = useState<{ team: number; pos: number } | null>(null);
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3">
          <Gamepad2 className="size-5 text-primary" />
          <h1 className="text-base font-semibold">Tecmo Super Bowl Roster Editor</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        {!rom ? (
          <div className="py-8">
            <RomDropZone />
          </div>
        ) : (
          <>
            <RomToolbar />
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex h-auto w-full flex-wrap justify-start">
                <TabsTrigger value="roster" className="gap-1.5">
                  <Users className="size-4" /> Team Roster
                </TabsTrigger>
                <TabsTrigger value="edit" className="gap-1.5">
                  <SlidersHorizontal className="size-4" /> Edit Players
                </TabsTrigger>
                <TabsTrigger value="names" className="gap-1.5">
                  <Hash className="size-4" /> Names &amp; Jersey Numbers
                </TabsTrigger>
                <TabsTrigger value="save" className="gap-1.5">
                  <Save className="size-4" /> Save &amp; Share
                </TabsTrigger>
                <TabsTrigger value="advanced" className="ml-auto gap-1.5 text-muted-foreground">
                  <Wrench className="size-4" /> Advanced
                </TabsTrigger>
              </TabsList>

              <TabsContent value="roster" className="space-y-3">
                <Intro>
                  Each team's full roster, laid out like the in-game team screen.
                </Intro>
                <TeamRosterView
                  teamIdx={teamIdx}
                  onTeamChange={setTeamIdx}
                  onEditPlayer={(pos) => setCard({ team: teamIdx, pos })}
                />
              </TabsContent>

              <TabsContent value="edit" className="space-y-3">
                <Intro>
                  Pick a team, then edit each player's name, face, and ratings. Changed values
                  are highlighted in yellow.
                </Intro>
                <PlayerAbilitiesEditor
                  teamIdx={editTeam}
                  onTeamChange={setTeamIdx}
                  group={group}
                  onGroupChange={setGroup}
                  onOpenPlayer={(pos) => setCard({ team: editTeam, pos })}
                />
              </TabsContent>

              <TabsContent value="names" className="space-y-3">
                <Intro>
                  Every team's full roster on one page — quick for renaming players or changing
                  jersey numbers across the league.
                </Intro>
                <PlayerNameEditor />
              </TabsContent>

              <TabsContent value="save" className="space-y-3">
                <ExportPanel />
              </TabsContent>

              <TabsContent value="advanced" className="space-y-3">
                <AdvancedTools />
              </TabsContent>
            </Tabs>
            <PlayerCard
              teamIdx={card?.team ?? 0}
              posIdx={card?.pos ?? null}
              onClose={() => setCard(null)}
              onNavigate={(pos) => setCard((c) => c && { ...c, pos })}
            />
          </>
        )}
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        This tool ships with no ROM data and no NFL/Tecmo/Nintendo content. You must supply
        your own legally owned ROM. All processing happens in your browser.
      </footer>
    </div>
  );
}

function Intro({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

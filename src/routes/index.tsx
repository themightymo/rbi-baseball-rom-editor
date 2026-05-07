import { createFileRoute } from "@tanstack/react-router";
import { RomProvider, useRom } from "@/lib/romStore";
import { RomUploader } from "@/components/RomUploader";
import { HexViewer } from "@/components/HexViewer";
import { StringSearch } from "@/components/StringSearch";
import { DiffViewer } from "@/components/DiffViewer";
import { RecordMapper } from "@/components/RecordMapper";
import { EncodingPanel } from "@/components/EncodingPanel";
import { PlayerRosterEditor } from "@/components/PlayerRosterEditor";
import { PlayerNameEditor } from "@/components/PlayerNameEditor";
import { PlayerAbilitiesEditor } from "@/components/PlayerAbilitiesEditor";
import { TeamEditor } from "@/components/TeamEditor";
import { ExportPanel } from "@/components/ExportPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gamepad2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Tecmo Roster & Team Editor — local NES ROM research" },
      {
        name: "description",
        content:
          "Local-only research and editor for player rosters and team data inside a user-supplied Tecmo Super Bowl NES ROM. No ROMs or copyrighted data are distributed.",
      },
    ],
  }),
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
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="size-5 text-primary" />
            <h1 className="text-base font-semibold">Tecmo Roster &amp; Team Editor</h1>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">
            Local · BYOR · No copyrighted assets
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <RomUploader />
        <Notice />

        <Tabs defaultValue="research">
          <TabsList className="flex w-full flex-wrap">
            <TabsTrigger value="research">Research</TabsTrigger>
            <TabsTrigger value="mappers">Mappers</TabsTrigger>
            <TabsTrigger value="names" disabled={!rom}>Names</TabsTrigger>
            <TabsTrigger value="abilities" disabled={!rom}>Abilities</TabsTrigger>
            <TabsTrigger value="players" disabled={!rom}>Players</TabsTrigger>
            <TabsTrigger value="teams" disabled={!rom}>Teams</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="research" className="space-y-4">
            <EncodingPanel />
            <StringSearch />
            <HexViewer />
            <DiffViewer />
          </TabsContent>

          <TabsContent value="mappers" className="space-y-6">
            <Section title="Player record">
              <RecordMapper section="players" />
            </Section>
            <Section title="Team record">
              <RecordMapper section="teams" />
            </Section>
          </TabsContent>

          <TabsContent value="names">
            <PlayerNameEditor />
          </TabsContent>

          <TabsContent value="abilities">
            <PlayerAbilitiesEditor />
          </TabsContent>

          <TabsContent value="players">
            <PlayerRosterEditor />
          </TabsContent>

          <TabsContent value="teams">
            <TeamEditor />
          </TabsContent>

          <TabsContent value="export">
            <ExportPanel />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        This tool ships with no ROM data, no copyrighted strings, and no NFL/Tecmo/Nintendo
        content. You must supply your own legally owned ROM. All processing happens in your
        browser.
      </footer>
    </div>
  );
}

function Notice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/80">
      <ShieldAlert className="size-4 shrink-0 text-primary" />
      <p>
        This is a research and editing utility. It contains no game data — every offset,
        encoding, and field definition is discovered from the ROM <em>you</em> upload and
        saved locally as a ROM map.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

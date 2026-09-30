import { HexViewer } from "@/components/HexViewer";
import { StringSearch } from "@/components/StringSearch";
import { DiffViewer } from "@/components/DiffViewer";
import { RecordMapper } from "@/components/RecordMapper";
import { EncodingPanel } from "@/components/EncodingPanel";
import { PlayerRosterEditor } from "@/components/PlayerRosterEditor";
import { TeamEditor } from "@/components/TeamEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";

/**
 * Power-user tools for ROM hackers. Casual users never need these — the
 * Team Rosters and Names tabs work automatically on a standard ROM.
 */
export function AdvancedTools() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">You probably don't need this.</strong> These tools
          are for ROM hackers working with modified or unusual ROMs, or editing parts of the
          game this editor doesn't handle automatically yet. Rosters, names and ratings already
          work on the other tabs.
        </p>
      </div>

      <Tabs defaultValue="inspect">
        <TabsList>
          <TabsTrigger value="inspect">Inspect ROM data</TabsTrigger>
          <TabsTrigger value="layouts">Custom data layouts</TabsTrigger>
        </TabsList>

        <TabsContent value="inspect" className="space-y-4">
          <Explain>
            Look at the ROM's raw contents: search for text, browse bytes, and compare against
            the original file to see exactly what you've changed.
          </Explain>
          <EncodingPanel />
          <StringSearch />
          <HexViewer />
          <DiffViewer />
        </TabsContent>

        <TabsContent value="layouts" className="space-y-6">
          <Explain>
            Teach the editor where a table of data lives in the ROM (where it starts, how big
            each entry is, and what each byte means). Once a layout is described below, an
            editable table for it appears underneath. Layouts are saved in this browser and can
            be exported from the Save &amp; Share tab.
          </Explain>

          <Section
            title="Player data layout"
            hint="Describe a table with one entry per player."
          >
            <RecordMapper section="players" />
            <div className="mt-4 border-t pt-4">
              <PlayerRosterEditor />
            </div>
          </Section>

          <Section title="Team data layout" hint="Describe a table with one entry per team.">
            <RecordMapper section="teams" />
            <div className="mt-4 border-t pt-4">
              <TeamEditor />
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Explain({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{hint}</p>
      {children}
    </section>
  );
}

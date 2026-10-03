import { HexViewer } from "@/components/HexViewer";
import { StringSearch } from "@/components/StringSearch";
import { DiffViewer } from "@/components/DiffViewer";
import { RecordMapper } from "@/components/RecordMapper";
import { EncodingPanel } from "@/components/EncodingPanel";
import { PlayerRosterEditor } from "@/components/PlayerRosterEditor";
import { TeamEditor } from "@/components/TeamEditor";
import { Info } from "lucide-react";

/**
 * Power-user tools for ROM hackers. Casual users never need these — the
 * RBI-specific editing will be added only after its byte layout is verified.
 */
function HackerNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="text-muted-foreground">
        <strong className="text-foreground">Research tools.</strong> Use these to inspect bytes,
        search strings, describe candidate records, and verify exactly what a change affects. RBI
        player parsing is intentionally disabled until its layout is proven.
      </p>
    </div>
  );
}

export function InspectRomTools() {
  return (
    <div className="space-y-4">
      <HackerNotice />
      <Explain>
        Look at the ROM's raw contents: search for text, browse bytes, and compare against the
        original file to see exactly what you've changed.
      </Explain>
      <EncodingPanel />
      <StringSearch />
      <HexViewer />
      <DiffViewer />
    </div>
  );
}

export function CustomLayoutTools() {
  return (
    <div className="space-y-6">
      <HackerNotice />
      <Explain>
        Teach the editor where a table of data lives in the ROM (where it starts, how big each entry
        is, and what each byte means). Once a layout is described below, an editable table for it
        appears underneath. Layouts are saved in this browser and can be exported from the Save
        &amp; Share tab.
      </Explain>

      <Section
        title="Candidate player layout"
        hint="Describe a temporary table while researching player records."
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
    <section className="nes-window p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{hint}</p>
      {children}
    </section>
  );
}

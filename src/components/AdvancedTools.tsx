import { useState } from "react";
import { HexViewer } from "@/components/HexViewer";
import { StringSearch } from "@/components/StringSearch";
import { DiffViewer } from "@/components/DiffViewer";
import { RecordMapper } from "@/components/RecordMapper";
import { EncodingPanel } from "@/components/EncodingPanel";
import { PlayerRosterEditor } from "@/components/PlayerRosterEditor";
import { TeamEditor } from "@/components/TeamEditor";
import { Info } from "lucide-react";
import { ResearchPanel } from "@/components/ResearchPanel";
import { ChrEditor } from "@/components/ChrEditor";

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
        search strings, describe candidate records, and verify exactly what a change affects. The
        proven RBI roster layout is available in the RBI Rosters tab; editing remains gated until
        round-trip validation is complete.
      </p>
    </div>
  );
}

export function InspectRomTools() {
  const [jumpOffset, setJumpOffset] = useState<number | null>(null);
  return (
    <div className="space-y-4">
      <HackerNotice />
      <Explain>
        Look at the ROM's raw contents: search for text, browse bytes, and compare against the
        original file to see exactly what you've changed.
      </Explain>
      <ResearchPanel />
      <EncodingPanel />
      <StringSearch onJump={(offset) => setJumpOffset(offset)} />
      <HexViewer jumpOffset={jumpOffset} />
      <ChrEditor />
      <DiffViewer />
    </div>
  );
}

export function CustomLayoutTools() {
  return (
    <div className="space-y-6">
      <HackerNotice />
      <Explain>
        Experiment with candidate record starts, lengths, counts, fields, and byte order without
        adding them to RBI-specific code. The editable preview exposes raw file offsets. These
        browser-local layouts can be exported from Save &amp; Export.
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

      <Section
        title="Candidate team layout"
        hint="Describe a temporary table while researching team records."
      >
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

import { useMemo } from "react";
import { useRom } from "@/lib/romStore";
import { getNesRomLayout, hex } from "@/core/nes/addressing";
import { detectRbiRom } from "@/games/rbi/detect";
import { RBI_ANNOTATIONS } from "@/games/rbi/annotations";

export function ResearchPanel() {
  const { rom, romChecksum } = useRom();
  const layout = useMemo(() => (rom ? getNesRomLayout(rom) : null), [rom]);
  const detection = useMemo(() => (rom ? detectRbiRom(rom) : null), [rom]);
  if (!rom || !detection) return null;

  return (
    <section className="nes-window space-y-3 p-4">
      <h2 className="text-sm">ROM research summary</h2>
      <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <Datum label="File size" value={`${rom.length.toLocaleString()} bytes`} />
        <Datum label="File CRC32" value={romChecksum ?? "Unknown"} />
        <Datum label="iNES" value={layout ? "Valid" : "Missing or invalid"} />
        <Datum
          label="RBI profile"
          value={detection.profileLabel ?? `No match (${detection.confidence})`}
        />
        <Datum label="Mapper" value={layout?.ines.mapper.toString() ?? "Unknown"} />
        <Datum label="PRG size" value={layout ? `${layout.ines.prgSize / 1024} KB` : "Unknown"} />
        <Datum label="CHR size" value={layout ? `${layout.ines.chrSize / 1024} KB` : "Unknown"} />
        <Datum
          label="Trainer"
          value={layout ? (layout.ines.hasTrainer ? "Present" : "None") : "Unknown"}
        />
        <Datum
          label="PRG file range"
          value={layout ? `${hex(layout.prgStart)}–${hex(layout.prgEnd - 1)}` : "Unknown"}
        />
        <Datum
          label="CHR file range"
          value={layout ? `${hex(layout.chrStart)}–${hex(layout.chrEnd - 1)}` : "Unknown"}
        />
      </dl>
      <div>
        <h3 className="text-xs text-muted-foreground">Known annotated RBI regions</h3>
        {RBI_ANNOTATIONS.length === 0 ? (
          <p className="mt-1 text-xs">None confirmed yet.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-xs">
            {RBI_ANNOTATIONS.map((annotation) => (
              <li key={`${annotation.start}:${annotation.label}`}>
                <span className="font-mono">{hex(annotation.start)}</span> {annotation.label} (
                {annotation.confidence})
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-mono">{value}</dd>
    </div>
  );
}

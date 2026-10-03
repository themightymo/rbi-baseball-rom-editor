import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, ShieldQuestion } from "lucide-react";
import { useRom } from "@/lib/romStore";
import { detectRbiRom } from "@/games/rbi/detect";

export function RbiDetectionPanel() {
  const { originalRom } = useRom();
  const result = useMemo(() => (originalRom ? detectRbiRom(originalRom) : null), [originalRom]);
  if (!result) return null;

  const recognized = result.isRbi;
  const Icon = result.supported ? CheckCircle2 : recognized ? AlertTriangle : ShieldQuestion;

  return (
    <section className="nes-window space-y-3 p-4" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon
          className={`mt-0.5 size-5 shrink-0 ${result.supported ? "text-highlight" : "text-warning"}`}
        />
        <div>
          <h2 className="text-sm leading-relaxed">
            {recognized ? "R.B.I. Baseball detected" : "ROM is not a supported RBI Baseball dump"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {result.supported
              ? "This exact original payload is supported by the current research baseline."
              : "You may inspect and export this file, but RBI roster editing is disabled."}
          </p>
        </div>
      </div>
      <dl className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <Datum label="Variant" value={result.profileLabel ?? "Unknown"} />
        <Datum label="ROM size" value={`${result.romSize.toLocaleString()} bytes`} />
        <Datum label="Mapper" value={result.mapper?.toString() ?? "Unknown"} />
        <Datum label="Status" value={result.supported ? "Supported" : "Inspection only"} />
        <Datum label="PRG" value={formatSize(result.prgSize)} />
        <Datum label="CHR" value={formatSize(result.chrSize)} />
        <Datum label="Confidence" value={result.confidence} />
        <Datum label="Data CRC32" value={result.payloadCrc32 ?? "Unavailable"} />
      </dl>
      {result.warnings.map((warning) => (
        <p key={warning} className="text-xs leading-relaxed text-warning">
          {warning}
        </p>
      ))}
    </section>
  );
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono">{value}</dd>
    </div>
  );
}

function formatSize(bytes?: number) {
  return bytes === undefined ? "Unknown" : `${bytes / 1024} KB`;
}

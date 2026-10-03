import { useMemo, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRom } from "@/lib/romStore";
import { download } from "@/lib/download";
import { detectRbiRom } from "@/games/rbi/detect";
import { exportRbiRosterCsv, importRbiRosterCsv, type RbiCsvError } from "@/games/rbi/csv";
import { detectedRbiTeamDataOffset } from "@/games/rbi/teams";

export function RbiCsvPanel() {
  const { rom, originalRom, setBytes } = useRom();
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<readonly RbiCsvError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const profile = useMemo(() => (originalRom ? detectRbiRom(originalRom) : null), [originalRom]);
  const teamDataOffset = useMemo(() => {
    if (!originalRom || !profile?.supported) return null;
    try {
      return detectedRbiTeamDataOffset(originalRom);
    } catch {
      return null;
    }
  }, [originalRom, profile]);
  const enabled = Boolean(rom && originalRom && profile?.supported && teamDataOffset !== null);

  return (
    <section className="nes-window p-4">
      <h3 className="text-sm font-medium">Roster CSV</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Export all 160 roster slots, edit confirmed fields in a spreadsheet, then import the full
        file. Batter averages use <code>.NNN</code>; pitcher ERA uses <code>N.NN</code>. Unknown
        bytes remain visible but read-only. An import with any error changes nothing.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!enabled}
          onClick={() => {
            if (!rom || teamDataOffset === null) return;
            download(
              "rbi-rosters.csv",
              exportRbiRosterCsv(rom, teamDataOffset),
              "text/csv;charset=utf-8",
            );
            setMessage("Exported the current complete roster.");
            setErrors([]);
          }}
        >
          <Download className="size-4" /> Export roster CSV
        </Button>
        <Button variant="outline" disabled={!enabled} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" /> Import roster CSV
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="text/csv,.csv"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file || !rom || teamDataOffset === null) return;
            const result = importRbiRosterCsv(rom, await file.text(), teamDataOffset);
            if (result.ok) {
              setBytes(0, result.rom);
              setErrors([]);
              setMessage(`Imported and validated all ${result.appliedRows} roster rows.`);
            } else {
              setErrors(result.errors);
              setMessage(null);
            }
            event.target.value = "";
          }}
        />
      </div>
      {!enabled && (
        <p className="mt-3 text-xs text-warning">
          CSV editing requires an exact, supported RBI payload profile.
        </p>
      )}
      {message && <p className="mt-3 text-xs text-highlight">{message}</p>}
      {errors.length > 0 && (
        <div className="mt-3 rounded border border-destructive p-3">
          <p className="text-xs font-medium text-destructive">
            Import rejected with {errors.length} error{errors.length === 1 ? "" : "s"}; the ROM was
            not changed.
          </p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">
            {errors.map((error, index) => (
              <li key={`${error.row}:${error.field ?? "row"}:${index}`}>
                {error.row > 0 ? `Row ${error.row}` : "Roster"}
                {error.field ? `, ${error.field}` : ""}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

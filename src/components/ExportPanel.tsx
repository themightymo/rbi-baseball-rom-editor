import { useRef } from "react";
import { useRom } from "@/lib/romStore";
import { Button } from "@/components/ui/button";
import { buildIPS } from "@/lib/diff";
import { Download, Upload, FileJson, RotateCcw, FileCode } from "lucide-react";
import { DEFAULT_ROM_MAP, type RomMap } from "@/types/RomMap";

function download(name: string, data: Uint8Array | string, mime = "application/octet-stream") {
  const part: BlobPart = typeof data === "string" ? data : new Uint8Array(data).buffer as ArrayBuffer;
  const blob = new Blob([part], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel() {
  const { rom, originalRom, romName, edits, romMap, setRomMap, clearEdits, setBytes } = useRom();
  const importRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);

  const editCount = edits.size;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Change summary
        </h3>
        <p className="mt-1 text-sm">
          {editCount === 0
            ? "No edited bytes."
            : `${editCount} byte${editCount === 1 ? "" : "s"} modified across the ROM.`}
        </p>
        {editCount > 0 && (
          <Button variant="outline" size="sm" className="mt-2" onClick={clearEdits}>
            <RotateCcw className="size-4" /> Revert all edits
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          disabled={!rom}
          onClick={() => rom && download(romName ?? "modified.nes", rom)}
        >
          <Download className="size-4" /> Export modified ROM
        </Button>
        <Button
          variant="outline"
          disabled={!rom || !originalRom}
          onClick={() => {
            if (!rom || !originalRom) return;
            download((romName ?? "rom") + ".ips", buildIPS(originalRom, rom));
          }}
        >
          <FileCode className="size-4" /> Export IPS patch
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            download(
              "rom-map.json",
              JSON.stringify(romMap, null, 2),
              "application/json",
            )
          }
        >
          <FileJson className="size-4" /> Export ROM map JSON
        </Button>
        <Button variant="outline" onClick={() => importRef.current?.click()}>
          <Upload className="size-4" /> Import ROM map JSON
        </Button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const text = await f.text();
            try {
              const parsed = JSON.parse(text) as RomMap;
              setRomMap({ ...DEFAULT_ROM_MAP, ...parsed });
            } catch {
              alert("Invalid ROM map JSON");
            }
            e.target.value = "";
          }}
        />

        <Button
          variant="outline"
          disabled={editCount === 0}
          onClick={() => {
            const editList = Array.from(edits.entries()).map(([offset, value]) => ({
              offset,
              value,
              original: originalRom?.[offset] ?? null,
            }));
            download(
              "edits-project.json",
              JSON.stringify(
                { kind: "tecmo-edit-project", romMapChecksum: null, edits: editList },
                null,
                2,
              ),
              "application/json",
            );
          }}
        >
          <FileJson className="size-4" /> Export project JSON
        </Button>
        <Button variant="outline" onClick={() => projectRef.current?.click()} disabled={!rom}>
          <Upload className="size-4" /> Import project JSON
        </Button>
        <input
          ref={projectRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f || !rom) return;
            try {
              const data = JSON.parse(await f.text()) as {
                edits: { offset: number; value: number }[];
              };
              for (const { offset, value } of data.edits) {
                setBytes(offset, new Uint8Array([value]));
              }
            } catch {
              alert("Invalid project JSON");
            }
            e.target.value = "";
          }}
        />
      </div>

      {editCount > 0 && originalRom && rom && (
        <div className="max-h-72 overflow-auto rounded-lg border font-mono text-xs">
          <table className="w-full">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Offset</th>
                <th className="p-2">Original</th>
                <th className="p-2">New</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(edits.entries())
                .slice(0, 500)
                .map(([off, val]) => (
                  <tr key={off} className="border-t">
                    <td className="p-2">0x{off.toString(16).toUpperCase()}</td>
                    <td className="p-2">{originalRom[off].toString(16).padStart(2, "0").toUpperCase()}</td>
                    <td className="p-2 text-warning">
                      {val.toString(16).padStart(2, "0").toUpperCase()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useRef } from "react";
import { useRom } from "@/lib/romStore";
import { Button } from "@/components/ui/button";
import { buildIPS } from "@/lib/diff";
import { download, saveFileAs } from "@/lib/download";
import { Save, Upload, FileJson, FileCode } from "lucide-react";
import { DEFAULT_ROM_MAP, type RomMap } from "@/types/RomMap";

export function ExportPanel() {
  const { rom, originalRom, romName, edits, romMap, setRomMap, setBytes } = useRom();
  const importRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);

  const editCount = edits.size;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Option
          title="Save the edited ROM"
          body="Writes a complete .nes file with your changes. Load it in any emulator to play."
        >
          <Button disabled={!rom} onClick={() => rom && saveFileAs(romName ?? "modified.nes", rom)}>
            <Save className="size-4" /> Save ROM As…
          </Button>
        </Option>
        <Option
          title="Share as a patch"
          body="A small .ips file containing only your changes. Others apply it to their own copy of the ROM — the safe, legal way to share a mod."
        >
          <Button
            variant="outline"
            disabled={!rom || !originalRom || editCount === 0}
            onClick={() => {
              if (!rom || !originalRom) return;
              download((romName ?? "rom").replace(/\.nes$/i, "") + ".ips", buildIPS(originalRom, rom));
            }}
          >
            <FileCode className="size-4" /> Download IPS patch
          </Button>
        </Option>
      </div>

      <details className="nes-window p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Advanced: work-in-progress &amp; layout files
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          A <em>project file</em> saves your list of changes so you can re-apply them to a fresh
          ROM later. A <em>layout file</em> holds any custom data layouts you described in the
          Custom Data Layouts tab.
        </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          <FileJson className="size-4" /> Export layout file
        </Button>
        <Button variant="outline" onClick={() => importRef.current?.click()}>
          <Upload className="size-4" /> Import layout file
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
              alert("That doesn't look like a valid layout file.");
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
          <FileJson className="size-4" /> Save project file
        </Button>
        <Button variant="outline" onClick={() => projectRef.current?.click()} disabled={!rom}>
          <Upload className="size-4" /> Open project file
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
              alert("That doesn't look like a valid project file.");
            }
            e.target.value = "";
          }}
        />
      </div>
      </details>

      {editCount > 0 && originalRom && rom && (
        <h3 className="text-sm font-medium">Changed bytes ({editCount})</h3>
      )}
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

function Option({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 nes-window p-4">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

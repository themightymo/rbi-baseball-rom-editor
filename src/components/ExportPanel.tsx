import { useRef } from "react";
import { useRom } from "@/lib/romStore";
import { Button } from "@/components/ui/button";
import { buildIPS } from "@/lib/diff";
import { download, saveFileAs } from "@/lib/download";
import { Save, Upload, FileJson, FileCode } from "lucide-react";
import { DEFAULT_ROM_MAP, type RomMap } from "@/types/RomMap";
import { buildRbiProject, applyRbiProject } from "@/games/rbi/project";
import { getRbiAnnotations } from "@/games/rbi/annotations";
import { annotationsAt } from "@/core/rom/annotations";

export function ExportPanel() {
  const { rom, originalRom, romName, edits, romMap, setRomMap, setBytes } = useRom();
  const importRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);

  const editCount = edits.size;
  const annotations = getRbiAnnotations(originalRom);

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
              download(
                (romName ?? "rom").replace(/\.nes$/i, "") + ".ips",
                buildIPS(originalRom, rom),
              );
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
          A <em>project file</em> saves your list of changes so you can re-apply them to a fresh ROM
          later. A <em>layout file</em> holds any custom data layouts you described in the Custom
          Data Layouts tab.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={() =>
              download(
                "rbi-research-layout.json",
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
              if (!originalRom) return;
              download(
                "rbi-baseball-project.json",
                JSON.stringify(buildRbiProject(originalRom, edits), null, 2),
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
              if (!f || !originalRom) return;
              try {
                const applied = applyRbiProject(originalRom, JSON.parse(await f.text()));
                setBytes(0, applied);
              } catch (error) {
                alert(
                  error instanceof Error ? error.message : "That isn't a valid RBI project file.",
                );
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
                <th className="p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(edits.entries())
                .slice(0, 500)
                .map(([off, val]) => (
                  <tr key={off} className="border-t">
                    <td className="p-2">0x{off.toString(16).toUpperCase()}</td>
                    <td className="p-2">
                      {originalRom[off].toString(16).padStart(2, "0").toUpperCase()}
                    </td>
                    <td className="p-2 text-warning">
                      {val.toString(16).padStart(2, "0").toUpperCase()}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {describeOffset(annotations, off)}
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

function Option({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
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

function describeOffset(annotations: ReturnType<typeof getRbiAnnotations>, offset: number): string {
  const matches = annotationsAt(annotations, offset);
  return matches.at(-1)?.label ?? "Unannotated byte";
}

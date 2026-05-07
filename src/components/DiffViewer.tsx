import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { diffBytes, type DiffRange } from "@/lib/diff";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABELS = [
  "unknown",
  "player_name",
  "player_position",
  "player_number",
  "player_attribute",
  "team_name",
  "team_city",
  "team_abbreviation",
  "roster_assignment",
];

export function DiffViewer() {
  const aRef = useRef<HTMLInputElement>(null);
  const bRef = useRef<HTMLInputElement>(null);
  const [a, setA] = useState<Uint8Array | null>(null);
  const [b, setB] = useState<Uint8Array | null>(null);
  const [ranges, setRanges] = useState<DiffRange[]>([]);

  const load = async (file: File, set: (b: Uint8Array) => void) => {
    const buf = await file.arrayBuffer();
    set(new Uint8Array(buf));
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <FileSlot label="Original ROM" inputRef={aRef} loaded={!!a} onPick={(f) => load(f, setA)} />
        <FileSlot label="Modified ROM" inputRef={bRef} loaded={!!b} onPick={(f) => load(f, setB)} />
      </div>
      <Button
        disabled={!a || !b}
        onClick={() => a && b && setRanges(diffBytes(a, b))}
      >
        Compare
      </Button>
      {ranges.length > 0 && (
        <div className="max-h-72 overflow-auto rounded-md border font-mono text-xs">
          <table className="w-full">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Offset</th>
                <th className="p-2">Original</th>
                <th className="p-2">Modified</th>
                <th className="p-2">Label</th>
              </tr>
            </thead>
            <tbody>
              {ranges.slice(0, 500).map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">0x{r.start.toString(16).toUpperCase()}</td>
                  <td className="p-2">{toHex(r.original)}</td>
                  <td className="p-2">{toHex(r.modified)}</td>
                  <td className="p-2">
                    <Select
                      defaultValue={r.label ?? "unknown"}
                      onValueChange={(v) => {
                        r.label = v;
                        setRanges([...ranges]);
                      }}
                    >
                      <SelectTrigger className="h-7 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LABELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

function toHex(b: Uint8Array) {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}

function FileSlot({
  label,
  inputRef,
  loaded,
  onPick,
}: {
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  loaded: boolean;
  onPick: (f: File) => void;
}) {
  return (
    <div className="rounded-md border bg-background/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <input
        ref={inputRef}
        type="file"
        accept=".nes,.bin"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={() => inputRef.current?.click()}
      >
        {loaded ? "Replace" : "Choose file"}
      </Button>
    </div>
  );
}

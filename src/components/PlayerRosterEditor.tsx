import { useMemo, useState } from "react";
import { useRom } from "@/lib/romStore";
import { decodeText, encodeText } from "@/lib/encoding";
import type { FieldDef, RomMap } from "@/types/RomMap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface FieldValue {
  raw: Uint8Array;
  text?: string;
  num?: number;
}

function readField(rom: Uint8Array, base: number, f: FieldDef, encoding: RomMap["encoding"]): FieldValue {
  const raw = rom.slice(base + f.start, base + f.start + f.length);
  if (f.type === "text") return { raw, text: decodeText(rom, base + f.start, f.length, encoding) };
  if (f.type === "number" || f.type === "enum") {
    let n = 0;
    for (let i = 0; i < f.length; i++) n = (n << 8) | raw[i];
    return { raw, num: n };
  }
  return { raw };
}

export function PlayerRosterEditor() {
  const { rom, romMap, setBytes, originalRom } = useRom();
  const p = romMap.players;
  const [teamIdx, setTeamIdx] = useState(0);
  const [filter, setFilter] = useState("");

  const ready =
    rom && p.offset !== null && p.recordLength && p.count && p.teamGrouping.playersPerTeam;

  const teams = useMemo(() => {
    if (!ready) return 0;
    return Math.ceil(p.count! / p.teamGrouping.playersPerTeam!);
  }, [p, ready]);

  if (!ready) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground">
        Define the player record (offset, length, count, players-per-team, and at least
        one field) in the <strong>Mappers → Players</strong> tab to enable this editor.
      </div>
    );
  }

  const ppt = p.teamGrouping.playersPerTeam!;
  const startPlayer = teamIdx * ppt;
  const endPlayer = Math.min(startPlayer + ppt, p.count!);
  const fieldEntries = Object.entries(p.fields);

  const filtered: number[] = [];
  for (let i = startPlayer; i < endPlayer; i++) {
    if (!filter) {
      filtered.push(i);
      continue;
    }
    const base = p.offset! + i * p.recordLength!;
    const matches = fieldEntries.some(([, f]) => {
      if (f.type !== "text") return false;
      const t = decodeText(rom!, base + f.start, f.length, romMap.encoding);
      return t.toLowerCase().includes(filter.toLowerCase());
    });
    if (matches) filtered.push(i);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
      <aside className="rounded-lg border bg-card p-2">
        <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          Teams ({teams})
        </div>
        <div className="max-h-[70vh] space-y-0.5 overflow-auto">
          {Array.from({ length: teams }).map((_, i) => (
            <button
              key={i}
              onClick={() => setTeamIdx(i)}
              className={`w-full rounded px-2 py-1.5 text-left text-sm transition ${
                i === teamIdx ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              Team {String(i + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
      </aside>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Filter players in this team…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            base 0x{(p.offset! + startPlayer * p.recordLength!).toString(16).toUpperCase()}
          </span>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-2">#</th>
                {fieldEntries.map(([k]) => (
                  <th key={k} className="p-2">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((idx) => {
                const base = p.offset! + idx * p.recordLength!;
                return (
                  <tr key={idx} className="border-t hover:bg-accent/30">
                    <td className="p-2 font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </td>
                    {fieldEntries.map(([k, f]) => (
                      <td key={k} className="p-1.5">
                        <FieldEditor
                          base={base}
                          field={f}
                          rom={rom!}
                          original={originalRom!}
                          encoding={romMap.encoding}
                          onWrite={(b) => setBytes(base + f.start, b)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={fieldEntries.length + 1} className="p-6 text-center text-muted-foreground">
                    No players match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function FieldEditor({
  base,
  field,
  rom,
  original,
  encoding,
  onWrite,
}: {
  base: number;
  field: FieldDef;
  rom: Uint8Array;
  original: Uint8Array;
  encoding: RomMap["encoding"];
  onWrite: (bytes: Uint8Array) => void;
}) {
  const cur = readField(rom, base, field, encoding);
  const orig = readField(original, base, field, encoding);
  const changed = !sameBytes(cur.raw, orig.raw);
  const offset = base + field.start;
  const offsetLabel = `0x${offset.toString(16).toUpperCase()}`;

  if (field.type === "text") {
    return (
      <div className="flex items-center gap-2">
        <Input
          className={`h-9 border-2 text-sm font-mono font-semibold ${changed ? "border-warning" : "border-input"}`}
          value={cur.text ?? ""}
          maxLength={field.length}
          onChange={(e) => onWrite(encodeText(e.target.value, field.length, encoding))}
        />
        <span className="font-mono text-[10px] text-muted-foreground" title={offsetLabel}>
          {offsetLabel}
        </span>
      </div>
    );
  }

  if (field.type === "number" || field.type === "enum") {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          className={`h-8 w-20 font-mono ${changed ? "border-warning" : ""}`}
          value={cur.num ?? 0}
          min={field.min}
          max={field.max}
          onChange={(e) => {
            let n = parseInt(e.target.value || "0", 10);
            if (field.min !== undefined) n = Math.max(field.min, n);
            if (field.max !== undefined) n = Math.min(field.max, n);
            const out = new Uint8Array(field.length);
            for (let i = field.length - 1; i >= 0; i--) {
              out[i] = n & 0xff;
              n >>= 8;
            }
            onWrite(out);
          }}
        />
        <span className="font-mono text-[10px] text-muted-foreground">{offsetLabel}</span>
      </div>
    );
  }

  // raw
  return (
    <div className="flex items-center gap-2">
      <Input
        className={`h-8 font-mono ${changed ? "border-warning" : ""}`}
        value={Array.from(cur.raw).map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ")}
        onChange={(e) => {
          const parts = e.target.value.split(/\s+/).filter(Boolean).slice(0, field.length);
          const out = new Uint8Array(field.length);
          parts.forEach((p, i) => (out[i] = parseInt(p, 16) & 0xff));
          onWrite(out);
        }}
      />
      <span className="font-mono text-[10px] text-muted-foreground">{offsetLabel}</span>
    </div>
  );
}

function sameBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

import { useRom } from "@/lib/romStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import type { FieldDef, FieldType, RomMap } from "@/types/RomMap";

type Section = "players" | "teams";

export function RecordMapper({ section }: { section: Section }) {
  const { romMap, setRomMap } = useRom();
  const def = romMap[section];

  const update = (patch: Partial<RomMap[typeof section]>) => {
    setRomMap({ ...romMap, [section]: { ...def, ...patch } } as RomMap);
  };

  const updateField = (key: string, patch: Partial<FieldDef> | null) => {
    const fields = { ...def.fields };
    if (patch === null) delete fields[key];
    else fields[key] = { ...fields[key], ...patch } as FieldDef;
    update({ fields } as Partial<RomMap[typeof section]>);
  };

  const renameField = (oldKey: string, newKey: string) => {
    if (!newKey || oldKey === newKey || def.fields[newKey]) return;
    const fields: Record<string, FieldDef> = {};
    for (const [k, v] of Object.entries(def.fields)) fields[k === oldKey ? newKey : k] = v;
    update({ fields } as Partial<RomMap[typeof section]>);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <NumField
          label="Starting offset (hex)"
          hex
          value={def.offset}
          onChange={(v) => update({ offset: v } as Partial<RomMap[typeof section]>)}
        />
        <NumField
          label="Record length (bytes)"
          value={def.recordLength}
          onChange={(v) => update({ recordLength: v } as Partial<RomMap[typeof section]>)}
        />
        <NumField
          label={section === "players" ? "Total player count" : "Total team count"}
          value={def.count}
          onChange={(v) => update({ count: v } as Partial<RomMap[typeof section]>)}
        />
        {section === "players" && (
          <NumField
            label="Players per team"
            value={romMap.players.teamGrouping.playersPerTeam}
            onChange={(v) =>
              setRomMap({
                ...romMap,
                players: {
                  ...romMap.players,
                  teamGrouping: { type: "fixed", playersPerTeam: v },
                },
              })
            }
          />
        )}
      </div>

      <div className="rounded-md border">
        <div className="flex items-center justify-between border-b p-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Fields</div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              let i = 1;
              let key = "field_1";
              while (def.fields[key]) key = `field_${++i}`;
              updateField(key, { start: 0, length: 1, type: "number" });
            }}
          >
            <Plus className="size-4" /> Add field
          </Button>
        </div>
        <div className="divide-y">
          {Object.entries(def.fields).length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No fields defined yet.</div>
          )}
          {Object.entries(def.fields).map(([key, f]) => (
            <div
              key={key}
              className="grid items-end gap-2 p-3 sm:grid-cols-[repeat(14,minmax(0,1fr))]"
            >
              <Labeled className="sm:col-span-3" label="Name">
                <Input defaultValue={key} onBlur={(e) => renameField(key, e.target.value.trim())} />
              </Labeled>
              <Labeled className="sm:col-span-2" label="Byte order">
                <Select
                  value={f.endian ?? "big"}
                  disabled={f.type !== "number" && f.type !== "enum"}
                  onValueChange={(value) => updateField(key, { endian: value as "little" | "big" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="little">little-endian</SelectItem>
                    <SelectItem value="big">big-endian</SelectItem>
                  </SelectContent>
                </Select>
              </Labeled>
              <Labeled className="sm:col-span-2" label="Start (rel)">
                <Input
                  type="number"
                  value={f.start}
                  onChange={(e) => updateField(key, { start: parseInt(e.target.value || "0", 10) })}
                />
              </Labeled>
              <Labeled className="sm:col-span-2" label="Length">
                <Input
                  type="number"
                  value={f.length}
                  onChange={(e) =>
                    updateField(key, { length: parseInt(e.target.value || "0", 10) })
                  }
                />
              </Labeled>
              <Labeled className="sm:col-span-2" label="Type">
                <Select
                  value={f.type}
                  onValueChange={(v) => updateField(key, { type: v as FieldType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["text", "number", "enum", "raw"] as FieldType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Labeled>
              <Labeled className="sm:col-span-1" label="Min">
                <Input
                  type="number"
                  value={f.min ?? ""}
                  onChange={(e) =>
                    updateField(key, {
                      min: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Labeled>
              <Labeled className="sm:col-span-1" label="Max">
                <Input
                  type="number"
                  value={f.max ?? ""}
                  onChange={(e) =>
                    updateField(key, {
                      max: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
              </Labeled>
              <div className="sm:col-span-1 flex justify-end">
                <Button size="icon" variant="ghost" onClick={() => updateField(key, null)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Labeled({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  hex,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hex?: boolean;
}) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <Input
        className="font-mono"
        value={value === null ? "" : hex ? value.toString(16).toUpperCase() : value}
        placeholder={hex ? "e.g. 1F000" : ""}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (!raw) return onChange(null);
          const n = hex ? parseInt(raw, 16) : parseInt(raw, 10);
          onChange(isNaN(n) ? null : n);
        }}
      />
    </div>
  );
}

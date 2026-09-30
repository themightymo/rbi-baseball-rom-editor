import { useRom } from "@/lib/romStore";
import { FieldEditor } from "./PlayerRosterEditor";
import { decodeText } from "@/lib/encoding";

export function TeamEditor() {
  const { rom, romMap, originalRom, setBytes } = useRom();
  const t = romMap.teams;

  if (!rom || t.offset === null || !t.recordLength || !t.count) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground">
        Fill in the starting offset, entry size, and number of teams above, then add at least
        one field — an editable table of teams will appear here.
      </div>
    );
  }

  const fields = Object.entries(t.fields);
  const teams: number[] = [];
  for (let i = 0; i < t.count; i++) teams.push(i);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {teams.map((i) => {
        const base = t.offset! + i * t.recordLength!;
        const headerField = fields.find(([, f]) => f.type === "text");
        const header = headerField
          ? decodeText(rom, base + headerField[1].start, headerField[1].length, romMap.encoding)
          : `Team ${i + 1}`;
        return (
          <div key={i} className="rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="font-semibold">{header.trim() || `Team ${i + 1}`}</h3>
              <span className="font-mono text-[10px] text-muted-foreground">
                0x{base.toString(16).toUpperCase()}
              </span>
            </div>
            <div className="space-y-2">
              {fields.map(([k, f]) => (
                <div key={k}>
                  <div className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {k}
                  </div>
                  <FieldEditor
                    base={base}
                    field={f}
                    rom={rom}
                    original={originalRom!}
                    encoding={romMap.encoding}
                    onWrite={(b) => setBytes(base + f.start, b)}
                  />
                </div>
              ))}
              {fields.length === 0 && (
                <div className="text-xs text-muted-foreground">No fields defined.</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

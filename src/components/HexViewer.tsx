import { useMemo, useState } from "react";
import { useRom } from "@/lib/romStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ROW = 16;
const ROWS_PER_PAGE = 32;

export function HexViewer() {
  const { rom } = useRom();
  const [offsetInput, setOffsetInput] = useState("0");
  const [page, setPage] = useState(0);

  const start = useMemo(() => {
    const v = parseInt(offsetInput, 16);
    if (isNaN(v)) return 0;
    return Math.max(0, Math.floor(v / ROW) * ROW);
  }, [offsetInput]);

  if (!rom) return <Empty />;

  const begin = start + page * ROWS_PER_PAGE * ROW;
  const rows: number[] = [];
  for (let i = 0; i < ROWS_PER_PAGE; i++) rows.push(begin + i * ROW);

  return (
    <div className="nes-window">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Jump to (hex)
        </label>
        <Input
          value={offsetInput}
          onChange={(e) => {
            setOffsetInput(e.target.value);
            setPage(0);
          }}
          className="w-32 font-mono"
        />
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))}>
            ◀
          </Button>
          <span className="px-2 font-mono text-xs text-muted-foreground">
            page {page + 1}
          </span>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)}>
            ▶
          </Button>
        </div>
      </div>
      <div className="overflow-auto p-3 font-mono text-xs leading-5">
        {rows.map((rowOff) => {
          if (rowOff >= rom.length) return null;
          const slice = rom.slice(rowOff, rowOff + ROW);
          return (
            <div key={rowOff} className="flex gap-4 whitespace-pre">
              <span className="text-muted-foreground">
                {rowOff.toString(16).padStart(6, "0").toUpperCase()}
              </span>
              <span>
                {Array.from(slice)
                  .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
                  .join(" ")}
              </span>
              <span className="text-muted-foreground">
                {Array.from(slice)
                  .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
                  .join("")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="nes-window border-dashed p-8 text-center text-sm text-muted-foreground">
      Upload a ROM to view its bytes.
    </div>
  );
}

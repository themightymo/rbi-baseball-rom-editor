import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { useRom } from "@/lib/romStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  fileOffsetToCpuAddress,
  fileOffsetToPrgOffset,
  getNesRomLayout,
  hex,
  parseOffset,
} from "@/core/nes/addressing";
import { annotationsAt } from "@/core/rom/annotations";
import { getRbiAnnotations } from "@/games/rbi/annotations";

const ROW_LENGTH = 16;
const PAGE_LENGTH = 32 * ROW_LENGTH;

export function HexViewer({ jumpOffset }: { jumpOffset?: number | null }) {
  const { rom } = useRom();
  const [offsetInput, setOffsetInput] = useState("0x000000");
  const [pageStart, setPageStart] = useState(0);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  const layout = useMemo(() => (rom ? getNesRomLayout(rom) : null), [rom]);
  const annotations = useMemo(() => getRbiAnnotations(rom), [rom]);
  const selection = useMemo(() => {
    if (selectionStart === null) return null;
    const end = selectionEnd ?? selectionStart;
    return { start: Math.min(selectionStart, end), end: Math.max(selectionStart, end) };
  }, [selectionStart, selectionEnd]);

  useEffect(() => {
    if (jumpOffset === null || jumpOffset === undefined) return;
    setOffsetInput(hex(jumpOffset));
    setPageStart(Math.floor(jumpOffset / PAGE_LENGTH) * PAGE_LENGTH);
    setSelectionStart(jumpOffset);
    setSelectionEnd(jumpOffset);
  }, [jumpOffset]);

  if (!rom) return <Empty />;

  const jump = () => {
    const offset = parseOffset(offsetInput);
    if (offset === null || offset >= rom.length) return;
    setPageStart(Math.floor(offset / PAGE_LENGTH) * PAGE_LENGTH);
    setSelectionStart(offset);
    setSelectionEnd(offset);
  };
  const rows = Array.from(
    { length: PAGE_LENGTH / ROW_LENGTH },
    (_, index) => pageStart + index * ROW_LENGTH,
  );
  const copySelection = async () => {
    if (!selection) return;
    const value = Array.from(rom.subarray(selection.start, selection.end + 1), (byte) =>
      byte.toString(16).padStart(2, "0").toUpperCase(),
    ).join(" ");
    await navigator.clipboard.writeText(value);
  };

  return (
    <section className="nes-window">
      <div className="space-y-3 border-b p-3">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            jump();
          }}
        >
          <label className="space-y-1 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="block">Jump to file offset</span>
            <Input
              value={offsetInput}
              onChange={(event) => setOffsetInput(event.target.value)}
              className="w-40 font-mono"
              aria-label="File offset in decimal or hexadecimal"
            />
          </label>
          <Button type="submit" size="sm">
            Jump
          </Button>
          <span className="text-xs text-muted-foreground">
            Decimal, `0x` hex, or bare hex with A–F
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPageStart(Math.max(0, pageStart - PAGE_LENGTH))}
            >
              ◀
            </Button>
            <span className="px-2 font-mono text-xs text-muted-foreground">{hex(pageStart)}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pageStart + PAGE_LENGTH >= rom.length}
              onClick={() => setPageStart(pageStart + PAGE_LENGTH)}
            >
              ▶
            </Button>
          </div>
        </form>
        {selection && (
          <SelectionSummary
            rom={rom}
            start={selection.start}
            end={selection.end}
            layout={layout}
            annotations={annotations}
            onCopy={copySelection}
          />
        )}
      </div>
      <div className="overflow-auto p-3 font-mono text-xs leading-5">
        {rows.map((rowOffset) => {
          if (rowOffset >= rom.length) return null;
          const slice = rom.subarray(rowOffset, Math.min(rowOffset + ROW_LENGTH, rom.length));
          return (
            <div key={rowOffset} className="flex min-w-max gap-4 whitespace-pre">
              <span className="w-20 text-muted-foreground">{hex(rowOffset)}</span>
              <span className="flex gap-1">
                {Array.from(slice, (byte, index) => {
                  const offset = rowOffset + index;
                  const selected =
                    selection && offset >= selection.start && offset <= selection.end;
                  const byteAnnotations = annotationsAt(annotations, offset);
                  return (
                    <button
                      key={offset}
                      type="button"
                      title={
                        byteAnnotations.map(({ label }) => label).join(", ") ||
                        `File ${hex(offset)}`
                      }
                      className={`rounded px-0.5 ${selected ? "bg-highlight text-background" : byteAnnotations.length ? "bg-primary/20 text-highlight" : "hover:bg-accent"}`}
                      onClick={(event) => {
                        if (event.shiftKey && selectionStart !== null) setSelectionEnd(offset);
                        else {
                          setSelectionStart(offset);
                          setSelectionEnd(offset);
                        }
                      }}
                    >
                      {byte.toString(16).padStart(2, "0").toUpperCase()}
                    </button>
                  );
                })}
              </span>
              <span className="text-muted-foreground">
                {Array.from(slice, (byte) =>
                  byte >= 32 && byte < 127 ? String.fromCharCode(byte) : ".",
                ).join("")}
              </span>
            </div>
          );
        })}
      </div>
      <p className="border-t p-3 text-xs text-muted-foreground">
        Click a byte to select it; Shift-click another byte to select a range.
      </p>
    </section>
  );
}

function SelectionSummary({
  rom,
  start,
  end,
  layout,
  annotations,
  onCopy,
}: {
  rom: Uint8Array;
  start: number;
  end: number;
  layout: ReturnType<typeof getNesRomLayout>;
  annotations: ReturnType<typeof getRbiAnnotations>;
  onCopy: () => void;
}) {
  const prgOffset = layout ? fileOffsetToPrgOffset(layout, start) : null;
  const cpuAddress = layout ? fileOffsetToCpuAddress(layout, start) : null;
  const selectedAnnotations = annotationsAt(annotations, start);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded border bg-background/40 p-2 text-xs">
      <span>
        File <strong className="font-mono">{hex(start)}</strong>
        {end !== start && (
          <>
            –<strong className="font-mono">{hex(end)}</strong>
          </>
        )}
      </span>
      <span>
        Length <strong className="font-mono">{end - start + 1}</strong>
      </span>
      <span>
        PRG <strong className="font-mono">{prgOffset === null ? "n/a" : hex(prgOffset)}</strong>
      </span>
      <span>
        CPU{" "}
        <strong className="font-mono">
          {cpuAddress === null
            ? "bank-dependent / n/a"
            : `$${cpuAddress.toString(16).toUpperCase().padStart(4, "0")}`}
        </strong>
      </span>
      <span>
        Annotation{" "}
        <strong>{selectedAnnotations.map(({ label }) => label).join(", ") || "Unlabeled"}</strong>
      </span>
      <Button size="sm" variant="outline" onClick={onCopy}>
        <Copy className="size-3" /> Copy {end - start + 1} byte{end === start ? "" : "s"}
      </Button>
      <span className="sr-only">Selected value {rom[start]}</span>
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

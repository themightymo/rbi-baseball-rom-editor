import { useRef } from "react";
import { useRom } from "@/lib/romStore";
import { Button } from "@/components/ui/button";
import { Upload, RotateCcw, FileWarning } from "lucide-react";

export function RomUploader() {
  const { rom, romName, romChecksum, hasINES, setRom, resetRom } = useRom();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    setRom(new Uint8Array(buf), file.name);
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Local ROM
          </h2>
          {rom ? (
            <div className="mt-1 font-mono text-sm">
              <div className="text-foreground">{romName}</div>
              <div className="text-muted-foreground">
                {rom.length.toLocaleString()} bytes · CRC32 {romChecksum}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your own legally owned NES ROM. Nothing leaves your browser.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".nes,.bin,application/octet-stream"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => inputRef.current?.click()} variant="default">
            <Upload className="size-4" /> {rom ? "Replace ROM" : "Upload ROM"}
          </Button>
          {rom && (
            <Button onClick={resetRom} variant="outline">
              <RotateCcw className="size-4" /> Clear
            </Button>
          )}
        </div>
      </div>
      {rom && !hasINES && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
          <FileWarning className="size-4 shrink-0" />
          No iNES header detected. Offsets in the map should be raw file offsets.
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Search } from "lucide-react";
import { useRom } from "@/lib/romStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hex } from "@/core/nes/addressing";
import { encodeSearchText, searchRomText } from "@/core/rom/search";

export function StringSearch({ onJump }: { onJump: (offset: number) => void }) {
  const { rom, romMap } = useRom();
  const [needle, setNeedle] = useState("");
  const [hits, setHits] = useState<number[]>([]);
  const [ran, setRan] = useState(false);
  const [encodingError, setEncodingError] = useState(false);

  if (!rom)
    return (
      <div className="nes-window border-dashed p-6 text-sm text-muted-foreground">
        Upload a ROM to search for strings.
      </div>
    );

  const runSearch = () => {
    const result = searchRomText(rom, needle, romMap.encoding);
    setEncodingError(result === null && needle.length > 0);
    setHits(result ?? []);
    setRan(true);
  };
  const encoded = encodeSearchText(needle, romMap.encoding);

  return (
    <section className="nes-window space-y-3 p-4">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch();
        }}
      >
        <Input
          placeholder="Search ROM text"
          value={needle}
          onChange={(event) => setNeedle(event.target.value)}
        />
        <Button type="submit">
          <Search className="size-4" /> Search
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Exact, case-sensitive {romMap.encoding.type === "ascii" ? "ASCII" : "custom-table"} byte
        search.
        {encoded && (
          <>
            {" "}
            Query bytes:{" "}
            <span className="font-mono">
              {Array.from(encoded, (byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(
                " ",
              )}
            </span>
          </>
        )}
      </p>
      {encodingError && (
        <p className="text-xs text-warning">
          One or more query characters are not defined by the active encoding.
        </p>
      )}
      {ran && (
        <div className="max-h-64 overflow-auto rounded-md border bg-background/50 p-2 font-mono text-xs">
          {hits.length === 0 ? (
            <div className="text-muted-foreground">No matches.</div>
          ) : (
            hits.map((offset) => (
              <button
                key={offset}
                type="button"
                className="flex w-full justify-between gap-4 rounded px-1 py-0.5 text-left hover:bg-accent"
                onClick={() => onJump(offset)}
              >
                <span>{hex(offset)}</span>
                <span className="text-muted-foreground">Jump to hex viewer →</span>
              </button>
            ))
          )}
        </div>
      )}
    </section>
  );
}

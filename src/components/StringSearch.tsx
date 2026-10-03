import { useState } from "react";
import { useRom } from "@/lib/romStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchString } from "@/lib/encoding";
import { Search } from "lucide-react";

export function StringSearch() {
  const { rom, romMap } = useRom();
  const [needle, setNeedle] = useState("");
  const [hits, setHits] = useState<number[]>([]);
  const [ran, setRan] = useState(false);

  if (!rom)
    return (
      <div className="nes-window border-dashed p-6 text-sm text-muted-foreground">
        Upload a ROM to search for strings.
      </div>
    );

  return (
    <div className="nes-window p-4 space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search for text (e.g. team name) — type your own"
          value={needle}
          onChange={(e) => setNeedle(e.target.value)}
        />
        <Button
          onClick={() => {
            setHits(searchString(rom, needle, romMap.encoding));
            setRan(true);
          }}
        >
          <Search className="size-4" /> Search
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Using {romMap.encoding.type} encoding. If nothing matches, try the Encoding panel to define
        a custom character map.
      </p>
      {ran && (
        <div className="max-h-64 overflow-auto rounded-md border bg-background/50 p-2 font-mono text-xs">
          {hits.length === 0 ? (
            <div className="text-muted-foreground">No matches.</div>
          ) : (
            hits.map((h) => (
              <div key={h} className="flex justify-between gap-4 py-0.5">
                <span>0x{h.toString(16).toUpperCase().padStart(6, "0")}</span>
                <span className="text-muted-foreground">
                  {Array.from(rom.slice(h, h + needle.length + 8))
                    .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "·"))
                    .join("")}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

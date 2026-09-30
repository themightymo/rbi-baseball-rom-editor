import { useRom } from "@/lib/romStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { decodeText } from "@/lib/encoding";

export function EncodingPanel() {
  const { romMap, setRomMap, rom } = useRom();
  const [hexByte, setHexByte] = useState("");
  const [ch, setCh] = useState("");

  const setType = (type: "ascii" | "custom") =>
    setRomMap({ ...romMap, encoding: { ...romMap.encoding, type } });

  const addEntry = () => {
    const k = hexByte.trim().toUpperCase().padStart(2, "0").slice(0, 2);
    if (!/^[0-9A-F]{2}$/.test(k) || !ch) return;
    setRomMap({
      ...romMap,
      encoding: {
        ...romMap.encoding,
        characterMap: { ...romMap.encoding.characterMap, [k]: ch[0] },
      },
    });
    setHexByte("");
    setCh("");
  };

  const removeEntry = (k: string) => {
    const m = { ...romMap.encoding.characterMap };
    delete m[k];
    setRomMap({ ...romMap, encoding: { ...romMap.encoding, characterMap: m } });
  };

  return (
    <div className="nes-window p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground">Encoding</span>
        <Button
          size="sm"
          variant={romMap.encoding.type === "ascii" ? "default" : "outline"}
          onClick={() => setType("ascii")}
        >
          ASCII
        </Button>
        <Button
          size="sm"
          variant={romMap.encoding.type === "custom" ? "default" : "outline"}
          onClick={() => setType("custom")}
        >
          Custom
        </Button>
      </div>

      {romMap.encoding.type === "custom" && (
        <>
          <div className="flex items-end gap-2">
            <div>
              <div className="mb-1 text-[10px] uppercase text-muted-foreground">Byte (hex)</div>
              <Input
                className="w-24 font-mono"
                value={hexByte}
                onChange={(e) => setHexByte(e.target.value)}
                placeholder="2A"
              />
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase text-muted-foreground">Character</div>
              <Input
                className="w-24 font-mono"
                value={ch}
                maxLength={1}
                onChange={(e) => setCh(e.target.value)}
                placeholder="A"
              />
            </div>
            <Button onClick={addEntry}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(romMap.encoding.characterMap)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => removeEntry(k)}
                  className="rounded border bg-background/40 px-2 py-1 font-mono text-xs hover:border-destructive"
                  title="Click to remove"
                >
                  {k}→{v}
                </button>
              ))}
            {Object.keys(romMap.encoding.characterMap).length === 0 && (
              <span className="text-xs text-muted-foreground">No mappings yet.</span>
            )}
          </div>
          {rom && (
            <div className="rounded-md border bg-background/30 p-2 font-mono text-xs">
              Preview @0x0:{" "}
              <span className="text-foreground">
                {decodeText(rom, 0, 32, romMap.encoding)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

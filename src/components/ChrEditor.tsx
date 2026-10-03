import { useEffect, useMemo, useState } from "react";
import { decodeTile, encodeTile, NES_TILE_BYTES } from "@/core/nes/chr";
import { getNesRomLayout, hex } from "@/core/nes/addressing";
import { useRom } from "@/lib/romStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PREVIEW_COLORS = ["#000000", "#747474", "#bcbcbc", "#fcfcfc"] as const;

export function ChrEditor() {
  const { rom, setBytes } = useRom();
  const [tileIndex, setTileIndex] = useState(0);
  const layout = useMemo(() => (rom ? getNesRomLayout(rom) : null), [rom]);
  const tileCount = layout ? Math.floor(layout.ines.chrSize / NES_TILE_BYTES) : 0;
  const safeIndex = Math.min(Math.max(tileIndex, 0), Math.max(tileCount - 1, 0));
  const tileOffset = layout ? layout.chrStart + safeIndex * NES_TILE_BYTES : null;
  const pixels = useMemo(
    () => (rom && tileOffset !== null ? decodeTile(rom, tileOffset) : null),
    [rom, tileOffset],
  );

  useEffect(() => {
    if (tileCount > 0 && tileIndex >= tileCount) setTileIndex(tileCount - 1);
  }, [tileCount, tileIndex]);

  if (!rom || !layout || tileCount === 0 || tileOffset === null || !pixels) {
    return (
      <section className="nes-window p-4">
        <h2 className="text-sm font-semibold">CHR tile editor</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          This ROM does not declare any CHR ROM tiles. CHR RAM cartridges have no tile bytes to edit
          in the file.
        </p>
      </section>
    );
  }

  function changePixel(pixelIndex: number) {
    if (!pixels || tileOffset === null) return;
    const next = new Uint8Array(pixels);
    next[pixelIndex] = (next[pixelIndex] + 1) & 3;
    setBytes(tileOffset, encodeTile(next));
  }

  return (
    <section className="nes-window p-4">
      <h2 className="text-sm font-semibold">CHR tile editor</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Inspect or edit raw 8×8 NES tiles. The four shades are plane indices 0–3, not confirmed
        in-game colors. No RBI sprite, logo, or screen meaning is assigned here.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="w-44 text-xs">
          Tile index (decimal)
          <Input
            className="mt-1 font-mono"
            type="number"
            min={0}
            max={tileCount - 1}
            value={safeIndex}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);
              if (Number.isInteger(value))
                setTileIndex(Math.min(Math.max(value, 0), tileCount - 1));
            }}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safeIndex === 0}
          onClick={() => setTileIndex((value) => Math.max(0, value - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safeIndex === tileCount - 1}
          onClick={() => setTileIndex((value) => Math.min(tileCount - 1, value + 1))}
        >
          Next
        </Button>
        <div className="text-xs text-muted-foreground">
          <div>{tileCount.toLocaleString()} tiles</div>
          <div className="font-mono">File {hex(tileOffset)}</div>
          <div className="font-mono">CHR +{hex(safeIndex * NES_TILE_BYTES, 4)}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-5">
        <div
          className="grid w-fit grid-cols-8 overflow-hidden border-2 border-foreground"
          aria-label={`Editable CHR tile ${safeIndex}`}
        >
          {[...pixels].map((pixel, index) => (
            <button
              key={index}
              type="button"
              className="size-7 border border-black/20 sm:size-9"
              style={{ backgroundColor: PREVIEW_COLORS[pixel] }}
              aria-label={`Pixel ${index}, plane index ${pixel}; click for next value`}
              onClick={() => changePixel(index)}
            />
          ))}
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>Click a pixel to cycle its 2-bit value.</p>
          {PREVIEW_COLORS.map((color, index) => (
            <div key={color} className="flex items-center gap-2">
              <span
                className="size-5 border border-foreground"
                style={{ backgroundColor: color }}
              />
              Plane index {index}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

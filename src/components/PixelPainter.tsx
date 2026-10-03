import { useCallback, useEffect, useRef, useState } from "react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TRANSPARENT, pixelsToDataUrl, type Pixels } from "@/lib/pixels";
import {
  Eraser,
  FlipHorizontal2,
  Grid3x3,
  PaintBucket,
  PaintbrushVertical,
  Pencil,
  Pipette,
  Redo2,
  Undo2,
} from "lucide-react";

// Shared pixel-art editor behind the headshot and helmet painters. Render it inside a
// DialogContent; it supplies the title, canvas, tools and Save / Revert buttons.

const CANVAS_PX = 384; // on-screen canvas size
// Checkerboard shown behind transparent pixels.
const CHECK_A = "#e5e5e5";
const CHECK_B = "#bdbdbd";

type Tool = "pencil" | "eraser" | "fill" | "pick";
type Source = () => Promise<Pixels> | Pixels;

export interface Palette {
  label: string;
  colors: { c: string; name: string }[];
  /** Lay the swatches out as a compact grid with this many columns. */
  columns?: number;
}

interface Props {
  title: string;
  description: React.ReactNode;
  width: number;
  height: number;
  /** What the eraser paints: a background colour, or TRANSPARENT. */
  eraseColor: string;
  /** What the canvas opens on; null opens blank. */
  initial: Source | null;
  blank: () => Pixels;
  palettes: Palette[];
  /** Offer a free colour picker (for art that isn't limited to the NES palette). */
  customColor?: boolean;
  defaultColor: string;
  /** Background behind the preview images (shows through transparent pixels). */
  previewBackground?: string;
  /**
   * Colour shown behind transparent pixels on the canvas instead of a checkerboard
   * (display only, never saved). Can be toggled off with a toolbar button.
   */
  canvasBackground?: string;
  previewScales?: number[];
  /** Extra "Start from" buttons; call `load` with the pixels to start from. */
  startOptions: (load: (source: Source) => void) => React.ReactNode;
  loadError: string;
  saveLabel: string;
  downloadName: string;
  /** Shows "Revert to original" when there's a saved custom image. */
  onRevert?: () => void;
  revertTitle?: string;
  onSave: (pixels: Pixels) => void;
  onClose: () => void;
}

export function PixelPainter({
  title,
  description,
  width,
  height,
  eraseColor,
  initial,
  blank,
  palettes,
  customColor,
  defaultColor,
  previewBackground,
  canvasBackground,
  previewScales = [1, 2],
  startOptions,
  loadError,
  saveLabel,
  downloadName,
  onRevert,
  revertTitle,
  onSave,
  onClose,
}: Props) {
  const scale = Math.floor(CANVAS_PX / width);
  const [pixels, setPixelsState] = useState<Pixels>(blank);
  const pxRef = useRef(pixels);
  const [undo, setUndo] = useState<Pixels[]>([]);
  const [redo, setRedo] = useState<Pixels[]>([]);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState(defaultColor);
  const [mirror, setMirror] = useState(false);
  const [grid, setGrid] = useState(true);
  const [showBackdrop, setShowBackdrop] = useState(!!canvasBackground);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastCell = useRef<number | null>(null);

  const setPixels = (p: Pixels) => {
    pxRef.current = p;
    setPixelsState(p);
  };

  /** Replace the whole canvas as one undoable step. */
  const replaceWith = (p: Pixels) => {
    setUndo((u) => [...u, pxRef.current]);
    setRedo([]);
    setPixels(p);
  };

  const startFrom = useCallback(
    async (source: Source, undoable: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const p = await source();
        if (undoable) {
          setUndo((u) => [...u, pxRef.current]);
          setRedo([]);
        }
        pxRef.current = p;
        setPixelsState(p);
      } catch {
        setError(loadError);
      } finally {
        setLoading(false);
      }
    },
    [loadError],
  );

  // Open on the current image.
  useEffect(() => {
    if (initial) startFrom(initial, false);
    else setLoading(false);
    // Only on open — later saves shouldn't reset the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw the canvas.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const half = scale / 2;
    pixels.forEach((c, i) => {
      const x = (i % width) * scale;
      const y = Math.floor(i / width) * scale;
      if (c === TRANSPARENT && showBackdrop && canvasBackground) {
        ctx.fillStyle = canvasBackground;
        ctx.fillRect(x, y, scale, scale);
      } else if (c === TRANSPARENT) {
        ctx.fillStyle = CHECK_A;
        ctx.fillRect(x, y, scale, scale);
        ctx.fillStyle = CHECK_B;
        ctx.fillRect(x, y, half, half);
        ctx.fillRect(x + half, y + half, half, half);
      } else {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, scale, scale);
      }
    });
    if (grid) {
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 1; x < width; x++) {
        ctx.moveTo(x * scale + 0.5, 0);
        ctx.lineTo(x * scale + 0.5, height * scale);
      }
      for (let y = 1; y < height; y++) {
        ctx.moveTo(0, y * scale + 0.5);
        ctx.lineTo(width * scale, y * scale + 0.5);
      }
      ctx.stroke();
      if (mirror) {
        ctx.strokeStyle = "rgba(255,0,128,0.6)";
        ctx.beginPath();
        ctx.moveTo((width / 2) * scale, 0);
        ctx.lineTo((width / 2) * scale, height * scale);
        ctx.stroke();
      }
    }
  }, [pixels, grid, mirror, width, height, scale, showBackdrop, canvasBackground]);

  const doUndo = () => {
    const prev = undo[undo.length - 1];
    if (!prev) return;
    setUndo(undo.slice(0, -1));
    setRedo((r) => [...r, pxRef.current]);
    setPixels(prev);
  };
  const doRedo = () => {
    const next = redo[redo.length - 1];
    if (!next) return;
    setRedo(redo.slice(0, -1));
    setUndo((u) => [...u, pxRef.current]);
    setPixels(next);
  };

  // Ctrl/Cmd+Z to undo, with Shift to redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      e.preventDefault();
      if (e.shiftKey) doRedo();
      else doUndo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Painting ──────────────────────────────────────────────────────────────

  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * width);
    const y = Math.floor(((e.clientY - r.top) / r.height) * height);
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    return y * width + x;
  };

  const withMirror = (i: number) => {
    const x = i % width;
    const mi = i - x + (width - 1 - x);
    return mirror && mi !== i ? [i, mi] : [i];
  };

  /** Paints a straight line of cells so fast strokes don't leave gaps. */
  const paintLine = (next: Pixels, from: number, to: number, c: string) => {
    let x0 = from % width,
      y0 = Math.floor(from / width);
    const x1 = to % width,
      y1 = Math.floor(to / width);
    const dx = Math.abs(x1 - x0),
      dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      for (const j of withMirror(y0 * width + x0)) next[j] = c;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  const floodFill = (next: Pixels, start: number, c: string) => {
    const target = next[start];
    if (target === c) return;
    const stack = [start];
    while (stack.length) {
      const i = stack.pop()!;
      if (next[i] !== target) continue;
      next[i] = c;
      const x = i % width;
      if (x > 0) stack.push(i - 1);
      if (x < width - 1) stack.push(i + 1);
      if (i >= width) stack.push(i - width);
      if (i < width * (height - 1)) stack.push(i + width);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const i = cellAt(e);
    if (i === null || loading) return;
    if (tool === "pick") {
      const c = pxRef.current[i]!;
      if (c === TRANSPARENT) setTool("eraser");
      else {
        setColor(c);
        setTool("pencil");
      }
      return;
    }
    const next = [...pxRef.current];
    if (tool === "fill") {
      for (const j of withMirror(i)) floodFill(next, j, color);
    } else {
      e.currentTarget.setPointerCapture(e.pointerId);
      paintLine(next, i, i, tool === "eraser" ? eraseColor : color);
      lastCell.current = i;
    }
    replaceWith(next);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || lastCell.current === null) return;
    const i = cellAt(e);
    if (i === null || i === lastCell.current) return;
    const next = [...pxRef.current];
    paintLine(next, lastCell.current, i, tool === "eraser" ? eraseColor : color);
    lastCell.current = i;
    setPixels(next);
  };

  const endStroke = () => {
    lastCell.current = null;
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const download = () => {
    const a = document.createElement("a");
    a.href = pixelsToDataUrl(pxRef.current, width, height);
    a.download = `${downloadName.replace(/[^\w-]+/g, "_")}.png`;
    a.click();
  };

  const pickColor = (c: string) => {
    setColor(c);
    if (tool !== "fill") setTool("pencil");
  };

  const preview = pixelsToDataUrl(pixels, width, height);
  const eraserLabel =
    eraseColor === TRANSPARENT ? "Eraser (makes pixels see-through)" : "Eraser (paints background)";

  return (
    <div className="space-y-3">
      <div className="pr-6">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="mt-1 text-xs">{description}</DialogDescription>
      </div>

      {/* Starting point */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Start from:</span>
        {startOptions((source) => startFrom(source, true))}
        <Button size="sm" variant="secondary" onClick={() => replaceWith(blank())}>
          Blank
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Canvas */}
        <div className="relative w-full max-w-[384px] shrink-0 self-center sm:self-start">
          <canvas
            ref={canvasRef}
            width={width * scale}
            height={height * scale}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            className="block w-full touch-none border-2 border-foreground"
            style={{
              aspectRatio: `${width} / ${height}`,
              imageRendering: "pixelated",
              cursor: tool === "pick" ? "copy" : "crosshair",
            }}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs">
              Loading…
            </div>
          )}
        </div>

        {/* Tools, colours, preview */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-1">
            <ToolBtn label="Pencil" active={tool === "pencil"} onClick={() => setTool("pencil")}>
              <Pencil />
            </ToolBtn>
            <ToolBtn
              label={eraserLabel}
              active={tool === "eraser"}
              onClick={() => setTool("eraser")}
            >
              <Eraser />
            </ToolBtn>
            <ToolBtn label="Fill" active={tool === "fill"} onClick={() => setTool("fill")}>
              <PaintBucket />
            </ToolBtn>
            <ToolBtn
              label="Pick colour from canvas"
              active={tool === "pick"}
              onClick={() => setTool("pick")}
            >
              <Pipette />
            </ToolBtn>
            <span className="mx-1 w-px bg-border" />
            <ToolBtn label="Mirror left/right" active={mirror} onClick={() => setMirror(!mirror)}>
              <FlipHorizontal2 />
            </ToolBtn>
            <ToolBtn label="Show grid" active={grid} onClick={() => setGrid(!grid)}>
              <Grid3x3 />
            </ToolBtn>
            {canvasBackground && (
              <ToolBtn
                label="Show background colour behind see-through pixels (not saved)"
                active={showBackdrop}
                onClick={() => setShowBackdrop(!showBackdrop)}
              >
                <PaintbrushVertical />
              </ToolBtn>
            )}
            <span className="mx-1 w-px bg-border" />
            <ToolBtn label="Undo (Ctrl+Z)" disabled={!undo.length} onClick={doUndo}>
              <Undo2 />
            </ToolBtn>
            <ToolBtn label="Redo (Ctrl+Shift+Z)" disabled={!redo.length} onClick={doRedo}>
              <Redo2 />
            </ToolBtn>
          </div>

          {palettes.map((p) => (
            <div key={p.label} className="space-y-1">
              <p className="text-[10px] text-muted-foreground">{p.label}</p>
              <div
                className={p.columns ? "grid gap-0.5" : "flex flex-wrap gap-1"}
                style={
                  p.columns
                    ? { gridTemplateColumns: `repeat(${p.columns}, minmax(0, 1fr))` }
                    : undefined
                }
              >
                {p.colors.map(({ c, name }) => (
                  <Swatch
                    key={c}
                    color={c}
                    name={name}
                    small={!!p.columns}
                    selected={color === c}
                    onClick={() => pickColor(c)}
                  />
                ))}
              </div>
            </div>
          ))}
          {customColor && (
            <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
              Custom
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-6 w-10 cursor-pointer bg-transparent"
              />
              <span className="font-mono">{color}</span>
            </label>
          )}

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">Preview</p>
            <div className="flex items-end gap-2">
              {previewScales.map((s) => (
                <img
                  key={s}
                  src={preview}
                  alt={`Preview at ${s}×`}
                  width={width * s}
                  height={height * s}
                  style={{ imageRendering: "pixelated", background: previewBackground }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex gap-2">
          {onRevert && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onRevert();
                onClose();
              }}
              title={revertTitle}
            >
              Revert to original
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={download}>
            Download PNG
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(pxRef.current);
              onClose();
            }}
            disabled={loading}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded border-2 p-1.5 transition [&_svg]:size-4 disabled:opacity-40 ${
        active
          ? "border-foreground bg-primary text-primary-foreground"
          : "border-transparent hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function Swatch({
  color,
  name,
  selected,
  small,
  onClick,
}: {
  color: string;
  name: string;
  selected: boolean;
  small?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={name}
      aria-label={name}
      aria-pressed={selected}
      onClick={onClick}
      className={`${small ? "aspect-square w-full" : "size-7"} rounded-sm border ${
        selected
          ? "ring-2 ring-highlight ring-offset-1 ring-offset-background"
          : "border-foreground/30"
      }`}
      style={{ background: color }}
    />
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FacePickerGrid } from "@/components/FacePicker";
import { hexId, isValidFaceId } from "@/lib/abilities";
import { NES_RGB } from "@/lib/helmets";
import {
  FACE_H,
  FACE_W,
  clearCustomFace,
  loadCustomFace,
  loadOriginalFace,
  pixelsToDataUrl,
  setCustomFace,
  useCustomFace,
  type Pixels,
} from "@/lib/customFaces";
import { Eraser, FlipHorizontal2, Grid3x3, PaintBucket, Pencil, Pipette, Redo2, Undo2 } from "lucide-react";

// Colours used by the original portraits.
const SKY = "#39bdff";
const FACE_COLORS = [
  { c: SKY, name: "Background" },
  { c: "#000000", name: "Black" },
  { c: "#ffffff", name: "White" },
  { c: "#ffe7ad", name: "Light skin" },
  { c: "#e75a10", name: "Dark skin" },
];
const NES_COLORS = [...new Set(NES_RGB)];

const SCALE = 12; // on-screen pixels per headshot pixel
const blank = (): Pixels => Array(FACE_W * FACE_H).fill(SKY);

type Tool = "pencil" | "eraser" | "fill" | "pick";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The real player (for an All-Star slot, the player it points to). */
  team: number;
  slot: number;
  /** The face ID currently set in the ROM — the "original" headshot. */
  faceId: number;
  playerLabel: string;
}

export function FacePainter({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),720px)] max-w-none gap-3 overflow-y-auto sm:max-w-none">
        {open && <PainterBody {...rest} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function PainterBody({ team, slot, faceId, playerLabel, onClose }: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }) {
  const custom = useCustomFace(team, slot);
  const [pixels, setPixelsState] = useState<Pixels>(blank);
  const pxRef = useRef(pixels);
  const [undo, setUndo] = useState<Pixels[]>([]);
  const [redo, setRedo] = useState<Pixels[]>([]);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#000000");
  const [mirror, setMirror] = useState(false);
  const [grid, setGrid] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const startFrom = useCallback(async (source: () => Promise<Pixels>, undoable: boolean) => {
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
      setError("Couldn't load that face image. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Open on the player's current headshot: their custom one, else the original.
  useEffect(() => {
    if (custom) startFrom(() => loadCustomFace(custom), false);
    else if (isValidFaceId(faceId)) startFrom(() => loadOriginalFace(faceId), false);
    else setLoading(false);
    // Only on open — later saves shouldn't reset the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw the canvas.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    pixels.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect((i % FACE_W) * SCALE, Math.floor(i / FACE_W) * SCALE, SCALE, SCALE);
    });
    if (grid) {
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 1; x < FACE_W; x++) {
        ctx.moveTo(x * SCALE + 0.5, 0);
        ctx.lineTo(x * SCALE + 0.5, FACE_H * SCALE);
      }
      for (let y = 1; y < FACE_H; y++) {
        ctx.moveTo(0, y * SCALE + 0.5);
        ctx.lineTo(FACE_W * SCALE, y * SCALE + 0.5);
      }
      ctx.stroke();
      if (mirror) {
        ctx.strokeStyle = "rgba(255,0,128,0.6)";
        ctx.beginPath();
        ctx.moveTo((FACE_W / 2) * SCALE, 0);
        ctx.lineTo((FACE_W / 2) * SCALE, FACE_H * SCALE);
        ctx.stroke();
      }
    }
  }, [pixels, grid, mirror]);

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
    const x = Math.floor(((e.clientX - r.left) / r.width) * FACE_W);
    const y = Math.floor(((e.clientY - r.top) / r.height) * FACE_H);
    if (x < 0 || y < 0 || x >= FACE_W || y >= FACE_H) return null;
    return y * FACE_W + x;
  };

  const withMirror = (i: number) => {
    const x = i % FACE_W;
    const mi = i - x + (FACE_W - 1 - x);
    return mirror && mi !== i ? [i, mi] : [i];
  };

  /** Paints a straight line of cells so fast strokes don't leave gaps. */
  const paintLine = (next: Pixels, from: number, to: number, c: string) => {
    let x0 = from % FACE_W, y0 = Math.floor(from / FACE_W);
    const x1 = to % FACE_W, y1 = Math.floor(to / FACE_W);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      for (const j of withMirror(y0 * FACE_W + x0)) next[j] = c;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
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
      const x = i % FACE_W;
      if (x > 0) stack.push(i - 1);
      if (x < FACE_W - 1) stack.push(i + 1);
      if (i >= FACE_W) stack.push(i - FACE_W);
      if (i < FACE_W * (FACE_H - 1)) stack.push(i + FACE_W);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const i = cellAt(e);
    if (i === null || loading) return;
    if (tool === "pick") {
      setColor(pxRef.current[i]!);
      setTool("pencil");
      return;
    }
    const next = [...pxRef.current];
    if (tool === "fill") {
      for (const j of withMirror(i)) floodFill(next, j, color);
    } else {
      e.currentTarget.setPointerCapture(e.pointerId);
      paintLine(next, i, i, tool === "eraser" ? SKY : color);
      lastCell.current = i;
    }
    replaceWith(next);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || lastCell.current === null) return;
    const i = cellAt(e);
    if (i === null || i === lastCell.current) return;
    const next = [...pxRef.current];
    paintLine(next, lastCell.current, i, tool === "eraser" ? SKY : color);
    lastCell.current = i;
    setPixels(next);
  };

  const endStroke = () => { lastCell.current = null; };

  // ── Actions ───────────────────────────────────────────────────────────────

  const save = () => {
    setCustomFace(team, slot, pixelsToDataUrl(pxRef.current));
    onClose();
  };

  const revert = () => {
    clearCustomFace(team, slot);
    onClose();
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = pixelsToDataUrl(pxRef.current);
    a.download = `${playerLabel.replace(/[^\w-]+/g, "_")}_headshot.png`;
    a.click();
  };

  const preview = pixelsToDataUrl(pixels);

  return (
    <div className="space-y-3">
      <div className="pr-6">
        <DialogTitle>Paint headshot</DialogTitle>
        <DialogDescription className="mt-1 text-xs">
          {playerLabel} · Your headshot is saved in this browser and shown in the editor. The
          original face is never changed, and the game itself still uses the face ID set in the ROM.
        </DialogDescription>
      </div>

      {/* Starting point */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Start from:</span>
        <Button
          size="sm" variant="secondary"
          disabled={!isValidFaceId(faceId)}
          onClick={() => startFrom(() => loadOriginalFace(faceId), true)}
        >
          Original{isValidFaceId(faceId) ? ` (${hexId(faceId)})` : ""}
        </Button>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary">Another face…</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            <FacePickerGrid
              value={faceId}
              onPick={(id) => { setPickerOpen(false); startFrom(() => loadOriginalFace(id), true); }}
              onChange={() => {}}
              hideDirect
            />
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="secondary" onClick={() => replaceWith(blank())}>Blank</Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Canvas */}
        <div className="relative w-full max-w-[384px] shrink-0 self-center sm:self-start">
          <canvas
            ref={canvasRef}
            width={FACE_W * SCALE}
            height={FACE_H * SCALE}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            className="block aspect-square w-full touch-none border-2 border-foreground"
            style={{ imageRendering: "pixelated", cursor: tool === "pick" ? "copy" : "crosshair" }}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs">Loading…</div>
          )}
        </div>

        {/* Tools, colours, preview */}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-1">
            <ToolBtn label="Pencil" active={tool === "pencil"} onClick={() => setTool("pencil")}><Pencil /></ToolBtn>
            <ToolBtn label="Eraser (paints background)" active={tool === "eraser"} onClick={() => setTool("eraser")}><Eraser /></ToolBtn>
            <ToolBtn label="Fill" active={tool === "fill"} onClick={() => setTool("fill")}><PaintBucket /></ToolBtn>
            <ToolBtn label="Pick colour from canvas" active={tool === "pick"} onClick={() => setTool("pick")}><Pipette /></ToolBtn>
            <span className="mx-1 w-px bg-border" />
            <ToolBtn label="Mirror left/right" active={mirror} onClick={() => setMirror(!mirror)}><FlipHorizontal2 /></ToolBtn>
            <ToolBtn label="Show grid" active={grid} onClick={() => setGrid(!grid)}><Grid3x3 /></ToolBtn>
            <span className="mx-1 w-px bg-border" />
            <ToolBtn label="Undo (Ctrl+Z)" disabled={!undo.length} onClick={doUndo}><Undo2 /></ToolBtn>
            <ToolBtn label="Redo (Ctrl+Shift+Z)" disabled={!redo.length} onClick={doRedo}><Redo2 /></ToolBtn>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">Face colours</p>
            <div className="flex flex-wrap gap-1">
              {FACE_COLORS.map(({ c, name }) => (
                <Swatch key={c} color={c} name={name} selected={color === c} onClick={() => { setColor(c); if (tool !== "fill") setTool("pencil"); }} />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">NES palette</p>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
              {NES_COLORS.map((c) => (
                <Swatch key={c} color={c} name={c} small selected={color === c} onClick={() => { setColor(c); if (tool !== "fill") setTool("pencil"); }} />
              ))}
            </div>
            <label className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground">
              Custom
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-6 w-10 cursor-pointer bg-transparent" />
              <span className="font-mono">{color}</span>
            </label>
          </div>

          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Preview</p>
              <div className="flex items-end gap-2">
                <img src={preview} alt="Headshot at actual size" width={FACE_W} height={FACE_H} style={{ imageRendering: "pixelated" }} />
                <img src={preview} alt="Headshot at 2×" width={FACE_W * 2} height={FACE_H * 2} style={{ imageRendering: "pixelated" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex gap-2">
          {custom && (
            <Button size="sm" variant="outline" onClick={revert} title="Delete this custom headshot and go back to the original face">
              Revert to original
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={download}>Download PNG</Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={loading}>Save headshot</Button>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ label, active, disabled, onClick, children }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode;
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
        active ? "border-foreground bg-primary text-primary-foreground" : "border-transparent hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function Swatch({ color, name, selected, small, onClick }: {
  color: string; name: string; selected: boolean; small?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={name}
      aria-label={name}
      aria-pressed={selected}
      onClick={onClick}
      className={`${small ? "aspect-square w-full" : "size-7"} rounded-sm border ${
        selected ? "ring-2 ring-highlight ring-offset-1 ring-offset-background" : "border-foreground/30"
      }`}
      style={{ background: color }}
    />
  );
}

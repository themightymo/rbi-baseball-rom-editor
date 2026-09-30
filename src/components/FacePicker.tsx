import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Paintbrush } from "lucide-react";
import { VALID_FACE_RANGE1, VALID_FACE_RANGE2, faceImgUrl, hexId, isValidFaceId } from "@/lib/abilities";

export function FaceThumb({ id, selected, onClick }: { id: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      title={`0x${hexId(id)} (${id})`}
      onClick={onClick}
      className={`flex flex-col items-center gap-px rounded border p-0.5 transition hover:scale-105 hover:bg-accent ${
        selected
          ? "border-warning ring-2 ring-warning bg-warning/20"
          : "border-transparent hover:border-foreground/20"
      }`}
    >
      <img
        src={faceImgUrl(id)}
        alt={hexId(id)}
        width={32} height={36}
        className="object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
          (e.currentTarget.nextSibling as HTMLElement | null)?.classList.remove("hidden");
        }}
      />
      <span className="hidden text-[8px] font-mono text-muted-foreground leading-4 w-8 text-center bg-muted rounded-sm">
        ?
      </span>
      <span className="text-[7px] font-mono text-muted-foreground leading-none">{hexId(id)}</span>
    </button>
  );
}


/** Grid of every valid face portrait, plus a direct-entry box. */
export function FacePickerGrid({ value, onPick, onChange, hideDirect, onPaint }: {
  value: number;
  onPick: (id: number) => void;
  onChange: (id: number) => void;
  /** Hide the direct face-ID entry box. */
  hideDirect?: boolean;
  /** When set, shows a button to paint a custom headshot. */
  onPaint?: () => void;
}) {
  const valid = isValidFaceId(value);
  const pick = onPick;
  return (
    <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-semibold text-muted-foreground">Select face (0x00–0x52 · 0x81–0xD4)</p>
      {onPaint && (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onPaint}>
          <Paintbrush /> Paint custom headshot
        </Button>
      )}
    </div>

    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground font-mono">0x00–0x52</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
        {VALID_FACE_RANGE1.map((id) => (
          <FaceThumb key={id} id={id} selected={id === value} onClick={() => pick(id)} />
        ))}
      </div>
    </div>

    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground font-mono">0x81–0xD4</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
        {VALID_FACE_RANGE2.map((id) => (
          <FaceThumb key={id} id={id} selected={id === value} onClick={() => pick(id)} />
        ))}
      </div>
    </div>

    {!hideDirect && (
    <div className="flex items-center gap-2 border-t pt-2">
      <span className="text-xs text-muted-foreground">Direct:</span>
      <Input
        type="number" min={0} max={255}
        value={value}
        className={`h-7 w-20 font-mono text-xs ${!valid ? "border-destructive" : ""}`}
        onChange={(e) => onChange(Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))}
      />
      {!valid && <span className="text-xs text-destructive">invalid — no face drawn</span>}
    </div>
    )}
    </div>
  );
}

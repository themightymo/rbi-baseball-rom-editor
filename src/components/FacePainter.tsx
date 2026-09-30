import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FacePickerGrid } from "@/components/FacePicker";
import { PixelPainter, type Palette } from "@/components/PixelPainter";
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

// Colours used by the original portraits.
const SKY = "#39bdff";
const PALETTES: Palette[] = [
  {
    label: "Face colours",
    colors: [
      { c: SKY, name: "Background" },
      { c: "#000000", name: "Black" },
      { c: "#ffffff", name: "White" },
      { c: "#ffe7ad", name: "Light skin" },
      { c: "#e75a10", name: "Dark skin" },
    ],
  },
  { label: "NES palette", colors: [...new Set(NES_RGB)].map((c) => ({ c, name: c })), columns: 14 },
];

const blank = (): Pixels => Array(FACE_W * FACE_H).fill(SKY);

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasOriginal = isValidFaceId(faceId);

  return (
    <PixelPainter
      title="Paint headshot"
      description={
        <>
          {playerLabel} · Your headshot is saved in this browser and shown in the editor. The
          original face is never changed, and the game itself still uses the face ID set in the ROM.
        </>
      }
      width={FACE_W}
      height={FACE_H}
      eraseColor={SKY}
      // Open on the player's current headshot: their custom one, else the original.
      initial={custom ? () => loadCustomFace(custom) : hasOriginal ? () => loadOriginalFace(faceId) : null}
      blank={blank}
      palettes={PALETTES}
      customColor
      defaultColor="#000000"
      startOptions={(load) => (
        <>
          <Button size="sm" variant="secondary" disabled={!hasOriginal} onClick={() => load(() => loadOriginalFace(faceId))}>
            Original{hasOriginal ? ` (${hexId(faceId)})` : ""}
          </Button>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="secondary">Another face…</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <FacePickerGrid
                value={faceId}
                onPick={(id) => { setPickerOpen(false); load(() => loadOriginalFace(id)); }}
                onChange={() => {}}
                hideDirect
              />
            </PopoverContent>
          </Popover>
        </>
      )}
      loadError="Couldn't load that face image. Check your internet connection and try again."
      saveLabel="Save headshot"
      downloadName={`${playerLabel}_headshot`}
      onRevert={custom ? () => clearCustomFace(team, slot) : undefined}
      revertTitle="Delete this custom headshot and go back to the original face"
      onSave={(px) => setCustomFace(team, slot, pixelsToDataUrl(px))}
      onClose={onClose}
    />
  );
}

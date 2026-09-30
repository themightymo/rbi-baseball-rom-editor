import { useState } from "react";
import { Paintbrush } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { PixelPainter, type Palette } from "@/components/PixelPainter";
import { Helmet } from "@/components/TeamSelect";
import { NES_RGB } from "@/lib/helmets";
import {
  HELMET_H,
  HELMET_W,
  clearCustomHelmet,
  helmetToPixels,
  pixelsToHelmet,
  setCustomHelmet,
  useHelmets,
} from "@/lib/customHelmets";
import { TRANSPARENT, type Pixels } from "@/lib/pixels";
import { CONFERENCES } from "@/lib/tsbRoster";
import { useTeamNames } from "@/lib/useTeamNames";

// Background of the game's TEAM DATA screen, where the helmets appear.
const SCREEN_BG = NES_RGB[0x11];

const NES_PALETTE: Palette = {
  label: "NES palette",
  colors: [...new Set(NES_RGB)].map((c) => ({ c, name: c })),
  columns: 14,
};

const blank = (): Pixels => Array(HELMET_W * HELMET_H).fill(TRANSPARENT);

/** Button + popup for painting a regular team's helmet. */
export function HelmetPainter({ teamIdx }: { teamIdx: number }) {
  const [open, setOpen] = useState(false);
  const { helmets, custom } = useHelmets();
  if (!helmets.length) return null;
  const isCustom = !!custom[teamIdx];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={isCustom ? "border-warning bg-warning/10" : undefined}>
          <Paintbrush /> {isCustom ? "Edit custom helmet" : "Paint helmet"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(calc(100vw-2rem),720px)] max-w-none gap-3 overflow-y-auto sm:max-w-none">
        {open && <PainterBody teamIdx={teamIdx} onClose={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function PainterBody({ teamIdx, onClose }: { teamIdx: number; onClose: () => void }) {
  const { helmets, originals, custom } = useHelmets();
  const { name: teamName, abbr: teamAbbr } = useTeamNames();
  const [pickerOpen, setPickerOpen] = useState(false);
  const original = originals[teamIdx]!;
  const current = helmets[teamIdx]!;

  // The team's own colours first, so they're easy to reach.
  const teamColors = [...new Set(helmetToPixels(original).filter((c) => c !== TRANSPARENT))];
  const palettes: Palette[] = [
    { label: "Original helmet colours", colors: teamColors.map((c) => ({ c, name: c })) },
    NES_PALETTE,
  ];

  return (
    <PixelPainter
      title="Paint helmet"
      description={
        <>
          {teamName(teamIdx)} · Your helmet is saved in this browser and shown in the editor. The
          original helmet in the ROM is never changed, so you can always revert to it.
        </>
      }
      width={HELMET_W}
      height={HELMET_H}
      eraseColor={TRANSPARENT}
      initial={() => helmetToPixels(current)}
      blank={blank}
      palettes={palettes}
      defaultColor={teamColors[0] ?? NES_RGB[0x30]!}
      previewBackground={SCREEN_BG}
      canvasBackground={SCREEN_BG}
      previewScales={[1, 2, 4]}
      startOptions={(load) => (
        <>
          <Button size="sm" variant="secondary" onClick={() => load(() => helmetToPixels(original))}>
            Original
          </Button>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="secondary">Another team…</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div
                className="grid grid-cols-7 gap-1 rounded p-1 text-[16px]"
                style={{ background: SCREEN_BG }}
              >
                {CONFERENCES.flatMap((c) => c.divisions.flat()).map((t) => (
                  <button
                    key={t}
                    type="button"
                    title={teamName(t)}
                    aria-label={teamName(t)}
                    onClick={() => { setPickerOpen(false); load(() => helmetToPixels(helmets[t]!)); }}
                    className="flex flex-col items-center rounded p-1 font-mono text-[9px] text-white hover:bg-white/20"
                  >
                    <Helmet pixels={helmets[t]} />
                    {teamAbbr(t)}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
      loadError="Couldn't load that helmet."
      saveLabel="Save helmet"
      downloadName={`${teamName(teamIdx)}_helmet`}
      onRevert={custom[teamIdx] ? () => clearCustomHelmet(teamIdx) : undefined}
      revertTitle="Delete this custom helmet and go back to the original from the ROM"
      onSave={(px) => setCustomHelmet(teamIdx, pixelsToHelmet(px))}
      onClose={onClose}
    />
  );
}

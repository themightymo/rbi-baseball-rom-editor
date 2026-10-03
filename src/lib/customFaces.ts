// Custom player headshots painted in the editor. They're stored in this browser only,
// keyed by the real player (team + roster slot), as 32×32 PNG data URLs. The original
// face portraits and the ROM's face ID byte are never touched, so deleting a custom
// headshot always reverts to the original.

import { faceImgUrl } from "@/lib/abilities";
import { createBrowserStore } from "@/lib/browserStore";
import { pixelsToDataUrl as toDataUrl, type Pixels } from "@/lib/pixels";

export type { Pixels } from "@/lib/pixels";

export const FACE_W = 32;
export const FACE_H = 32;

const store = createBrowserStore<string>("tecmo.customfaces.v1");

const key = (team: number, slot: number) => `${team}-${slot}`;

export function setCustomFace(team: number, slot: number, dataUrl: string) {
  store.set(key(team, slot), dataUrl);
}

export function clearCustomFace(team: number, slot: number) {
  store.clear(key(team, slot));
}

/** The player's custom headshot (a data URL), or null to use the original face. */
export function useCustomFace(team: number, slot: number): string | null {
  return store.use(key(team, slot));
}

// ─── Pixel helpers ────────────────────────────────────────────────────────────

const hex = (n: number) => n.toString(16).padStart(2, "0");

async function imageToPixels(src: Blob | string): Promise<Pixels> {
  const blob = typeof src === "string" ? await (await fetch(src)).blob() : src;
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = FACE_W;
  canvas.height = FACE_H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  // Portraits are 32×32 or 32×33; anchor at the top so the face lines up.
  ctx.drawImage(bmp, 0, 0);
  const d = ctx.getImageData(0, 0, FACE_W, FACE_H).data;
  const out: Pixels = [];
  for (let i = 0; i < d.length; i += 4)
    out.push(`#${hex(d[i]!)}${hex(d[i + 1]!)}${hex(d[i + 2]!)}`);
  return out;
}

/** Pixels of one of the game's original face portraits. */
export const loadOriginalFace = (faceId: number) => imageToPixels(faceImgUrl(faceId));

/** Pixels of a saved custom headshot. */
export const loadCustomFace = (dataUrl: string) => imageToPixels(dataUrl);

export const pixelsToDataUrl = (px: Pixels) => toDataUrl(px, FACE_W, FACE_H);

// Custom player headshots painted in the editor. They're stored in this browser only,
// keyed by the real player (team + roster slot), as 32×32 PNG data URLs. The original
// face portraits and the ROM's face ID byte are never touched, so deleting a custom
// headshot always reverts to the original.

import { useSyncExternalStore } from "react";
import { faceImgUrl } from "@/lib/abilities";

export const FACE_W = 32;
export const FACE_H = 32;

const LS_KEY = "tecmo.customfaces.v1";

type Store = Record<string, string>;

const key = (team: number, slot: number) => `${team}-${slot}`;

let cache: Store | null = null;
const listeners = new Set<() => void>();

function load(): Store {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(LS_KEY);
    cache = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function save(next: Store) {
  cache = next;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable or full — keep it in memory for this session */
  }
  listeners.forEach((l) => l());
}

export function setCustomFace(team: number, slot: number, dataUrl: string) {
  save({ ...load(), [key(team, slot)]: dataUrl });
}

export function clearCustomFace(team: number, slot: number) {
  const { [key(team, slot)]: _, ...rest } = load();
  save(rest);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The player's custom headshot (a data URL), or null to use the original face. */
export function useCustomFace(team: number, slot: number): string | null {
  return useSyncExternalStore(
    subscribe,
    () => load()[key(team, slot)] ?? null,
    () => null,
  );
}

// ─── Pixel helpers ────────────────────────────────────────────────────────────

/** A headshot as FACE_W × FACE_H CSS colours (row-major). */
export type Pixels = string[];

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
  for (let i = 0; i < d.length; i += 4) out.push(`#${hex(d[i]!)}${hex(d[i + 1]!)}${hex(d[i + 2]!)}`);
  return out;
}

/** Pixels of one of the game's original face portraits. */
export const loadOriginalFace = (faceId: number) => imageToPixels(faceImgUrl(faceId));

/** Pixels of a saved custom headshot. */
export const loadCustomFace = (dataUrl: string) => imageToPixels(dataUrl);

export function pixelsToDataUrl(px: Pixels): string {
  const canvas = document.createElement("canvas");
  canvas.width = FACE_W;
  canvas.height = FACE_H;
  const ctx = canvas.getContext("2d")!;
  px.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i % FACE_W, Math.floor(i / FACE_W), 1, 1);
  });
  return canvas.toDataURL("image/png");
}

// Custom team helmets painted in the editor. Like custom headshots, they're stored in
// this browser only, keyed by team, as 256 NES colour indices (-1 = transparent) — the
// same format decodeHelmet() returns. The helmet tiles, sprites and palettes in the ROM
// are never touched, so deleting a custom helmet always reverts to the original.

import { useMemo } from "react";
import { createBrowserStore } from "@/lib/browserStore";
import { NES_RGB, decodeHelmet } from "@/lib/helmets";
import { useRom } from "@/lib/romStore";
import { TEAM_NAMES } from "@/lib/tsbRoster";
import { TRANSPARENT, type Pixels } from "@/lib/pixels";

export const HELMET_W = 16;
export const HELMET_H = 16;

const store = createBrowserStore<number[]>("tecmo.customhelmets.v1");

const valid = (v: number[] | null | undefined): v is number[] =>
  Array.isArray(v) && v.length === HELMET_W * HELMET_H;

export function setCustomHelmet(team: number, helmet: ArrayLike<number>) {
  store.set(String(team), Array.from(helmet));
}

export function clearCustomHelmet(team: number) {
  store.clear(String(team));
}

/** Every team's custom helmet, indexed by team; missing entries use the original. */
export function useCustomHelmets(): Record<number, Int8Array> {
  const all = store.useAll();
  const out: Record<number, Int8Array> = {};
  for (const [t, v] of Object.entries(all)) if (valid(v)) out[Number(t)] = Int8Array.from(v);
  return out;
}

// ─── Pixel helpers ────────────────────────────────────────────────────────────

export function helmetToPixels(helmet: ArrayLike<number>): Pixels {
  return Array.from(helmet, (c) => (c >= 0 ? NES_RGB[c]! : TRANSPARENT));
}

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** NES colour index for a CSS hex colour (the closest one if it isn't exact). */
function nesIndex(c: string): number {
  const exact = NES_RGB.indexOf(c.toLowerCase());
  if (exact >= 0) return exact;
  const [r, g, b] = rgb(c);
  let best = 0x0f;
  let bestD = Infinity;
  NES_RGB.forEach((n, i) => {
    const [nr, ng, nb] = rgb(n);
    const d = (nr! - r!) ** 2 + (ng! - g!) ** 2 + (nb! - b!) ** 2;
    if (d < bestD) [best, bestD] = [i, d];
  });
  return best;
}

export function pixelsToHelmet(px: Pixels): Int8Array {
  return Int8Array.from(px, (c) => (c === TRANSPARENT ? -1 : nesIndex(c)));
}

// ─── ROM + custom ─────────────────────────────────────────────────────────────

/**
 * Every team's helmet as shown in the editor (the custom one if saved), plus the
 * originals decoded from the unmodified ROM. Empty until a ROM is loaded.
 */
export function useHelmets(): { helmets: Int8Array[]; originals: Int8Array[]; custom: Record<number, Int8Array> } {
  const { originalRom, hasINES } = useRom();
  const originals = useMemo(
    () => (originalRom ? TEAM_NAMES.map((_, t) => decodeHelmet(originalRom, hasINES, t)) : []),
    [originalRom, hasINES],
  );
  const custom = useCustomHelmets();
  return { helmets: originals.map((h, t) => custom[t] ?? h), originals, custom };
}

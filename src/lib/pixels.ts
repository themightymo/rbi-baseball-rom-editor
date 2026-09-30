// Pixel images used by the painters: a row-major array of CSS colours, with
// TRANSPARENT for see-through pixels.

export type Pixels = string[];

export const TRANSPARENT = "transparent";

export function pixelsToDataUrl(px: Pixels, width: number, height: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  px.forEach((c, i) => {
    if (c === TRANSPARENT) return;
    ctx.fillStyle = c;
    ctx.fillRect(i % width, Math.floor(i / width), 1, 1);
  });
  return canvas.toDataURL("image/png");
}

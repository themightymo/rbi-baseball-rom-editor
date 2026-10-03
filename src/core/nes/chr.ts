export const NES_TILE_WIDTH = 8;
export const NES_TILE_HEIGHT = 8;
export const NES_TILE_BYTES = 16;
export const NES_TILE_PIXELS = NES_TILE_WIDTH * NES_TILE_HEIGHT;

function requireInteger(value: number, label: string, minimum: number): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${label} must be an integer of at least ${minimum}.`);
  }
}

function requireTileRange(bytes: Uint8Array, offset: number): void {
  requireInteger(offset, "Tile offset", 0);
  if (offset + NES_TILE_BYTES > bytes.length) {
    throw new RangeError("Tile extends beyond the supplied CHR bytes.");
  }
}

function requirePixel(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 3) {
    throw new RangeError("CHR pixels must be integers from 0 to 3.");
  }
}

/** Decode one NES 2-bit planar 8x8 tile to row-major color indices. */
export function decodeTile(bytes: Uint8Array, offset = 0): Uint8Array {
  requireTileRange(bytes, offset);
  const pixels = new Uint8Array(NES_TILE_PIXELS);

  for (let y = 0; y < NES_TILE_HEIGHT; y++) {
    const lowPlane = bytes[offset + y];
    const highPlane = bytes[offset + 8 + y];
    for (let x = 0; x < NES_TILE_WIDTH; x++) {
      const bit = 7 - x;
      pixels[y * NES_TILE_WIDTH + x] = ((lowPlane >> bit) & 1) | (((highPlane >> bit) & 1) << 1);
    }
  }

  return pixels;
}

/** Encode 64 row-major color indices as one NES 2-bit planar tile. */
export function encodeTile(pixels: ArrayLike<number>): Uint8Array {
  if (pixels.length !== NES_TILE_PIXELS) {
    throw new RangeError(`A CHR tile must contain exactly ${NES_TILE_PIXELS} pixels.`);
  }

  const bytes = new Uint8Array(NES_TILE_BYTES);
  for (let y = 0; y < NES_TILE_HEIGHT; y++) {
    for (let x = 0; x < NES_TILE_WIDTH; x++) {
      const pixel = pixels[y * NES_TILE_WIDTH + x];
      requirePixel(pixel);
      const bit = 7 - x;
      bytes[y] |= (pixel & 1) << bit;
      bytes[8 + y] |= ((pixel >> 1) & 1) << bit;
    }
  }
  return bytes;
}

/** Decode a row-major rectangle of adjacent tiles to row-major pixels. */
export function decodeTileGrid(
  bytes: Uint8Array,
  columns: number,
  rows: number,
  offset = 0,
): Uint8Array {
  requireInteger(columns, "Grid columns", 1);
  requireInteger(rows, "Grid rows", 1);
  requireInteger(offset, "Grid offset", 0);
  const byteLength = columns * rows * NES_TILE_BYTES;
  if (!Number.isSafeInteger(byteLength) || offset + byteLength > bytes.length) {
    throw new RangeError("Tile grid extends beyond the supplied CHR bytes.");
  }

  const width = columns * NES_TILE_WIDTH;
  const pixels = new Uint8Array(width * rows * NES_TILE_HEIGHT);
  for (let tileY = 0; tileY < rows; tileY++) {
    for (let tileX = 0; tileX < columns; tileX++) {
      const tile = decodeTile(bytes, offset + (tileY * columns + tileX) * NES_TILE_BYTES);
      for (let y = 0; y < NES_TILE_HEIGHT; y++) {
        for (let x = 0; x < NES_TILE_WIDTH; x++) {
          pixels[(tileY * NES_TILE_HEIGHT + y) * width + tileX * NES_TILE_WIDTH + x] =
            tile[y * NES_TILE_WIDTH + x];
        }
      }
    }
  }
  return pixels;
}

/** Encode a row-major pixel rectangle as row-major adjacent NES tiles. */
export function encodeTileGrid(
  pixels: ArrayLike<number>,
  columns: number,
  rows: number,
): Uint8Array {
  requireInteger(columns, "Grid columns", 1);
  requireInteger(rows, "Grid rows", 1);
  const width = columns * NES_TILE_WIDTH;
  const height = rows * NES_TILE_HEIGHT;
  if (pixels.length !== width * height) {
    throw new RangeError(`A ${columns}x${rows} tile grid must contain ${width * height} pixels.`);
  }

  const bytes = new Uint8Array(columns * rows * NES_TILE_BYTES);
  for (let tileY = 0; tileY < rows; tileY++) {
    for (let tileX = 0; tileX < columns; tileX++) {
      const tile = new Uint8Array(NES_TILE_PIXELS);
      for (let y = 0; y < NES_TILE_HEIGHT; y++) {
        for (let x = 0; x < NES_TILE_WIDTH; x++) {
          tile[y * NES_TILE_WIDTH + x] =
            pixels[(tileY * NES_TILE_HEIGHT + y) * width + tileX * NES_TILE_WIDTH + x];
        }
      }
      bytes.set(encodeTile(tile), (tileY * columns + tileX) * NES_TILE_BYTES);
    }
  }
  return bytes;
}

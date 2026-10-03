import assert from "node:assert/strict";
import test from "node:test";
import { decodeTile, decodeTileGrid, encodeTile, encodeTileGrid } from "../src/core/nes/chr.ts";

test("decodes and encodes all four NES planar pixel values", () => {
  const bytes = new Uint8Array(16);
  bytes[0] = 0x50; // low plane: 0, 1, 0, 1
  bytes[8] = 0x30; // high plane: 0, 0, 1, 1

  const pixels = decodeTile(bytes);
  assert.deepEqual([...pixels.subarray(0, 8)], [0, 1, 2, 3, 0, 0, 0, 0]);
  assert.deepEqual(encodeTile(pixels), bytes);
});

test("tile encoding is symmetric across every pixel", () => {
  const pixels = Uint8Array.from({ length: 64 }, (_, index) => index % 4);
  assert.deepEqual(decodeTile(encodeTile(pixels)), pixels);
});

test("grid helpers preserve row-major tile placement", () => {
  const width = 16;
  const pixels = Uint8Array.from({ length: width * 16 }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    return (Math.floor(x / 8) + Math.floor(y / 8) * 2) & 3;
  });

  const encoded = encodeTileGrid(pixels, 2, 2);
  assert.equal(encoded.length, 64);
  assert.deepEqual(decodeTileGrid(encoded, 2, 2), pixels);
});

test("CHR helpers reject invalid ranges and pixel values", () => {
  assert.throws(() => decodeTile(new Uint8Array(15)), /beyond/);
  assert.throws(() => decodeTileGrid(new Uint8Array(16), 2, 1), /beyond/);
  assert.throws(() => encodeTile(new Uint8Array(63)), /exactly 64/);
  assert.throws(() => encodeTile(Uint8Array.from({ length: 64 }, () => 4)), /0 to 3/);
  assert.throws(() => encodeTileGrid(new Uint8Array(64), 2, 1), /128 pixels/);
});

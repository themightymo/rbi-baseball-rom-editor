import test from "node:test";
import assert from "node:assert/strict";
import { NES_RGB, isNesColorIndex, nesColor } from "../src/core/nes/palette.ts";

test("NES palette exposes exactly 64 indexed colors", () => {
  assert.equal(NES_RGB.length, 64);
  assert.equal(nesColor(0x25), "#fc74b4");
  assert.equal(isNesColorIndex(0), true);
  assert.equal(isNesColorIndex(63), true);
  assert.equal(isNesColorIndex(64), false);
  assert.throws(() => nesColor(-1), /0 to 63/);
});

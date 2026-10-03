import test from "node:test";
import assert from "node:assert/strict";
import {
  fileOffsetToCpuAddress,
  fileOffsetToPrgOffset,
  getNesRomLayout,
  parseOffset,
} from "../src/core/nes/addressing.ts";

function makeRom(prgUnits: number, chrUnits: number, mapper: number, trainer = false) {
  const trainerSize = trainer ? 512 : 0;
  const rom = new Uint8Array(16 + trainerSize + prgUnits * 16 * 1024 + chrUnits * 8 * 1024);
  rom.set([0x4e, 0x45, 0x53, 0x1a, prgUnits, chrUnits]);
  rom[6] = ((mapper & 0x0f) << 4) | (trainer ? 0x04 : 0);
  rom[7] = mapper & 0xf0;
  return rom;
}

test("parses decimal, prefixed hex, and unambiguous bare hex offsets", () => {
  assert.equal(parseOffset("256"), 256);
  assert.equal(parseOffset("0x100"), 256);
  assert.equal(parseOffset("1A0"), 0x1a0);
  assert.equal(parseOffset("nope"), null);
});

test("derives PRG and CHR file ranges including a trainer", () => {
  const layout = getNesRomLayout(makeRom(2, 1, 0, true));
  assert.ok(layout);
  assert.equal(layout.prgStart, 528);
  assert.equal(layout.prgEnd, 528 + 32 * 1024);
  assert.equal(layout.chrStart, layout.prgEnd);
  assert.equal(layout.chrEnd, layout.chrStart + 8 * 1024);
});

test("converts file offsets to PRG-relative offsets", () => {
  const layout = getNesRomLayout(makeRom(4, 4, 206));
  assert.ok(layout);
  assert.equal(fileOffsetToPrgOffset(layout, layout.prgStart), 0);
  assert.equal(fileOffsetToPrgOffset(layout, layout.prgEnd - 1), 64 * 1024 - 1);
  assert.equal(fileOffsetToPrgOffset(layout, layout.chrStart), null);
});

test("reports only statically calculable mapper 206 CPU addresses", () => {
  const layout = getNesRomLayout(makeRom(4, 4, 206));
  assert.ok(layout);
  assert.equal(fileOffsetToCpuAddress(layout, layout.prgStart), null);
  assert.equal(fileOffsetToCpuAddress(layout, layout.prgEnd - 16 * 1024), 0xc000);
  assert.equal(fileOffsetToCpuAddress(layout, layout.prgEnd - 1), 0xffff);
});

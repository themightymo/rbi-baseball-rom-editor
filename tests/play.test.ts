import assert from "node:assert/strict";
import test from "node:test";
import { createNesPlaySnapshot } from "../src/core/nes/play.ts";

test("play snapshots copy the current ROM into application memory", () => {
  const rom = new Uint8Array(32);
  rom[20] = 7;
  const snapshot = createNesPlaySnapshot(rom, "edited.nes");
  assert.equal(snapshot.name, "edited.nes");
  assert.notEqual(snapshot.bytes, rom);
  assert.deepEqual(snapshot.bytes, rom);

  rom[20] = 9;
  assert.equal(snapshot.bytes[20], 7);
});

test("play snapshots reject headerless short input", () => {
  assert.throws(() => createNesPlaySnapshot(new Uint8Array(15), null), /iNES header/);
});

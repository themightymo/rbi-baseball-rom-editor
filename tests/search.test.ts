import test from "node:test";
import assert from "node:assert/strict";
import { encodeSearchText, findByteSequence, searchRomText } from "../src/core/rom/search.ts";

test("finds every exact and overlapping byte-sequence match", () => {
  assert.deepEqual(findByteSequence(Uint8Array.from([1, 1, 1]), Uint8Array.from([1, 1])), [0, 1]);
});

test("encodes and searches exact ASCII", () => {
  const encoding = { type: "ascii" as const, characterMap: {} };
  assert.deepEqual(Array.from(encodeSearchText("RBI", encoding) ?? []), [0x52, 0x42, 0x49]);
  assert.deepEqual(
    searchRomText(Uint8Array.from([0x52, 0x42, 0x49, 0, 0x52, 0x42, 0x49]), "RBI", encoding),
    [0, 4],
  );
  assert.deepEqual(searchRomText(Uint8Array.from([0x72, 0x62, 0x69]), "RBI", encoding), []);
});

test("uses a custom character table and rejects unmapped characters", () => {
  const encoding = { type: "custom" as const, characterMap: { "01": "A", "02": "B" } };
  assert.deepEqual(searchRomText(Uint8Array.from([1, 2, 0, 1, 2]), "AB", encoding), [0, 3]);
  assert.equal(searchRomText(Uint8Array.from([1, 2]), "AC", encoding), null);
});

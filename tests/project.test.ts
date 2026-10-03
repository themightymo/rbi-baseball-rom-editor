import test from "node:test";
import assert from "node:assert/strict";
import { buildRbiProject, applyRbiProject } from "../src/games/rbi/project.ts";

function fixture(): Uint8Array {
  return Uint8Array.from({ length: 512 }, (_, index) => (index * 19) & 0xff);
}

test("RBI project records source identity and sorted edits", () => {
  const original = fixture();
  const project = buildRbiProject(
    original,
    new Map([
      [20, 7],
      [3, 9],
    ]),
  );
  assert.equal(project.game, "rbi-baseball");
  assert.equal(project.version, 1);
  assert.match(project.sourceRomCrc32, /^[0-9A-F]{8}$/);
  assert.deepEqual(project.edits, [
    { offset: 3, original: original[3], value: 9 },
    { offset: 20, original: original[20], value: 7 },
  ]);
  const applied = applyRbiProject(original, project);
  assert.equal(applied[3], 9);
  assert.equal(applied[20], 7);
  assert.equal(original[3], 57);
});

test("RBI project rejects the wrong source without partial application", () => {
  const original = fixture();
  const project = buildRbiProject(original, new Map([[3, 9]]));
  const wrong = new Uint8Array(original);
  wrong[100] ^= 0xff;
  assert.throws(() => applyRbiProject(wrong, project), /CRC32/);
  assert.equal(wrong[3], original[3]);
});

test("RBI project validates every edit before returning a modified ROM", () => {
  const original = fixture();
  const project = buildRbiProject(original, new Map([[3, 9]]));
  project.edits.push({ offset: 9999, original: 0, value: 1 });
  assert.throws(() => applyRbiProject(original, project), /outside the ROM/);
  assert.equal(original[3], 57);
});

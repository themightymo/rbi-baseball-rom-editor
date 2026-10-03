import assert from "node:assert/strict";
import test from "node:test";
import { matchExactRbiProfile } from "../src/games/rbi/detect.ts";
import {
  getRbiProfile,
  RBI_ROM_PROFILES,
  resolveRbiProfileOffsets,
} from "../src/games/rbi/profiles.ts";

function makeInes(prgBanks: number, chrBanks: number): Uint8Array {
  const rom = new Uint8Array(16 + prgBanks * 16 * 1024 + chrBanks * 8 * 1024);
  rom.set([0x4e, 0x45, 0x53, 0x1a, prgBanks, chrBanks]);
  return rom;
}

test("exact original payload profiles accept canonical and common legacy mapper headers", () => {
  const fingerprint = {
    payloadCrc32: "3C5C81D4",
    prgSize: 64 * 1024,
    chrSize: 32 * 1024,
  };
  assert.equal(matchExactRbiProfile({ ...fingerprint, mapper: 206 })?.id, "rbi-usa-licensed");
  assert.equal(matchExactRbiProfile({ ...fingerprint, mapper: 4 })?.id, "rbi-usa-licensed");
  assert.equal(matchExactRbiProfile({ ...fingerprint, mapper: 1 }), null);
});

test("unfingerprinted expanded and historical families cannot auto-detect", () => {
  const manualFamilies = RBI_ROM_PROFILES.filter((profile) => profile.family !== "original");
  assert.ok(manualFamilies.length >= 4);
  assert.ok(manualFamilies.every((profile) => profile.payloadCrc32 === null));
  assert.equal(
    matchExactRbiProfile({
      payloadCrc32: "00000000",
      mapper: 4,
      prgSize: 128 * 1024,
      chrSize: 64 * 1024,
    }),
    null,
  );
});

test("profile offsets resolve from iNES regions instead of absolute file sizes", () => {
  const original = getRbiProfile("rbi-usa-licensed");
  assert.ok(original);
  assert.deepEqual(resolveRbiProfileOffsets(makeInes(4, 4), original), {
    playerData: 0x10,
    teamData: 0x10,
    chr: 0x10010,
  });

  const expanded = getRbiProfile("rbi-overstuffed-licensed-family");
  assert.ok(expanded);
  assert.deepEqual(resolveRbiProfileOffsets(makeInes(8, 8), expanded), {
    playerData: 0x10010,
    teamData: 0x10010,
    chr: 0x20010,
  });
});

test("unknown stuffed and historical offsets remain explicit nulls", () => {
  assert.equal(getRbiProfile("rbi-stuffed-licensed-family")?.teamData.baseOffset, null);
  assert.equal(getRbiProfile("rbi-historical-hack-family")?.playerData.baseOffset, null);
});

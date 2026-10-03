import assert from "node:assert/strict";
import test from "node:test";
import { suggestBatterRatings, suggestPitcherRatings } from "../src/games/rbi/ratings.ts";

test("suggests deterministic batter ratings from a real stat line", () => {
  assert.deepEqual(
    suggestBatterRatings({
      atBats: 500,
      hits: 150,
      homeRuns: 25,
      stolenBases: 20,
    }),
    { battingAverage: 300, homeRuns: 25, contact: 24, power: 850, speed: 130 },
  );
});

test("ties each batter rating to its named source statistic", () => {
  const baseline = suggestBatterRatings({
    atBats: 500,
    hits: 150,
    homeRuns: 25,
    stolenBases: 20,
  });
  const moreHits = suggestBatterRatings({
    atBats: 500,
    hits: 160,
    homeRuns: 25,
    stolenBases: 20,
  });
  const moreHomeRuns = suggestBatterRatings({
    atBats: 500,
    hits: 150,
    homeRuns: 30,
    stolenBases: 20,
  });
  const moreStolenBases = suggestBatterRatings({
    atBats: 500,
    hits: 150,
    homeRuns: 25,
    stolenBases: 30,
  });

  assert.equal(moreHits.contact > baseline.contact, true);
  assert.equal(moreHits.power, baseline.power);
  assert.equal(moreHits.speed, baseline.speed);
  assert.equal(moreHomeRuns.contact, baseline.contact);
  assert.equal(moreHomeRuns.power > baseline.power, true);
  assert.equal(moreHomeRuns.speed, baseline.speed);
  assert.equal(moreStolenBases.contact, baseline.contact);
  assert.equal(moreStolenBases.power, baseline.power);
  assert.equal(moreStolenBases.speed > baseline.speed, true);
});

test("suggests deterministic pitcher ratings from statistics and fastball velocity", () => {
  assert.deepEqual(
    suggestPitcherRatings({
      inningsPitched: 180,
      appearances: 30,
      earnedRuns: 60,
      strikeouts: 180,
      walks: 60,
      fastballMph: 95,
    }),
    {
      earnedRunAverage: 300,
      drop: 6,
      leftCurve: 8,
      rightCurve: 8,
      slowPitchVelocity: 150,
      normalPitchVelocity: 170,
      fastPitchVelocity: 190,
      stamina: 60,
    },
  );
});

test("suggestions clamp to confirmed writable ROM ranges", () => {
  const batter = suggestBatterRatings({
    atBats: 1,
    hits: 1,
    homeRuns: 1,
    stolenBases: 10,
  });
  assert.equal(batter.battingAverage, 405);
  assert.equal(batter.speed, 255);

  const pitcher = suggestPitcherRatings({
    inningsPitched: 1,
    appearances: 1,
    earnedRuns: 20,
    strikeouts: 20,
    walks: 20,
    fastballMph: 110,
  });
  assert.equal(pitcher.earnedRunAverage, 355);
  assert.equal(pitcher.drop, 0);
  assert.equal(pitcher.leftCurve, 15);
});

test("rejects impossible or incomplete stat lines", () => {
  assert.throws(
    () =>
      suggestBatterRatings({
        atBats: 100,
        hits: 101,
        homeRuns: 5,
        stolenBases: 0,
      }),
    /Hits cannot exceed/,
  );
  assert.throws(
    () =>
      suggestPitcherRatings({
        inningsPitched: 0,
        appearances: 1,
        earnedRuns: 0,
        strikeouts: 0,
        walks: 0,
        fastballMph: 90,
      }),
    /Innings pitched/,
  );
});

import { RBI_BATTER_GAMEPLAY_LIMITS } from "./batters.ts";

export interface BatterStatLine {
  atBats: number;
  hits: number;
  homeRuns: number;
  stolenBases: number;
}

export interface SuggestedBatterRatings {
  battingAverage: number;
  homeRuns: number;
  contact: number;
  power: number;
  speed: number;
}

export interface PitcherStatLine {
  inningsPitched: number;
  appearances: number;
  earnedRuns: number;
  strikeouts: number;
  walks: number;
  fastballMph: number;
}

export interface SuggestedPitcherRatings {
  earnedRunAverage: number;
  drop: number;
  leftCurve: number;
  rightCurve: number;
  slowPitchVelocity: number;
  normalPitchVelocity: number;
  fastPitchVelocity: number;
  stamina: number;
}

/**
 * Transparent recommendations, not a reconstruction of RBI Baseball's original rating method.
 * Each playable rating has one visible statistical source: Contact uses batting average,
 * Power uses home runs, and Speed uses stolen-base rate.
 */
export function suggestBatterRatings(stats: BatterStatLine): SuggestedBatterRatings {
  validateCount(stats.atBats, "At-bats", 1);
  for (const [label, value] of [
    ["Hits", stats.hits],
    ["Home runs", stats.homeRuns],
    ["Stolen bases", stats.stolenBases],
  ] as const) {
    validateCount(value, label);
  }
  if (stats.hits > stats.atBats) throw new RangeError("Hits cannot exceed at-bats.");
  if (stats.homeRuns > stats.hits) throw new RangeError("Home runs cannot exceed hits.");

  const average = stats.hits / stats.atBats;
  return {
    battingAverage: clamp(Math.round(average * 1000), 150, 405),
    homeRuns: clamp(stats.homeRuns, 0, 255),
    contact: clamp(
      Math.round((0.405 - average) * 100),
      RBI_BATTER_GAMEPLAY_LIMITS.contact.min,
      RBI_BATTER_GAMEPLAY_LIMITS.contact.max,
    ),
    power: clamp(
      650 + stats.homeRuns * 8,
      RBI_BATTER_GAMEPLAY_LIMITS.power.min,
      RBI_BATTER_GAMEPLAY_LIMITS.power.max,
    ),
    speed: clamp(
      Math.round(118 + (stats.stolenBases / stats.atBats) * 300),
      RBI_BATTER_GAMEPLAY_LIMITS.speed.min,
      RBI_BATTER_GAMEPLAY_LIMITS.speed.max,
    ),
  };
}

/**
 * Heuristic pitching recommendations. ERA is direct; stamina uses innings per appearance;
 * velocities use the scouting fastball input; curve/drop use K/9 and BB/9 proxies.
 */
export function suggestPitcherRatings(stats: PitcherStatLine): SuggestedPitcherRatings {
  if (!Number.isFinite(stats.inningsPitched) || stats.inningsPitched <= 0) {
    throw new RangeError("Innings pitched must be greater than zero.");
  }
  validateCount(stats.appearances, "Appearances", 1);
  for (const [label, value] of [
    ["Earned runs", stats.earnedRuns],
    ["Strikeouts", stats.strikeouts],
    ["Walks", stats.walks],
  ] as const) {
    validateCount(value, label);
  }
  if (!Number.isFinite(stats.fastballMph) || stats.fastballMph < 40 || stats.fastballMph > 110) {
    throw new RangeError("Fastball velocity must be from 40 to 110 MPH.");
  }

  const strikeoutsPerNine = (stats.strikeouts * 9) / stats.inningsPitched;
  const walksPerNine = (stats.walks * 9) / stats.inningsPitched;
  const fast = clamp(Math.round(stats.fastballMph * 2), 0, 255);
  const curve = clamp(Math.round((strikeoutsPerNine - 2) * 1.2), 0, 15);
  return {
    earnedRunAverage: clamp(
      Math.round((stats.earnedRuns * 9 * 100) / stats.inningsPitched),
      100,
      355,
    ),
    drop: clamp(Math.round(8 - walksPerNine * 0.8), 0, 15),
    leftCurve: curve,
    rightCurve: curve,
    slowPitchVelocity: clamp(fast - 40, 0, 255),
    normalPitchVelocity: clamp(fast - 20, 0, 255),
    fastPitchVelocity: fast,
    stamina: clamp(Math.round((stats.inningsPitched / stats.appearances) * 10), 0, 255),
  };
}

function validateCount(value: number, label: string, minimum = 0): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${label} must be an integer of at least ${minimum}.`);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export interface BatterStatLine {
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  stolenBases: number;
  strikeouts: number;
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
 * Power uses isolated power; Contact uses strikeout avoidance; Speed uses steals per at-bat.
 */
export function suggestBatterRatings(stats: BatterStatLine): SuggestedBatterRatings {
  validateCount(stats.atBats, "At-bats", 1);
  for (const [label, value] of [
    ["Hits", stats.hits],
    ["Doubles", stats.doubles],
    ["Triples", stats.triples],
    ["Home runs", stats.homeRuns],
    ["Stolen bases", stats.stolenBases],
    ["Strikeouts", stats.strikeouts],
  ] as const) {
    validateCount(value, label);
  }
  if (stats.hits > stats.atBats) throw new RangeError("Hits cannot exceed at-bats.");
  if (stats.doubles + stats.triples + stats.homeRuns > stats.hits) {
    throw new RangeError("Extra-base hits cannot exceed total hits.");
  }
  if (stats.strikeouts > stats.atBats) throw new RangeError("Strikeouts cannot exceed at-bats.");

  const average = stats.hits / stats.atBats;
  const isolatedPower = (stats.doubles + stats.triples * 2 + stats.homeRuns * 3) / stats.atBats;
  return {
    battingAverage: clamp(Math.round(average * 1000), 150, 405),
    homeRuns: clamp(stats.homeRuns, 0, 255),
    contact: clamp(Math.round((1 - stats.strikeouts / stats.atBats) * 32), 0, 255),
    power: clamp(Math.round(650 + isolatedPower * 1200), 0, 65535),
    speed: clamp(Math.round(110 + (stats.stolenBases / stats.atBats) * 500), 0, 255),
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

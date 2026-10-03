export type RbiHandedness = "L" | "R";

export interface RbiBatter {
  teamId: number;
  rosterSlot: number;
  name: string;
  bats: RbiHandedness;
  /** Displayed average in thousandths: 275 renders as .275. */
  battingAverage: number;
  homeRuns: number;
  contact: number;
  power: number;
  speed: number;
  unknown: readonly [number, number];
  offset: number;
  rawBytes: Uint8Array;
}

export type RbiPitcherDelivery = "standard" | "sidearm";

export interface RbiPitcher {
  teamId: number;
  rosterSlot: number;
  name: string;
  throws: RbiHandedness;
  delivery: RbiPitcherDelivery;
  /** Displayed ERA in hundredths: 284 renders as 2.84. */
  earnedRunAverage: number;
  drop: number;
  leftCurve: number;
  rightCurve: number;
  slowPitchVelocity: number;
  normalPitchVelocity: number;
  fastPitchVelocity: number;
  stamina: number;
  unknown1: number;
  unknown2: number;
  offset: number;
  rawBytes: Uint8Array;
}

export interface RbiTeam {
  id: number;
  name: string;
  abbreviation: string;
  offset: number;
  rawBytes: Uint8Array;
  batters: RbiBatter[];
  pitchers: RbiPitcher[];
}

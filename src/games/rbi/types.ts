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

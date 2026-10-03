export interface NesPlaySnapshot {
  name: string;
  bytes: Uint8Array;
}

/** Capture an immutable-in-practice working-ROM copy for the browser player. */
export function createNesPlaySnapshot(rom: Uint8Array, name: string | null): NesPlaySnapshot {
  if (rom.length < 16) throw new RangeError("A playable NES ROM must include an iNES header.");
  return {
    name: name?.trim() || "Current RBI Baseball ROM",
    bytes: new Uint8Array(rom),
  };
}

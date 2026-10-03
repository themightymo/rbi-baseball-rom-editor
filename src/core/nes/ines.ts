export interface INESInfo {
  valid: boolean;
  headerSize: number;
  prgSize: number;
  chrSize: number;
  mapper: number;
  hasTrainer: boolean;
  expectedFileSize: number;
}

const INES_HEADER_SIZE = 16;

export function parseINES(bytes: Uint8Array): INESInfo | null {
  if (
    bytes.length < INES_HEADER_SIZE ||
    bytes[0] !== 0x4e ||
    bytes[1] !== 0x45 ||
    bytes[2] !== 0x53 ||
    bytes[3] !== 0x1a
  ) {
    return null;
  }

  const hasTrainer = (bytes[6] & 0x04) !== 0;
  const prgSize = bytes[4] * 16 * 1024;
  const chrSize = bytes[5] * 8 * 1024;
  const mapper = (bytes[6] >>> 4) | (bytes[7] & 0xf0);
  const expectedFileSize = INES_HEADER_SIZE + (hasTrainer ? 512 : 0) + prgSize + chrSize;

  return {
    valid: bytes.length >= expectedFileSize,
    headerSize: INES_HEADER_SIZE,
    prgSize,
    chrSize,
    mapper,
    hasTrainer,
    expectedFileSize,
  };
}

export function detectINES(bytes: Uint8Array): boolean {
  return parseINES(bytes) !== null;
}

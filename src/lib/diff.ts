export interface DiffRange {
  start: number;
  end: number; // exclusive
  original: Uint8Array;
  modified: Uint8Array;
  label?: string;
}

export function diffBytes(a: Uint8Array, b: Uint8Array, gap = 4): DiffRange[] {
  const len = Math.min(a.length, b.length);
  const ranges: DiffRange[] = [];
  let i = 0;
  while (i < len) {
    if (a[i] !== b[i]) {
      const start = i;
      let lastDiff = i;
      while (i < len && i - lastDiff <= gap) {
        if (a[i] !== b[i]) lastDiff = i;
        i++;
      }
      const end = lastDiff + 1;
      ranges.push({
        start,
        end,
        original: a.slice(start, end),
        modified: b.slice(start, end),
      });
    } else {
      i++;
    }
  }
  return ranges;
}

const IPS_HEADER = [0x50, 0x41, 0x54, 0x43, 0x48] as const;
const IPS_FOOTER = [0x45, 0x4f, 0x46] as const;
const IPS_MAX_OFFSET = 0xffffff;
const IPS_MAX_RECORD_SIZE = 0xffff;

// Build an IPS patch from equal-length original and modified ROM images.
export function buildIPS(original: Uint8Array, modified: Uint8Array): Uint8Array {
  if (original.length !== modified.length) {
    throw new RangeError("IPS export requires original and modified ROMs of equal length.");
  }
  const ranges = diffBytes(original, modified, 0);
  const chunks: number[] = [];
  chunks.push(...IPS_HEADER);
  for (const r of ranges) {
    for (let position = 0; position < r.modified.length; position += IPS_MAX_RECORD_SIZE) {
      const offset = r.start + position;
      if (offset > IPS_MAX_OFFSET) {
        throw new RangeError("IPS cannot encode offsets above 0xFFFFFF.");
      }
      const data = r.modified.subarray(position, position + IPS_MAX_RECORD_SIZE);
      chunks.push((offset >> 16) & 0xff, (offset >> 8) & 0xff, offset & 0xff);
      chunks.push((data.length >> 8) & 0xff, data.length & 0xff);
      for (const byte of data) chunks.push(byte);
    }
  }
  chunks.push(...IPS_FOOTER);
  return new Uint8Array(chunks);
}

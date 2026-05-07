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

// Build a simple IPS patch from edits.
export function buildIPS(original: Uint8Array, modified: Uint8Array): Uint8Array {
  const ranges = diffBytes(original, modified, 0);
  const chunks: number[] = [];
  // header "PATCH"
  chunks.push(0x50, 0x41, 0x54, 0x43, 0x48);
  for (const r of ranges) {
    const off = r.start;
    if (off > 0xffffff) continue;
    chunks.push((off >> 16) & 0xff, (off >> 8) & 0xff, off & 0xff);
    const size = r.modified.length;
    chunks.push((size >> 8) & 0xff, size & 0xff);
    for (let k = 0; k < size; k++) chunks.push(r.modified[k]);
  }
  // footer "EOF"
  chunks.push(0x45, 0x4f, 0x46);
  return new Uint8Array(chunks);
}

import type { RomMap } from "@/types/RomMap";

export function decodeText(
  bytes: Uint8Array,
  start: number,
  length: number,
  encoding: RomMap["encoding"],
): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    const b = bytes[start + i];
    if (b === undefined) break;
    if (encoding.type === "custom") {
      const key = b.toString(16).padStart(2, "0").toUpperCase();
      out += encoding.characterMap[key] ?? ".";
    } else {
      out += b >= 32 && b < 127 ? String.fromCharCode(b) : ".";
    }
  }
  return out;
}

export function encodeText(text: string, length: number, encoding: RomMap["encoding"]): Uint8Array {
  const out = new Uint8Array(length);
  // Build reverse map for custom encoding.
  let reverse: Record<string, number> | null = null;
  if (encoding.type === "custom") {
    reverse = {};
    for (const [hex, ch] of Object.entries(encoding.characterMap)) {
      reverse[ch] = parseInt(hex, 16);
    }
  }
  for (let i = 0; i < length; i++) {
    const ch = text[i];
    if (ch === undefined) {
      out[i] = 0x20; // space pad
      continue;
    }
    if (reverse && reverse[ch] !== undefined) {
      out[i] = reverse[ch];
    } else {
      out[i] = ch.charCodeAt(0) & 0xff;
    }
  }
  return out;
}

// Search bytes for an ASCII (or custom-encoded) string. Returns byte offsets.
export function searchString(
  bytes: Uint8Array,
  needle: string,
  encoding: RomMap["encoding"],
  caseInsensitive = true,
): number[] {
  if (!needle) return [];
  const encoded = encodeText(needle, needle.length, encoding);
  const lower = caseInsensitive;
  const matchByte = (a: number, b: number) => (lower ? (a | 0x20) === (b | 0x20) : a === b);
  const hits: number[] = [];
  for (let i = 0; i <= bytes.length - encoded.length; i++) {
    let ok = true;
    for (let j = 0; j < encoded.length; j++) {
      if (!matchByte(bytes[i + j], encoded[j])) {
        ok = false;
        break;
      }
    }
    if (ok) {
      hits.push(i);
      if (hits.length > 500) break;
    }
  }
  return hits;
}

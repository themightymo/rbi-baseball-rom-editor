export interface TextEncoding {
  type: "ascii" | "custom";
  characterMap: Record<string, string>;
}

export function encodeSearchText(text: string, encoding: TextEncoding): Uint8Array | null {
  if (!text) return null;
  if (encoding.type === "ascii") {
    const values = Array.from(text, (character) => character.codePointAt(0));
    return values.some((value) => value === undefined || value > 0x7f)
      ? null
      : Uint8Array.from(values as number[]);
  }

  const reverse = new Map<string, number>();
  for (const [byte, character] of Object.entries(encoding.characterMap)) {
    reverse.set(character, Number.parseInt(byte, 16));
  }
  const values = Array.from(text, (character) => reverse.get(character));
  return values.some((value) => value === undefined) ? null : Uint8Array.from(values as number[]);
}

export function findByteSequence(haystack: Uint8Array, needle: Uint8Array): number[] {
  if (needle.length === 0 || needle.length > haystack.length) return [];
  const matches: number[] = [];
  for (let offset = 0; offset <= haystack.length - needle.length; offset++) {
    let matched = true;
    for (let index = 0; index < needle.length; index++) {
      if (haystack[offset + index] !== needle[index]) {
        matched = false;
        break;
      }
    }
    if (matched) matches.push(offset);
  }
  return matches;
}

export function searchRomText(
  rom: Uint8Array,
  text: string,
  encoding: TextEncoding,
): number[] | null {
  const needle = encodeSearchText(text, encoding);
  return needle ? findByteSequence(rom, needle) : null;
}

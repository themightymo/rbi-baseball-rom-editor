const RBI_NAME_GLYPHS: Readonly<Record<number, string>> = (() => {
  const glyphs: Record<number, string> = { 0x24: " ", 0x25: "." };
  for (let index = 0; index < 26; index++) {
    glyphs[0x0a + index] = String.fromCharCode(0x41 + index);
    glyphs[0x28 + index] = String.fromCharCode(0x61 + index);
  }
  return glyphs;
})();

const RBI_GLYPH_BYTES: Readonly<Record<string, number>> = Object.fromEntries(
  Object.entries(RBI_NAME_GLYPHS).map(([byte, character]) => [character, Number(byte)]),
);

/** Unknown glyphs remain `?` instead of being guessed. */
export function decodeRbiName(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => RBI_NAME_GLYPHS[byte] ?? "?")
    .join("")
    .trimEnd();
}

export function encodeRbiName(name: string): Uint8Array {
  if (name.length > 6) throw new RangeError("RBI player names can contain at most 6 characters.");
  const encoded = new Uint8Array(6);
  for (const [index, character] of Array.from(name.padEnd(6, " ")).entries()) {
    const byte = RBI_GLYPH_BYTES[character];
    if (byte === undefined) {
      throw new RangeError(`Character ${JSON.stringify(character)} is not in the RBI name table.`);
    }
    encoded[index] = byte;
  }
  return encoded;
}

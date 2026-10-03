const RBI_NAME_GLYPHS: Readonly<Record<number, string>> = (() => {
  const glyphs: Record<number, string> = { 0x24: " ", 0x25: "." };
  for (let index = 0; index < 26; index++) {
    glyphs[0x0a + index] = String.fromCharCode(0x41 + index);
    glyphs[0x28 + index] = String.fromCharCode(0x61 + index);
  }
  return glyphs;
})();

/** Unknown glyphs remain `?` instead of being guessed. */
export function decodeRbiName(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => RBI_NAME_GLYPHS[byte] ?? "?")
    .join("")
    .trimEnd();
}

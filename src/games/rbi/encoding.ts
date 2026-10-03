/**
 * Name glyphs verified for the single Phase 3 subject, Reggie Jackson (`JACKSN`).
 * Unknown glyphs remain `?` until independently correlated.
 */
const CONFIRMED_NAME_GLYPHS: Readonly<Record<number, string>> = {
  0x13: "J",
  0x28: "A",
  0x2a: "C",
  0x32: "K",
  0x35: "N",
  0x3a: "S",
};

export function decodeRbiName(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => CONFIRMED_NAME_GLYPHS[byte] ?? "?").join("");
}

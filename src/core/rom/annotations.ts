export interface RomAnnotation {
  start: number;
  length: number;
  label: string;
  confidence: "confirmed" | "strongly-inferred" | "suspected";
}

export function annotationsAt(
  annotations: readonly RomAnnotation[],
  offset: number,
): RomAnnotation[] {
  return annotations.filter(({ start, length }) => offset >= start && offset < start + length);
}

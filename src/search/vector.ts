/** The query's weight in the blended ranking vector; the taste centroid gets `1 - QUERY_WEIGHT`. Initial value, tunable once real query traffic exists (spec 0009 Follow-up). */
export const QUERY_WEIGHT = 0.75;

/** Formats a float array as a pgvector input literal, e.g. `[0.1,0.2,0.3]`. */
export function toVectorLiteral(values: ReadonlyArray<number>): string {
  return `[${values.join(",")}]`;
}

/** Parses a pgvector output literal (`"[0.1,0.2,0.3]"`) back into a float array. */
export function parseVectorLiteral(literal: string): number[] {
  return literal
    .slice(1, -1)
    .split(",")
    .map((value) => Number.parseFloat(value));
}

/** Elementwise weighted average of two equal length vectors, `query` weighted `queryWeight`. */
export function blendVectors(
  query: ReadonlyArray<number>,
  taste: ReadonlyArray<number>,
  queryWeight: number,
): number[] {
  return query.map((value, index) => {
    const tasteValue = taste[index] ?? 0;
    return value * queryWeight + tasteValue * (1 - queryWeight);
  });
}

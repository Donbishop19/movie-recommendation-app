/** Maps Drizzle's `T | null` to `T | undefined` at the data access boundary, per AGENTS.md. */
export function toUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

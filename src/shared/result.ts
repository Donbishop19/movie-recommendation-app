/** The one error handling shape every Server Action and Route Handler returns. */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** The small named error union shared by data-access-backed Server Actions and Route Handlers. */
export type DataError = "not_found" | "unauthorized" | "conflict" | "unknown";

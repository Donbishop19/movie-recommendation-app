/**
 * In memory, best effort per user search rate limit (spec 0009's chosen tradeoff over a
 * durable Postgres backed counter): a fixed window count per user id, reset every
 * `WINDOW_MS`. Does not enforce a hard cap across concurrent serverless instances, only a
 * courtesy limit within one warm instance.
 */
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

/** Returns `true` when the caller is within their per minute search budget. */
export function checkSearchRateLimit(userId: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(userId);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  bucket.count += 1;
  return true;
}

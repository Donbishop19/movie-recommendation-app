export type AnalyticsEnv = {
  readonly posthogKey: string;
  readonly posthogHost: string;
};

/** Reads and validates the PostHog env vars, failing loudly if either is missing. */
function readAnalyticsEnv(): AnalyticsEnv {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.POSTHOG_HOST;

  if (!posthogKey) {
    throw new Error(
      "Missing required env var NEXT_PUBLIC_POSTHOG_KEY (PostHog project API key).",
    );
  }
  if (!posthogHost) {
    throw new Error(
      "Missing required env var POSTHOG_HOST (PostHog ingestion host, e.g. https://us.i.posthog.com).",
    );
  }

  return { posthogKey, posthogHost };
}

/**
 * Server-only: validates both PostHog env vars together. Never import this from a
 * "use client" file — `POSTHOG_HOST` is not `NEXT_PUBLIC_` prefixed and is undefined
 * in the browser bundle, which would fail this check on every page load. Client code
 * reads `NEXT_PUBLIC_POSTHOG_KEY` directly instead (see `posthog-provider.tsx`).
 */
export const analyticsEnv = readAnalyticsEnv();

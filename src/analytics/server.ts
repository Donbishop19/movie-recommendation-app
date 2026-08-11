import { PostHog } from "posthog-node";
import * as Sentry from "@sentry/nextjs";
import { analyticsEnv } from "./env";
import type { AnalyticsEventMap, EventName } from "./events";

let client: PostHog | undefined;

/**
 * A `posthog-node` singleton tuned for a serverless environment: `flushAt: 1` and
 * `flushInterval: 0` send every captured event immediately instead of batching, so a
 * short lived function does not exit before a queued event is flushed.
 */
function getClient(): PostHog {
  if (!client) {
    client = new PostHog(analyticsEnv.posthogKey, {
      host: analyticsEnv.posthogHost,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

/**
 * Fires a typed analytics event from server side code (a Server Action or Route
 * Handler). Attaches the caller supplied user id and a timestamp automatically; no
 * call site passes either by hand. Never throws and never blocks or changes the
 * timing of the caller — a failed or slow send is an accepted, silently dropped loss.
 */
export function trackServer<E extends EventName>(
  event: E,
  distinctId: string,
  properties: AnalyticsEventMap[E],
): void {
  try {
    getClient().capture({
      distinctId,
      event,
      properties,
      timestamp: new Date(),
    });
  } catch (error) {
    Sentry.captureException(error);
  }
}

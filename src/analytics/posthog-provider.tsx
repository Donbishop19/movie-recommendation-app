"use client";

import type { ReactNode } from "react";
import {
  PostHogProvider as PosthogJsProvider,
  usePostHog,
} from "posthog-js/react";
import type { AnalyticsEventMap, EventName } from "./events";

/**
 * Reads the client PostHog key directly rather than through `analyticsEnv`: that
 * module also validates the server-only `POSTHOG_HOST`, which is undefined in the
 * browser bundle and would throw on every page load if pulled into client code.
 */
function readClientPosthogKey(): string {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    throw new Error("Missing required env var NEXT_PUBLIC_POSTHOG_KEY.");
  }
  return key;
}

/**
 * Wraps the app in PostHog's client SDK. Requests are proxied through this app's own
 * `/ingest` route rather than PostHog's domain directly, so ad blockers don't silently
 * drop them. Autocapture (clicks and pageviews) and session replay are both off.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  return (
    <PosthogJsProvider
      apiKey={readClientPosthogKey()}
      options={{
        api_host: "/ingest",
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
      }}
    >
      {children}
    </PosthogJsProvider>
  );
}

/**
 * A typed hook for firing a client side analytics event. PostHog's own client state
 * attaches the identified user id and a timestamp automatically; no call site passes
 * either by hand. Never throws — a failed or slow send is an accepted, silently dropped loss.
 */
export function useTrackClient() {
  const posthog = usePostHog();

  return function trackClient<E extends EventName>(
    event: E,
    properties: AnalyticsEventMap[E],
  ): void {
    try {
      posthog.capture(event, properties);
    } catch {
      // fire and forget, per AC-5: a dropped event must never surface to the caller
    }
  };
}

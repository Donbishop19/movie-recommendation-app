# Analytics (PostHog)

Product analytics pipe: one shared typed event map, a server helper, and a client helper, proxied through this app's own domain. Governed by spec [0005](../../docs/specs/0005-product-analytics-foundation/index.md).

## Files

- `env.ts`: validates `NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_HOST` at import time, server only. Never import from a `"use client"` file: `POSTHOG_HOST` is undefined in the browser bundle and would throw on every page load.
- `events.ts`: `AnalyticsEventMap`, the single source of truth for every event name and its property shape.
- `server.ts`: `trackServer(event, distinctId, properties)`, a `posthog-node` singleton tuned for a serverless environment (`flushAt: 1`, `flushInterval: 0` so a short lived function doesn't exit before a queued event is flushed).
- `posthog-provider.tsx`: `PostHogProvider` (wraps the app, wired into `src/app/layout.tsx`) and `useTrackClient()`, the client side hook.

## Conventions

- Every event name and property comes from `AnalyticsEventMap` in `events.ts`; no ad hoc string literal event name exists anywhere else in the codebase.
- No event property is ever raw personal data (email, name, free text): only ids, counts, booleans, or a fixed set of named categories.
- `trackServer`/`trackClient` never throw and never block their caller; a dropped event is an accepted, silent loss.
- Client requests always go through this app's own `/ingest/:path*` rewrite (`next.config.ts`), never PostHog's domain directly.
- Autocapture and session replay are both off in the client SDK config; don't turn them on without revisiting spec 0005.

## Known gap

- Only one PostHog project is in use across all environments (dev/staging/production); the per environment split spec 0005 originally called for (AC-8) is deferred by explicit engineer decision, see the spec's Follow-up section.

_Drafted by /sync from the introducing change, worth a quick human pass._

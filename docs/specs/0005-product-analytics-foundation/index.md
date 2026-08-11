# 0005. Product analytics foundation

**Date**: 2026-08-10
**Status**: Accepted

## Summary

This decision picks PostHog as the product analytics provider and lays the tracking pipe end to end: a typed list of event names and their data shapes, a server side and a client side way to send an event, and a route that keeps ad blockers from silently dropping client events. No dashboard gets built in this app; PostHog's own dashboard is where the data is viewed. The four events the product needs first (onboarding started, onboarding completed, feed viewed, feed item engaged) are defined now so the next feature (core discovery loop) can call them right away, even though the pipe is proven today with one real event on the movie catalog feature that already works.

## Requirements

**User stories**:

- As the person running this project, I want to know whether users finish onboarding and engage with their feed, so I can tell if the core product loop is working.
- As a developer building the next feature (core discovery loop), I want a ready made, typed way to record an event, so I do not have to design an event taxonomy while also building the feature itself.
- As the person running this project, I want event data to never carry raw personal information, so a data export or a compromised provider account cannot leak more than ids and counts.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Calling the server tracking helper with a valid event sends it to PostHog; the event this spec instruments on the existing movie catalog browse action appears in the PostHog project's Activity view after being fired once.
- **AC-2**: The server and client tracking helpers only accept an event name and a property shape defined in one shared typed event map; passing an event name or property outside that map is a TypeScript compile error, not something that can happen at runtime.
- **AC-3**: Every call through either tracking helper automatically attaches the caller supplied user id and a timestamp; no call site passes these by hand.
- **AC-4**: No property in the typed event map is a raw personal data field (email, name, free text); every property is an id, a count, a boolean, or a fixed set of named categories.
- **AC-5**: A failed, slow, or errored call to PostHog never throws and never changes the return value or timing of the code that called it.
- **AC-6**: Every client side event request goes to this app's own domain (a `/ingest` path), which a Next.js rewrite forwards to PostHog; the browser never calls PostHog's domain directly.
- **AC-7**: Autocapture (automatic click and pageview logging) and session replay are both explicitly turned off in both the client and server SDK setup.
- **AC-8**: Development and the staging Vercel environment send events to a different PostHog project than production, so non production traffic never lands in production metrics.
- **AC-9**: The four core event names (`onboarding_started`, `onboarding_completed`, `feed_viewed`, `feed_item_engaged`) and their property shapes are defined in the shared typed event map, ready for the core discovery loop feature to call without any further taxonomy design.
- **AC-10**: Every PostHog related environment variable is validated at startup, matching the project's existing pattern (`src/db/env.ts`), and fails loudly if one is missing.

## Decision

**Chosen option**: Option 1: PostHog

Adopt PostHog Cloud (US region) as the product analytics provider: one SDK family (`posthog-js` client side, `posthog-node` server side) covers both capture paths, autocapture and session replay off, client requests proxied through this app's own domain, and a separate PostHog project for development/staging versus production.

**Implementation skills**: `posthog-instrumentation` (`posthog/posthog-for-claude`, `.agents/skills/posthog-instrumentation/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`)

## Rationale

Reasoning and options considered: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

No new database table. PostHog is the sole store of event data (a deliberate choice, see rationale.md); the only identity value sent is the existing Supabase Auth user id, reused as PostHog's distinct id. Nothing changes in `supabase/migrations/`.

**API surface**:

| Surface                                                                               | Method | Key inputs                                                               | Key outputs                          | Auth                                                                                              | Key errors                               |
| ------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `trackServer()` (function, `src/analytics/server.ts`)                                 | n/a    | `event: EventName`, `distinctId: string`, `properties` (typed per event) | none, fire and forget                | caller already holds a verified session; this helper does not check one itself                    | never throws; a failed send is swallowed |
| `trackClient()` (function, `src/analytics/posthog-provider.tsx` or a co-located hook) | n/a    | `event: EventName`, `properties` (typed per event)                       | none, fire and forget                | none of its own; a real authenticated call site is added later by the core discovery loop feature | never throws                             |
| `/ingest/:path*` (Next.js rewrite, `next.config.ts`)                                  | any    | proxies the client SDK's request                                         | forwards to PostHog's ingestion host | none; PostHog's own project key in the payload is its authorization                               | passthrough of whatever PostHog returns  |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action                                                           | Value produced / displayed                 | Source                                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `trackServer`, `trackClient`                                     | `distinctId`                               | caller supplied argument; for a Server Action this is `session.userId` from the existing `requireSession()` helper (spec 0003) |
| `trackServer`, `trackClient`                                     | timestamp                                  | computed inside the helper at call time, never passed in                                                                       |
| `trackServer`, `trackClient`                                     | which event names and properties are legal | the shared typed event map, `src/analytics/events.ts`, the taxonomy this spec defines                                          |
| the `movie_catalog_browsed` proof event on `browsePopularMovies` | `resultCount`, `page`                      | the action's own existing return value (`movies.length`) and the already clamped `page` argument; no new computation           |
| `/ingest` rewrite destination                                    | the real PostHog ingestion host            | `POSTHOG_HOST` env var                                                                                                         |
| client and server SDK init                                       | the PostHog project to send to             | `NEXT_PUBLIC_POSTHOG_KEY` env var, a different value per Vercel environment                                                    |

**Key invariants**:

- `trackServer`/`trackClient` never throw and never block their caller; a dropped event is an accepted loss
- Every event name and property anywhere in the codebase comes from the single typed event map; no ad hoc string literal event name exists outside it
- No event property is ever a raw personal data field (email, name, free text)
- Client side requests always go through `/ingest`, never directly to PostHog's domain
- The production PostHog project key is only ever set in the production Vercel environment

**Security model**:

`trackServer` and `trackClient` do not perform their own authorization check; they rely on the caller already having verified the user (the existing `requireSession()` pattern for Server Actions), matching AGENTS.md's rule of one consistent error handling and auth pattern rather than a second, competing one just for analytics. The `/ingest` proxy performs no authorization of its own; PostHog's own ingestion protocol authorizes by the project key already inside the payload, which is how PostHog's documented reverse proxy pattern is meant to work. No personal data is ever sent (AC-4), so there is no compliance scope beyond what PostHog itself already handles as a sub processor. An analytics opt out control is explicitly out of scope here; it belongs to slice 4 (account & privacy settings), which already owns the rest of the privacy surface.

**Configuration required**:

- `NEXT_PUBLIC_POSTHOG_KEY`: PostHog project API key. Public by PostHog's own design (safe to expose to the client). Set to a different PostHog project's key per Vercel environment: one project for local development and the staging environment, a separate project for production, matching spec 0001's staging/production split and spec 0003's per project secret pattern.
- `POSTHOG_HOST`: PostHog's ingestion host (PostHog Cloud, US region, e.g. `https://us.i.posthog.com`). Used server side only, by the `/ingest` rewrite's destination and the server SDK's `host` setting.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: call `browsePopularMovies` once; a `movie_catalog_browsed` event appears in PostHog's Activity view with the correct `resultCount` and `page`, verifies **AC-1**, **AC-3**
- Failure case: point `NEXT_PUBLIC_POSTHOG_KEY` at an invalid value (or otherwise force the PostHog call to fail) and call `trackServer`; the calling Server Action still returns its normal successful result, verifies **AC-5**
- Type safety (this feature's real boundary, in place of a traditional auth check): attempting to call `trackServer`/`trackClient` with an event name or property not in the typed event map fails to compile, verifies **AC-2**, **AC-4**

## Build plan

1. [x] Install `posthog-js` and `posthog-node`; add `src/analytics/env.ts` validating `NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_HOST` at startup, matching the existing `dbEnv` pattern, satisfies **AC-10**
2. [x] Define the shared typed event map (`src/analytics/events.ts`): one TypeScript type mapping each event name to its property shape, including the four core events (`onboarding_started`, `onboarding_completed`, `feed_viewed`, `feed_item_engaged`) with the properties confirmed in this spec's design conversation, satisfies **AC-2**, **AC-4**, **AC-9**
3. [x] Add the server capture helper (`src/analytics/server.ts`): a `posthog-node` singleton configured for a serverless environment (a low flush threshold so a short lived function does not lose a batched event), autocapture and session replay both off, and `trackServer(event, distinctId, properties)` that attaches a timestamp automatically and never throws, satisfies **AC-3**, **AC-5**, **AC-7**
4. [x] Add the client provider (`src/analytics/posthog-provider.tsx`, a client component wrapping `posthog-js`) wired into `src/app/layout.tsx`, configured with `api_host: "/ingest"`, autocapture and session replay both off, plus a typed `trackClient()` helper for the core discovery loop feature to call later, satisfies **AC-3**, **AC-7**
5. [x] Add the reverse proxy: Next.js rewrites in `next.config.ts` forwarding `/ingest/:path*` to `POSTHOG_HOST`, with `skipTrailingSlashRedirect` enabled per PostHog's documented Next.js proxy setup, satisfies **AC-6**
6. [x] Instrument `browsePopularMovies` (`src/app/actions/movies.ts`) with a real `trackServer` call (`movie_catalog_browsed`, `{ resultCount, page }`) right before it returns success, satisfies **AC-1** — the pipe (SDK config → PostHog project) was fired and confirmed live 2026-08-11 via a direct `trackServer`/`posthog-node` call against the real project (see verify notes below); the call site inside `browsePopularMovies` itself is still unexercised through a real signed-in browser session, the same gap noted in spec 0003's `verify.md` (no sign in flow exists yet, core discovery loop, #7, builds it)
7. [x] Create the PostHog project and set `NEXT_PUBLIC_POSTHOG_KEY`/`POSTHOG_HOST` — **partially**: one shared PostHog project is live and its key is in `.env.local`. The engineer explicitly chose, live in this build session (2026-08-11), to defer the dev/staging vs production project split for now rather than create a second project; **AC-8 is not satisfied as originally written**. Revisit when the cost of cross-environment noise in one project actually bites, or fold the decision into a future `/architect` pass if it should be formally recorded as changed.

## Consequences

**Positive**:

- The core discovery loop feature can call `trackClient`/`trackServer` with the four core events already typed and defined; it does not need to design an event taxonomy while also building sign in, swipe, and the feed
- The `/ingest` proxy protects client side event counts from ad blocker loss, so onboarding and feed metrics stay trustworthy once real users arrive
- A provider verified, working pipe exists before any real UI does, catching integration problems (a bad API key, a misconfigured proxy) early instead of discovering them mid feature build

**Negative / tradeoffs**:

- Adds a third external vendor account (after TMDB and Sentry) and a second PostHog project to manage (development/staging versus production)
- Autocapture and session replay are both off, so no incidental behavioral data exists yet; anything not explicitly added to the typed event map later is simply not recorded
- The `/ingest` rewrite is one more moving part in `next.config.ts`; because a failed send is silently swallowed (AC-5), a broken proxy would not throw an obvious error, only quietly missing data, so it needs a deliberate check after deploy, not an assumption that it works
- No in app analytics opt out exists yet; deferred intentionally to slice 4, so no user can opt out of the ids only tracking this spec defines until that slice ships

**Neutral**:

- PostHog is the only place event data lives; there is no local Supabase mirror, so joining analytics with recommendation or rating data later needs either PostHog's own export/API or a deliberate follow up decision to add a mirror table
- The typed event map starts at four events; the core discovery loop, CSV import, and vibe search features each add their own events to the same map as they are built, rather than this spec trying to anticipate them

## Follow-up

- [ ] Core discovery loop (#7) wires the real `onboarding_started`/`onboarding_completed` and `feed_viewed`/`feed_item_engaged` call sites using `trackClient`/`trackServer` against the event map this spec defines
- [ ] Account & privacy settings (slice 4) owns the analytics opt out control; this foundation intentionally ships without one
- [ ] The PostHog MCP server was run via `npx @posthog/wizard@latest mcp add` but hadn't registered in this session's tool list as of 2026-08-11 (MCP servers load at session start); confirm it connects after a fresh session/restart
- [ ] If a future feature needs to join analytics data with recommendation quality data, revisit the "no local Supabase mirror" choice made here
- [ ] AC-8 (separate dev/staging vs production PostHog projects) is deferred by the engineer's explicit choice on 2026-08-11: one shared project is in use for now. Create the second project and split the keys per Vercel environment when this stops being good enough, or run `/architect` to formally amend the decision if a written record is wanted

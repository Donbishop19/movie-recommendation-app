# 0009. Vibe search

**Date**: 2026-08-13
**Status**: In Progress

## Summary

This decision designs vibe search: a free text search screen where a user types a mood or theme ("moody, slow burn, like Blade Runner") and gets back a ranked list of movies that actually match that meaning, not just keywords. Results are also shaped by what the user has already liked. It reuses the vector column already reserved on the movie catalog and finally puts Inngest, the project's chosen background job tool, to work computing each movie's embedding. No new database tables are needed.

## Requirements

**User stories**:

- As a user, I want to type a free text description of the kind of movie I'm in the mood for, so I can find something that matches without knowing its title or genre.
- As a user, I want search results shaped by what I've already liked, so a vague query still feels personal to my taste.
- As a user unsure what to type, I want example vibes I can tap, so I can try the feature without guessing at a good query.
- As a user, I want to like or dislike a search result right there, so acting on a good find doesn't require leaving the screen.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A signed in user submitting a free text query (explicit submit, not as they type) on `/search` gets back up to 20 movies ranked by semantic similarity to the query, drawn only from movies that already have a computed embedding.
- **AC-2**: For a user with 3 or more liked movies (`rating_value >= 4`), ranking blends the query embedding with a taste centroid computed from those liked movies' embeddings (query weighted heavier). A user with fewer than 3 liked movies gets results ranked by query similarity alone.
- **AC-3**: Requesting more results returns a further batch, with no movie repeated from the current search session, matching the feed's load more pattern.
- **AC-4**: A query with no result scoring above the similarity threshold shows an empty state message plus a popularity ranked fallback list, instead of forcing weak matches onto the user.
- **AC-5**: A movie the user already rated (any value or source) can still appear in vibe search results; unlike the feed, vibe search does not exclude rated movies.
- **AC-6**: Liking or disliking a search result writes into the same `ratings` row the feed uses (`source = 'swipe'`, unique per user and movie), respecting the existing rule that a `csv_import` rating is never overwritten by this kind of write.
- **AC-7**: A query over 200 characters or empty/whitespace only is rejected with a typed validation error before any OpenAI call is made; a caller exceeding the per user rate limit gets a typed rate limited error, also before any OpenAI call.
- **AC-8**: A signed out caller invoking the search action or the result rating action is rejected with `unauthorized`.
- **AC-9**: Once a movie is cached through any existing upsert path and has no embedding yet, an Inngest function embeds its title, synopsis, and genres and writes `movies.embedding` plus `embedding_updated_at`. A movie with no embedding is never a search candidate.
- **AC-10**: If the OpenAI call to embed the query fails (timeout, rate limit, outage), the search screen shows an inline retry state without losing the query text the user typed.
- **AC-11**: The search screen shows a row of tappable example vibe queries above the input.

## Options considered

### Option 1: Query and taste centroid blended pgvector search over an organically grown, Inngest embedded catalog (recommended)

Embed the query with OpenAI at request time, blend it with a centroid built from the user's liked movies' embeddings, and run one pgvector cosine similarity query with an HNSW index. Movie embeddings are computed asynchronously by an Inngest function triggered on every cache write missing one.

**Pros**:

- Personalization and query relevance resolve in a single pgvector query
- Puts Inngest, chosen in spec 0001, to real use for the first time
- No schema change; reuses the column spec 0002 already reserved

**Cons**:

- The project now runs two background job mechanisms side by side (Inngest here, `pg_cron`/`pg_net` for catalog refresh)

### Option 2: Query only search, synchronous embedding, no personalization

Embed a movie inline the moment it's cached (blocking the existing upsert path), skip the taste centroid, rely on `pg_cron` for stragglers, matching spec 0003's job pattern exactly.

**Pros**:

- Fewest moving parts, one job mechanism total
- No blend logic to build or tune

**Cons**:

- Does not satisfy the "informed by taste profile" requirement
- Slows down `getOrRefreshMovie`, `searchMovies`, and `browsePopularMovies` with an inline OpenAI call on every cache write

### Option 3: LLM based structured tag extraction instead of embeddings

Route the query through an LLM to extract structured tags (mood, era, theme) against a fixed taxonomy, then filter the catalog by those tags, no vector similarity involved.

**Pros**:

- Results explainable by name ("tagged moody, slow burn")
- No vector index or blend math to tune

**Cons**:

- Needs a hand maintained taxonomy (brittle, misses queries outside it) or a second LLM hop per query, adding latency and cost
- Leaves the vector infrastructure spec 0001 and 0002 already built for this exact feature unused

## Decision

**Chosen option**: Option 1: Query and taste centroid blended pgvector search over an organically grown, Inngest embedded catalog

Build `vibeSearch` as a Server Action that embeds the caller's query with OpenAI, blends it with a taste centroid when the caller has 3 or more liked movies, and ranks the cached, embedded catalog with a cosine similarity pgvector query behind an HNSW index. A new Inngest function, triggered whenever a movie is cached without an embedding, computes it from the movie's title, synopsis, and genres. A `rateSearchResult` Server Action reuses the existing rating write path for inline like and dislike on a result. No new tables.

**Implementation skills**: `inngest-durable-functions` (`inngest/inngest-skills`, `.agents/skills/inngest-durable-functions/`) · `supabase` (`supabase/agent-skills`, `.agents/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.agents/skills/supabase-postgres-best-practices/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `posthog-instrumentation` (`posthog/posthog-for-claude`, `.agents/skills/posthog-instrumentation/`) · `sentry-get-started` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-get-started/`)

## Rationale

Reasoning and options considered: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

No new tables or columns. This feature reads and writes only what spec 0002 already built:

- `movies.embedding` (`vector(1536)`, nullable) and `movies.embedding_updated_at`: written only by the new Inngest function, read by every vibe search query.
- `movies` (id, title, synopsis, genres, poster_url, external_rating): read to build the embedding input text and to render results.
- `ratings` (user_id, movie_id, rating_value, source): read to build the taste centroid (`rating_value >= 4`), written by `rateSearchResult` using the same upsert and source precedence rule as `swipeMovie`/`engageFeedItem`.
- `profiles`: read only via the existing session/ownership helpers, no new fields.

**State transitions**:

`movies.embedding`: `null` to a vector, written exactly once per movie by the Inngest function (a later catalog refresh does not currently re-embed; see Follow-up). No other transition.

**API surface**:

| Endpoint                                                             | Method         | Key inputs                                               | Key outputs                                       | Auth                                              | Key errors                                                        |
| -------------------------------------------------------------------- | -------------- | -------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| `vibeSearch` (Server Action)                                         | n/a            | `query: string`, `cursor?` (opt, for load more)          | `items` (movie, no raw score), `hasMore`          | session                                           | `unauthorized`, `invalid_query`, `rate_limited`, `unknown`        |
| `rateSearchResult` (Server Action)                                   | n/a            | `movieId: string` (uuid), `action` (`like` \| `dislike`) | void                                              | session                                           | `unauthorized`, `not_found`, `unknown`                            |
| `embedMovie` (Inngest function, triggered by a `movie/cached` event) | n/a            | `movieId` (from the event payload)                       | writes `movies.embedding`, `embedding_updated_at` | internal (Inngest signing key)                    | retried by Inngest; reported to Sentry once retries are exhausted |
| `/api/inngest` (Route Handler, Inngest's serve endpoint)             | GET, POST, PUT | Inngest's own signed request                             | n/a                                               | `INNGEST_SIGNING_KEY` verified by the Inngest SDK | 401 on an unverified request (handled by the SDK)                 |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action                           | Value produced / displayed | Source                                                                                                                                                                                                      |
| -------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vibeSearch`                     | query embedding            | OpenAI `embeddings.create` on the caller's raw `query` text, this spec                                                                                                                                      |
| `vibeSearch`                     | taste centroid             | `AVG(movies.embedding)` over the caller's `ratings` rows where `rating_value >= 4`, joined to `movies`, only computed when that set has 3 or more rows (same threshold as spec 0006's feed cold start rule) |
| `vibeSearch`                     | blended ranking vector     | Computed: query embedding weighted 0.75, taste centroid weighted 0.25 when present, this spec (see Key invariants)                                                                                          |
| `vibeSearch`                     | candidate pool             | `movies` where `embedding IS NOT NULL`, ordered by cosine distance (`<=>`) to the blended vector, this spec                                                                                                 |
| `vibeSearch`                     | empty state trigger        | Computed: no candidate scores within the similarity threshold, this spec                                                                                                                                    |
| `vibeSearch`                     | fallback list              | `browsePopularMovies` (existing, spec 0003), reused as is                                                                                                                                                   |
| `vibeSearch`, `rateSearchResult` | caller identity            | Supabase Auth session, via the existing `requireSession()` (spec 0003)                                                                                                                                      |
| `rateSearchResult`               | `rating_value`             | Same fixed mapping as `swipeMovie` (spec 0002/0006): like = 4.5, dislike = 1.0                                                                                                                              |
| `rateSearchResult`               | `movie_id`, `user_id`      | Caller's `movieId` input and the session identity                                                                                                                                                           |
| `embedMovie`                     | embedding input text       | Concatenated `title`, `synopsis`, and `genres` from the triggering `movies` row, this spec                                                                                                                  |
| `embedMovie`                     | trigger                    | A `movie/cached` Inngest event, sent from the existing list and detail upsert paths (spec 0003) whenever the written row's `embedding` is null, this spec                                                   |

**Key invariants**:

- `movies.embedding` is written only by `embedMovie`; no request path (search, catalog lookup, browse) ever calls OpenAI's embedding endpoint for a movie inline, keeping catalog writes fast (per spec 0003's existing design intent).
- `vibeSearch`'s candidate pool is always `WHERE embedding IS NOT NULL`; a movie without one is invisible to search until `embedMovie` runs, by design (see Consequences).
- The taste centroid uses the same "3 or more liked movies" threshold as the feed's cold start fallback (spec 0006, AC-6), so the two features degrade the same way for a new user.
- The blend weight (query 0.75, taste centroid 0.25) and the empty result similarity threshold are initial values owned by this spec, expected to need live tuning (see Follow-up); they are not user configurable.
- Distance metric is cosine (`<=>`), matching the metric OpenAI recommends for `text-embedding-3-small`; the HNSW index is built with `vector_cosine_ops` to match.
- `rateSearchResult` reuses `swipeMovie`'s exact rating write rules, including the source precedence rule from spec 0002: a `csv_import` sourced rating is never overwritten by this write.
- Vibe search never excludes a movie for having already been rated (AC-5); this is a deliberate difference from the feed's exclusion rule, since a search is an explicit request, not a passive recommendation.
- The query text a user types is never persisted to any table; it is sent to OpenAI for embedding and, separately, only a non identifying event (result count, whether results were found) is sent to PostHog, never the raw query string, matching AGENTS.md's analytics conventions (`src/analytics/AGENTS.md`: no event property is ever raw free text).
- The per user search rate limit is enforced with an in memory counter inside the Server Action's process, a deliberate best effort choice (see Consequences), not a durable cross instance guarantee.

**Security model**:

`vibeSearch` and `rateSearchResult` both call the existing `requireSession()` helper (spec 0003) first, rejecting an unauthenticated caller with `unauthorized`. `rateSearchResult` needs no separate ownership check beyond the session: it always writes to `(session.userId, movieId)`, the same shape as `swipeMovie`, never someone else's row. The `embedMovie` Inngest function and the `/api/inngest` Route Handler are not user facing; the Inngest SDK verifies every inbound call against `INNGEST_SIGNING_KEY`, matching the trust model spec 0003 already used for its shared secret protected refresh endpoint. `movies.embedding` writes go through the existing service role Drizzle connection, same as every other catalog write. No new regulated data: the only new third party data flow is the user's typed query text going to OpenAI at request time, an extension of the same trust boundary spec 0001 already accepted for embedding catalog synopsis text.

**Configuration required**:

- `OPENAI_API_KEY`: server only, used for both the query embedding call in `vibeSearch` and the movie embedding call in `embedMovie`
- `INNGEST_EVENT_KEY`: used to send the `movie/cached` event from the app to Inngest
- `INNGEST_SIGNING_KEY`: used by the Inngest SDK to verify inbound calls to `/api/inngest`

All three validated at startup, failing loudly if missing, matching the existing `dbEnv`/`tmdbEnv` pattern.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: a user with 5 liked action movies searches "heist gone wrong"; results blend the query with their taste centroid and rank by cosine similarity, verifies **AC-1**, **AC-2**
- Failure case: OpenAI's embedding call times out mid search; the screen shows an inline retry and the typed query is not cleared, verifies **AC-10**
- Auth/permission: a signed out request to `vibeSearch` is rejected with `unauthorized` before any OpenAI call is made, verifies **AC-8**

## Build plan

1. [x] Add the OpenAI SDK and its env validation, add the Inngest client and the `/api/inngest` serve Route Handler, and add the `embedMovie` Inngest function (title + synopsis + genres in, `movies.embedding` + `embedding_updated_at` out), triggered by a `movie/cached` event fired from the existing list and detail upsert paths whenever the written row has no embedding, satisfies **AC-9**
2. [x] Migration: add an HNSW index on `movies.embedding` using `vector_cosine_ops`, satisfies **AC-1** — already applied by the spec 0002 migration (`20260809120000_core_data_model.sql`), which built this index ahead of time; no new migration needed
3. [x] `vibeSearch` Server Action: embed the query, run the cosine similarity query against embedded movies only, cap at 20 with a cursor for load more, behind the session guard, satisfies **AC-1**, **AC-3**, **AC-5**, **AC-8**
4. [x] Blend in the taste centroid (the `rating_value >= 4`, 3-or-more-liked-movies query and vector blend) and the empty state plus `browsePopularMovies` fallback, satisfies **AC-2**, **AC-4**
5. [x] Query length cap, the in memory per user rate limit, and their typed errors (`invalid_query`, `rate_limited`), satisfies **AC-7**
6. [x] `rateSearchResult` Server Action, reusing the existing rating upsert and source precedence rule, satisfies **AC-6**
7. [x] `/search` screen: TabBar entry (Feed, Search, Account), the query input with explicit submit, the preset vibe ChipGroup, the two column result grid reusing the feed's `Card` and like/dislike pattern, loading/empty/error states, and the inline retry on an embedding failure, satisfies **AC-1**, **AC-10**, **AC-11**
8. [x] Wire the `vibe_search_performed` analytics event (result count, whether results were found; never the raw query text) through the existing analytics helpers, and report `embedMovie` failures (after Inngest's retries are exhausted) and query embedding failures to Sentry, matching spec 0003's existing error reporting pattern

## Consequences

**Positive**:

- Delivers personalized semantic search on schema that already exists, no migration risk beyond one new index
- Finally activates Inngest, closing the gap between what spec 0001 committed to and what the codebase actually runs, and gives the project a real durable job pattern to reuse later
- Reuses the feed's proven poster grid and like/dislike interaction, so the search screen needed no new core UI component
- Blending personalization into one pgvector query keeps ranking a single query, no second pass or re-sort step

**Negative / tradeoffs**:

- The candidate pool is bounded to whatever's already cached and embedded; a catalog that has seen little swipe/browse/lookup traffic will feel thin until it grows organically, an explicit tradeoff over pre-seeding a broader pool
- The in memory rate limit is best effort only; it will not enforce a hard cap for a caller spread across multiple cold serverless instances, accepted because the per query cost is small and the project runs at single operator scale today
- Every query sends the user's free text to OpenAI, extending the same third party trust boundary spec 0001 already accepted for catalog synopsis text, now to user input as well
- The project now runs two background job mechanisms side by side, Inngest here and `pg_cron`/`pg_net` for the spec 0003 catalog refresh, a real added surface rather than one consistent pattern

**Neutral**:

- The blend weight (0.75/0.25) and the empty result similarity threshold are initial values, expected to need tuning once real query traffic exists
- The feed's cosmetic category `ChipGroup` (`design.md`'s Known gap) is not wired to real filtering by this feature; vibe search ships as its own screen, not a feed filter mode

## Follow-up

- [ ] Tune the query/taste centroid blend weight and the empty result similarity threshold once real usage exists
- [ ] If the "thin pool early on" tradeoff proves a real problem, revisit proactively seeding a broader embedded catalog
- [ ] If a hard rate limit guarantee is ever needed (not best effort), move the counter off in memory onto a durable store
- [ ] Now that Inngest is wired up, consider migrating the spec 0003 catalog refresh job onto it too, for one consistent background job mechanism; revisit only if running both becomes a real maintenance cost
- [ ] Consider whether the feed's cosmetic `ChipGroup` should be wired to real category filtering, or reconsidered now that vibe search exists as the "second ranking mode" `design.md`'s Known gap anticipated
- [ ] A catalog refresh (spec 0003) currently never re-embeds an already embedded movie even if its synopsis changes; revisit if stale embeddings ever prove a real quality issue

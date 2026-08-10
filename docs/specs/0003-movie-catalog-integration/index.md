# 0003. Movie catalog integration

**Date**: 2026-08-10
**Status**: In Progress

## Summary

This decision picks TMDB (The Movie Database) as the movie metadata provider and defines how the app fetches, caches, and refreshes that data. A movie's full details (poster, genres, cast, synopsis, rating) are fetched from TMDB the first time anyone looks it up, then cached in the `movies` table spec 0002 already reserved for this. A small scheduled job keeps old cache rows from going stale forever. This gives every later feature, swiping, the feed, CSV import, vibe search, a real, working movie catalog to build against instead of placeholder data.

## Requirements

**User stories**:

- As a user browsing the swipe deck, I want a real, currently popular set of movies to rate, so onboarding feels alive instead of empty.
- As a user uploading a Letterboxd CSV, I want my titles matched against real catalog data, so the import actually finds my movies.
- As any user viewing a movie, I want full metadata (poster, genres, cast, synopsis, rating), so the recommendation makes sense to me.
- As the person running this project, I want the catalog to stay reasonably fresh without an operational burden, so I am not manually re-syncing data.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A lookup for a movie whose cached row has full detail data (was itself written by a detail fetch, not just a search/browse hit) and is less than 7 days old returns the cached row without calling TMDB.
- **AC-2**: A lookup for a movie with no cached row, a cached row that only ever came from a search/browse hit (no detail data yet), or a detail row 7 days or older, fetches full details from TMDB (including cast, which needs the `credits` addition to TMDB's response), upserts the row as a detail write, and returns the fresh data. If TMDB reports the movie as adult flagged, the lookup returns `not_found` instead of caching it.
- **AC-3**: A repeated cache write for the same (`external_source`, `external_id`) updates the existing row through a real upsert; it never creates a duplicate row or throws a unique violation.
- **AC-4**: A title search always queries TMDB's live search (never the local cache first), caches every returned movie's list level fields through a list upsert (see Key invariants; it never overwrites existing detail data and never marks a row as having full detail), and returns the ranked candidate list.
- **AC-5**: A browse/discover call returns one page (20 results, TMDB's default) of TMDB's popularity ranked movies, caching each through the same list upsert as search; a caller can request additional pages (clamped to TMDB's 500 page limit).
- **AC-6**: When TMDB is unavailable, times out, or is rate limited on a lookup with no usable cached row, the action returns a typed `Result` error, never a thrown exception or a silently empty result.
- **AC-7**: An hourly scheduled job refreshes up to 25 cached rows needing a detail fetch (no detail data yet, or detail data 7 days or older), oldest first. A successful refresh or a definitive 404 (TMDB no longer has the movie) both mark the row as freshly checked, a 404'd row keeps serving its last cached metadata, just without dominating every future batch; only a transient failure (timeout, 5xx, rate limit) leaves the row's freshness unchanged so it is retried on the next batch or the next direct request.
- **AC-8**: The lookup, search, and browse actions all reject a caller with no valid Supabase Auth session.
- **AC-9**: Search, browse, and the direct lookup all exclude adult flagged content: search and browse pass `include_adult=false` to TMDB, and a lookup whose TMDB response is itself adult flagged is treated as not found (see AC-2). No path ever caches or returns an adult flagged title.
- **AC-10**: Every TMDB error and every refresh failure is reported to Sentry, never silently swallowed.
- **AC-11**: The refresh endpoint rejects any request missing the correct shared secret header with a 401, and cannot be triggered by an ordinary client request.

## Decision

**Chosen option**: Option 1: TMDB, on demand cache aside with a scheduled staleness refresh

Integrate TMDB as the sole metadata provider using its v4 Bearer read access token. Every lookup, search, and browse result is cached into the existing `movies` table through a real upsert (fixing the tracer bullet's check then insert race), a full detail upsert for a direct lookup and a lighter list upsert for search/browse (see Feature design). An hourly `pg_cron` plus `pg_net` job calls a shared secret protected Route Handler that refreshes up to 25 stale rows at a time.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.agents/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.agents/skills/supabase-postgres-best-practices/`) · `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `sentry-get-started` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-get-started/`)

## Rationale

Reasoning and options considered: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

No schema change. This feature populates the columns spec 0002 already reserved on `movies`: `external_source` (always the literal `'tmdb'`), `external_id`, `title`, `release_year`, `synopsis`, `poster_url` (stored as a full absolute URL, not TMDB's relative path), `genres`, `cast_members`, `runtime_minutes`, `external_rating`, `cached_at`. The unique constraint on (`external_source`, `external_id`) from spec 0002 is what the upsert targets.

TMDB's search and discover endpoints do not return `genres` (only numeric ids), `cast_members`, or `runtime_minutes`, only its single movie detail endpoint does. Rather than add a new "has full detail" column, `cached_at` itself carries that meaning: a **list upsert** (from search or browse) writes only the fields the list response actually has (`title`, `release_year`, `synopsis`, `poster_url`, `external_rating`) and, only on first insert, sets `cached_at` to the Unix epoch (`to_timestamp(0)`), a deliberately ancient timestamp; a **detail upsert** (from a direct lookup or the refresh job) writes every column, including `genres`, `cast_members`, `runtime_minutes`, and sets `cached_at = now()`. Since the epoch is always more than 7 days old, a list seeded row always reads as needing a detail fetch (AC-1/AC-2), and a list upsert on an existing row never touches `cached_at` or the detail only columns, so it can never downgrade a row that already has real detail data.

**API surface**:

| Endpoint                              | Method | Key inputs                                        | Key outputs                  | Auth                        | Key errors                             |
| ------------------------------------- | ------ | ------------------------------------------------- | ---------------------------- | --------------------------- | -------------------------------------- |
| `getOrRefreshMovie` (Server Action)   | n/a    | `tmdbId: number`                                  | `Movie`                      | signed in session required  | `not_found`, `unauthorized`, `unknown` |
| `searchMovies` (Server Action)        | n/a    | `query: string`, `year?: number`, `page?: number` | `Movie[]`, `totalPages`      | signed in session required  | `unauthorized`, `unknown`              |
| `browsePopularMovies` (Server Action) | n/a    | `page?: number` (default 1)                       | `Movie[]`, `totalPages`      | signed in session required  | `unauthorized`, `unknown`              |
| `/api/jobs/refresh-catalog`           | POST   | header `x-catalog-refresh-secret`                 | `{ refreshedCount: number }` | shared secret (pg_net only) | 401 unauthorized                       |

Errors reuse spec 0002's existing `DataError` union (`not_found | unauthorized | conflict | unknown`), no new error variants. A TMDB 404 on a direct lookup maps to `not_found`; a timeout, 5xx, or 429 (rate limited) maps to `unknown`, AC-6 only requires a typed error comes back, not that every provider failure mode is separately distinguishable.

**Value sourcing** (every value each action produces, computes, or displays names where it comes from):

| Action                                                     | Value produced / displayed                                                                 | Source                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getOrRefreshMovie`                                        | title, synopsis, external_rating                                                           | TMDB `GET /3/movie/{id}?append_to_response=credits`: `title`, `overview`, `vote_average`                                                                                             |
| `getOrRefreshMovie`                                        | release_year                                                                               | First 4 characters of TMDB's `release_date` (`YYYY-MM-DD`), parsed to an integer; `undefined` when `release_date` is empty (an unreleased title)                                     |
| `getOrRefreshMovie`                                        | genres                                                                                     | TMDB's `genres` array (name field only; the numeric `genre_ids` list search/discover return is not used here)                                                                        |
| `getOrRefreshMovie`                                        | cast_members                                                                               | TMDB's `credits.cast`, top 10 by billing `order`, stored as `{ tmdbId, name, character, profilePath }` (`profilePath` made absolute the same way as poster_url)                      |
| `getOrRefreshMovie`                                        | runtime_minutes                                                                            | TMDB's `runtime`                                                                                                                                                                     |
| `getOrRefreshMovie`, `searchMovies`, `browsePopularMovies` | poster_url (absolute)                                                                      | Computed: `https://image.tmdb.org/t/p/w500` + TMDB's `poster_path`                                                                                                                   |
| `getOrRefreshMovie`, `searchMovies`, `browsePopularMovies` | external_source                                                                            | Fixed constant `'tmdb'`, this spec's provider decision                                                                                                                               |
| `getOrRefreshMovie`                                        | external_id                                                                                | Caller's `tmdbId` input                                                                                                                                                              |
| `getOrRefreshMovie`                                        | adult-flagged rejection                                                                    | TMDB's `adult` field on the detail response; `true` short circuits to `not_found` before any upsert (AC-2, AC-9)                                                                     |
| all three Server Actions                                   | caller identity for the session guard                                                      | Supabase Auth session cookie, read via `requireSession()` calling `supabase.auth.getUser()`                                                                                          |
| `searchMovies`                                             | candidate list, ranking order                                                              | TMDB `GET /3/search/movie` (`query`, `primary_release_year`, `page`, `include_adult=false`); order is TMDB's own relevance ranking                                                   |
| `searchMovies`, `browsePopularMovies`                      | title, release_year, synopsis, external_rating (list level fields, no genres/cast/runtime) | TMDB's `title`/`overview`/`vote_average` and `release_date` (parsed the same way as the detail path); `genre_ids` (numeric) is not mapped to `genres`, left for a later detail fetch |
| `searchMovies`, `browsePopularMovies`                      | totalPages                                                                                 | TMDB's `total_pages`; requested `page` is clamped to 1 to 500, TMDB's own page limit                                                                                                 |
| `browsePopularMovies`                                      | list, ranking order                                                                        | TMDB `GET /3/discover/movie?sort_by=popularity.desc&include_adult=false&page=N`; order is TMDB's own popularity ranking                                                              |
| `/api/jobs/refresh-catalog`                                | which rows to refresh                                                                      | DB query: `movies` where `cached_at` older than 7 days (this naturally includes every list seeded row, whose `cached_at` is the epoch), ordered oldest first, limit 25               |
| `/api/jobs/refresh-catalog`                                | caller authorization                                                                       | `x-catalog-refresh-secret` header compared to the `CATALOG_REFRESH_SECRET` env var                                                                                                   |

**Key invariants**:

- `movies` stays unique on (`external_source`, `external_id`); every cache write is a real upsert (`ON CONFLICT ... DO UPDATE`), closing the tracer bullet's check then insert race
- `external_source` is always the literal `'tmdb'` for every row this feature writes; no other provider is integrated
- **List upsert vs detail upsert** (see Data model sketch): a list upsert (search, browse) writes only `title`, `release_year`, `synopsis`, `poster_url`, `external_rating`, and on insert only sets `cached_at` to the Unix epoch; on conflict it never touches `cached_at`, `genres`, `cast_members`, or `runtime_minutes`, so it can never overwrite or downgrade a row that already has real detail data. A detail upsert (a direct lookup, or the refresh job) writes every column and always sets `cached_at = now()`
- `cached_at` advances on a successful detail fetch or a definitive 404; a transient failure (timeout, 5xx, rate limit) leaves it unchanged, so the row is retried on the next request or scheduled batch, but a permanently gone title does not dominate every future refresh batch
- Search and browse always pass `include_adult=false`; a direct lookup whose TMDB response is itself adult flagged is treated as not found. No path ever caches or returns an adult flagged title
- All three consumer actions require a Supabase Auth session before touching TMDB or the DB
- The refresh Route Handler only runs with the correct shared secret header; the secret is a server only env var, never exposed to the client bundle
- Every TMDB call (from any of the three actions or the refresh job) uses a 5 second timeout (`AbortSignal.timeout(5000)`) and is not retried in the request path; the refresh job may retry a single call once if TMDB returns a `Retry-After` header on a 429, otherwise it does not retry either, leaving that row for the next scheduled batch

**Security model**:

The three consumer Server Actions require a valid Supabase Auth session, checked by a `requireSession()` helper (`src/auth/session.ts`) using `@supabase/ssr`'s server client and the caller's session cookie, read with the anon key. This matches AGENTS.md's rule that the anon key is used only for the auth handshake, never for data reads; all `movies` reads and writes still go through the Drizzle service role connection from spec 0002, and its existing RLS policies (authenticated read only, service role write) are unchanged. The refresh Route Handler is not session gated, since `pg_net` calls it as a machine, not a signed in user; instead it checks a shared secret header against a server only env var and returns 401 without it. The TMDB read access token is a server only secret used only inside the TMDB client module.

**Configuration required**:

- `TMDB_READ_ACCESS_TOKEN`: TMDB's v4 Bearer read access token, used by the TMDB client for every request
- `CATALOG_REFRESH_SECRET`: shared secret the `pg_cron`/`pg_net` job presents to call the refresh Route Handler. Stored as a Postgres setting (`ALTER DATABASE ... SET app.settings.catalog_refresh_secret`, or Supabase Vault) rather than a literal in the migration file, and also as the app's own env var so the Route Handler can compare against it. Spec 0001 uses a separate Supabase project for staging, so a value hardcoded into the migration file would apply the same secret and target URL to both staging and production; setting it per project keeps the migration file environment agnostic
- `CATALOG_REFRESH_URL`: same reasoning as the secret above, the target URL `pg_net` calls, stored per project rather than hardcoded, so staging's cron never points at production
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public Supabase project URL and anon key, used only by the session helper to read the caller's auth session, not for data access
- `SENTRY_DSN`: used by `@sentry/nextjs` to report every TMDB and refresh failure (AC-10); neither the package nor this env var exist in the project yet, both are added by this feature (see Build plan)

All validated at startup, failing loudly if missing, matching the existing `dbEnv` pattern (`src/db/env.ts`).

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: a signed in caller looks up a TMDB id never seen before; the action fetches it from TMDB, upserts it, and returns full metadata with an absolute poster URL, verifies **AC-1**, **AC-2**, **AC-8**
- Failure case: TMDB times out on a lookup with no existing cached row; the caller gets a typed error `Result`, not a thrown exception, verifies **AC-6**
- Auth/permission: an unauthenticated caller invokes any of the three actions and gets `unauthorized` instead of the action running, verifies **AC-8**
- Refresh job: the scheduled batch hits a row TMDB now 404s on; that row's existing cached metadata keeps being served, `cached_at` still advances so it does not stay at the head of the next batch, while other rows in the same batch refresh normally, verifies **AC-7**

## Build plan

1. [x] Install and minimally initialize `@sentry/nextjs` (`SENTRY_DSN`), reused by every task below for AC-10. Add a server only TMDB client module (`src/movies/tmdb-client.ts`) with Bearer auth, a 5 second timeout (`AbortSignal.timeout(5000)`), no retry, and startup validation of `TMDB_READ_ACCESS_TOKEN` (matching the `dbEnv` pattern), satisfies **AC-6**, **AC-10**
2. [x] Install `@supabase/ssr` and add the Supabase Auth session helper (`src/auth/session.ts`) using its server client and the new `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars; #7 (core discovery loop) reuses this same mechanism for its sign in flow rather than building its own, satisfies **AC-8**
3. [x] Replace the tracer bullet's check then insert in `src/app/actions/movies.ts` with a real detail upsert (writes every column, `cached_at = now()`), and extend it into `getOrRefreshMovie(tmdbId)`: return a cache hit whose `cached_at` is within 7 days as is (this naturally excludes list seeded rows, their `cached_at` is the epoch), otherwise call the TMDB client's get by id (with `append_to_response=credits`), short circuit to `not_found` if the response is adult flagged, otherwise map the response onto the `movies` columns (parsed `release_year`, top 10 `cast_members` by billing order, the absolute poster URL) and upsert, all behind the session guard, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-6**, **AC-8**, **AC-9**, **AC-10**
4. [x] Add a list upsert helper (writes only `title`, `release_year`, `synopsis`, `poster_url`, `external_rating`, sets `cached_at` to the epoch only on insert, touches nothing else on conflict) and `searchMovies` in the same file: call TMDB's search endpoint (`include_adult=false`), cache every returned movie through the list upsert, clamp `page` to TMDB's 1 to 500 range, return the ranked list and `totalPages` behind the session guard, satisfies **AC-4**, **AC-6**, **AC-8**, **AC-9**, **AC-10**
5. [x] Add `browsePopularMovies`: call TMDB's discover endpoint (`sort_by=popularity.desc`, `include_adult=false`, one page of 20 by default, page clamped the same way), cache every returned movie through the same list upsert, return the list and `totalPages` behind the session guard, satisfies **AC-5**, **AC-6**, **AC-8**, **AC-9**, **AC-10**
6. [x] Add the protected refresh Route Handler (`src/app/api/jobs/refresh-catalog/route.ts`): verify the `x-catalog-refresh-secret` header against `CATALOG_REFRESH_SECRET` (401 if missing or wrong), query up to 25 `movies` rows needing a detail fetch (`cached_at` older than 7 days, oldest first, which includes every list seeded row), refresh each through the TMDB client and the detail upsert (a definitive 404 still advances `cached_at`, a transient failure does not, retried once if TMDB sends `Retry-After`), report failures to Sentry, return the refreshed count, satisfies **AC-7**, **AC-10**, **AC-11**
7. [x] Add a migration enabling `pg_net` and scheduling an hourly `pg_cron` job that calls the refresh Route Handler, reading the target URL and shared secret from a per project Postgres setting (Supabase Vault), never a literal in the migration file, satisfies **AC-7**. `pg_net` cannot reach a local dev server, so verify this task by invoking the Route Handler directly with the correct header, not by waiting on a live cron fire

## Consequences

**Positive**:

- One TMDB client backs every lookup, search, and browse call; #7 and #8 build against a ready surface instead of each integrating a provider themselves
- Settles spec 0002's open `external_source`/`external_id` placeholder and its Follow-up item
- The scheduled refresh keeps the cache from silently going stale forever for movies nobody happens to re-request, and as a side effect it is also what promotes a search/browse seeded row (list level fields only) up to full detail data, without a user ever needing to trigger a direct lookup

**Negative / tradeoffs**:

- Adds a second external vendor account (TMDB) and a second background job trigger (`pg_net`) on top of what spec 0001 already committed to
- The auth session helper is built ahead of #7's actual sign in flow; it only proves a valid Supabase session is required, not the full sign in UX, so #7 still has real design work to do
- No app side rate limiting on search or browse; if usage or abuse ever approaches TMDB's stated rate limit, this becomes a real gap, deferred deliberately this session
- Two separate upsert paths (list vs detail) instead of one is real added complexity, needed only because TMDB's search/discover responses are thinner than its detail response; a single, simpler upsert was not possible without either losing the browse/search capability's caching or silently corrupting a fully cached row

**Neutral**:

- `external_source` is fixed to the literal `'tmdb'` everywhere; adding a second provider later means reopening this spec, not a config change
- The discover/browse pool for #7's swipe seed reflects TMDB's own popularity ranking; a future personalized cold start seeding strategy is a decision for #7, not this spec

## Follow-up

- [ ] Core discovery loop (#7) should reuse `requireSession()` from this spec rather than rebuild its own, and design the actual sign in UI/flow on top of it
- [ ] Letterboxd CSV import (#8) should build its title/year matching algorithm on top of `searchMovies`, not integrate TMDB itself
- [ ] If usage ever nears TMDB's stated rate limit, revisit the "no app side rate limiting" choice made here
- [ ] Agent Skills/MCP discovery for TMDB was declined this session; nothing installed

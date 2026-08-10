# 0002. Data model

**Date**: 2026-08-09
**Status**: Accepted

## Summary

This decision sets the core database schema for the movie recommendation app: the tables for user profiles, the movie catalog cache, ratings (from both swiping and Letterboxd import), imports, the personalized feed, and the vector column vibe search will use later. Every later feature (onboarding, the feed, CSV import, vibe search, account deletion) builds on this schema without needing a breaking change. It also settles the query layer left open by spec 0001: Drizzle ORM on top of Supabase Postgres.

## Context

> Premise note: this spec depends on one decision that has not been made yet, movie catalog integration (spec 4, not written). The schema below does not wait on it: movie identity is kept as an internal id with a generic external_source/external_id pair, so whichever provider spec 4 picks slots in without changing a foreign key anywhere else.

The app has two onboarding paths (swipe, Letterboxd CSV import) that must both build one taste profile the feed and vibe search read from. The feed needs a persisted reason per recommendation and a way to avoid immediately repeating a movie. Spec 0001 already commits this project to Supabase Postgres with pgvector and a `vector(1536)` embedding column sized for `text-embedding-3-small`, and to a server side only data access boundary (Server Actions and Route Handlers using the service role key, RLS on every table as a deny by default backstop). Account deletion is a later feature (scope item 10), but its cascade behavior has to be decided now, changing a foreign key's delete rule later is a breaking migration. The project is built and operated by one person under a Tracer Bullet approach, so the schema should be provable end to end quickly, not maximally general.

## Requirements

**User stories**:

- As a new user, I want my swipes and my Letterboxd import to both build one taste profile, so recommendations reflect all my ratings regardless of how I gave them.
- As a returning user, I want a feed of recommended movies with a reason for each, so I understand why it was suggested.
- As a user, I want vibe search to work against my real taste data later, so results feel relevant to a mood, not just a keyword.
- As a user, I want my ratings and import data removed when I delete my account, so I can trust the app with my data.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A signed in user's swipe (like or pass) on a movie is stored as one row per (user, movie) in `ratings`, and re-swiping the same movie updates that row rather than creating a duplicate.
- **AC-2**: A Letterboxd CSV import stores one `imports` row per upload plus one `import_rows` row per parsed line (matched, unmatched, or ambiguous with candidates), and a matched row writes into the same `ratings` table tagged `source = 'csv_import'`, merging with any existing rating on re-import.
- **AC-3**: A generated feed item is stored with its movie, a frozen text reason, and an engagement status (`shown`, `liked`, `disliked`, `dismissed`), and the same movie can be shown again in a later feed (no permanent uniqueness constraint blocks a repeat).
- **AC-4**: `movies` carries a nullable `vector(1536)` embedding column with a similarity index, populated asynchronously after a movie is cached, ready for vibe search to query.
- **AC-5**: The movie catalog cache stores metadata fetched on demand (not a full catalog sync), keyed by an internal id decoupled from the external provider, unique per (`external_source`, `external_id`), with a `cached_at` timestamp for staleness checks.
- **AC-6**: Deleting a user's Supabase Auth record cascades to remove their `profiles`, `ratings`, `imports`, `import_rows`, and `feed_items` rows; the shared `movies` table is untouched.
- **AC-7**: Row level security is enabled and deny by default on every table, with owner scoped policies matching the project's existing data access boundary (service role bypasses RLS in Server Actions and Route Handlers; RLS is the backstop for any other path).
- **AC-8**: A real Server Action reads and writes through Drizzle to Supabase Postgres end to end, proving the whole pipe before any consuming feature spec builds on top of this schema.

## Options considered

### Option 1: Unified normalized relational schema (recommended)

Six tables (`profiles`, `movies`, `ratings`, `imports`, `import_rows`, `feed_items`), one `ratings` table shared by both onboarding paths and tagged by `source`, movie identity decoupled from the (not yet chosen) catalog provider.

**Pros**:

- One place to read "does this user like this movie", so the taste profile, feed generation, and dedup logic all query one table
- No foreseeable breaking migration through the onboarding, feed, and vibe search slices

**Cons**:

- Normalizing swipe (binary) and star rating (0.5 to 5) onto one numeric scale loses some of each source's native nuance

### Option 2: Append only event log for ratings and swipes

Every rating action is an inserted event row, never updated; the "current" rating is the latest event per (user, movie).

**Pros**:

- Full history of every rating change, a natural audit trail if that is ever needed

**Cons**:

- Every read that needs "the current rating" (feed generation, taste profile) needs a latest-per-user-movie query or a maintained materialized view; real added complexity with no stated audit requirement to justify it

### Option 3: Source separated rating tables

A `swipes` table and a `letterboxd_ratings` table, kept apart instead of merged.

**Pros**:

- Each table's columns fit its source exactly, no forced shared scale

**Cons**:

- Every consumer of "has this user rated this movie" (feed generation, taste profile, dedup) has to UNION across both tables, doubling the query surface for a distinction the product itself does not otherwise care about

## Decision

**Chosen option**: Option 1: Unified normalized relational schema

Build six Postgres tables under Supabase, RLS enabled and deny by default on every one, with a single `ratings` table shared by swipe and CSV import onboarding, movie identity decoupled from the catalog provider, and a nullable `vector(1536)` column on `movies` for vibe search. Query through Drizzle ORM; schema DDL stays hand written SQL in `supabase/migrations/`, matching the project's existing convention, drizzle-kit is used only to introspect and generate types, never to push schema.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.agents/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.agents/skills/supabase-postgres-best-practices/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`)

## Rationale

Reasoning and options considered: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

**`profiles`** (1:1 with Supabase `auth.users`, created by a trigger on signup)

| Field                   | Type        | Nullable | Notes                                         |
| ----------------------- | ----------- | -------- | --------------------------------------------- |
| id                      | uuid        | no       | PK, = `auth.users.id`, no separate generation |
| display_name            | text        | yes      |                                               |
| avatar_url              | text        | yes      |                                               |
| onboarding_completed_at | timestamptz | yes      |                                               |
| created_at              | timestamptz | no       | default now()                                 |
| updated_at              | timestamptz | no       | default now(), trigger maintained             |

**`movies`** (shared catalog cache, not user owned)

| Field                | Type         | Nullable | Notes                                                |
| -------------------- | ------------ | -------- | ---------------------------------------------------- |
| id                   | uuid         | no       | PK, default gen_random_uuid()                        |
| external_id          | text         | no       | the catalog provider's id, provider chosen in spec 4 |
| external_source      | text         | no       | placeholder value until spec 4                       |
| title                | text         | no       |                                                      |
| release_year         | integer      | yes      |                                                      |
| synopsis             | text         | yes      |                                                      |
| poster_url           | text         | yes      |                                                      |
| genres               | text[]       | yes      | denormalized                                         |
| cast_members         | jsonb        | yes      | denormalized                                         |
| runtime_minutes      | integer      | yes      |                                                      |
| external_rating      | numeric(3,1) | yes      |                                                      |
| embedding            | vector(1536) | yes      | null until the backfill job computes it              |
| cached_at            | timestamptz  | no       | default now()                                        |
| embedding_updated_at | timestamptz  | yes      |                                                      |
| Unique               |              |          | (external_source, external_id)                       |

**`ratings`**

| Field        | Type            | Nullable | Notes                                                                    |
| ------------ | --------------- | -------- | ------------------------------------------------------------------------ |
| id           | bigint identity | no       | PK                                                                       |
| user_id      | uuid            | no       | FK → profiles.id, on delete cascade                                      |
| movie_id     | uuid            | no       | FK → movies.id, on delete restrict (no feature ever deletes a movie row) |
| rating_value | numeric(2,1)    | no       | 0.5 to 5, one scale for both sources                                     |
| source       | text            | no       | 'swipe' \| 'csv_import', CHECK constrained                               |
| created_at   | timestamptz     | no       | default now()                                                            |
| updated_at   | timestamptz     | no       | default now(), trigger maintained                                        |
| Unique       |                 |          | (user_id, movie_id); upsert on re-rate                                   |

**`imports`**

| Field           | Type            | Nullable | Notes                                                      |
| --------------- | --------------- | -------- | ---------------------------------------------------------- |
| id              | bigint identity | no       | PK                                                         |
| user_id         | uuid            | no       | FK → profiles.id, on delete cascade                        |
| filename        | text            | yes      |                                                            |
| status          | text            | no       | 'processing' \| 'completed' \| 'failed', CHECK constrained |
| total_rows      | integer         | no       | default 0                                                  |
| matched_count   | integer         | no       | default 0                                                  |
| unmatched_count | integer         | no       | default 0                                                  |
| created_at      | timestamptz     | no       | default now()                                              |
| completed_at    | timestamptz     | yes      |                                                            |
| error_message   | text            | yes      | set when status = 'failed'                                 |

**`import_rows`**

| Field               | Type            | Nullable | Notes                                                                                                         |
| ------------------- | --------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| id                  | bigint identity | no       | PK                                                                                                            |
| import_id           | bigint          | no       | FK → imports.id, on delete cascade                                                                            |
| user_id             | uuid            | no       | FK → profiles.id, on delete cascade; denormalized from the parent import so RLS and lookups don't need a join |
| raw_title           | text            | no       |                                                                                                               |
| raw_year            | integer         | yes      |                                                                                                               |
| matched_movie_id    | uuid            | yes      | FK → movies.id, on delete restrict                                                                            |
| candidate_movie_ids | uuid[]          | yes      | populated only when match_status = 'ambiguous'                                                                |
| match_status        | text            | no       | 'matched' \| 'unmatched' \| 'ambiguous', CHECK constrained                                                    |
| created_at          | timestamptz     | no       | default now()                                                                                                 |

**`feed_items`**

| Field                    | Type            | Nullable | Notes                                                                                                                                                               |
| ------------------------ | --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                       | bigint identity | no       | PK                                                                                                                                                                  |
| user_id                  | uuid            | no       | FK → profiles.id, on delete cascade                                                                                                                                 |
| movie_id                 | uuid            | no       | FK → movies.id, on delete restrict (no feature ever deletes a movie row)                                                                                            |
| reason                   | text            | no       | frozen at generation time                                                                                                                                           |
| status                   | text            | no       | 'shown' \| 'liked' \| 'disliked' \| 'dismissed', default 'shown', CHECK constrained                                                                                 |
| rank                     | integer         | yes      | position within the feed batch that generated it                                                                                                                    |
| shown_at                 | timestamptz     | no       | default now()                                                                                                                                                       |
| responded_at             | timestamptz     | yes      |                                                                                                                                                                     |
| No uniqueness constraint |                 |          | a movie can reappear in a later feed                                                                                                                                |
| Index                    |                 |          | (user_id, shown_at desc), for the "don't repeat what was shown in the last 14 days" dedup query at feed generation time (window tunable by core discovery loop, #7) |

**Relationships**: `auth.users` 1:1 `profiles` · `profiles` 1:N `ratings` / `imports` / `feed_items` · `movies` 1:N `ratings` / `feed_items` / `import_rows` (nullable) · `imports` 1:N `import_rows`

**State transitions**:
`imports.status`: `processing` → `completed` | `failed`. The Inngest job sets `completed` on success; an `onFailure` handler sets `failed` and writes `error_message`, so a crashed job never leaves `status` stuck at `processing`. `matched_count`/`unmatched_count` are recomputed from `import_rows` rather than incremented as rows are processed, so a resumed or retried job's counts stay correct.

**API surface**:
This spec defines only the schema and the data access boundary, no new endpoints. Each consuming feature spec defines its own Server Actions and Route Handlers against these tables: core discovery loop (#7, swipe and feed reads/writes), Letterboxd CSV import onboarding (#8, imports/import_rows writes), vibe search (#9, embedding similarity reads), account and privacy settings (#10, the delete cascade this spec sets up).

**Value sourcing** (every value each action produces, computes, or displays names where it comes from; a required value with no named source is an undecided input, resolve it before this spec is done, do NOT leave the build to invent it):

| Action            | Value produced / displayed                                                                                        | Source                                                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swipe write       | rating_value                                                                                                      | Fixed mapping decided here: like = 4.5, pass = 1.0 (see Key invariants); movie_id and user_id come from the swipe action's own inputs, defined in core discovery loop (#7)                |
| CSV row processed | rating_value                                                                                                      | Parsed 0.5 to 5 star rating from the Letterboxd CSV column, parsing rules decided in CSV import onboarding (#8)                                                                           |
| CSV row processed | match_status, matched_movie_id, candidate_movie_ids                                                               | Title/year match against the `movies` cache; the matching algorithm itself is decided in CSV import onboarding (#8)                                                                       |
| Feed generation   | reason (frozen text)                                                                                              | Rendered from the source rating(s) overlap at generation time; the template logic is decided in spec 0001's "recommendation reasons" choice, detailed further in core discovery loop (#7) |
| Feed generation   | rank                                                                                                              | Position assigned by the feed ranking algorithm, decided in core discovery loop (#7)                                                                                                      |
| Movie cache write | embedding                                                                                                         | Computed by an Inngest job calling `text-embedding-3-small` (decided in spec 0001), written asynchronously after the row exists; the trigger/schedule is detailed in vibe search (#9)     |
| Movie cache write | title, synopsis, poster_url, genres, cast_members, runtime_minutes, external_rating, external_source, external_id | Fetched from the external catalog provider chosen in movie catalog integration (#4, not yet written); this spec only reserves the columns                                                 |

**Key invariants**:

- `ratings`: unique (user_id, movie_id); `rating_value` between 0.5 and 5 inclusive; swipe maps to rating_value 4.5 (like) or 1.0 (pass), a fixed mapping so the taste profile reads one scale regardless of source
- **Source precedence on conflict**: a `csv_import` row is never overwritten by a `swipe` write; a swipe only inserts or updates a rating when no `csv_import` row already exists for that (user, movie). This stops a later swipe from silently downgrading a real 0.5 to 5 star import into the coarse binary mapping. Any reader of `rating_value` that cares about precision (not just "liked or not") must also read `source`, since a swipe's 4.5/1.0 is a coarse stand in, not a real star rating
- **CSV row dedup before write**: when an import's parsed rows contain more than one row matching the same movie, only one write per (user, movie) is issued (last row wins), so the `ratings` upsert never attempts to affect the same row twice in one statement
- `movies`: unique (external_source, external_id); `id` defaults to `gen_random_uuid()`, the standard Supabase pattern; boring and dependency free over a time ordered UUID extension, acceptable at this project's scale
- `ratings`, `imports`, `import_rows`, `feed_items` use `bigint generated always as identity` primary keys (never exposed as opaque ids, sequential insert locality, SQL standard)
- `import_rows.match_status = 'matched'` implies `matched_movie_id` is not null; `'ambiguous'` implies `candidate_movie_ids` is non empty; `'unmatched'` implies both are null. This holds permanently because `matched_movie_id` is `on delete restrict`, not `set null`, matching movies never being deleted
- Deleting a `profiles` row (cascading from `auth.users`) cascades to `ratings`, `imports`, `import_rows` (via `imports` and directly, both FKs on `profiles.id`), and `feed_items`; `movies` is never touched by a user deletion, and no feature in this scope deletes a `movies` row, so every `movie_id` foreign key (`ratings`, `feed_items`, `import_rows.matched_movie_id`) is `on delete restrict` for consistency
- Every foreign key column is indexed (user_id, movie_id, import_id, matched_movie_id) per the project's Postgres best practices skill, and every RLS policy's `auth.uid()` call is wrapped as `(select auth.uid())` to avoid a per row re-evaluation
- **Application layer boundary** (AGENTS.md requires no `null`, explicit `undefined`, and one consistent error handling pattern): Drizzle returns `T | null` for nullable columns; a thin data access module maps `null` to `undefined` at the boundary before any Server Action or Route Handler sees the value. Every Server Action and Route Handler returns a `Result<T, E>` (`{ ok: true, value: T } | { ok: false, error: E }`, `E` a small named error union such as `not_found | unauthorized | conflict | unknown`), the one consistent pattern this schema's consumers use

**Security model**:
RLS is enabled and forced on all six tables, deny by default. `profiles`, `ratings`, `imports`, `import_rows`, `feed_items` get owner scoped policies (`(select auth.uid()) = user_id`) directly on each table's own `user_id` column, including `import_rows` (denormalized, not an `exists` join, so the policy stays a single indexed lookup on large imports); no client role can insert or delete `profiles` directly (the signup trigger owns creation). `movies` gets an authenticated read only policy; all writes to `movies` happen through the service role (Server Actions, Route Handlers, and the Inngest/pg_cron jobs), never from a client role. In normal operation the app never queries with the anon key except the sign in handshake (per the project's existing data access boundary), and Drizzle's own connection (`DATABASE_URL`) runs as the privileged `postgres` role through Supabase's pooler, which also bypasses RLS, matching the service role's existing trust level. RLS is therefore a backstop against a direct anon key or user JWT connection, not the primary enforcement layer for Server Action traffic; it must be verified separately over an anon key/user JWT connection, never over the Drizzle connection (see Critical test scenarios).

**Configuration required**:

- `DATABASE_URL`: pooled Postgres connection string (Supabase's transaction mode pooler, role `postgres`), used at runtime by Drizzle for queries from Server Actions and Route Handlers; the client must set `prepare: false` since the transaction mode pooler does not support prepared statements
- `DIRECT_URL`: the non pooled Postgres connection string, used only by `drizzle-kit` to introspect the schema (never to push it, see Decision)
- Both are validated at startup per AGENTS.md's "fail loudly if a required env var is missing" rule

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: a user swipes ten movies, uploads a Letterboxd CSV that adds five more, and both sets of ratings appear in one `ratings` query tagged by source, verifies **AC-1**, **AC-2**
- Failure case: the same movie is swiped twice with different outcomes; the second write updates the existing row instead of creating a duplicate or throwing a unique violation, verifies **AC-1**
- Auth/permission: a query made over an anon key/user JWT connection (not the Drizzle service connection, which bypasses RLS by design) attempts to read another user's `ratings` row; RLS denies it even though the query itself is well formed, verifies **AC-7**

## Build plan

1. [x] Install and configure Drizzle ORM (postgres-js driver, `prepare: false`) against `DATABASE_URL` for runtime queries and `DIRECT_URL` for `drizzle-kit` introspection; validate both env vars at startup, failing loudly if missing, satisfies **AC-8**
2. [x] Write the migration by hand as a SQL file in `supabase/migrations/`, creating all six tables (including `imports.error_message`, `import_rows.user_id`), their CHECK constrained enums, uniform `on delete restrict` on every `movie_id`/`matched_movie_id` foreign key, `on delete cascade` on every `user_id` foreign key, and the `profiles` row creation trigger on `auth.users` signup; apply it with the Supabase CLI, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-6**
3. [x] In the same migration, enable the `vector` extension and add the `embedding` column and its similarity index on `movies`, satisfies **AC-4**
4. [x] Add indexes on every foreign key column (including `feed_items (user_id, shown_at desc)`) and enable RLS with deny by default plus owner scoped policies (using `(select auth.uid())` directly on each table's own `user_id`) on all six tables, satisfies **AC-7**
5. [x] Run `drizzle-kit pull` against the applied schema to generate and commit the Drizzle schema/types (never `drizzle-kit push`), so downstream feature specs (#7, #8, #9, #10) can import them; add the thin data access module that maps Drizzle's `null` to `undefined` and defines the shared `Result<T, E>` type
6. [x] Write one real Server Action (for example, fetch or create the caller's own `profiles` row) as the tracer bullet proving Server Action → Drizzle → Supabase Postgres → typed `Result` end to end, satisfies **AC-8**. Built against `movies` instead of `profiles`: `profiles` rows are owned by the signup trigger and there's no auth flow built yet (core discovery loop, #7) to produce a real `auth.users` row, so `movies` (a real, service-role-writable table) proves the same pipe without fabricating a fake user.
7. [x] Verify RLS separately, over a simulated authenticated/anon Postgres role (not the Drizzle service connection), confirming a cross user read is denied, satisfies **AC-7**. No Supabase anon key was available in this session, so verified via `SET LOCAL ROLE authenticated` plus `set_config('request.jwt.claims', ...)` on the direct Postgres connection, the standard way to exercise RLS policies without a live Supabase Auth session — same enforcement path, same result.

## Consequences

**Positive**:

- One `ratings` table answers "does this user like this movie" for the taste profile, feed generation, and dedup alike, no UNION across sources anywhere
- Movie identity is decoupled from the not yet chosen catalog provider, so spec 4 slots in without touching any foreign key
- Persisted `feed_items` gives the "don't repeat" logic and engagement analytics a home without a later migration
- RLS deny by default on every table backstops the service role boundary already set in spec 0001

**Negative / tradeoffs**:

- Mixing a `bigint identity` strategy (ratings, imports, import_rows, feed_items) with UUID primary keys (profiles, movies) means Drizzle's schema and any cross entity joins carry two id types; documented here so it is a deliberate choice, not an inconsistency
- A feed item's `reason` is frozen text at generation time; if the source rating is later corrected, past feed reasons will not reflect that correction
- A `csv_import` rating can never be overwritten by a swipe on the same movie (source precedence, see Key invariants); a user who wants to explicitly re-rate an imported movie by swiping will find the swipe silently ignored, a real UX gap the core discovery loop spec (#7) should surface if it matters
- Migrations are hand written SQL rather than Drizzle managed, so schema changes cost an extra manual step (writing the SQL file) that a Drizzle-push workflow would have automated; traded for staying inside the project's existing Supabase CLI convention

**Neutral**:

- `movies.external_source` and `external_id` are reserved but not yet meaningful until movie catalog integration (spec 4) is written
- Genres and cast are stored denormalized (array/JSONB); revisit only if a query pattern later needs relational filtering across them

## Follow-up

- [ ] Movie catalog integration (`/architect movie catalog integration`, scope item 4) must pick the real `external_source` value(s) and confirm the fetched fields (title, synopsis, poster_url, genres, cast_members, runtime_minutes, external_rating) match what `movies` reserves here
- [ ] Vibe search (`/architect vibe search`, scope item 9) defines the embedding backfill job's trigger and schedule, and the similarity index type (hnsw vs ivfflat) and its tuning
- [ ] Core discovery loop (`/architect core discovery loop`, scope item 7) defines the swipe endpoint, the feed ranking algorithm behind `rank`, and the reason template logic behind the frozen `reason` text; it should also decide whether a swipe on an already csv_import rated movie needs a visible message ("this rating came from your import"), since the write itself is silently a no op per this spec's source precedence rule
- [ ] Letterboxd CSV import onboarding (`/architect letterboxd CSV import onboarding`, scope item 8) defines the title/year fuzzy matching algorithm behind `match_status` and `candidate_movie_ids`
- [ ] Account and privacy settings (`/architect account & privacy settings`, scope item 10) should confirm the hard delete cascade decided here still matches its requirements when that spec is written

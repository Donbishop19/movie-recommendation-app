# Rationale: 0002. Data model

## Context

See [index.md](index.md) for the summary and the premise note on the movie catalog integration dependency (spec 4, not yet written). The reasoning in full:

The app has two onboarding paths, swiping and a Letterboxd CSV import, that both have to build one taste profile the feed and vibe search read from; whatever shape the schema takes, a query like "does this user like this movie" cannot need to know which path produced the rating. The feed needs a persisted reason per recommendation (spec 0001 already committed to template generated reasons, not a live model call) and a way to avoid immediately repeating a movie, which argues for storing feed history rather than computing it fresh every time. Spec 0001 also already fixed two things this spec must build around: Supabase Postgres with pgvector and a `vector(1536)` column sized for `text-embedding-3-small`, and a server side only data access boundary (Server Actions and Route Handlers with the service role key, RLS everywhere as a deny by default backstop, the anon key used only for the sign in handshake). Account deletion is a later feature (scope item 10), but its cascade behavior has to be decided now: changing a foreign key's delete rule after data exists is a breaking migration, not a config change. The project is built and operated by one person under a Tracer Bullet build approach, which favors a schema that can be proven end to end quickly over one that anticipates scale or team size this project does not have.

## Options considered

### Option 1: Unified normalized relational schema (recommended)

Six tables (`profiles`, `movies`, `ratings`, `imports`, `import_rows`, `feed_items`), one `ratings` table shared by both onboarding paths and tagged by `source`, movie identity decoupled from the catalog provider.

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

## Rationale

The engineer confirmed, question by question, a single upsertable `ratings` table normalized to one numeric scale, on-demand catalog caching with an internal movie id, persisted feed items with no repeat constraint, hard cascading delete, and Drizzle as the query layer. Given a Tracer Bullet approach and a solo builder, Option 1 is the schema that proves the whole pipe (onboarding through both paths into one feed) the fastest, and the `source` column on `ratings` keeps enough provenance that a future feature can still tell a swipe from an import without paying Option 2's or Option 3's query cost today.

Two implementation details came from the installed `supabase-postgres-best-practices` skill rather than the design conversation, and are recorded here because they change the schema from what a default Supabase setup would produce:

- **Primary key strategy**: the skill flags random UUID (v4) primary keys as causing index fragmentation on tables that grow, and recommends `bigint identity` for single database, internal tables, or a time ordered UUID (UUIDv7) for ids that are distributed or exposed externally. `profiles.id` has no choice, it must equal `auth.users.id`, which Supabase generates. `movies.id` is exposed in URLs and decoupled from the provider by design; a time ordered UUID (`pg_uuidv7` extension) was the first instinct, but the cross check on this spec flagged that the extension's availability on this project's Supabase instance has never been verified, and deferring that check to `/develop` would leave a builder guessing at a primary key default mid migration. `gen_random_uuid()` (v4) is used instead: boring, zero extra dependency, and the fragmentation cost only shows up at a scale this on-demand-cached catalog will not reach soon. The four child tables (`ratings`, `imports`, `import_rows`, `feed_items`) are never exposed as opaque ids, so they use `bigint generated always as identity`, the skill's default for that case.
- **RLS performance**: the skill flags that calling `auth.uid()` bare in a policy re-evaluates it per row on large tables, and that every foreign key and every RLS policy column needs an index. Both are written into this spec's Key invariants and Security model directly (`(select auth.uid())` wrapping, indexes on every foreign key) rather than left for `/develop` to discover after the fact.

No References section: the engineer opted out of citations for this spec (References level: none). The reasoning above is the full trail; the two best practice points are grounded in the installed `supabase-postgres-best-practices` skill's `schema-primary-keys.md` and `security-rls-performance.md` references, consulted during this design.

## Cross check

A cross check (a different model, read only) reviewed the drafted spec before confirmation and found twelve gaps, six of them blocking: an unresolved conflict between Drizzle managed and hand written migrations, an AC-7 test scenario that could not actually fail (it read through the service role connection, which bypasses RLS), an undefined precedence when a swipe and a CSV import rating collide, a crash on duplicate CSV rows matching one movie, an undefined partial import failure state, and a contradiction between `import_rows`' `set null` delete rule and its own "matched implies non null" invariant. All twelve were resolved and folded directly into `index.md` (Decision, Feature design, Build plan, Consequences, Follow-up) rather than left as open questions; the resolutions are visible inline at each affected field.

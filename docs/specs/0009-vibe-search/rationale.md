# 0009. Vibe search — Rationale

## Context

The app has two ways to find a movie today: browsing TMDB's popularity list and the feed's genre overlap ranking (spec 0006), neither of which understands a free text mood or theme description. The product goal (scope item 9) is a natural language "vibe" query, "something moody and slow burn like Blade Runner", that returns relevant results distinct from keyword or title search, informed by what the user has already rated.

Two decisions were already made in earlier specs and are treated as fixed here, not reopened: spec 0001 committed to Supabase Postgres with the pgvector extension and OpenAI's `text-embedding-3-small` model, and spec 0002 reserved a nullable `vector(1536)` column (`movies.embedding`) plus `embedding_updated_at` for this exact purpose. Spec 0002's Follow-up explicitly left two things for this spec to decide: the embedding backfill job's trigger and schedule, and the similarity index type and its tuning.

The forces at play: the searchable catalog is bounded by whatever has already been cached (spec 0003's on demand cache aside model), so vibe search inherits a catalog that starts small and grows organically, not a fixed corpus. The project runs on Vercel serverless functions with no shared memory between instances, which rules out a naive in process rate limiter as a hard guarantee. AGENTS.md names Inngest as the project's background job tool, but the one job built so far (spec 0003's catalog refresh) used `pg_cron` plus `pg_net` directly instead, so this spec also decides whether to finally adopt Inngest or extend the existing pattern. The project is built and run by one person under a Tracer Bullet approach, so the design favors the smallest working end to end slice over a maximally general search system.

## Options considered

### Option 1: Query and taste centroid blended pgvector search over an organically grown, Inngest embedded catalog (recommended)

Embed the user's query text with OpenAI at request time, blend it with a centroid vector computed from the user's liked movies' embeddings (weighted toward the query), and run one pgvector cosine similarity query with an HNSW index. Movie embeddings are computed asynchronously by an Inngest function triggered whenever a movie is cached without one.

**Pros**:

- Personalization and query relevance are resolved in a single pgvector query, no second ranking pass
- Finally puts Inngest, already chosen in spec 0001, to real use, giving the project a durable, retryable background job pattern instead of one built around a raw scheduled endpoint
- No new schema, reuses the column spec 0002 already reserved

**Cons**:

- The project now runs two different background job mechanisms side by side (Inngest here, `pg_cron`/`pg_net` for catalog refresh), a real added surface to keep working

### Option 2: Query only search, synchronous embedding, no personalization (simplest)

Embed a movie inline the moment it is cached (blocking the existing upsert path), skip the taste centroid entirely, and rely on `pg_cron` to sweep any stragglers, matching spec 0003's existing job pattern exactly.

**Pros**:

- Fewest moving parts: no new background job runner, no blend logic to build or tune
- Consistent with the one job mechanism already proven in this codebase

**Cons**:

- Does not satisfy the product requirement that results be "informed by the user's taste profile"
- Calling OpenAI inline on every movie cache write adds real latency to `getOrRefreshMovie`, `searchMovies`, and `browsePopularMovies`, the exact paths spec 0003 built to be fast and cache aside

### Option 3: LLM based structured tag extraction instead of embeddings

Route the vibe query through an LLM first to extract structured tags (mood, era, theme) against a fixed taxonomy, then filter the catalog on those tags using existing columns, no vector similarity involved.

**Pros**:

- Results are explainable by name ("tagged moody, slow burn"), not just a similarity score
- No vector index or blending math to build or tune

**Cons**:

- Needs either a hand maintained mood taxonomy (brittle, misses any query outside it) or a second LLM call per query on top of the first, adding latency and cost without the benefit pgvector already gives for free
- Ignores the vector infrastructure spec 0001 and 0002 already paid for specifically to support this feature

## Rationale

Option 1 is the only one that satisfies the stated requirement, personalized vibe search, without adding a system the project does not already have reason to run. The embedding infrastructure (pgvector, the reserved column, the chosen embedding model) was already paid for by spec 0001 and 0002 specifically for this feature; Option 3 would strand that work and substitute a taxonomy or a second LLM hop for something pgvector already does in one query. Option 2's inline embedding call would reintroduce exactly the request path latency spec 0003 was built to avoid, and drops the personalization the feature exists to deliver.

Adopting Inngest here rather than extending the `pg_cron`/`pg_net` pattern is a deliberate call, not a default: the alternative was a real, working pattern already proven in this codebase. Inngest wins because embedding is naturally event driven, "a movie was just cached, embed it", not schedule driven like the catalog freshness sweep, and Inngest's built in retry means a single OpenAI hiccup does not require a second cron pass to notice and fix. The project accepts running two background job mechanisms for now (see Consequences and Follow-up); consolidating onto one is deferred, not ignored.

The in memory, best effort rate limit (chosen by the engineer over the durable Postgres backed counter option) is accepted as a real, named tradeoff: it will not enforce a hard cap across concurrent serverless instances, but the cost of a search request is small and the project runs at single operator scale today, so a courtesy level limit was judged sufficient rather than adding a new table and query for enforcement precision nothing currently needs.

## Context

This is scope item 7, the walking skeleton: sign in, swipe onboarding, and a personalized feed, all real, no CSV import or vibe search yet. It is deliberately one spec covering three sub flows rather than three separate specs, because proving the whole pipe connects, not any one layer in isolation, is the point of the Tracer Bullet approach this project follows. Splitting it would mean the auth spec ships with no onboarding to route into, and the onboarding spec ships with no feed to prove it fed anything.

The schema this feature needs already exists (spec 0002): `ratings` with a fixed swipe mapping (like 4.5, pass 1.0), `feed_items` with a frozen `reason` and a dedup window spec 0002 explicitly left tunable by this feature, and `profiles.onboarding_completed_at`. The recommendation approach is also already bounded by spec 0001: reasons are template generated from taste profile overlap, not a live model call. What is genuinely open here is what "overlap" means in practice, and where the feed's candidate movies come from, since the movie cache only holds whatever has already been looked up or browsed (spec 0002 AC-5), not a full catalog.

A returning user's feed also needs a signal beyond their original ten onboarding swipes if the loop is going to feel alive on a second or third visit, so this spec treats a feed like or dislike as ongoing taste signal, not a one off reaction, feeding it back into the same `ratings` table the onboarding swipes wrote to.

## Options considered

### Option 1: Genre overlap scoring against the cached catalog (recommended)

Score a candidate movie by how many of its cached genres appear among the genres of the user's liked movies, fetching new candidates through a genre filtered TMDB discover call when the user has enough signal, falling back to plain popularity when they do not.

**Pros**:

- Genres are already cached on every movie (spec 0002, spec 0003), so no new data collection or job is needed to make this work on day one.
- Cheap and fast enough to run on every feed load, matching spec 0001's "no live model call" decision for reasons.

**Cons**:

- A coarse signal: two movies sharing one genre tag can otherwise have nothing in common, so recommendation quality is a real step below anything using cast, plot, or embeddings.

### Option 2: Genre plus cast overlap scoring

Same as Option 1, but also score shared top billed cast members (already cached per spec 0002's `cast_members` column) as a second signal.

**Pros**:

- Meaningfully more relevant matches; a user who liked one actor's films sees more of that actor's other work, not just same genre titles.

**Cons**:

- More scoring logic to design and test before the loop is even proven end to end once, working against this feature's own Tracer Bullet goal of proving the pipe first.

### Option 3: Embedding similarity over the pgvector column

Use the `vector(1536)` column spec 0002 already reserved, computing similarity between a candidate's embedding and the centroid of the user's liked movies' embeddings.

**Pros**:

- The strongest relevance signal of the three, and reuses infrastructure spec 0001 already committed to.

**Cons**:

- The embedding backfill job and its trigger are not built yet; spec 0002's Follow-up assigns that decision to vibe search (scope item 9, spec 0009), not this feature. Building it here would duplicate that spec's job.

## Rationale

Option 1 is chosen because this feature's job is to prove the whole loop works end to end, the explicit goal of the Tracer Bullet approach this project runs under, not to ship the best possible ranking on the first pass. Genre data is already sitting in the `movies` cache from spec 0003 with no extra fetch or job needed, so it is the cheapest signal that is still genuinely personalized rather than generic. Option 2's cast signal is a real improvement but adds scoring complexity before the pipe has been proven once; it is noted as a future enhancement in Consequences rather than dropped. Option 3 is the strongest long term signal, but its embedding backfill job belongs to vibe search (spec 0009) per spec 0002's own Follow-up, and duplicating that decision here would fork where "how movies get embedded" is decided.

The genre filtered TMDB discover call (rather than only ranking whatever is already cached) is necessary, not optional: after ten onboarding swipes the cache holds roughly one page of generic popular movies, nowhere near enough to fill a relevant 20 item feed once already rated titles are excluded. Fetching a genre targeted page keeps the candidate pool actually related to the user's taste instead of padding the feed with unrelated popular titles.

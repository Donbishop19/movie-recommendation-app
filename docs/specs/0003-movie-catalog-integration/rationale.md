## Context

The `movies` table (spec 0002) reserved `external_source`, `external_id`, and every metadata column a movie needs to display, but deliberately left the actual provider and fetch strategy undecided so this spec could settle them without a breaking migration. Every later feature reads through this cache: swipe onboarding (#7) needs a seed pool of movies to show before a user has rated anything; Letterboxd CSV import (#8) needs to match uploaded titles against real catalog entries; vibe search (#9) needs the embedding column populated from real synopses. None of those can be designed against fake data.

The project is built and run by one person on Supabase's free tier (spec 0001), so the integration has to fit a hobby project's request budget and stay operationally boring: no dedicated ETL pipeline, no second vector database, nothing that needs babysitting. Spec 0002 already fixed one constraint that shapes every option here: the cache is populated on demand, not through a full catalog sync (AC-5), and its `cached_at` timestamp exists specifically for a staleness policy this spec has to define.

Auth (#7) is not yet built, no sign in flow exists in the app today. Any access rule this spec adds has to hold without depending on a sign in UI that does not exist yet, only on Supabase Auth's session mechanism, already chosen as the platform's auth in spec 0001 and usable standalone, ahead of the actual sign in screens.

## Options considered

### Option 1: TMDB, on demand cache aside with a scheduled staleness refresh (recommended)

Query TMDB live for lookup, search, and discover; cache every result into `movies` through an upsert; a small hourly job refreshes rows older than 7 days.

**Pros**:

- One provider covers every capability this feature needs (lookup, search, and the discover/browse pool #7 needs for its swipe deck) from a single free account
- Matches AC-5 from spec 0002 (fetched on demand, not a full sync), so this spec and the data model spec stay consistent with each other

**Cons**:

- Ties the whole catalog's quality and uptime to one third party's terms of service; adding a second provider later (for example, streaming availability) means a second client and mapping layer

### Option 2: OMDb, on demand cache aside

Same caching strategy, a different provider.

**Pros**:

- Simple API, quick to get an API key

**Cons**:

- No discover/trending endpoint, which would leave the browse capability unmet and force a second provider anyway; a much lower free tier quota (1,000 requests a day) that a browsing swipe pool would burn through quickly; no cast data in its response

### Option 3: Full catalog pre sync (nightly bulk import of TMDB's library)

Import a large slice of TMDB's catalog into Postgres on a schedule, so every read is a local query with no live provider call.

**Pros**:

- No per request provider latency; reads still work during a brief TMDB outage

**Cons**:

- Directly conflicts with spec 0002's AC-5, which already fixed on demand caching, not a full sync; a nightly bulk import is a meaningfully bigger job (rate limits, storage, staleness tracking across thousands of untouched rows) for a solo project with no stated need to browse TMDB's entire library, only what users actually look up

## Rationale

TMDB is the only option that satisfies every capability this feature needs (lookup, search, and a discover/browse endpoint for #7's swipe seed pool) from a single account, matching the operationally boring constraint from Context: one client, one credential, one quota to watch. Its documented free tier rate limit (about 40 requests a second) comfortably covers a solo project's early traffic, which is also why no app side rate limiter was added on top of it, a second layer of limiting logic has no problem to solve yet at this scale. OMDb was rejected specifically because it has no discover/trending endpoint; it would force a second provider integration for the browse capability #7 needs almost immediately, exactly the "two providers, two clients" cost this spec exists to avoid. A full catalog pre sync was rejected because spec 0002 already fixed on demand caching (AC-5); reopening that here would put the data model spec and this one at odds, a coherence problem across specs, not a fresh tradeoff to weigh again.

The 7 day staleness window and the hourly, 25 row refresh batch follow the same reasoning: movie metadata (title, synopsis, cast, runtime) is close to static once released, so a slow, steady refresh is enough to catch the rare correction without meaningfully taxing TMDB's quota, and pacing it hourly rather than one daily batch keeps every individual call small and boring instead of bursty. Requiring a signed in session on every lookup, search, and browse action is not a data sensitivity concern, movie metadata is not private, but a quota protection one: it closes the one abuse path (an anonymous caller hammering search) cheaply, since every consuming feature already requires sign in anyway.

## References

**Project sources** (verifiable, in this repo):

- `AGENTS.md`, the data access boundary (server side only, anon key only for the auth handshake) and the one Result pattern rule
- Spec 0001, the stack decision: Supabase Auth chosen, `pg_cron` for simple regular jobs, Inngest reserved for durable multi step jobs
- Spec 0002, the data model: the `movies` table's reserved `external_source`/`external_id` columns, its Follow-up item asking this spec to pick the real provider, and its existing RLS/service role boundary

**Practices & standards**:

- Cache aside pattern for on demand, provider backed data
- Upsert (`ON CONFLICT ... DO UPDATE`) for idempotent writes under a unique constraint, replacing a check then insert race
- Shared secret header for an internal, machine only endpoint (a cron triggered call, not a user facing one)

**Links** (web verified):

- TMDB Authentication (v4 read access token): https://developer.themoviedb.org/reference/intro/authentication
- TMDB Search Movie: https://developer.themoviedb.org/reference/search-movie
- TMDB Discover Movie: https://developer.themoviedb.org/reference/discover-movie
- TMDB Movie Details: https://developer.themoviedb.org/reference/movie-details
- TMDB Image Basics: https://developer.themoviedb.org/docs/image-basics
- TMDB Rate Limiting: https://developer.themoviedb.org/docs/rate-limiting

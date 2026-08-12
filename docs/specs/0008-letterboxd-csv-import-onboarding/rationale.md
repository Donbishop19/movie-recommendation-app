# 0008. Letterboxd CSV import onboarding, rationale

See [index.md](index.md) for the summary and the build spec. The reasoning in full follows.

## Context

The app has one onboarding path today (swipe through movies). The scope calls for a second path: a user uploads their Letterboxd `ratings.csv` export, sees which titles matched the catalog, and lands on a feed seeded from that history instead of starting from zero. The data model spec (0002) already reserved the `imports` and `import_rows` tables for this, with a `match_status` of `matched`, `unmatched`, or `ambiguous` and a `candidate_movie_ids` column for the ambiguous case, plus a rule that a `csv_import` rating is never overwritten by a swipe. What it explicitly left open, and what this spec resolves, is: how a CSV row's title and year actually becomes a match against the catalog, how the upload and review flow behaves, and how large an import this app can process without a background job.

The movie catalog (spec 3) is populated on demand, not fully synced. That matters here: most rows in a real Letterboxd export name a movie the app has never cached, so matching cannot lean on a local lookup alone; it has to reach the TMDB catalog live for most rows, the same way the existing search screen does. The forces at play are the size of a real export (a longtime Letterboxd user can log low thousands of ratings over years), the request time budget of a synchronous Server Action, and keeping this slice buildable without introducing a background job runner into the onboarding path before it is needed anywhere else in the app.

## Options considered

### Option 1: Synchronous Server Action, live per row TMDB matching (recommended)

Parse the upload with `papaparse`, validate its header against Letterboxd's `ratings.csv` shape, cap it at 500 rows, and for each distinct title and year in the file call the existing `searchTmdbMovies` to classify the row and cache the matched movie through the existing `listUpsert`. Everything happens inside the one Server Action call that handles the upload.

**Pros**:

- No new infrastructure; reuses the TMDB search call, the catalog cache, and the Server Action pattern already in the codebase.
- Simplest to build and to reason about: one request, one result, no progress polling or job state to design.
- Fits the project's Tracer Bullet approach: a real end to end thread first, before anything gets thicker.

**Cons**:

- A row cap is required to keep the request inside a serverless function's time budget; a user with an unusually large export cannot import all of it in one upload (they could split the file or re import in batches, since re import is allowed anytime).

### Option 2: Background Inngest job for matching

Store the raw parsed rows, hand matching to an Inngest durable function, and have the review screen poll or subscribe for progress as rows resolve.

**Pros**:

- No practical row limit; a very large export processes over minutes without holding a request open.
- Matches the project's existing background job runner (used today for catalog staleness refresh), so no new tool.

**Cons**:

- The review screen needs a progress or polling state that does not exist yet, and the onboarding flow now spans two request boundaries (upload, then a job completing later) instead of one, more to build and more failure modes for a first version of this feature.

### Option 3: Local cache first matching, TMDB search as fallback

Before calling TMDB, try a normalized title and year lookup against movies already cached locally, only falling back to a TMDB search on a miss.

**Pros**:

- Saves a TMDB call for any title the app has already cached (from browsing or another user's onboarding).

**Cons**:

- The catalog cache is sparse for a new or early app; a typical import predates any meaningful local coverage, so this optimization rarely triggers in practice while still requiring a fuzzy local text match to build and keep correct.

## Rationale

Option 1 fits the project's on demand catalog philosophy (spec 3 chose no full sync, this feature should not quietly reintroduce one through a local first matching pass) and its Tracer Bullet build approach (a thin working thread before investing in a background job). The row cap is a real tradeoff, not a free win, but 500 rows covers the common case and re import is explicitly allowed anytime, so a user with a larger export has a workable path without a job runner in this slice. Option 2 is the right eventual answer if the cap becomes a real complaint; it is recorded as a Follow up rather than built now, since adding it later does not touch the schema or the matching logic, only how the Server Action is invoked.

## Matching algorithm detail

For each distinct (normalized title, raw year) pair in the file (a rewatch logged twice shares one TMDB lookup):

1. Normalize the raw title: lowercase, trim, collapse whitespace, strip punctuation. This is comparison only; the raw title is always what gets stored and displayed.
2. Call `searchTmdbMovies(rawTitle, rawYear, page: 1)`, take the first 5 results, and keep any whose normalized title matches. If none match, retry once with no year (`rawYear: undefined`), since a Letterboxd year can differ from TMDB's release year by region or a year end release, then keep any of that broader result set whose normalized title matches.
3. Classify from the surviving candidates: zero, `unmatched`; exactly one, `matched` (cache it through `listUpsert`, write `matched_movie_id`); two or more, `ambiguous` (cache the top 5 through `listUpsert`, write their ids to `candidate_movie_ids`).
4. A row whose Rating column is missing, non numeric, or outside 0.5 to 5 is always classified `unmatched`, whatever the title match result, since there is no valid `rating_value` to write.

This lives in the app layer (a matching module), not the database; nothing here is a new invariant the schema enforces.

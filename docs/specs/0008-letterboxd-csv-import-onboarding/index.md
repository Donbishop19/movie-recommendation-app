# 0008. Letterboxd CSV import onboarding

**Date**: 2026-08-12
**Status**: Accepted

## Summary

This decision designs the second onboarding path: a user uploads their Letterboxd `ratings.csv` export, the app matches each title against the movie catalog by a live TMDB search, and the user reviews matched, ambiguous, and unmatched rows before landing on a feed seeded from that history. It builds mostly on the `imports` and `import_rows` tables spec 0002 already reserved, with one small addition: an `import_rows.rating_value` column, needed so an ambiguous row's star rating survives until the user resolves it. Matching happens synchronously in one request, capped at 500 rows, the thinnest working version of this path; a background job is a later option if that cap becomes a real limit.

## Requirements

**User stories**:

- As a new user who already tracks their taste on Letterboxd, I want to import my ratings instead of swiping from zero, so the app's first feed already reflects years of history.
- As a user reviewing my import, I want to see which titles matched, which didn't, and which need my help, so nothing from my file is silently dropped or silently misassigned.
- As a user with an ambiguous title in my import, I want to pick the right movie from real candidates, so my taste profile stays accurate.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: From `/onboarding`, a not yet onboarded signed in user is offered a choice between swipe onboarding and importing a Letterboxd `ratings.csv`; picking import routes to the upload screen.
- **AC-2**: Uploading a file that is not a `.csv`, exceeds 2MB, exceeds 500 data rows, or whose header row does not match Letterboxd's `ratings.csv` columns (`Date, Name, Year, Letterboxd URI, Rating`) is rejected before any row is processed; the `imports` row is recorded with `status = 'failed'` and a visible error message, and no `import_rows` are written.
- **AC-3**: A valid upload creates one `imports` row and, for every parsed data row, one `import_rows` row classified `matched`, `unmatched`, or `ambiguous`, matched by a live TMDB title and year search; a row with a missing, non numeric, or out of range Rating value is always classified `unmatched`, regardless of title match.
- **AC-4**: Every `matched` row, at upload time or after the user resolves an `ambiguous` row, writes one `ratings` row tagged `source = 'csv_import'`, unique per (user, movie); when more than one row in the same upload matches the same movie, only the last such row's rating is written.
- **AC-5**: The review screen shows a summary count (matched, ambiguous, unmatched) and lists every row, grouped by status; a `matched` row shows its cached movie (poster, title); an `ambiguous` row lets the user pick one of its stored candidate movies, or leave it unresolved; an `unmatched` row shows its raw title and year with no action. No row is ever hidden, whatever its status.
- **AC-6**: A single TMDB search failure while matching one row marks only that row `unmatched` and the import continues; it never fails the whole upload.
- **AC-7**: The user can continue to the feed once at least one row is `matched` (initial or resolved), whether or not every `ambiguous` row was resolved; continuing sets `profiles.onboarding_completed_at` (once, if not already set) and routes to `/feed`. With zero matched rows, this continue action is not offered; the user is pointed back to swipe onboarding instead.
- **AC-8**: A user can upload a second Letterboxd CSV at any time, before or after onboarding; each upload creates its own `imports` row, and matched rows upsert into the same `ratings` table, so a re import layers in new or corrected ratings without duplicating existing rows.
- **AC-9**: A signed out visitor hitting the import upload or review routes is redirected to `/signin`; every Server Action in this feature rejects an unauthenticated caller with `unauthorized`, and one user can never read or resolve another user's import.

## Options considered

### Option 1: Synchronous Server Action, live per row TMDB matching (recommended)

Parse the upload with `papaparse`, validate its header, cap it at 500 rows, and for each distinct title and year in the file call the existing `searchTmdbMovies` to classify the row and cache the matched movie through the existing `listUpsert`, all inside the one Server Action that handles the upload.

**Pros**:

- No new infrastructure; reuses the TMDB search call, the catalog cache, and the Server Action pattern already in the codebase.
- Simplest to build and reason about: one request, one result, no progress polling or job state to design.

**Cons**:

- The row cap means a very large export cannot be imported in a single upload (splitting the file, or re importing in batches, is the workaround).

### Option 2: Background Inngest job for matching

Store the raw parsed rows, hand matching to an Inngest durable function, and have the review screen poll or subscribe for progress as rows resolve.

**Pros**:

- No practical row limit; a very large export processes over minutes without holding a request open.

**Cons**:

- The review screen needs a progress state that does not exist yet, and onboarding now spans two request boundaries instead of one, more to build and more failure modes for a first version of this path.

### Option 3: Local cache first matching, TMDB search as fallback

Try a normalized title and year lookup against movies already cached locally before calling TMDB, falling back to a TMDB search only on a miss.

**Pros**:

- Saves a TMDB call for any title the app has already cached.

**Cons**:

- The catalog cache is sparse for a new or early app; a typical import predates any meaningful local coverage, so the optimization rarely triggers while still requiring a fuzzy local text match to build and keep correct.

## Decision

**Chosen option**: Option 1: Synchronous Server Action, live per row TMDB matching

Build the upload, matching, and review flow as Server Actions on top of the existing `imports`, `import_rows`, `ratings`, and `profiles` tables, matching each row against TMDB live and capping a single upload at 500 rows. One small migration: a nullable `rating_value` column on `import_rows`.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `supabase` (`supabase/agent-skills`, `.agents/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.agents/skills/supabase-postgres-best-practices/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `posthog-instrumentation` (`posthog/posthog-for-claude`, `.agents/skills/posthog-instrumentation/`)

## Rationale

Reasoning and options considered in full, plus the matching algorithm detail: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

Mostly the schema spec 0002 already built, plus one small new column:

- `imports` (id, user_id, filename, status, total_rows, matched_count, unmatched_count, created_at, completed_at, error_message): one row per upload; `status` moves `processing` to `completed` or `failed` inside the same Server Action call.
- `import_rows` (id, import_id, user_id, raw_title, raw_year, **rating_value** (new column, see below), matched_movie_id, candidate_movie_ids, match_status, created_at): one row per parsed CSV line, written once at upload time; `match_status` and `matched_movie_id` can change once, when the user resolves an `ambiguous` row.
- `ratings` (user_id, movie_id, rating_value, source): written for every row that becomes `matched`, `source = 'csv_import'`, unique per (user_id, movie_id), upserted (spec 0002's existing source precedence rule already keeps a `csv_import` row safe from a later swipe).
- `movies`: matched and candidate rows are cached through the existing `listUpsert`, no schema change.
- `profiles.onboarding_completed_at`: set once, the first time this feature's completion action runs with at least one matched row and the column is still null.

**Migration (new): `import_rows.rating_value`**

Spec 0002 reserved `import_rows` with no place to hold a row's parsed star rating between upload and a later resolve. That's fine for a row that matches immediately (the rating writes straight into `ratings`), but an `ambiguous` row's rating has nowhere to wait until the user resolves it, since the raw uploaded file is deliberately not stored (see Consequences). Add one nullable column: `rating_value numeric(2,1)`, the same type and scale as `ratings.rating_value`. Populated whenever the CSV's Rating column parsed to a valid 0.5 to 5 value (whatever the row's match outcome); null when it did not, which per AC-3 also forces that row `unmatched`. No constraint beyond the existing numeric precision; the 0.5 to 5 range is enforced by the parser (spec 0008's `letterboxd-csv.ts`), same as it always was, so no new CHECK constraint is needed on this column.

**State transitions**:

- `imports.status`: `processing` (on create) to `completed` (matching finished, whatever the per row outcomes) or `failed` (the whole file rejected before any row was processed).
- `import_rows.match_status`: set once at upload time (`matched`, `unmatched`, `ambiguous`); an `ambiguous` row can move to `matched` (the user picked a candidate) or `unmatched` (the user marked it unresolved) exactly once, by the user's own resolve action. `matched` and `unmatched` rows never change status after upload.
- `profiles.onboarding_completed_at`: `null` to a timestamp, set once, by whichever onboarding path (swipe or this one) reaches its completion condition first.

**API surface**:

| Endpoint                    | Method        | Key inputs                                                            | Key outputs                                                                   | Auth               | Key errors                                                                                               |
| --------------------------- | ------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `uploadLetterboxdImport`    | Server Action | `file` (FormData, .csv)                                               | `{ importId, totalRows, matchedCount, ambiguousCount, unmatchedCount, rows }` | session            | `invalid_file_type`, `file_too_large`, `row_limit_exceeded`, `invalid_header`, `unauthorized`, `unknown` |
| `getImportReview`           | Server Action | `importId` (number)                                                   | `{ import, rows }` (rows carry matched movie or candidates)                   | session, ownership | `unauthorized`, `not_found`                                                                              |
| `resolveAmbiguousImportRow` | Server Action | `importRowId` (number), `choice` (`movieId: string` \| `"unmatched"`) | `{ matchStatus }`                                                             | session, ownership | `unauthorized`, `not_found`, `invalid_choice`                                                            |
| `completeCsvImport`         | Server Action | `importId` (number)                                                   | `{ onboardingComplete: boolean, ratedCount: number }`                         | session, ownership | `unauthorized`, `not_found`, `no_matched_rows`                                                           |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from; a required value with no named source is an undecided input, resolve it before this spec is done, do NOT leave the build to invent it):

| Action                      | Value produced / displayed                                | Source                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uploadLetterboxdImport`    | `totalRows`, per row `raw_title`/`raw_year`               | Parsed from the uploaded file with `papaparse`, this spec                                                                                                       |
| `uploadLetterboxdImport`    | `match_status`, `matched_movie_id`, `candidate_movie_ids` | The title/year matching algorithm against `searchTmdbMovies`, this spec (see rationale.md)                                                                      |
| `uploadLetterboxdImport`    | `import_rows.rating_value`                                | Parsed from the CSV's Rating column (already the app's 0.5 to 5 scale), stored on the row so a later resolve still has it, this spec                            |
| `uploadLetterboxdImport`    | `ratings.rating_value` on an initially `matched` row      | `import_rows.rating_value` for that same row, this spec                                                                                                         |
| `uploadLetterboxdImport`    | `imports.status`, `error_message`                         | Computed: `failed` with a named reason if header/type/size/row cap validation fails before processing, else `completed` once every row is classified, this spec |
| `resolveAmbiguousImportRow` | new `match_status`/`matched_movie_id`                     | The `choice` input, validated against that row's stored `candidate_movie_ids` (or the literal `"unmatched"`), this spec                                         |
| `resolveAmbiguousImportRow` | `ratings.rating_value` when resolved to a movie           | That row's own stored `import_rows.rating_value` (always present: an `ambiguous` row only exists when its rating parsed validly, per AC-3), this spec           |
| `completeCsvImport`         | `onboardingComplete`                                      | Computed: true if `profiles.onboarding_completed_at` is already set, or this import's matched row count (initial plus resolved) is at least 1, this spec        |
| `completeCsvImport`         | `ratedCount`                                              | Count of this import's `import_rows` with `match_status = 'matched'` at call time, this spec                                                                    |

**Key invariants**:

- `import_rows.match_status = 'matched'` implies `matched_movie_id` is not null; `'ambiguous'` implies `candidate_movie_ids` is non empty; `'unmatched'` implies both are null (spec 0002's own constraint, unchanged).
- `import_rows.rating_value` is not null whenever `match_status` is `matched` or `ambiguous` (both only ever result from a row whose CSV rating parsed validly, per AC-3); it may be null on an `unmatched` row (either the rating never parsed, or it did but no title match was found).
- A `matched` or `unmatched` row's status never changes after upload; only an `ambiguous` row can be resolved, and only once (a second resolve call on an already resolved row is rejected with `not_found`, since it no longer matches the `ambiguous` precondition).
- Within one upload, when two or more rows resolve to the same movie, only the last one (by file order) writes a `ratings` row for it; every row is still shown in the review regardless.
- A `csv_import` rating is never overwritten by a swipe (spec 0002's existing source precedence rule, unchanged by this feature); a later `csv_import` upload can update an earlier `csv_import` rating on the same movie.
- `profiles.onboarding_completed_at` is set at most once, guarded the same way the swipe path guards it (an update that only applies when the column is still null).

**Security model**:

- Every Server Action calls `requireSession()` first (the existing pattern from spec 0003), rejecting an unauthenticated caller with `unauthorized`.
- `getImportReview`, `resolveAmbiguousImportRow`, and `completeCsvImport` each check the `imports`/`import_rows` row belongs to the caller before reading or writing it, the same ownership check pattern `engageFeedItem` uses today. Row level security is a backstop, not the enforcement path for Server Action traffic (service role connection), matching spec 0002's own security model.
- File upload validation (type, size, header shape) runs before any row is parsed or any TMDB call is made, so a malformed or oversized file cannot spend TMDB rate limit or database writes.
- No roles beyond "the caller owns their own import". No regulated data is touched; the raw uploaded file is processed in memory and not persisted, only its filename and derived rows are stored.

**Configuration required**:

No new environment variables or credentials. Reuses the existing TMDB read token (spec 0003) and Supabase service role connection (spec 0002).

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: a user uploads a valid `ratings.csv` with 120 rows, sees 100 matched, 12 ambiguous, 8 unmatched on the review screen, resolves 5 ambiguous rows, then continues to a feed seeded from 105 `csv_import` ratings, verifies **AC-1**, **AC-3**, **AC-4**, **AC-5**, **AC-7**
- Failure case: an upload with the wrong header row is rejected with a visible error and no `import_rows` written, verifies **AC-2**
- Failure case: one row's TMDB search throws mid import; that row is `unmatched`, every other row still classifies normally, and the upload still reaches `status = 'completed'`, verifies **AC-6**
- Auth/permission: a signed out request to the import routes is redirected to `/signin`; a call to `resolveAmbiguousImportRow` for another user's `import_rows` row is rejected, verifies **AC-9**

## Build plan

1. [x] Migration: add nullable `import_rows.rating_value numeric(2,1)`, apply it, confirm the column is live, satisfies **AC-4**
2. [x] Add `papaparse`; write the CSV parsing and Letterboxd header/type/size/row cap validation module, satisfies **AC-2**
3. [x] Write the title/year matching module (normalize, `searchTmdbMovies`, classify, cache through `listUpsert`), per the algorithm in rationale.md, satisfies **AC-3**
4. [x] `uploadLetterboxdImport` Server Action: create the `imports` row, run validation then matching, write `import_rows` (including `rating_value`), upsert `ratings` for initially matched rows (last row per movie wins), set `imports.status`, fire `onboarding_started` (`method: "csv_import"`), satisfies **AC-2**, **AC-3**, **AC-4**, **AC-6**, **AC-8**
5. [x] Restructure `/onboarding` into a choice screen (swipe vs import), moving the existing swipe flow to `/onboarding/swipe`, and add the `/onboarding/import` upload screen wired to `uploadLetterboxdImport`, built to the existing design system, satisfies **AC-1**
6. [x] Review screen: grouped summary and status sections (matched, ambiguous, unmatched), the candidate picker for ambiguous rows wired to `resolveAmbiguousImportRow` (writes `ratings` from that row's stored `rating_value`), satisfies **AC-5**
7. [x] `completeCsvImport` Server Action and the review screen's continue action (disabled state when zero matched rows, pointing back to swipe instead), firing `onboarding_completed` (`method: "csv_import"`), redirecting to `/feed`, satisfies **AC-7**
8. [x] `getImportReview` for reloading an in progress review, plus the ownership checks across all four actions, satisfies **AC-9**

## Consequences

**Positive**:

- A user with real Letterboxd history gets a feed reflecting years of taste on day one, instead of starting from ten swipes.
- Almost no migration; ships on the schema spec 0002 already reserved, plus one small nullable column.
- Every row's fate is visible on the review screen, matching the scope's "handled visibly, not silently dropped" bar.

**Negative / tradeoffs**:

- The 500 row synchronous cap means a very large export needs more than one upload; there is no in app guidance that splits a file for the user, they would need to do it themselves or just re import in batches over time.
- Live TMDB matching means upload time scales with row count and TMDB's response time; there is no pre computed or cached matching for a first time title.
- The raw uploaded file is not stored, so a failed or rejected upload cannot be inspected after the fact beyond its recorded `error_message`; the user must re upload to retry.

**Neutral**:

- Matching reuses the existing `searchTmdbMovies` and `listUpsert` from spec 0003 unchanged; no new external provider.
- The `/onboarding` route now branches into two flows instead of rendering the swipe view directly, a small routing change to existing code.

## Follow-up

- [ ] If the 500 row cap turns out to block real users often, revisit Option 2 (a background Inngest job) rather than raising the cap further; it does not require a schema change
- [ ] Spec 0006's own Follow-up flagged that a swipe on an already `csv_import` rated movie silently no ops (spec 0002's source precedence rule); now that this import path is real, core discovery loop's swipe screen may want a visible "this rating came from your import" message, tracked there, not built here
- [ ] Consider letting a user delete or replace a specific import from account settings, once that feature (scope item 10) is designed; this spec's `imports` rows accumulate with no delete path yet

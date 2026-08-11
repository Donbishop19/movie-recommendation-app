# 0006. Core discovery loop

**Date**: 2026-08-11
**Status**: In Progress

## Summary

This decision designs the first real user journey through the app: sign in with email and password or Google, swipe through ten movies to build a taste profile, then see a personalized feed with a short reason on each recommendation. It reuses the auth, data, and catalog work already built (specs 0001 to 0003) without any new migration. The feed is ranked by genre overlap with the movies the user liked, generated fresh on each visit and saved so a movie is not repeated too soon.

## Requirements

**User stories**:

- As a new visitor, I want to sign in with email and password or with Google, so I can start using the app with the method I prefer.
- As a signed in, not yet onboarded user, I want to swipe like or pass on a set of movies, so the app learns what I enjoy.
- As an onboarded user, I want a feed of recommended movies with a short reason on each, so I understand why it was picked for me and can react to it.
- As a user, I want a movie I already disliked to never come back, and a movie I have not yet seen to not repeat too soon, so the feed keeps feeling fresh.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A visitor can sign up or sign in with email and password, or with Google. After signing in they land on `/onboarding` if not yet onboarded, or `/feed` if they already are.
- **AC-2**: Swiping like or pass on ten distinct movies during onboarding sets `profiles.onboarding_completed_at` and routes the user to `/feed`.
- **AC-3**: Each swipe writes one `ratings` row (unique per user and movie, `rating_value` 4.5 for like or 1.0 for pass, `source = 'swipe'`); swiping the same movie again updates that row instead of creating a duplicate.
- **AC-4**: `/feed` shows 20 recommended movies ranked by genre overlap with the user's liked movies, each carrying a frozen reason naming the top overlapping genre; every generation is saved as `feed_items` rows.
- **AC-5**: Feed candidates exclude every movie the user has already rated, of any value or source, and, among unrated movies, any shown to them in the last 14 days.
- **AC-6**: A user with fewer than 3 liked movies still gets a full 20 item feed, falling back to popularity ranked recommendations with a generic reason.
- **AC-7**: Liking or disliking a feed item updates that item's status and writes the matching `ratings` row, so later feed generations reflect it.
- **AC-8**: A signed out visitor hitting `/onboarding` or `/feed` is redirected to `/signin`; every Server Action in this feature rejects an unauthenticated caller with `unauthorized`.
- **AC-9**: A failed swipe deck fetch or feed generation shows an inline retry state, without losing the user's prior swipes or feed.
- **AC-10**: Cancelling or denying the Google prompt returns the user to `/signin` with an inline message, and creates no partial account.
- **AC-11**: Asking for more of the feed (load more) returns a further batch with no movie repeated from the current session.

## Decision

**Chosen option**: Option 1: Genre overlap scoring against the cached catalog

Build the swipe onboarding and feed as Server Actions on top of the existing `profiles`, `ratings`, `movies`, and `feed_items` tables, with feed candidates ranked purely by genre overlap between a movie's cached genres and the genres of the movies the user liked. No new table or migration.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `supabase` (`supabase/agent-skills`, `.agents/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.agents/skills/supabase-postgres-best-practices/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `posthog-instrumentation` (`posthog/posthog-for-claude`, `.agents/skills/posthog-instrumentation/`)

## Rationale

Reasoning and options considered: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

No new table or column. This feature reads and writes the schema spec 0002 already built:

- `profiles.onboarding_completed_at`: set once, the first time the caller's `source = 'swipe'` rating count reaches 10.
- `ratings` (user_id, movie_id, rating_value, source): written by both a swipe and a feed like or dislike, always `source = 'swipe'` (see Key invariants), unique per (user_id, movie_id).
- `movies` (id, external_id, external_source, genres, external_rating): read for ranking, written through the existing `listUpsert`/`detailUpsert` paths plus one new genre filtered TMDB call this feature adds.
- `feed_items` (user_id, movie_id, reason, status, rank, shown_at, responded_at): one row per generated recommendation; `status` moves `shown` to `liked` or `disliked` on engagement.

**State transitions**:

- `profiles.onboarding_completed_at`: `null` to a timestamp, set exactly once, on the swipe that brings the caller's swipe count to 10.
- `feed_items.status`: `shown` (on generation) to `liked` or `disliked` (on engagement); no further transition.

**API surface**:

| Endpoint             | Method        | Key inputs                                        | Key outputs                                        | Auth               | Key errors                                                                |
| -------------------- | ------------- | ------------------------------------------------- | -------------------------------------------------- | ------------------ | ------------------------------------------------------------------------- |
| `signUpWithPassword` | Server Action | email, password                                   | void (session cookie set)                          | none               | `email_taken`, `weak_password`, `unknown`                                 |
| `signInWithPassword` | Server Action | email, password                                   | void                                               | none               | `invalid_credentials`, `unknown`                                          |
| `signInWithGoogle`   | Server Action | none                                              | redirect URL to Supabase's Google flow             | none               | `unknown`                                                                 |
| `/auth/callback`     | Route Handler | `code` (query)                                    | redirect to `/onboarding` or `/feed`               | none               | `oauth_denied` (redirects to `/signin` with a message, not an error body) |
| `signOut`            | Server Action | none                                              | void                                               | session            | `unknown`                                                                 |
| `getSwipeDeck`       | Server Action | `page` (opt)                                      | movies (TMDB id, title, poster, genres), `hasMore` | session            | `unauthorized`, `unknown`                                                 |
| `swipeMovie`         | Server Action | tmdbId (number), action (`like` \| `pass`)        | `{ onboardingComplete: boolean }`                  | session            | `unauthorized`, `not_found`, `unknown`                                    |
| `getFeed`            | Server Action | `batchSize` (opt, default 20)                     | items (feedItemId, movie, reason), `hasMore`       | session, onboarded | `unauthorized`, `onboarding_incomplete`, `unknown`                        |
| `engageFeedItem`     | Server Action | feedItemId (number), action (`like` \| `dislike`) | void                                               | session, ownership | `unauthorized`, `not_found`, `unknown`                                    |

**Value sourcing** (every value each action produces, computes, or displays names where it comes from; a required value with no named source is an undecided input, resolve it before this spec is done, do NOT leave the build to invent it):

| Action                       | Value produced / displayed                         | Source                                                                                                                                                                     |
| ---------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| swipeMovie                   | rating_value                                       | Fixed mapping decided in spec 0002: like = 4.5, pass = 1.0                                                                                                                 |
| swipeMovie                   | onboardingComplete flag                            | Computed: count of the caller's `ratings` rows with `source = 'swipe'` reaches 10, this spec                                                                               |
| getSwipeDeck                 | candidate movies                                   | `discoverTmdbPopularMovies` (existing, spec 0003), paginated, filtered against the caller's own `ratings`                                                                  |
| getFeed                      | top liked genres                                   | Derived: unnest `movies.genres` across the caller's `rating_value = 4.5` rows, grouped by genre, top 3 by count, this spec                                                 |
| getFeed                      | candidate movies, signal present                   | New: a genre filtered TMDB discover call (`with_genres`) using the top liked genres, this spec                                                                             |
| getFeed                      | candidate movies, thin signal (fewer than 3 likes) | `discoverTmdbPopularMovies` (existing, spec 0003)                                                                                                                          |
| getFeed                      | overlap score and rank                             | Computed: count of a candidate's genres intersecting the top liked genres, sorted descending, TMDB `voteAverage` as the tiebreaker, this spec                              |
| getFeed                      | reason text                                        | Template "Because you liked [Genre] movies" naming the candidate's single highest scoring overlapping genre; "Popular right now" under the thin signal fallback, this spec |
| getFeed                      | exclusion set                                      | The caller's `ratings` rows (any value or source) plus any `feed_items` shown to them in the last 14 days, this spec                                                       |
| engageFeedItem               | rating_value on engagement                         | Same fixed mapping as a swipe: like = 4.5, dislike = 1.0, this spec                                                                                                        |
| middleware, `/auth/callback` | redirect destination                               | `profiles.onboarding_completed_at`, null or set, read through `requireSession` plus a profile lookup, this spec                                                            |

**Key invariants**:

- A rated movie, whatever its value or source, is never a feed candidate again. The 14 day window in AC-5 only governs movies shown but never rated, so a permanently disliked movie stays excluded without a separate rule.
- A feed like or dislike is written with `source = 'swipe'`, reusing the existing enum rather than adding a value. The schema's real distinction is a coarse binary signal (`swipe`) against a precise imported star rating (`csv_import`); a feed reaction is the same coarse signal as an onboarding swipe, so no migration is needed for this feature.
- `profiles.onboarding_completed_at` is set exactly once, inside the same write as the tenth `source = 'swipe'` rating, so a concurrent double submit cannot set it twice or skip it.
- `feed_items.rank` is assigned once per generation call, by descending overlap score with TMDB `voteAverage` as the tiebreaker; it is never recomputed after the row is written.
- Movies are only ever cached through the existing `listUpsert`/`detailUpsert` paths from spec 0003; this feature adds one new list style TMDB call (genre filtered discover) that writes through the same `listUpsert`.

**Security model**:

- Every Server Action calls `requireSession()` first (the existing pattern from spec 0003), rejecting an unauthenticated caller with `unauthorized`.
- `engageFeedItem` additionally checks that the `feed_items` row belongs to the caller before updating it. Row level security is a backstop, not the enforcement path for Server Action traffic, per spec 0002's own security model, since the Server Action runs on the service role connection.
- Route level middleware performs the same session and onboarding check, so a signed out or not yet onboarded request never renders `/onboarding` or `/feed` at all, not only fails its data calls.
- No roles beyond "the caller owns their own rows". No regulated data is touched; this feature adds no new analytics property beyond the ids, counts, and named categories already allowed by the project's PII policy.

**Configuration required**:

- `NEXT_PUBLIC_SITE_URL`: the base URL Supabase's OAuth flow and `/auth/callback` are built from. Assumed `http://localhost:3000` for now (the engineer's choice, see Follow-up), validated at startup, failing loudly if missing.
- Google must be turned on as a sign in provider in the Supabase project dashboard; this is project configuration, not an app env var.
- No new TMDB credential; this feature reuses the existing `tmdbReadAccessToken` from spec 0003.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: a visitor signs up with email and password, swipes ten movies (seven likes, three passes), and lands on `/feed` with 20 genre relevant recommendations, each carrying a reason, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**
- Failure case: the TMDB call behind the swipe deck fails mid onboarding; the screen shows an inline retry and the swipes already recorded are untouched, verifies **AC-9**
- Failure case: a user who liked only one of their ten swipes still gets a full 20 item feed through the popularity fallback, verifies **AC-6**
- Auth/permission: a signed out request to `/feed` is redirected to `/signin` before any data call runs; a call to `engageFeedItem` for another user's `feed_items` row is rejected, verifies **AC-8** and the ownership rule in Security model

## Build plan

1. Email and password sign up, sign in, sign out, and Google OAuth (Server Actions plus the `/auth/callback` Route Handler), the `/signin` page built to the design system, and the `NEXT_PUBLIC_SITE_URL` env var, satisfies **AC-1**, **AC-10**
2. Route gating middleware, checking session and `profiles.onboarding_completed_at` across `/signin`, `/onboarding`, and `/feed`, satisfies **AC-1**, **AC-8**
3. `getSwipeDeck` Server Action (paginated `discoverTmdbPopularMovies`, filtered against the caller's own ratings) and the onboarding swipe screen (poster card, like/pass buttons), satisfies **AC-2**, **AC-9**
4. `swipeMovie` Server Action (rating upsert, swipe count check, setting `onboarding_completed_at` at 10, the `onboarding_started`/`onboarding_completed` analytics events), satisfies **AC-2**, **AC-3**
5. `getFeed` Server Action: top liked genres, the new genre filtered TMDB discover call, the rated-plus-14-day exclusion, genre overlap scoring and rank assignment, the popularity fallback under thin signal, `feed_items` persistence, and the reason template, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-9**, **AC-11**
6. Feed screen: single column list of cards (poster, title, reason, like/dislike buttons), load more, and the `feed_viewed` analytics event, satisfies **AC-4**, **AC-11**
7. `engageFeedItem` Server Action (status update, ratings upsert, ownership check, the `feed_item_engaged` analytics event), satisfies **AC-7**

## Consequences

**Positive**:

- The whole first user journey (sign in, onboarding, feed) works end to end on the schema already built, no migration needed.
- Reusing `source = 'swipe'` for feed engagement keeps the ratings table as the single place that answers "does this user like this movie", matching spec 0002's own design intent.
- Excluding every rated movie from future candidates gives the permanent dislike rule for free, with no separate flag or query.

**Negative / tradeoffs**:

- Genre overlap alone is a coarse signal; two movies sharing "Action" can otherwise have nothing in common. Cast overlap or an embedding based similarity (once vibe search lands, spec 0009) would rank better but cost more to build now.
- Reusing `ratings.source = 'swipe'` for feed engagement means the table can no longer distinguish "rated during onboarding" from "rated while browsing the feed" if that distinction ever matters later; recovering it would need a migration.
- Feed generation calls TMDB live on most visits (a new genre filtered discover call plus upserts), so feed load time depends on TMDB's response time; there is no pre-computed cache in this slice.

**Neutral**:

- The swipe deck and the feed both draw from the same TMDB popular/discover surface already built in spec 0003; no new external provider.
- Drag to swipe is not built in this slice; onboarding ships with like/pass buttons only.

## Follow-up

- [ ] Configure the real production or staging OAuth redirect URL in Supabase's Google provider settings and set `NEXT_PUBLIC_SITE_URL` for that environment once one exists; this spec assumes `http://localhost:3000`
- [ ] Sign in rate limiting is deferred to Supabase Auth's own built in protection; revisit if abuse is ever observed
- [ ] A drag to swipe gesture is a possible enhancement on top of the button based interaction shipped here; track it separately if wanted
- [ ] Letterboxd CSV import onboarding (`/architect letterboxd CSV import onboarding`, scope item 8) still needs to resolve spec 0002's "a swipe silently no ops over an existing csv_import rating" rule once that import path exists
- [ ] Account and privacy settings (`/architect account & privacy settings`, scope item 10) should build password reset; it is out of scope here
- [ ] Vibe search (scope item 9) may eventually replace or augment genre overlap ranking with the embedding similarity spec 0002 already reserved a column for

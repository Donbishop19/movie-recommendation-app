# Verify: vibe search · spec 0009 · updated 2026-08-13

_Steps derived from spec 0009 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Sign in as an onboarded user with 3+ liked movies, visit `/search`, submit "moody and slow burn" → up to 20 ranked results appear, distinct from a title/keyword search → AC-1, AC-2
- [ ] Sign in as an onboarded user with fewer than 3 liked movies, submit a vibe query → a full result set still returns, ranked by query relevance alone (no personalization) → AC-2
- [ ] Click "Load more" on a result set → a further batch appears with no movie repeated from the current search session → AC-3
- [ ] Submit a query unlikely to match anything in the cached catalog (e.g. gibberish text) → an empty state message appears plus a popularity ranked fallback list, not weak matches → AC-4
- [ ] Search for a movie you already rated (like or dislike, any source) by a matching description → it can still appear in the results → AC-5
- [ ] Like a search result → the same `ratings` row the feed uses is written/updated (`source = 'swipe'`); a movie already rated via CSV import is not overwritten by this write → AC-6
- [ ] Submit a 201+ character query, and separately a blank/whitespace only query → both are rejected with an inline validation message before any OpenAI call → AC-7
- [ ] Submit 21 searches within one minute as the same signed in user → the 21st is rejected with a rate limited message before any OpenAI call → AC-7
- [ ] Visit `/search` while signed out → redirected to `/signin`; call `vibeSearch` or `rateSearchResult` without a session → both return `unauthorized` → AC-8
- [ ] Look up, search, or browse a movie never seen before → within a short delay its `movies.embedding` and `embedding_updated_at` are populated (check via the DB or the Inngest dashboard's `embed-movie` function run) → AC-9
- [ ] While the movie above has no embedding yet, confirm it does not appear in a vibe search result → AC-9
- [ ] Temporarily break the OpenAI call (e.g. an invalid `OPENAI_API_KEY`) and submit a search → an inline retry state appears and the typed query is not cleared → AC-10
- [ ] Visit `/search` → a row of tappable example vibe chips appears above the input; tapping one fills and submits the search → AC-11
- [ ] Search a distinctive phrase drawn from a specific cached movie's synopsis → that movie ranks near the top, confirming the embedding input (title + synopsis + genres) carries real signal → AC-1

## Commands

- [ ] `pnpm run typecheck` → passes → whole feature compiles clean
- [ ] `pnpm run lint` → passes
- [ ] `pnpm run format:check` → passes

## Configuration required before these steps can run

- [ ] `OPENAI_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` added to the environment (not yet present in `.env.local` as of this build; every catalog-touching action now imports the Inngest client at module scope, so these three are hard requirements to run the app at all, not just to search)
- [ ] An Inngest Dev Server (or Inngest Cloud) connection running locally so `embed-movie`'s runs are visible for the AC-9 checks above

## Acceptance-criteria coverage

- AC-1 … covered by the happy path, embedding-quality, and thin-signal steps
- AC-2 … covered by the personalized vs cold-start steps
- AC-3 … covered by the load more step
- AC-4 … covered by the empty state step
- AC-5 … covered by the already-rated step
- AC-6 … covered by the like/dislike write step
- AC-7 … covered by the query length and rate limit steps
- AC-8 … covered by the signed-out redirect and unauthorized action steps
- AC-9 … covered by the embedding backfill and candidate-pool steps
- AC-10 … covered by the OpenAI failure step
- AC-11 … covered by the preset chip step

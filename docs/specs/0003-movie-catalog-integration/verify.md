# Verify: Movie catalog integration · spec 0003 · updated 2026-08-10

_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] From a signed in session, call `getOrRefreshMovie(550)` twice in a row → the second call returns the same `cachedAt` and does not re-hit TMDB → AC-1; verified live 2026-08-10 at the catalog-cache layer (fetch call counter instrumented around the second lookup: 0 TMDB calls, `cachedAt` identical both times: `2026-08-10 09:43:34.726+00`)
- [x] Trigger a TMDB failure (temporarily point `TMDB_READ_ACCESS_TOKEN` at an invalid value, or simulate a timeout) and call any of the three actions with no usable cached row → a typed `Result` error comes back, never a thrown exception or an empty success → AC-6; verified live 2026-08-10 (`fetchTmdbMovieDetail` with a forged invalid bearer token returned `{"ok":false,"error":{"kind":"unknown"}}`, no throw)
- [x] Confirm the same failure produced an event in Sentry (the project the `SENTRY_DSN` points at) → AC-10; verified live 2026-08-10 (a real TMDB failure was reported via `reportTmdbError`, tagged `verify_run:check-verify-1786355777491`, and confirmed present in the `javascript-nextjs` Sentry project via `search_events`: title "TMDB getOrRefreshMovie failed: unknown", `tags[feature]=movie-catalog`, `tags[action]=getOrRefreshMovie`, `tags[kind]=unknown`, timestamp `2026-08-10T09:56:18+00:00`)
- [x] Look up a known adult flagged TMDB title directly → `getOrRefreshMovie` returns `not_found`, and the row is never cached with real detail data → AC-9; verified live 2026-08-10 against TMDB id 188412 ("Debbie Does Dallas", confirmed `adult: true` via a live TMDB search), row absent from `movies` both before and after the lookup

## Commands

- [x] Direct lookup on a never-seen id (`getOrRefreshMovie(550)`, Fight Club) → fetches from TMDB, upserts as a detail write, returns full metadata (`genres: ["Drama","Thriller"]`, `cast[0].order === 0`, `runtimeMinutes: 139`, absolute `posterUrl`) → AC-1, AC-2, AC-8; verified live 2026-08-10
- [x] Re-run the same detail upsert a second time → same `movies.id` both times, no duplicate row or unique violation → AC-3; verified live 2026-08-10
- [x] `searchMovies("Fight Club")` → returns TMDB's own ranked results and `totalPages`; every result cached through the list upsert → AC-4; verified live 2026-08-10
- [x] `browsePopularMovies()` → one page of 20 TMDB popularity ranked movies, `totalPages` present → AC-5; verified live 2026-08-10
- [x] Invariant: running the list upsert again against an id that already has real detail data (Fight Club appearing in the search results) does not touch `cachedAt`, `genres`, `castMembers`, or `runtimeMinutes` → AC-2, AC-3; verified live 2026-08-10 (`cachedAt unchanged: true`, `genres still present: true`)
- [x] A brand new list seeded row gets `cachedAt` set to the Unix epoch and null `genres`/`castMembers`/`runtimeMinutes` → AC-2; verified live 2026-08-10
- [x] `rowsNeedingDetailRefresh(25)` excludes a fresh detail row (Fight Club) and returns up to 25 epoch/stale rows, oldest first → AC-7; verified live 2026-08-10
- [x] `POST /api/jobs/refresh-catalog` with no `x-catalog-refresh-secret` header → `401` → AC-11; verified live 2026-08-10
- [x] `POST /api/jobs/refresh-catalog` with the correct header → refreshes up to 25 stale rows, advances their `cachedAt`, returns `{ refreshedCount }`; a second run against an empty batch returns `{ refreshedCount: 0 }` → AC-7; verified live 2026-08-10 (`refreshedCount: 25`, then DB check: 26 rows with detail data, 14 still epoch, batch cap respected)
- [x] `GET /movie/999999999` on TMDB directly returns `404`, which the client's `toErrorResult` maps to `{ kind: "not_found" }` → AC-2, AC-6; confirmed against the live TMDB API 2026-08-10
- [x] `getOrRefreshMovie`, `searchMovies`, `browsePopularMovies` called with no Supabase Auth session cookie → all three return `{ ok: false, error: "unauthorized" }` before any TMDB call or DB write → AC-8; verified live 2026-08-10 through a real Route Handler request
- [ ] Call any action with a real, signed in Supabase Auth session cookie and confirm it succeeds → AC-8 positive path. Not exercised live this session: no sign in flow exists yet (core discovery loop, #7, builds it on `requireSession()`); the session helper follows the current officially documented `@supabase/ssr` App Router pattern (confirmed via live docs lookup), but hasn't been driven through a real browser session
- [x] Call `searchMovies`/`browsePopularMovies` and confirm no adult flagged title ever appears in results (TMDB's `include_adult=false` is passed on every call) → AC-9; verified live 2026-08-10 (`searchTmdbMovies("fight club")` and `discoverTmdbPopularMovies(1)` both hit TMDB live with `include_adult=false`, 20 results each, no adult titles)
- [x] Call `searchMovies`/`browsePopularMovies` with `page` set below 1 or above 500 and confirm the requested page is clamped into TMDB's own range → Value sourcing (totalPages/page clamp); verified live 2026-08-10 (`clampTmdbPage`: `undefined→1`, `0→1`, `-5→1`, `501→500`, `3→3`)

## Acceptance-criteria coverage

- AC-1: covered by the repeat direct-lookup step (cache hit path) and the manual same-cachedAt check
- AC-2: covered by the never-seen-id lookup, the not_found 404 mapping, and the list-vs-detail upsert invariant steps
- AC-3: covered by the repeated detail upsert (no duplicate) and the list-upsert-never-downgrades invariant step
- AC-4: covered by the `searchMovies` step
- AC-5: covered by the `browsePopularMovies` step
- AC-6: covered by the TMDB failure manual step and the 404 mapping step
- AC-7: covered by the `rowsNeedingDetailRefresh` step and the refresh Route Handler success step
- AC-8: covered by the no-session step (negative, verified live) and the real-session step (positive, not yet exercised live)
- AC-9: covered by the adult flagged direct lookup manual step and the include_adult manual step
- AC-10: covered by the Sentry event manual step
- AC-11: covered by the missing/wrong secret 401 step

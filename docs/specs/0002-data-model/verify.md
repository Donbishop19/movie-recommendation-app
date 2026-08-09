# Verify: data model · spec 0002 · updated 2026-08-09

_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Commands

- [ ] `pnpm run typecheck` → passes clean → AC-8
- [ ] `pnpm run lint` → passes clean → AC-8
- [ ] `pnpm run format:check` → passes clean for all `src/`, `supabase/`, `drizzle.config.ts` files → AC-8
- [ ] Query `information_schema.tables` for `public` schema → all six tables present (`profiles`, `movies`, `ratings`, `imports`, `import_rows`, `feed_items`) → AC-1, AC-2, AC-3, AC-5, AC-6
- [ ] Query `pg_class`/`pg_policies` for `public` schema → `relrowsecurity` and `relforcerowsecurity` true on all six tables, 19 owner-scoped policies present → AC-7
- [ ] Query `information_schema.columns` for `movies` → `embedding` column is `vector`, nullable → AC-4
- [ ] Query `pg_indexes` for `public` schema → `movies_embedding_hnsw_idx` present using `hnsw`/`vector_cosine_ops` → AC-4
- [ ] Insert two `ratings` rows with the same `(user_id, movie_id)` → second insert violates `ratings_user_movie_unique`, confirming upsert-not-duplicate is enforced at the DB level → AC-1
- [ ] Insert two `movies` rows with the same `(external_source, external_id)` → second insert violates `movies_external_unique` → AC-5
- [ ] Insert two `feed_items` rows for the same `(user_id, movie_id)` at different times → both succeed, no uniqueness violation (a movie can reappear) → AC-3
- [ ] Insert a row into `auth.users`, then confirm the `on_auth_user_created` trigger created a matching `profiles` row automatically → AC-6 (creation half), spec's Feature design
- [ ] Delete that `auth.users` row → confirm cascade removes the `profiles`, `ratings`, `imports`, `import_rows`, `feed_items` rows for that user, and `movies` rows are untouched → AC-6
- [ ] `SET LOCAL ROLE authenticated` + `set_config('request.jwt.claims', '{"sub":"<user B>"}', true)`, then `select * from ratings where user_id = '<user A>'` → 0 rows (cross-user read denied) → AC-7
- [ ] Same simulated `authenticated` role as the row's own owner → 1 row returned (owner read succeeds, confirms policies aren't blanket-deny) → AC-7
- [ ] `SET LOCAL ROLE anon`, `select * from ratings` → 0 rows (no policy grants `anon` access) → AC-7
- [ ] Call `getOrCacheMovieAction` (`src/app/actions/movies.ts`) twice with the same `externalSource`/`externalId` → first call inserts and returns a new row, second call returns the same `id` with no overwrite → AC-8

## Acceptance-criteria coverage

- AC-1 (swipe upsert, no duplicates) … covered by the ratings unique-constraint step
- AC-2 (imports/import_rows structure, `csv_import` tagging) … schema and cascade rules are in place (`imports` → `import_rows` cascade, denormalized `user_id`); the actual CSV parse/match/merge behavior is Letterboxd CSV import onboarding's own build (scope #8) and isn't exercised here
- AC-3 (feed_items, repeatable movie) … covered by the feed_items no-uniqueness step
- AC-4 (nullable vector embedding + similarity index) … covered by the movies column/index steps
- AC-5 (movies cache keyed by external_source/external_id) … covered by the movies unique-constraint step
- AC-6 (auth.users deletion cascades, movies untouched) … covered by the signup-trigger and cascade-delete steps
- AC-7 (RLS deny by default, owner scoped) … covered by the cross-user/own-user/anon simulated-role steps
- AC-8 (real Server Action end to end) … covered by the `getOrCacheMovieAction` step, plus the typecheck/lint/format commands

# Review, feat/coding-standards-tooling (data model scope), 2026-08-09

**Reviewed by**: claude-opus-5 (author on a different model)
**Scope**: 18 files (lock file excluded), `a8ee9db..HEAD` + uncommitted working tree — the `feat(data-model)` slice only
**Verdict**: Changes requested

## Summary

This lands spec 0002's six-table schema as hand-written SQL, pulls Drizzle types from it, and adds a tracer-bullet Server Action. The SQL migration is the strongest part of the change: it matches the spec field-for-field, gets the cascade/restrict split right, wraps every `auth.uid()` as `(select auth.uid())`, and enables **and forces** RLS on all six tables. The weak part is the TypeScript side. The single Server Action — which is the reference implementation every future action in this project will be copied from — has no auth check, no input validation, an unguarded read-then-insert race, and a bare `catch {}` that collapses every failure into `unknown` with zero diagnostics. Separately, the committed Drizzle schema is a **lossy** representation of the database (RLS policies lost their `USING`/`WITH CHECK` clauses, one index has a wrong operator class), which is a live footgun the repo does nothing to warn about. No blockers; six majors, all narrow and cheap to fix.

## Major

### 🟠 Tracer-bullet Server Action has no auth, validation, or rate limit, on an RLS-bypassing connection, `src/app/actions/movies.ts:41-73`

**Problem**: `getOrCacheMovieAction` is a `"use server"` export that takes fully attacker-controlled `externalSource`/`externalId`/`title` and inserts them into the shared `movies` table over the Drizzle connection, which runs as `postgres` and bypasses RLS by design (spec 0002, Security model). There is no session check, no length/shape validation on any of the three strings, and no bound on how often it can be called.

Mitigating fact I confirmed: nothing in the repo imports it (`grep` for `getOrCacheMovieAction` returns only its own definition and `verify.md`), so Next.js will not currently emit an action ID for it and it is not routable today. That is luck, not design — the moment a page imports it, it becomes an unauthenticated public write endpoint into a shared table on a pooled privileged connection.

**Why it matters**: AGENTS.md's data-access boundary makes Server Actions _the_ enforcement layer and RLS only a backstop. This action is where that boundary is supposed to be demonstrated, and it demonstrates the absence of it. Vercel previews point at staging per AGENTS.md, so anyone with a preview URL could spam-insert unbounded rows once it is wired up. Every later action (#7 swipe, #8 import, #9 vibe search) will be modelled on this file.

**Suggested fix**: Even without an auth flow, make the boundary explicit rather than absent — either (a) drop `"use server"` and export it as a plain server-side module function called from a Server Component, which still proves the Drizzle pipe, or (b) keep the action and add the shape it should have permanently: a caller-identity check that returns `err("unauthorized")` (the `DataError` union already has the member), plus validation of `title`/`externalId` length and an allow-list or `CHECK` on `external_source`. Leave a `TODO` naming spec #7 as the owner of the real session check.

### 🟠 Read-then-insert race on the movie cache surfaces as a generic failure, `src/app/actions/movies.ts:45-69`

**Problem**: The action does `findFirst` on `(external_source, external_id)` and then, on a miss, `insert`. That is a TOCTOU window: two concurrent calls for the same movie both miss, both insert, and the second violates `movies_external_unique`. The violation is caught by the bare `catch` at line 70 and returned as `err("unknown")` — so a routine, expected cache stampede reads to the caller as an unexplained failure rather than a cache hit.

**Why it matters**: On-demand catalog caching (AC-5) makes concurrent first-touch of the same movie the _normal_ case, not an edge case — a feed render or a CSV import will fan out many parallel lookups over the same popular titles. Every future consumer inherits this.

**Suggested fix**: Replace the insert with an upsert on the unique constraint — `.onConflictDoUpdate({ target: [movies.externalSource, movies.externalId], set: { title } }).returning()`, or `onConflictDoNothing()` followed by a re-select when nothing came back. Either makes the concurrent path return the cached row instead of an error. Note the `DataError` union already carries `conflict` for cases where surfacing it is genuinely correct.

### 🟠 Bare `catch {}` swallows every error with no diagnostics, `src/app/actions/movies.ts:70-72`

**Problem**: `catch { return err("unknown"); }` discards the error object entirely. A connection failure, a missing env var, a constraint violation, and a Drizzle type error are all indistinguishable at the call site and leave no trace anywhere. Nothing is logged and nothing is reported, despite Sentry being a named dependency in AGENTS.md.

**Why it matters**: This is the file that establishes AGENTS.md's "one consistent error handling pattern across every server action and route handler." As written the pattern is "throw away all failure information." `DataError` defines `not_found | unauthorized | conflict | unknown`, and the only action in the codebase can only ever produce `unknown` — the other three members are currently unreachable, so the taxonomy is untested by its own reference implementation. Since this project's gate is typecheck + `/check verify` rather than a test suite, a silently-swallowed runtime failure is exactly the class of bug that gets past both.

**Suggested fix**: Bind the error (`catch (error)`), report it (`console.error` now, `Sentry.captureException` once spec 0001's Sentry setup lands), and map known Postgres error codes to the right `DataError` member — at minimum `23505` (unique violation) → `conflict`. Consider factoring this into a shared `toDataError(error)` helper in `src/shared/` so every future action gets it for free rather than re-implementing the mapping.

### 🟠 Committed Drizzle schema is a lossy copy of the SQL source of truth, `src/db/drizzle/schema.ts`

**Problem**: `drizzle-kit pull` dropped or mangled several things, and the file carries no warning that it is unsafe to generate from:

- **RLS policies lost their predicates.** Every non-`select` policy is emitted with no `using` and no `withCheck` — e.g. `ratings_insert_own` (`schema.ts:152-156`), `ratings_update_own` (`:157-161`), `ratings_delete_own` (`:162-166`), and the same across `imports`, `import_rows`, `feed_items`, plus `profiles_update_own` (`:57-61`). That is 14 of the 19 policies. The SQL migration has correct `(select auth.uid()) = user_id` predicates on all of them (`supabase/migrations/20260809120000_core_data_model.sql:202-268`); a policy generated from `schema.ts` instead would have no restriction at all — i.e. **wide open**.
- **Wrong operator class.** `feed_items_user_shown_at_idx` (`schema.ts:357-361`) declares `op("timestamptz_ops")` on `table.userId`, which is a `uuid` column. There is no `timestamptz_ops` for uuid; DDL generated from this would fail outright.
- **Unique constraint column order reversed.** `schema.ts:93` is `.on(table.externalId, table.externalSource)`; the migration is `unique (external_source, external_id)` (`migration:39`). Same uniqueness semantics, different index prefix.
- **`FORCE ROW LEVEL SECURITY` is not represented at all** — `src/db/drizzle/0000_acoustic_forgotten_one.sql` emits only `ENABLE ROW LEVEL SECURITY`.

**Why it matters**: One stray `drizzle-kit push` or `generate` (both are one `npx` away, and `drizzle.config.ts` already points `schema` and `out` at the right paths for it) silently replaces correct owner-scoped RLS with unrestricted policies. The convention protecting against this lives in two prose locations — spec 0002's Decision and a comment in `drizzle.config.ts` — but not in the file that would actually do the damage.

**Suggested fix**: Add a header comment to `schema.ts` stating it is generated by `drizzle-kit pull`, that `supabase/migrations/` is the source of truth, that the RLS predicates and `FORCE` are deliberately not represented here, and that `push`/`generate` must never be run. Fix the `timestamptz_ops` → `uuid_ops` operator class and the unique-constraint column order so the file at least doesn't misrepresent the DB. If you want a hard guard rather than a comment, a `predev`/`prebuild` check or a `drizzle-kit` wrapper script that refuses `push` would make it enforceable.

### 🟠 Module-scope Postgres client with no pool sizing or HMR guard, `src/db/client.ts:8-11`

**Problem**: `postgres(dbEnv.databaseUrl, { prepare: false })` is created at module scope with default options. `prepare: false` is correct for the transaction-mode pooler (spec 0002, Configuration required), but two things are missing: `max` is left at postgres.js's default of 10, and there is no `globalThis` singleton cache.

**Why it matters**: Two separate failure modes. On Vercel, each serverless instance opens up to 10 connections to Supabase's pooler; a handful of concurrent instances will exhaust the pooler's default pool size and start erroring — and per the previous finding, those errors will arrive as `err("unknown")` with no trace. In `next dev`, HMR re-evaluates the module on every edit to anything in its import graph, creating a fresh 10-connection pool each time and leaking the old ones, so a normal editing session walks into connection exhaustion locally too.

**Suggested fix**: Set `max: 1` (the standard setting for serverless against a transaction pooler) and a short `idle_timeout`, and cache the client on `globalThis` in non-production so HMR reuses one pool. Both are a few lines and are the conventional Next.js + postgres.js setup.

### 🟠 The tracer bullet is never exercised through Next.js, `docs/specs/0002-data-model/verify.md:22`

**Problem**: AC-8 requires "a real Server Action reads and writes through Drizzle to Supabase Postgres end to end," and `verify.md:22` checks it off by calling `getOrCacheMovieAction` twice. But nothing in the repo imports the action, `verify.md` never runs `pnpm build`, and there is no page or route that would cause Next.js to compile the `"use server"` module. Whatever invoked it (a `tsx` script, most likely, given `tsx` is a devDependency) called the exported function directly, which proves **Drizzle → Postgres** but not the Server Action RPC boundary — argument serialization, the `"use server"` export-shape check, the generated POST endpoint, and `Result` round-tripping back to a caller are all unproven.

**Why it matters**: This project deliberately has no test runner and gates on typecheck plus `/check verify` (AGENTS.md) — so `verify.md` _is_ the safety net, and the one criterion the whole Tracer Bullet approach exists to prove is the one it doesn't actually reach. `tsc --noEmit` will not catch a `"use server"` violation or a serialization failure; only `next build` / `next dev` will. There is a second-order risk too: `src/db/env.ts:25` throws at module import and `src/db/client.ts:8` opens a connection at module scope, so the first time this action _is_ imported by a page, `next build` will need `DATABASE_URL` and `DIRECT_URL` present at build time on Vercel — a failure mode nobody has hit yet precisely because nothing imports it.

**Suggested fix**: Wire the action into one real surface (a small Server Component or a `/api` route that calls it), then add `pnpm build` and a browser/`curl` invocation to `verify.md`'s command list so AC-8 is checked against the actual Next.js pipe. Confirm at the same time whether the build needs the env vars set in Vercel's build environment, not just runtime.

## Minor

### 🟡 `DIRECT_URL` is required at app runtime but only used by drizzle-kit, `src/db/env.ts:9,17-20`

**Problem**: `readDbEnv()` throws at import time if `DIRECT_URL` is missing, and `dbEnv` is imported by `src/db/client.ts`, which every Server Action pulls in. But `directUrl` is never read by any runtime code — spec 0002 scopes it to `drizzle-kit` introspection, and `drizzle.config.ts:3-8` already validates it independently with its own error message.

**Why it matters**: This forces the _direct, non-pooled_ connection string — a more privileged credential than the pooled one — into the production and preview runtime environments where nothing uses it, purely to satisfy a startup check. That is avoidable secret surface, and it will fail deploys for a variable the running app doesn't need.

**Suggested fix**: Drop `directUrl` from `DbEnv` and from the runtime validation; `drizzle.config.ts` is the right and only place it belongs. AGENTS.md's rule is "validate every _required_ env var" — at runtime this one isn't required.

### 🟡 Two redundant indexes, `supabase/migrations/20260809120000_core_data_model.sql:99,105`

**Problem**: `ratings_user_id_idx` on `(user_id)` is fully covered by the `ratings_user_movie_unique` index on `(user_id, movie_id)`, which serves any `user_id`-prefix lookup. `feed_items_user_id_idx` on `(user_id)` is likewise covered by `feed_items_user_shown_at_idx` on `(user_id, shown_at desc)`.

**Why it matters**: Every insert and update to `ratings` and `feed_items` — the two highest-write tables in the design — pays to maintain an index the planner will never choose, plus the storage. Both tables are on the hot path for swiping and feed generation.

**Suggested fix**: Drop both. The spec's "every foreign key column is indexed" invariant is still satisfied by the composite indexes; it's worth adding a one-line comment saying so, so a later reader doesn't "restore" them.

### 🟡 Extensions created in the `public` schema, `supabase/migrations/20260809120000_core_data_model.sql:8-9`

**Problem**: `create extension if not exists pgcrypto;` and `create extension if not exists vector;` omit `with schema extensions`, so they land in `public` (or wherever `search_path` points).

**Why it matters**: Supabase's own database advisor flags this as `extension_in_public`; the platform convention is a dedicated `extensions` schema, kept out of the schema that RLS-governed application tables live in and that PostgREST exposes. It's also a migration-portability hazard — a fresh Supabase project may already have `vector` installed in `extensions`, in which case `if not exists` silently no-ops and the two environments diverge.

**Suggested fix**: Use `create extension if not exists vector with schema extensions;` (same for `pgcrypto`) and confirm `gen_random_uuid()` still resolves on the resulting `search_path`. The `supabase-postgres-best-practices` skill named in the spec covers this.

### 🟡 `set_updated_at()` has a mutable search_path, `supabase/migrations/20260809120000_core_data_model.sql:122-130`

**Problem**: The trigger function has no `set search_path`, unlike `handle_new_user()` at `:146-156` which correctly pins one.

**Why it matters**: Supabase's advisor flags `function_search_path_mutable`. The exposure here is limited because the function is `security invoker` and only touches `new.updated_at`, so it is materially lower risk than a `security definer` function would be — but it is an inconsistency with the function 20 lines below it and a lint the project will have to clear eventually.

**Suggested fix**: Add `set search_path = ''` to `set_updated_at()`. While there, `handle_new_user()` pins `search_path = public` — since its body already fully qualifies `public.profiles`, `set search_path = ''` is the stricter and recommended form there too.

### 🟡 Server Action lives in a layer folder, not a feature folder, `src/app/actions/movies.ts`

**Problem**: AGENTS.md is explicit: "Organize source by feature under `src/<feature>/`, not by technical layer." `src/app/actions/` is a technical-layer folder, and it's the first one the project has created.

**Why it matters**: This is the file every subsequent feature will be patterned on, so the layer split will propagate — `src/app/actions/ratings.ts`, `src/app/actions/imports.ts`, and so on — which is precisely the structure the rule exists to prevent. Cheap to fix now, expensive after four features. (`src/db/` and `src/shared/` are shared infrastructure and read fine as-is.)

**Suggested fix**: Move it to `src/movies/actions.ts` (or `src/movies/get-or-cache-movie.ts`) and let spec #7's swipe action open `src/discovery/`.

### 🟡 A unique constraint is checked off as proof of upsert behavior, `docs/specs/0002-data-model/verify.md:14`

**Problem**: The step reads "Insert two `ratings` rows with the same `(user_id, movie_id)` → second insert violates `ratings_user_movie_unique`, confirming upsert-not-duplicate is enforced at the DB level → AC-1." AC-1 says re-swiping "updates that row rather than creating a duplicate." A rejected second insert proves the constraint exists; it proves the opposite of an upsert succeeding.

**Why it matters**: AC-1 is legitimately only half-satisfiable right now (no swipe action exists until spec #7), but the checkbox reads as if it were fully covered, which is how a gap gets forgotten. It's also the same missing-`onConflict` pattern that the tracer bullet action actually has, so the phrasing hides a real weakness rather than surfacing it.

**Suggested fix**: Reword to say the constraint is verified and the upsert path itself is deferred to spec #7, or add a step that runs an actual `insert ... on conflict (user_id, movie_id) do update` and asserts one row with the new value. The "Acceptance-criteria coverage" section already handles AC-2 this way honestly — mirror that.

## Nits

- ⚪ `drizzle.config.ts:13` — `export default` violates AGENTS.md's "named exports only," but drizzle-kit requires a default export. Worth one line in the existing comment block noting it's a tool-mandated exception, so a later reader (or a lint rule) doesn't try to "fix" it.
- ⚪ `supabase/migrations/20260809120000_core_data_model.sql:167-178` — `force row level security` is a no-op while the tables' owner (`postgres`) carries `BYPASSRLS`, which the successful signup-trigger and tracer-bullet steps in `verify.md` confirm it does. Harmless and arguably good defense-in-depth, but a comment saying it only bites if a non-bypassing app role is ever introduced would save someone a confusing debugging session.
- ⚪ `docs/specs/0002-data-model/verify.md:11` — "19 owner-scoped policies present" is off by one in spirit: `movies_select_authenticated` is `using (true)`, deliberately not owner-scoped.
- ⚪ `supabase/migrations/20260809120000_core_data_model.sql:37` — AC-5 calls out `cached_at` "for staleness checks" but there's no index on it. Fine at current scale; note it as spec #4's problem when the refresh sweep is written.
- ⚪ `src/app/actions/movies.ts:65-67` — the `if (!created)` guard is unreachable; `.returning()` on a successful single-row insert always yields a row. Harmless defensiveness, but it's a branch that can never be exercised.
- ⚪ `pnpm-workspace.yaml:2` — `esbuild: true` newly allows an install-time build script (pulled in via drizzle-kit). Expected and standard, just flagging that the change widens the postinstall surface.
- ⚪ `docs/scope/scope.md` and `docs/specs/0002-data-model/verify.md` have uncommitted edits sitting on top of `cd34dbd`. Commit them with the feature so the tree is clean at merge.
- ⚪ `pnpm-lock.yaml` — scanned, nothing anomalous; additions correspond to `drizzle-orm`, `drizzle-kit`, `postgres`, `tsx` and their esbuild dependency tree.

## Strengths

- **The SQL migration is genuinely good work.** It matches spec 0002's data-model tables field-for-field, gets the cascade/restrict asymmetry right (`on delete cascade` on every `user_id`, `on delete restrict` on every `movie_id`), CHECK-constrains all four enum-ish columns, and enables _and forces_ RLS on all six tables before writing a single policy. The `(select auth.uid())` wrapping is applied consistently across all 18 owner-scoped policies — that's the per-row re-evaluation trap the `supabase-postgres-best-practices` skill warns about, avoided everywhere rather than in most places.
- **`import_rows` carries a denormalized `user_id`** so its RLS policy is a single indexed lookup instead of an `EXISTS` join against `imports`. That's a deliberate, correctly-reasoned performance decision, documented at the point of use (`migration:233-234`) rather than only in the spec.
- **RLS was verified over a genuinely different privilege path.** `verify.md:19-21` uses `SET LOCAL ROLE authenticated` plus `set_config('request.jwt.claims', ...)` and checks all three cases — cross-user denied, owner allowed, `anon` denied. Testing the owner-allowed case is what separates real verification from a policy set that happens to deny everything, and the spec's own cross-check had previously caught an AC-7 scenario that couldn't fail. Good follow-through.
- **The `null` → `undefined` boundary is a clean, minimal abstraction.** `toUndefined` (`src/db/nullable.ts`) plus the `toMovie` mapper is exactly the right amount of machinery to satisfy AGENTS.md's no-`null` rule without a heavyweight DTO layer, and the `Result<T, E>` shape in `src/shared/result.ts` is correctly `readonly` throughout.
- **The spec/scope docs are honest about deviation.** Build-plan item 6 records _why_ the tracer bullet targets `movies` instead of `profiles` (no auth flow exists to produce a real `auth.users` row) instead of quietly retargeting it, and item 7 records how RLS was verified without a Supabase anon key. That is the right instinct.

## Test coverage

`TESTS = none-by-design` — the project gates on `pnpm run typecheck` plus manual `/check verify`, so no findings are raised for the absence of a runner.

Judged against that gate, `verify.md` is a real, followable checklist: 16 concrete steps with expected results, each mapped to an acceptance criterion, plus an explicit coverage section that admits AC-2's behavioral half is out of scope. The schema-level criteria (AC-1 constraint, AC-3, AC-4, AC-5, AC-6, AC-7) are checked against the live database with queries specific enough to re-run.

Two gaps in the gate itself, both raised above:

- **AC-8 is not actually exercised through Next.js** (Major, above). Nothing imports the action and `pnpm build` is not in the command list, so the Server Action boundary is unproven — `tsc --noEmit` cannot catch a `"use server"` shape violation or a serialization failure. This is the criterion the Tracer Bullet approach exists to establish, so it should be the best-covered one, not the weakest.
- **AC-1's upsert half is checked off by a constraint rejection** (Minor, above), which demonstrates the constraint rather than the update-on-conflict behavior the criterion describes.

Where typecheck will not help at all, and `/check verify` should be extended: the concurrent-insert race in `getOrCacheMovieAction` (two parallel calls with identical keys — currently returns `err("unknown")` instead of the cached row), and the connection-pool behavior under `next dev` HMR and multi-instance serverless. Both are runtime shapes invisible to the compiler, and both are currently masked by the bare `catch`.

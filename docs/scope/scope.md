# Scope: Movie Recommendation App

A movie recommendation app where users sign in, onboard by importing their Letterboxed CSV ratings or swiping through movies, then get a personalized feed with reasons and a natural language vibe search.

**Build approach:** Tracer Bullet (each feature built end to end through every layer, working; prove the whole pipe connects before building any part of it fully).
**Workflow:** Beta (after /develop: /check verify, then /test; no fresh model review by default).

_You are in charge. Every box below is a **suggestion**, not a gate: run any, skip any, and mark a feature `done` when you decide it is. The workflow records what you actually did (including "skipped"), it never requires a step. The one thing it asks is that a load bearing decision be written down (a spec), not that any check be run._

## At a glance

| #   | Feature                          | Phase      | Status      |
| --- | -------------------------------- | ---------- | ----------- |
| 1   | Stack & architecture             | Foundation | done        |
| 2   | Coding standards & tooling       | Foundation | done        |
| 3   | Data model                       | Foundation | done        |
| 4   | Movie catalog integration        | Foundation | done        |
| 5   | Design system & UI foundation    | Foundation | in-progress |
| 6   | Product analytics foundation     | Foundation | planned     |
| 7   | Core discovery loop              | Slice 1    | planned     |
| 8   | Letterboxd CSV import onboarding | Slice 2    | planned     |
| 9   | Vibe search                      | Slice 3    | planned     |
| 10  | Account & privacy settings       | Slice 4    | planned     |
| 11  | Public landing page & SEO        | Slice 5    | planned     |

## Foundations

### 1. Stack & architecture

Decide the stack and scaffold a runnable project so every later slice builds on real structure.
**Done when:** the stack is recorded in a spec and the empty scaffold boots locally and passes build.

- [x] Decide the stack (spec): `/architect stack & architecture` · spec [0001](../specs/0001-stack-architecture/index.md)
- [x] Scaffold from the decision: `/develop stack & architecture` · code in repo root (Next.js App Router scaffold: `src/app/`, `package.json`, `tsconfig.json`)
- [x] Verify it: `/check verify stack & architecture`
- [x] Test it: `/test stack & architecture`

### 2. Coding standards & tooling

Capture conventions, then install lint, format, and pre-commit enforcement from the real scaffolded project.
**Done when:** root `AGENTS.md` reflects the real stack, and lint/format/pre-commit run clean.

- [x] Capture conventions + tooling choices: `/audit`
- [x] Install lint, format, and pre-commit enforcement: `/develop tooling` · code in repo root (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.husky/pre-commit`, `package.json`)

### 3. Data model

Core entities every feature builds on: users, movie catalog cache, ratings, swipes, imports, feed items, and recommendation reasons.
**Done when:** entities and relationships support onboarding (both paths), the feed, and vibe search without a breaking migration.

- [x] Design it (spec): `/architect data model` · spec [0002](../specs/0002-data-model/index.md)
- [x] Build it: `/develop data model` · code in `supabase/migrations/`, `src/db/`, `src/shared/result.ts`, `src/app/actions/movies.ts`, `drizzle.config.ts`
  - [x] Connect Drizzle ORM to Supabase Postgres (`DATABASE_URL`/`DIRECT_URL`), satisfies AC-8
  - [x] Migrate the six core tables by hand written SQL (profiles, movies, ratings, imports, import_rows, feed_items) with their constraints and cascade rules, plus the pgvector embedding column, satisfies AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
  - [x] Enable RLS deny by default with owner scoped policies and foreign key indexes on all six tables, satisfies AC-7
  - [x] Generate Drizzle types, the null-to-undefined data access boundary, and a tracer bullet Server Action proving the pipe end to end, satisfies AC-8
- [x] Verify it: `/check verify data model`
- [x] Test it: `/test data model`

### 4. Movie catalog integration

How rich movie metadata (posters, genres, cast, synopsis, ratings) gets sourced and kept fresh; every later feature displays or reasons over this data.
**Done when:** a movie can be looked up with full metadata, and the sync/caching approach is recorded.

- [x] Design it (spec): `/architect movie catalog integration` · spec [0003](../specs/0003-movie-catalog-integration/index.md)
- [x] Build it: `/develop movie catalog integration` · code in `src/movies/`, `src/auth/`, `src/observability/`, `src/app/actions/movies.ts`, `src/app/api/jobs/refresh-catalog/`, `src/instrumentation.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `supabase/migrations/`
  - [x] TMDB client and Supabase Auth session guard, satisfies AC-6, AC-8, AC-10
  - [x] Direct lookup (`getOrRefreshMovie`) with a real detail upsert, satisfies AC-1, AC-2, AC-3, AC-6, AC-8, AC-9, AC-10
  - [x] Search and browse with the list upsert, satisfies AC-4, AC-5, AC-6, AC-8, AC-9, AC-10
  - [x] Scheduled staleness refresh job (Route Handler + `pg_cron`/`pg_net` migration), satisfies AC-7, AC-10, AC-11
- [x] Verify it: `/check verify movie catalog integration`
- [ ] Test it: `/test movie catalog integration` (skipped on the engineer's call after a clean verify)

### 5. Design system & UI foundation

Visual language, layout primitives, and base components so onboarding, the feed, and search feel cohesive.
**Done when:** `design.md` covers type/color/spacing/components, base components handle focus and keyboard, and the WCAG AA baseline is documented.

- [x] Design it (spec): `/architect design system & UI foundation` · spec [0004](../specs/0004-design-system-ui-foundation/index.md)
- [x] Build it: `/develop design system & UI foundation` · code in `src/design-system/`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/dev/components/`, `design.md`, `components.json`, `postcss.config.mjs`
  - [x] Tailwind CSS v4 + shadcn/ui setup, design tokens (color/type/spacing/radius), and root layout wiring, satisfies AC-1, AC-2
  - [x] Core interactive and Layout/structure components (button, input, select, checkbox, radio, label, container, stack, card), satisfies AC-3, AC-4, AC-5, AC-6
  - [x] Navigation and Feedback/overlays components (header/nav, tabs, link, dialog, toast, spinner, badge), plus reduced motion handling, satisfies AC-3, AC-4, AC-7, AC-8
  - [x] `/dev/components` showcase route, `design.md`, and removal of the create-next-app boilerplate, satisfies AC-9, AC-10, AC-11
- [ ] Verify it: `/check verify design system & UI foundation`
- [ ] Test it: `/test design system & UI foundation`

### 6. Product analytics foundation · needs a decision

Event taxonomy and provider so onboarding completion and feed engagement, the chosen success metric, are measurable from day one.
**Done when:** an event fires end to end (captured and visible) and the core event names (onboarding started/completed, feed viewed, feed item engaged) are recorded.

- [ ] Design it (spec): `/architect product analytics foundation`

## Slice 1: Core discovery loop

### 7. Core discovery loop · needs a decision

The walking skeleton: sign in (email + Google OAuth), swipe through movies to onboard, then see a personalized feed with a reason attached to each recommendation. Real auth, real DB, real UI, no CSV import or vibe search yet.
**Done when:** a user can sign in, swipe to rate a set of movies, and see a feed of recommendations, each with a short reason, that reflects their swipes.

- [ ] Design it (spec): `/architect core discovery loop`

## Slice 2: Letterboxd CSV import onboarding

### 8. Letterboxd CSV import onboarding · needs a decision

A second onboarding path: upload a Letterboxd ratings export CSV, match titles against the catalog, and seed the same taste profile the swipe path builds.
**Done when:** a user can upload a Letterboxd CSV, see matched vs unmatched titles, and land on a feed seeded from the import, with malformed or unmatched rows handled visibly rather than silently dropped.

- [ ] Design it (spec): `/architect letterboxd CSV import onboarding`

## Slice 3: Vibe search

### 9. Vibe search · needs a decision

Natural language search over the catalog ("something moody and slow-burn like Blade Runner") that understands vibe, not just title/genre keywords, informed by the user's taste profile.
**Done when:** a user can type a free text vibe query and get a ranked, relevant result set distinct from keyword/title search, in a reasonable response time.

- [ ] Design it (spec): `/architect vibe search`

## Slice 4: Account & privacy settings

### 10. Account & privacy settings · needs a decision

Privacy policy and terms pages, plus account controls: sign out, delete account, and delete the imported/rated data tied to it.
**Done when:** a user can read the privacy policy, delete their account, and confirm their ratings/import data are removed; the deletion behavior (hard vs soft delete, cascade scope) is recorded.

- [ ] Design it (spec): `/architect account & privacy settings`

## Slice 5: Public landing page & SEO

### 11. Public landing page & SEO

A signed-out marketing page explaining the product, with basic on-page SEO (metadata, sitemap, social cards), built on the established design system.
**Done when:** the landing page renders signed out, has page metadata and a sitemap entry, and links into sign in.

- [ ] Build it: `/develop public landing page & SEO`

## Deferred

Out of scope for the current build pass, kept so the plan stays honest.

- **Monetization & billing**: subscription or ads support · needs a decision
- **Notification / recommendation digest email**: welcome email and periodic digest · needs a decision
- **Admin panel**: internal view to manage users and inspect data · needs a decision
- **Internationalization**: additional languages/locales · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State                        | Set by                                                                                 | The feature shows                                                                                                                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planned` · needs a decision | `/scope`                                                                               | one box: `Design it (spec): /architect <feature>`                                                                                                                                                                                                                                 |
| `in-progress` (designed)     | **`/architect` at spec capture**                                                       | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow-up enrolled                                                          |
| `in-progress` (building)     | `/develop`                                                                             | milestone sub-boxes tick one by one; code pointer filled                                                                                                                                                                                                                          |
| `in-progress` (verified)     | `/check verify`                                                                        | `Build it` + milestones ticked; `Verify it` ticked                                                                                                                                                                                                                                |
| `done`                       | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | the boxes you ran are ticked, ones you skipped are recorded as skipped; the tier's last stage (`Prototype` → after `/develop`; `Alpha` → after `/check verify`; `Beta`/`GA` → after `/test`) is the _suggested_ point to call it done, never a gate; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (e.g. `· GA`, `· Prototype`) overrides the project default `**Workflow:**` tier for that one feature; no tag = inherit. The **effective tier** (tag if set, else default) is the _recommended_ verification depth; every skill reads it the same way to suggest the next step and to shape the closing boxes. Those boxes are suggestions you run or skip; skipping never blocks `done`. The single rigor dial (no separate "weight").
- **Workflow** (header line) is the project default tier, the stages each feature _suggests_ running **after** `/develop`: **Prototype** = nothing (rely on its build time self check); **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. `done` is your call, not gated on these; a skipped stage is recorded as skipped. An `Assumed` spec is flagged on the feature (its decision still owes ratification) but does not block you from marking `done`; `/architect` still records any load bearing decision, the one thing the workflow asks. A feature's own tier tag overrides the default.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.

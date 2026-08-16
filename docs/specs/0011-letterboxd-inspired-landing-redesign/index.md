# 0011. Letterboxd inspired landing page redesign

**Date**: 2026-08-16
**Status**: Accepted

## Summary

This decision redesigns the signed out home page (`src/app/page.tsx`) to read much closer to
letterboxd.com: a full bleed dark page (dropping the light lavender "floating card" look added on
2026-08-15), a hero built from a real poster collage pulled from the app's own movie catalog, and a
"Popular right now" poster row using real data, not more marketing copy. The blue accent color and
the TellaMovie name stay as they are; this is a layout and imagery change, not a full rebrand. It
also adds one new thing to the backend: a public, no login required way to read a short list of
popular movies, since every existing movie action currently requires a signed in session.

## Requirements

**User stories**:

- As a visitor who has never signed up, I want the home page to feel like a real movie product
  with real posters, not a generic marketing template, so I trust the app enough to create an
  account.
- As the engineer, I want the home page's popular movies to come from the same catalog data the
  rest of the app already trusts, not hand picked images, so the page never looks stale or fake.
- As a user relying on a keyboard or screen reader, I want the new poster wall and poster row to
  respect the same accessibility baseline as the rest of the app, so the redesign does not cost
  accessibility ground already won.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: The home page renders full bleed on the dark canvas (`bg-canvas`), with no light
  backdrop. The `.marketing-backdrop` CSS class and the `--color-backdrop-from/via/to` tokens are
  removed from `tokens.css`, since no page uses them once this ships.
- **AC-2**: The hero section shows a real poster collage background built from the app's own movie
  catalog data (not placeholder or stock images), with a dark scrim over it so the headline and
  subhead keep the already verified ink on canvas (17.4:1) and body on canvas (9.0:1) contrast.
- **AC-3**: A "Popular right now" horizontal poster row renders below the hero, showing real
  movies (title, poster, rating badge), reusing the existing `Card` / `MoviePoster` / `Badge`
  pattern already used in the feed's poster grid.
- **AC-4**: Both the hero collage and the popular row are powered by one new public Server Action
  that needs no signed in session, while still going through the same service role bound data
  layer as every other read in the app (no anon key used).
- **AC-5**: If the catalog has fewer posters than wanted (for example, right after first deploy,
  before the catalog refresh job has run) or the TMDB call fails, the page still renders cleanly:
  the hero falls back to a plain dark gradient and the popular row is left out, never a visible
  error on a public marketing page.
- **AC-6**: The page reuses the existing `NavBar` component directly on the dark canvas, the same
  header already used on sign in, terms, and privacy, instead of a bespoke header just for home.
- **AC-7**: Below the hero and popular row, the page keeps the existing "How it works" three step
  section, the closing call to action, and the footer, restyled for the darker, denser look. The
  four card "Built around your actual taste" feature grid is removed.
- **AC-8**: The "TellaMovie" brand name and wordmark are unchanged.
- **AC-9**: Existing SEO surfaces, page metadata, the sitemap entry, the Open Graph image, and the
  canonical URL, keep working unchanged; the new poster imagery must not block or slow initial
  metadata delivery in a way that regresses SEO.
- **AC-10**: The WCAG AA baseline holds: the decorative poster collage is `aria-hidden`, every
  poster in the popular row carries real alt text through the existing `MoviePoster` /
  `ImageFallback` components, the horizontal scroll row is usable by keyboard, and every focus ring
  stays intact.
- **AC-11**: `design.md` is rewritten for the signed out shell's new direction (poster collage hero,
  popular row, full bleed dark canvas), replacing the lavender "marketing backdrop" passage from
  the 2026-08-15 rebrand notes. The accent color, its contrast values, and the authenticated shell
  sections (tab bar, hero spotlight, poster grid) are not touched.

## Options considered

### Option 1: Full bleed dark canvas, real poster collage and popular row (chosen)

Drop the lavender floating card entirely. The home page sits directly on the dark canvas like
every other signed out page, with a hero built from real cached poster art and a real "Popular
right now" row underneath.

**Pros**:

- The single closest match to how letterboxd.com actually reads (dark, poster dense, image led)
  achievable with data the app already has.
- Removes a page chrome pattern (the lavender card) that exists nowhere else in the app and was
  never fully load bearing to begin with.

**Cons**:

- Needs one new public facing Server Action, a small addition to the app's public surface that the
  presentation only 0007 redesign never needed.
- The hero's quality depends on the catalog already having enough cached popular titles; a brand
  new environment needs the refresh job to have run at least once first.

### Option 2: Keep the lavender card, restyle its contents darker and denser

Keep the floating card structure from the 2026-08-15 rebrand, just make what is inside it feel
more poster forward.

**Pros**:

- Smaller change, no new Server Action, no tokens.css cleanup.

**Cons**:

- The floating card on a light backdrop is a pattern that does not exist anywhere on
  letterboxd.com or in the rest of this app; keeping it caps how close the result can actually get
  to the reference, which is the whole point of this request.

### Option 3: Full Letterboxd style rebrand, including its green accent color

Adopt a Letterboxd style green as the new accent color across the signed out shell, in addition to
the layout changes.

**Pros**:

- Closer still to Letterboxd's actual brand identity.

**Cons**:

- The engineer chose to keep the existing blue accent (already AA contrast verified) rather than
  reopen and re-verify a whole new color across the design system; a color change also does not
  fit "wire to the same base we already have," which asked for the existing foundation to carry
  the new look, not be replaced by it.

## Decision

**Chosen option**: Option 1: Full bleed dark canvas, real poster collage and popular row.

Rebuild the home page as a full bleed dark page built from real catalog data, keeping the existing
blue accent, the TellaMovie name, and the shared `NavBar`.

## Rationale

Reasoning and the full context: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

No new tables or columns. The new action reads the existing `movies` table (from spec 0002 / spec 0003) exactly as `browsePopularMovies` already does, through `discoverTmdbPopularMovies` and
`listUpsert`.

**API surface**:

| Action                   | Trigger                                     | Key inputs                                  | Key outputs                    | Auth         | Key errors                                |
| ------------------------ | ------------------------------------------- | ------------------------------------------- | ------------------------------ | ------------ | ----------------------------------------- |
| `getPublicPopularMovies` | Called during the home page's server render | `limit: number` (how many posters to fetch) | `Result<MovieList, DataError>` | none, public | `"unknown"` on a TMDB or database failure |

**Value sourcing**:

| Action                   | Value produced / displayed                      | Source                                                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getPublicPopularMovies` | The popular movies list (title, poster, rating) | TMDB's popularity ranked discover endpoint (`discoverTmdbPopularMovies`, already used by `browsePopularMovies`), written through `listUpsert` into the `movies` table exactly like every other list fetch |
| Home page hero           | The poster collage images                       | The same `getPublicPopularMovies` result, fetched with a larger `limit` and tiled into the collage                                                                                                        |
| Home page render         | How often TMDB is actually called               | The route segment's `revalidate = 3600` (one hour ISR), a RECOMMEND decision (below), not a per visitor call                                                                                              |

**Key invariants**:

- `getPublicPopularMovies` never requires a session and never writes anything a signed in user's
  data depends on; it only reads and caches public movie metadata, identical in shape to what
  `browsePopularMovies` already caches.
- The page never shows a visible error state for a hero or popular row failure; it degrades to a
  plain gradient and an omitted row instead (AC-5).

**Security model**:

Fully public, read only, no PII. Like every other read in the app, this action goes through the
Supabase service role key server side (the project's data access boundary rule), never the anon
key. The `movies` table's `movies_select_authenticated` row level security policy does not block
this: RLS only applies to direct anon or authenticated client access, and this action, like every
other movie read in the app, goes through the service role key, which is exempt from RLS by
design. No new authorization model is needed.

**Configuration required**:

None. Reuses the existing TMDB credentials and database connection already configured for the
movie catalog integration (spec 0003).

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: the home page renders with a real poster collage hero and a populated "Popular right
  now" row, verifies **AC-2**, **AC-3**, **AC-4**.
- Failure case: `getPublicPopularMovies` fails or returns fewer posters than requested; the hero
  falls back to a plain gradient and the popular row is omitted, with no visible error, verifies
  **AC-5**.
- Accessibility: keyboard tab order reaches every interactive element (nav, popular row, CTAs) with
  a visible focus ring, and the decorative collage is invisible to a screen reader while every
  popular row poster announces real alt text, verifies **AC-10**.

## Build plan

1. [x] Add `getPublicPopularMovies` (a new exported function alongside the existing movie actions,
       reusing `discoverTmdbPopularMovies`, `listUpsert`, and `toMovie`, with no `requireSession`
       call), satisfies **AC-4**. Code: `src/app/actions/movies.ts`.
2. [x] Add a `PosterWall` component (the decorative, `aria-hidden` hero collage) and a horizontal
       scrolling poster row for "Popular right now," both reusing the existing `MoviePoster`, `Card`,
       and `Badge` components rather than inventing new poster rendering, satisfies **AC-2**, **AC-3**,
       **AC-10**. Code: `src/design-system/components/poster-wall.tsx`, `src/app/page.tsx`.
3. [x] Rebuild `src/app/page.tsx`: remove the `.marketing-backdrop` wrapper and floating card, render
       `NavBar` directly on the dark canvas, wire the hero and popular row to `getPublicPopularMovies`,
       set `export const revalidate = 3600` on the route so TMDB is called at most once an hour, keep
       "How it works," the closing CTA, and the footer (restyled), and remove the four card feature
       grid, satisfies **AC-1**, **AC-3**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**.
4. [x] Remove the now unused `.marketing-backdrop` class and `--color-backdrop-from/via/to` tokens from
       `tokens.css`, satisfies **AC-1**.
5. [x] Rewrite `design.md`'s signed out shell section for the new direction, and link this spec from
       scope feature 11, satisfies **AC-11**.

## Consequences

**Positive**:

- The home page finally reads close to the letterboxd.com reference, using only data the app
  already has, no new external dependency.
- Removes a page chrome pattern (the lavender card) that existed only on this one page and had no
  spec behind it.
- One consistent header across the entire signed out shell (home, sign in, terms, privacy).

**Negative / tradeoffs**:

- The hero and popular row depend on the catalog already holding cached popular titles; a brand
  new environment needs the refresh job (spec 0003) to have run at least once, or the page falls
  back to a plain gradient with no popular row until it has.
- The one hour ISR cache means the hero and popular row can be up to an hour behind TMDB's live
  popularity ranking, an accepted tradeoff for not calling TMDB on every visitor.
- One more public, unauthenticated Server Action exists in the codebase; it is read only and
  carries no PII, but it is a small addition to the public surface that did not exist before.

**Neutral**:

- The `--color-backdrop-*` tokens and `.marketing-backdrop` class are deleted outright rather than
  kept unused, per the project's own "delete what is certainly unused" rule.
- "TellaMovie" naming is unchanged; a rename was raised and explicitly deferred (see Follow-up).

## Follow-up

- [ ] The brand name/wordmark change was raised during design and deferred; revisit as its own
      decision later if still wanted.
- [ ] No automated test suite exists yet (project convention). Verify this feature with
      `/check verify` and a manual browser pass, per `test-preferences.json`.
- [ ] Consider carrying the same full bleed dark, poster forward treatment to the sign in page for
      full consistency across the signed out shell; out of scope here, this spec covers the home
      page only.
- [ ] Adding page view or CTA click analytics to the redesigned home page is a separate decision;
      this spec does not add new analytics events.

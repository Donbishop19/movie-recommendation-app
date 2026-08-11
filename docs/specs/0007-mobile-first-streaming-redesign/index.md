# 0007. Mobile first streaming app visual redesign

**Date**: 2026-08-11
**Status**: In Progress

## Summary

This decision replaces the design system's visual direction (spec 0004) with a modern, mobile first
streaming app look: a large hero movie card with a gradient overlay, pill shaped chips, rounded
poster cards with a rating badge, and a persistent bottom tab bar, based on a reference screenshot
the engineer supplied. It keeps the existing accessible component set and accent color, and adds
three new components (a bottom tab bar, a hero spotlight, and a pill chip group) rather than
rebuilding the system from scratch. Nothing about it needs a database or a server action change; it
is presentation and page composition only.

## Requirements

**User stories**:

- As the person building every screen from this point on, I want the design system to read as a
  mobile first streaming app, not a desktop dashboard, so new screens (Letterboxd import, vibe
  search, account settings, the landing page) inherit a direction that matches the product's real
  feel.
- As a user on a phone, I want a persistent bottom tab bar and a large featured recommendation at
  the top of my feed, so the app feels like the movie apps I already use.
- As a user relying on a keyboard or screen reader, I want the new tab bar, hero spotlight, and
  chip row to be just as reachable and clearly focused as every other component, so the redesign
  does not cost accessibility ground already won in spec 0004.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: `design.md` is rewritten to document the new character (name, palette notes, mobile
  shell pattern, updated component inventory), while the existing verified color tokens and their
  contrast values are retained, not re derived.
- **AC-2**: New CSS custom properties for the hero gradient overlay, the poster rating badge, and
  the tab bar are added to `tokens.css` alongside, not replacing, the existing color, spacing,
  radius, and motion tokens.
- **AC-3**: A new `TabBar` component (`tab-bar.tsx`, exporting `TabBar` and `TabBarItem`) renders a
  persistent bottom navigation bar with two real destinations, Feed and Account, fully keyboard
  operable with the existing focus ring convention and correct `aria-current` on the active item.
- **AC-4**: The authenticated app shell (onboarding, feed) renders the new `TabBar` instead of the
  top `NavBar`; the signed out shell (home, sign in) keeps the existing top `NavBar` unchanged.
- **AC-5**: A new `HeroSpotlight` component renders at the top of the Feed page, showing the user's
  top ranked recommendation as a large poster image with a gradient overlay and its recommendation
  reason text, falling back to `ImageFallback` when the poster is missing.
- **AC-6**: A new `Chip` / `ChipGroup` component renders a pill shaped row above the Feed's poster
  grid with a single active "For You" chip; it is styled and keyboard operable but not wired to any
  filtering logic in this pass.
- **AC-7**: The movie poster `Card` used in swipe onboarding and the feed grid is restyled with
  fully rounded corners and a TMDB rating badge overlay (reusing `Badge`, sourced from the already
  synced `movies` rating field), replacing the current plain bordered treatment.
- **AC-8**: The authenticated app shell's `Container` usage (onboarding, feed) is constrained to a
  centered, phone width column at every viewport size, not only below the small breakpoint.
- **AC-9**: Every restyled or newly added component keeps the existing WCAG AA baseline (visible
  accent focus ring, 44 by 44px minimum touch target, no color only signal), specifically re
  verified for the new gradient overlay text and the new tab bar icons, since those are the two
  genuinely new visual treatments this spec introduces.
- **AC-10**: The `/dev/components` showcase route is updated to render `TabBar`, `HeroSpotlight`,
  and `ChipGroup` and their key states, alongside the existing inventory.
- **AC-11**: The nine already shipped components touched by this redesign (`button`, `badge`,
  `container`, `link`, `nav-bar`, `stack`, `card`, `dialog`, `toast`, `input`) keep their existing
  exported names and prop signatures; only their internal class names change, so onboarding, feed,
  and sign in code needs no prop level changes beyond adopting the new shell components where the
  page structure requires it.

## Decision

**Chosen option**: Option 2: Full re skin plus new structural components

Restyle the existing component set in place (same exported names and props) and add three net new
components, `TabBar`, `HeroSpotlight`, and `ChipGroup`, swapping the authenticated app shell's
navigation from the top `NavBar` to the bottom `TabBar` and constraining it to a phone width column.
The accent color and its already verified contrast values are kept unchanged.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`,
`.agents/skills/nextjs-app-router-patterns/`), for the server or client component split on the new
`TabBar` and `HeroSpotlight` (interactive parts need `"use client"`, the rest stays server rendered)
· `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`), for
typing the new `TabBarItem` and `Chip` variant props precisely

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
None. This is presentation and page composition only; no new table, column, or migration.

**State transitions**:
N/A, no entity state machine.

**API surface**:
None. No new Server Actions or Route Handlers. `HeroSpotlight` and the poster rating badge read
values already produced by the existing feed and movie catalog actions (spec 0006, spec 0003); the
`TabBar`'s Account destination reuses the existing sign out Server Action until Slice 4 ships real
account settings.

**Value sourcing**:

| Action / component         | Value produced or displayed              | Source                                                                                                            |
| -------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `HeroSpotlight`            | Top ranked recommendation and its poster | The existing feed Server Action's first (highest ranked) returned item, no new ranking logic                      |
| `HeroSpotlight`            | Recommendation reason text               | The existing feed Server Action's per item reason field (spec 0006)                                               |
| Poster `Card` rating badge | TMDB rating                              | The `movies.vote_average` column already synced by the movie catalog integration (spec 0003)                      |
| `TabBar` Account item      | Its destination                          | Until Slice 4 (Account & privacy settings) ships, routes to the existing sign out action in `src/auth/actions.ts` |

**Key invariants**:

- No component hardcodes a raw color, spacing, or radius value outside the token set (carried over
  from spec 0004).
- The bottom `TabBar` and `HeroSpotlight` never render on the signed out shell (home, sign in); the
  top `NavBar` never renders on the authenticated app shell (onboarding, feed).
- The nine already shipped components' exported names and prop signatures are unchanged; only the
  Tailwind class names inside them change.
- Any text rendered over the hero gradient overlay meets 4.5 to 1 contrast against the busiest
  expected poster region (checked against a bright, low contrast poster, not just a dark one).

**Security model**:
Not applicable, unchanged from spec 0004. No data access or authorization boundary; these remain
presentational primitives.

**Configuration required**:
None. No new environment variables or credentials.

**Critical test scenarios** (manual, per `AGENTS.md`'s "no automated suite yet, verify with
typecheck plus manual `/check verify`"):

- Happy path: sign in, land on the feed, see the hero spotlight's top pick, scroll the poster grid
  with rating badges, reach Account through the bottom tab bar, all using the keyboard only,
  verifies **AC-3**, **AC-4**, **AC-5**, **AC-7**, **AC-9**
- Failure case: a poster image fails to load in the hero spotlight, the `ImageFallback` placeholder
  renders instead of a broken image icon, verifies **AC-5**
- Accessibility: tab through the new `TabBar` and `ChipGroup` with the keyboard only, confirm the
  visible focus ring and the correct `aria-current` / `aria-selected` state, verifies **AC-3**,
  **AC-6**, **AC-9**
- Showcase check: `/dev/components` renders `TabBar`, `HeroSpotlight`, and `ChipGroup` in isolation
  with their key states, verifies **AC-10**

## Build plan

1. [x] Extend `tokens.css` with the new hero gradient, tab bar, and poster badge tokens alongside
       the existing, unchanged palette, satisfies **AC-2**
2. [x] Rewrite `design.md`'s character, composition patterns, and component inventory sections for
       the new direction, keeping the existing verified contrast values, satisfies **AC-1**
3. [x] Build `TabBar` and wire it into the authenticated app shell layout (onboarding, feed),
       replacing `NavBar` there only; confirm the signed out shell (home, sign in) still renders
       `NavBar` unchanged, satisfies **AC-3**, **AC-4**
4. [x] Build `HeroSpotlight` and wire it to the top of the Feed page using the existing feed
       action's top ranked item and reason text, satisfies **AC-5**
5. [x] Restyle the poster `Card` used in swipe onboarding and the feed grid with rounded corners
       and a TMDB rating badge overlay, satisfies **AC-7**
6. [x] Build `Chip` / `ChipGroup` and place it above the Feed poster grid with a single active "For
       You" chip, cosmetic only, satisfies **AC-6**
7. [x] Constrain the authenticated app shell's `Container` usage to the centered phone width
       column at every viewport size, satisfies **AC-8**
8. [x] Restyle the remaining touched components' internal class names (`button`, `badge`, `input`,
       `dialog`, `toast`, `container`, `stack`, `link`) to the new direction without changing exported
       names or props, satisfies **AC-11**
9. [x] Verify WCAG AA contrast and touch target size on every new and restyled component (checked
       by construction: the hero text sits on a fully opaque scrim matching the already verified ink on
       canvas ratio, the tab bar and chips reuse `focusRing` and meet the 44px touch target via
       `--size-tab-bar`/`min-w-11`); a live browser check is still owed, see Follow-up, satisfies
       **AC-9**
10. [x] Update the `/dev/components` showcase route to render `TabBar`, `HeroSpotlight`, and
        `ChipGroup` and their key states, satisfies **AC-10**; confirmed rendering (HTTP 200, new
        section present) against the running dev server 2026-08-11

## Consequences

**Positive**:

- The app reads as a modern mobile streaming product from first launch, matching the reference
  direction, using data already available from the existing feed and catalog actions.
- Reusing the same accent color and the existing Radix based accessible primitives means no new
  WCAG audit for color; only the two genuinely new treatments (gradient overlay, tab bar) need one.
- The nine already shipped base components keep their exported API, so onboarding, feed, and sign
  in call sites need shell level changes, not prop level rewrites.

**Negative / tradeoffs**:

- Every screen just manually verified (the sign in layout bug fixed earlier this session) gets
  restyled again in this same pass, so that manual verification needs to be redone, not assumed to
  still hold.
- The pill filter chips are cosmetic only in this pass; shipping a control that visually implies
  filtering but does nothing is real UX debt until it is wired to something.
- The `TabBar`'s Account destination has no real settings page behind it yet (Slice 4 is not built);
  it only offers sign out until then.

**Neutral**:

- `design.md`'s name changes from `cinematic-amber-design-system` to reflect the new direction;
  spec 0004 is superseded, not deleted, so the original direction's reasoning stays on record.
- Three net new components (`TabBar`, `HeroSpotlight`, `Chip` / `ChipGroup`) join the component
  inventory.

## Follow-up

- [ ] No browser automation tool was available to `/develop` for this build; typecheck and lint are
      clean and the `/dev/components` showcase was confirmed rendering server side (HTTP 200), but
      the actual visual result (hero gradient legibility, tab bar layout, poster grid on a real
      phone width) has not been checked in a live browser. Do that check next, ideally against the
      reference image, before calling this feature done.
- [ ] Wire the `ChipGroup` filter pills to real genre or category filtering once there is more than
      one ranking view to switch between (see AC-6).
- [ ] Replace the `TabBar`'s Account tab placeholder with real account settings once Slice 4
      (Account & privacy settings) ships.
- [ ] Re run a full manual walkthrough of sign in, onboarding, and feed after this redesign lands,
      since it restyles surfaces that were just bug fixed and manually verified this session.
- [ ] A dedicated numbered "Top picks for you" ranked list section was declined for this spec (see
      rationale.md); revisit if user research wants a distinct ranked view beyond the hero
      spotlight.

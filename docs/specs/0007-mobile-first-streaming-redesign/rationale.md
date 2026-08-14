# Rationale: mobile first streaming app visual redesign

## Context

Spec 0004 shipped a dark, amber accented "cinematic screening room" direction: a sticky top
`NavBar`, a `Container` capped at readable prose widths, and simple bordered `Card`s. It was
designed and accepted before any real screen existed to react to. Sign in, swipe onboarding, and
the feed (spec 0006) are now built and were being manually verified end to end when the engineer
compared the running app against a reference mobile streaming app screenshot: a large hero movie
card with a gradient overlay, pill shaped category chips, rounded poster cards with a rating badge,
and a persistent bottom tab bar. The engineer decided the current direction reads more like a
desktop dashboard than the mobile first movie app they actually want to ship.

The existing component set (Radix based, WCAG AA contrast verified, exported from
`src/design-system/components/`) is not the problem; the visual character and page level
composition pattern are. Rebuilding the whole design system from scratch would discard accepted,
contrast verified work and its accessibility wiring for no real gain. Leaving the current desktop
feeling shell in place means every future screen (Letterboxd import, vibe search, account settings,
the public landing page) inherits a direction the engineer has already rejected.

## Options considered

### Option 1: Fix in place, palette only

Adjust only token values (slightly warmer neutrals, a deeper canvas) without adding new structural
components.

**Pros**:

- Fastest, zero new components, lowest regression risk.

**Cons**:

- Does not deliver the mobile first structural change the reference actually shows (bottom tab bar,
  hero spotlight, pill chips); the app would still read as a desktop dashboard with different paint.

### Option 2: Full re skin plus new structural components

Restyle the nine existing components in place (same exported names and props) and add three net new
components (`TabBar`, `HeroSpotlight`, `ChipGroup`), swapping the authenticated shell's navigation
from the top `NavBar` to a bottom `TabBar` and constraining it to a phone width column.

**Pros**:

- Matches the reference direction closely.
- Reuses the existing accessible component API, so consuming pages need shell level, not prop
  level, changes.
- Keeps the accent color and its verified contrast, so no new color audit is needed.

**Cons**:

- Touches nearly every page in the app (sign in, onboarding, feed, `/dev/components`, root layout)
  in one pass.
- The new gradient overlay and tab bar icon treatments need a fresh, targeted WCAG pass even though
  the base palette is unchanged.

### Option 3: Replace directly, rebuild from scratch

Discard spec 0004's components and tokens; start a new design system matching the reference pixel
for pixel.

**Pros**:

- Cleanest possible match to the reference.

**Cons**:

- Discards accepted, contrast verified, Radix backed accessibility work for a purely cosmetic goal.
- Directly contradicts the engineer's explicit instruction to keep the components already built.
- Highest cost and regression risk for no functional gain over Option 2.

## Rationale

Option 2 was chosen because the existing component set's accessibility wiring, Radix primitives,
the shared focus ring convention, keyboard operability, is sound and already contrast verified;
spec 0004's real cost was in that plumbing, not in the specific palette or page composition, so
none of it needs to be redone. The engineer was explicit that this is a re skin plus a structural
change, not a rebuild, which rules out Option 3 directly. Option 1 was rejected because the
reference image's core signal, a mobile app shell with a bottom tab bar and a hero spotlight, is
structural, not just color; a palette only pass would not address why the current app reads as a
desktop dashboard rather than a mobile streaming app. Keeping the accent color (the engineer's
confirmed choice) also avoids re running the WCAG contrast audit spec 0004 already completed for
every text and background pairing; only the two genuinely new treatments, the gradient overlay and
the poster badge, need a fresh check.

Two smaller decisions from the design conversation, worth recording since they shape the build
plan directly:

- **Filter pills are cosmetic only in this pass.** The feed has one ranking algorithm today (genre
  overlap); there is no second view for the pills to switch between yet. Wiring real filtering now
  would be new functional scope disguised as a visual redesign. Revisit once vibe search (Slice 3)
  or a second ranking view exists.
- **The numbered "Top 10 Trending" list from the reference has no equivalent concept in this app.**
  There is no trending or popularity ranking distinct from the feed's own genre overlap ranking.
  Building a dedicated ranked list section now would invent a data view the product does not have,
  rather than re skin an existing one. Declined for this spec; the hero spotlight already surfaces
  the single top ranked item.

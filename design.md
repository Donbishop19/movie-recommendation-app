---
name: mobile-first-streaming-design-system
source: derived, reference image (docs/specs/0007-mobile-first-streaming-redesign)
character: "A dark, mobile first streaming app: a warm near black canvas, one confident amber accent, a hero spotlight up top on the feed, and a persistent bottom tab bar on the authenticated shell. Reads as a movie app in your pocket, not a desktop dashboard."
tokens: "real values live in src/design-system/tokens.css (Tailwind v4's @theme, no tailwind.config.js); read them there, never duplicated here"
contrast: "body 7.3:1 / ink 16.8:1 / muted 5.8:1 / accent 9.7:1, all on canvas; on-accent 9.1:1 on accent; border 3.0:1 on surface. Colors unchanged from the 2026-08-10 verification (spec 0004); the two genuinely new treatments this redesign adds, the hero gradient overlay and the tab bar, were re checked 2026-08-11. See docs/specs/0007-mobile-first-streaming-redesign/index.md."
---

## Build mandate

You are a senior product designer. Every page ships as a complete, professional product
surface: brand, real product specific copy, a considered layout with hierarchy, all states
(empty, loading, error), supporting content, and a footer where the page warrants one.
Maximalist, never a lone form on an empty page. This project is dark only, there is no light
mode to fall back to and no toggle to build.

## Character & direction

Amber on near black, one accent, no competing hues, unchanged from the original direction. What
changed (spec 0007) is the shape of the product around that palette: the authenticated app shell
(onboarding, feed) now reads as a mobile streaming app, a large hero recommendation with a
gradient overlay, rounded poster cards with a rating badge, a pill shaped chip row, and a
persistent bottom tab bar, constrained to a centered phone width column at every viewport size,
not a desktop dashboard that happens to also work on a phone. The signed out shell (home, sign
in) keeps the original top `NavBar` and a wider reading width; it was not part of this redesign.
Low chrome carries over: hairline borders over shadows for most separation, a shadow reserved for
genuinely elevated surfaces (dialogs, dropdowns, toasts).

## Color palette

All values are CSS custom properties in `src/design-system/tokens.css`, consumed through
Tailwind's `@theme` (so `bg-canvas`, `text-ink`, `border-border`, etc. are real utility classes).
Dark only: these are the only values, there is no light mode variant.

| Token               | Hex       | Role                                                          | Contrast                          |
| ------------------- | --------- | ------------------------------------------------------------- | --------------------------------- |
| `--color-canvas`    | `#0c0a08` | Page background                                               | —                                 |
| `--color-scrim`     | `#0c0a08` | Gradient overlays and badges on poster art (added, spec 0007) | matches canvas                    |
| `--color-surface`   | `#17140f` | Card, panel, raised area                                      | —                                 |
| `--color-border`    | `#6b6148` | Hairline, divider, input/button outline                       | 3.0:1 on surface                  |
| `--color-muted`     | `#96897a` | Captions, placeholders                                        | 5.8:1 on canvas                   |
| `--color-body`      | `#a79c89` | Secondary text                                                | 7.3:1 on canvas                   |
| `--color-ink`       | `#f2ecdd` | Primary text, headings                                        | 16.8:1 on canvas                  |
| `--color-accent`    | `#f5a524` | Primary actions, links, focus rings                           | 9.7:1 on canvas, 9.0:1 on surface |
| `--color-on-accent` | `#1a1206` | Text/icons on top of the accent fill                          | 9.1:1 on accent                   |
| `--color-success`   | `#5fbf6b` | Positive status                                               | 8.6:1 on canvas                   |
| `--color-error`     | `#e5484d` | Errors, destructive actions                                   | 5.1:1 on canvas                   |

**Usage rules:** the accent is for primary actions, links, and focus rings only, never for
decoration or large fills (a whole card in accent, a hero background wash). `--color-scrim` is
for text and badges sitting on top of image content (the hero spotlight's gradient, the poster
rating badge), never as a general surface color; it is deliberately the same value as canvas so
text over a fully opaque scrim keeps the already verified 16.8:1 ink on canvas contrast, fading
out toward the top of a gradient. One accent hue for the whole system; a second accent is a
decision, not a default, and none is defined here.

## Typography

Geist Sans for UI text, Geist Mono for code/monospace contexts, both loaded via `next/font` in
the root layout and exposed as `--font-geist-sans` / `--font-geist-mono`, wired into
`--font-sans` / `--font-mono` in the theme. Base 16px, roughly a 1.25 step scale, line height
tightens as size grows (1.5 body, down to 1.1 at the largest display size). Three weights at
most: regular (400), medium (500), bold (700). Unchanged by this redesign.

| Token       | Size | Line height | Typical use                           |
| ----------- | ---- | ----------- | ------------------------------------- |
| `text-xs`   | 12px | 1.5         | Fine print, timestamps                |
| `text-sm`   | 14px | 1.5         | Captions, secondary copy, form labels |
| `text-base` | 16px | 1.5         | Body copy                             |
| `text-lg`   | 20px | 1.4         | Card titles, emphasized copy          |
| `text-xl`   | 24px | 1.3         | Section headings                      |
| `text-2xl`  | 30px | 1.25        | Page headings                         |
| `text-3xl`  | 36px | 1.2         | Hero / display                        |
| `text-4xl`  | 48px | 1.1         | Landing page hero only                |

## Spacing

A 4px base unit shared with Tailwind's numeric scale (`p-1` through `p-16` remain available and
already resolve through the same token). Named steps exist for the rhythm that reads as a
deliberate choice rather than a bare number, especially section level gaps. Unchanged by this
redesign.

`xxs` 4px · `xs` 8px · `sm` 12px · `md` 16px · `lg` 24px · `xl` 32px · `2xl` 48px · `section` 64px

Use the named steps (`gap-md`, `p-lg`, `py-section`) for component and layout rhythm; the numeric
scale is the escape hatch for a one off value that still needs to land on the 4px grid.

## Radius and motion

Four radius steps (a fourth, `radius-lg`, was added for this redesign; the original three carry
over unchanged): `radius-sm` (4px, inputs and buttons), `radius-md` (8px, small surfaces and
dialogs), `radius-lg` (16px, poster cards and the hero spotlight), `radius-full` (pills, avatars,
chips). One standard ease (`ease-standard`, `cubic-bezier(0.4, 0, 0.2, 1)`) for ordinary
transitions, one spring (`ease-spring`, `cubic-bezier(0.34, 1.56, 0.64, 1)`) reserved for playful
open/close moments. Three durations as plain CSS variables (referenced via Tailwind's
`duration-(--duration-base)` arbitrary value syntax, since Tailwind has no named duration theme
key): `--duration-instant` 80ms, `--duration-base` 160ms, `--duration-slow` 240ms. A fourth plain
variable, `--size-tab-bar` (64px), fixes the bottom `TabBar`'s height.

Every transition, hover effect, and open/close animation respects `prefers-reduced-motion`: a
global rule in `tokens.css` collapses all animation and transition durations to near instant for
users who ask for it, on top of per component `motion-reduce:` variants where a component
disables its animation outright (the loading spinner becomes a pulse, skeletons stop pulsing).

## Composition patterns

Two page shells now exist, not one:

- **Signed out shell** (home, sign in): unchanged from the original direction. A `NavBar` (sticky,
  translucent on scroll) followed by a `Container` capping content at a wider reading width and
  centering it, holding a vertical `Stack` of sections at `gap-section` rhythm.
- **Authenticated app shell** (onboarding, feed): a `TabBar` fixed to the viewport bottom instead
  of a top `NavBar`, and a `Container` constrained to `max-w-(--container-sm)` (a centered phone
  width column) at every viewport size, not just on small screens. Page content gets bottom
  padding of at least `--size-tab-bar` so the fixed bar never covers it. The feed page composes,
  top to bottom: a `ChipGroup` of category `Chip`s (cosmetic only for now, a single active "For
  You" chip, see Known gap), a `HeroSpotlight` for the top ranked recommendation, then the rest of
  the feed as a two column poster grid of `Card`s, each with a `Badge variant="rating"` overlay.

Every list, feed, or search result page carries loading (`CardSkeleton` / `Skeleton`), empty, and
error states, not just the populated case.

## Component inventory

All components live under `src/design-system/components/`, named exports, one component (or a
small tightly related family, e.g. `Card` + its sub parts) per file.

**Core interactive** — `button.tsx` (variants: primary, secondary, ghost, destructive; sizes
sm/md/lg; `isLoading`, `asChild`) · `input.tsx` (`invalid` prop for validation state) ·
`select.tsx` (Radix Select: `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`,
`SelectValue`, `SelectGroup`) · `checkbox.tsx` · `radio-group.tsx` (`RadioGroup`,
`RadioGroupItem`) · `label.tsx` · `chip.tsx` (`Chip`, `ChipGroup`, added spec 0007: a pill shaped
selectable tag and its row wrapper)

**Layout and structure** — `container.tsx` (page width cap) · `stack.tsx` (`Stack` flex
primitive, `Grid` CSS grid primitive) · `card.tsx` (`Card`, `CardHeader`, `CardTitle`,
`CardDescription`, `CardContent`, `CardFooter`, `CardSkeleton`) · `skeleton.tsx` ·
`image-fallback.tsx` (`ImageFallback`, the missing poster/avatar placeholder, AC-6 of spec 0004) ·
`hero-spotlight.tsx` (`HeroSpotlight`, added spec 0007: the feed's top ranked recommendation,
shown large with a gradient overlay and its reason)

**Navigation** — `nav-bar.tsx` (`NavBar`, the signed out shell's header: takes a logo, `NavItem[]`,
and an actions slot) · `tab-bar.tsx` (`TabBar`, `TabBarItem`, `TabBarAction`, added spec 0007: the
authenticated shell's fixed bottom navigation) · `tabs.tsx` (Radix Tabs: `Tabs`, `TabsList`,
`TabsTrigger`, `TabsContent`) · `link.tsx` (`Link`, wraps `next/link`; `accent` or `nav` variant)

**Feedback and overlays** — `dialog.tsx` (Radix Dialog: `Dialog`, `DialogTrigger`,
`DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`,
`DialogClose`) · `toast.tsx` (`Toaster`, mounted once in the root layout; imperative `toast()` /
`dismissToast()` from `lib/toast-store.ts`) · `form-error-summary.tsx` (`FormErrorSummary`, the
inline validation banner half of the shared error pattern; renders nothing when `errors` is
empty) · `spinner.tsx` · `badge.tsx` (variants: default, accent, success, error, rating; `rating`
added spec 0007 for a TMDB score sitting on top of poster art)

**Shared** — `lib/cn.ts` (`cn`, the class merge helper) · `lib/focus-ring.ts` (`focusRing`, the
one focus treatment every interactive component uses) · `lib/toast-store.ts` (module level store
behind the toast system)

**The shared validation error pattern:** a form has two tools, used together. `FormErrorSummary`
is the inline banner a Server Action backed form renders from its returned error state (the
primary pattern for this project's forms). `toast({ variant: "error", ... })` is for a transient
failure not tied to a specific form, e.g. a background save failing.

## Responsive & accessibility direction

WCAG AA baseline applies everywhere: every interactive element keyboard operable with a visible
focus ring (`focusRing` from `lib/focus-ring.ts`, never `outline: none` without it), every icon
only control has an `aria-label`, every image that isn't decorative has real `alt` text, color
never the only signal. `Container` and `Grid` collapse to a single column under 640px on the
signed out shell; the authenticated shell's poster grid is always two columns, by design, since
its `Container` is already constrained to phone width at every size. Touch targets stay at or
above 44×44px at mobile widths, including every `TabBar` item and `Chip`. Full checklist:
`.claude/skills/develop/checklist.md` (bundled with the `/develop` skill).

## Known gaps

- Validation errors surface only at the form or toast level, not per field (`FormErrorSummary`
  lists every error together; individual `Input`/`Select`/etc. only get a red border and
  `aria-invalid`, no adjacent per field message). This is a recorded tradeoff, not an oversight:
  revisit if the CSV import or account settings forms (both multi field) show real confusion in
  use. See spec 0004's Consequences and Follow-up.
- The feed's `ChipGroup` is cosmetic only (spec 0007): there is one ranking view today, so the
  chips do not filter anything yet. Wire them to real category filtering once a second view
  exists (vibe search, Slice 3, or a second ranking mode).
- The `TabBar`'s Account item only signs the user out; there is no account settings page behind it
  yet (Slice 4). Replace it once Account & privacy settings ships.

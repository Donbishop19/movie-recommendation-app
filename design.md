---
name: cinematic-amber-design-system
source: derived
character: "A dark only, cinematic system: a warm near black canvas, one confident amber accent, and generous breathing room. Reads as a screening room, not a dashboard: quiet, focused, unhurried."
tokens: "real values live in src/design-system/tokens.css (Tailwind v4's @theme, no tailwind.config.js); read them there, never duplicated here"
contrast: "body 7.3:1 / ink 16.8:1 / muted 5.8:1 / accent 9.7:1, all on canvas; on-accent 9.1:1 on accent; border 3.0:1 on surface. Verified 2026-08-10, see docs/specs/0004-design-system-ui-foundation/index.md."
---

## Build mandate

You are a senior product designer. Every page ships as a complete, professional product
surface: brand, real product specific copy, a considered layout with hierarchy, all states
(empty, loading, error), supporting content, and a footer where the page warrants one.
Maximalist, never a lone form on an empty page. This project is dark only, there is no light
mode to fall back to and no toggle to build.

## Character & direction

Amber on near black, one accent, no competing hues. The neutral ladder carries a slight warm
tint borrowed from the accent, so the grays read as deliberate rather than default gray. Low
chrome: hairline borders over shadows for most separation, a shadow reserved for genuinely
elevated surfaces (dialogs, dropdowns). Generous spacing over dense information. The mood is
cinematic and unhurried, closer to a screening room or a film poster wall than a productivity
dashboard.

## Color palette

All values are CSS custom properties in `src/design-system/tokens.css`, consumed through
Tailwind's `@theme` (so `bg-canvas`, `text-ink`, `border-border`, etc. are real utility classes).
Dark only: these are the only values, there is no light mode variant.

| Token               | Hex       | Role                                    | Contrast                          |
| ------------------- | --------- | --------------------------------------- | --------------------------------- |
| `--color-canvas`    | `#0c0a08` | Page background                         | —                                 |
| `--color-surface`   | `#17140f` | Card, panel, raised area                | —                                 |
| `--color-border`    | `#6b6148` | Hairline, divider, input/button outline | 3.0:1 on surface                  |
| `--color-muted`     | `#96897a` | Captions, placeholders                  | 5.8:1 on canvas                   |
| `--color-body`      | `#a79c89` | Secondary text                          | 7.3:1 on canvas                   |
| `--color-ink`       | `#f2ecdd` | Primary text, headings                  | 16.8:1 on canvas                  |
| `--color-accent`    | `#f5a524` | Primary actions, links, focus rings     | 9.7:1 on canvas, 9.0:1 on surface |
| `--color-on-accent` | `#1a1206` | Text/icons on top of the accent fill    | 9.1:1 on accent                   |
| `--color-success`   | `#5fbf6b` | Positive status                         | 8.6:1 on canvas                   |
| `--color-error`     | `#e5484d` | Errors, destructive actions             | 5.1:1 on canvas                   |

**Usage rules:** the accent is for primary actions, links, and focus rings only, never for
decoration or large fills (a whole card in accent, a hero background wash). One accent hue for
the whole system; a second accent is a decision, not a default, and none is defined here.
Borders are hairlines, not shadows, for most separation; `shadow-lg` is reserved for dialogs,
dropdown/select panels, and toasts, the genuinely elevated surfaces.

## Typography

Geist Sans for UI text, Geist Mono for code/monospace contexts, both loaded via `next/font` in
the root layout and exposed as `--font-geist-sans` / `--font-geist-mono`, wired into
`--font-sans` / `--font-mono` in the theme. Base 16px, roughly a 1.25 step scale, line height
tightens as size grows (1.5 body, down to 1.1 at the largest display size). Three weights at
most: regular (400), medium (500), bold (700).

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
deliberate choice rather than a bare number, especially section level gaps:

`xxs` 4px · `xs` 8px · `sm` 12px · `md` 16px · `lg` 24px · `xl` 32px · `2xl` 48px · `section` 64px

Use the named steps (`gap-md`, `p-lg`, `py-section`) for component and layout rhythm; the numeric
scale is the escape hatch for a one off value that still needs to land on the 4px grid.

## Radius and motion

Three radius steps only: `radius-sm` (4px, inputs and buttons), `radius-md` (8px, cards),
`radius-full` (pills, avatars). One standard ease (`ease-standard`,
`cubic-bezier(0.4, 0, 0.2, 1)`) for ordinary transitions, one spring (`ease-spring`,
`cubic-bezier(0.34, 1.56, 0.64, 1)`) reserved for playful open/close moments. Three durations as
plain CSS variables (referenced via Tailwind's `duration-(--duration-base)` arbitrary value
syntax, since Tailwind has no named duration theme key): `--duration-instant` 80ms,
`--duration-base` 160ms, `--duration-slow` 240ms.

Every transition, hover effect, and open/close animation respects `prefers-reduced-motion`: a
global rule in `tokens.css` collapses all animation and transition durations to near instant for
users who ask for it, on top of per component `motion-reduce:` variants where a component
disables its animation outright (the loading spinner becomes a pulse, skeletons stop pulsing).

## Composition patterns

A page is a `NavBar` (sticky, translucent on scroll) followed by a `Container` capping content
width and centering it, holding a vertical `Stack` of sections at `gap-section` rhythm. Card
collections use `Grid` (2/3/4 responsive columns) of `Card`s; a single record's detail view uses
a `Stack`. Every list, feed, or search result page carries loading (`CardSkeleton` / `Skeleton`),
empty, and error states, not just the populated case.

## Component inventory

All components live under `src/design-system/components/`, named exports, one component (or a
small tightly related family, e.g. `Card` + its sub parts) per file.

**Core interactive** — `button.tsx` (variants: primary, secondary, ghost, destructive; sizes sm/md/lg; `isLoading`, `asChild`) · `input.tsx` (`invalid` prop for validation state) · `select.tsx` (Radix Select: `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`, `SelectGroup`) · `checkbox.tsx` · `radio-group.tsx` (`RadioGroup`, `RadioGroupItem`) · `label.tsx`

**Layout and structure** — `container.tsx` (page width cap) · `stack.tsx` (`Stack` flex primitive, `Grid` CSS grid primitive) · `card.tsx` (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardSkeleton`) · `skeleton.tsx` · `image-fallback.tsx` (`ImageFallback`, the missing poster/avatar placeholder, AC-6)

**Navigation** — `nav-bar.tsx` (`NavBar`, takes a logo, `NavItem[]`, and an actions slot) · `tabs.tsx` (Radix Tabs: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) · `link.tsx` (`Link`, wraps `next/link`; `accent` or `nav` variant)

**Feedback and overlays** — `dialog.tsx` (Radix Dialog: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`) · `toast.tsx` (`Toaster`, mounted once in the root layout; imperative `toast()` / `dismissToast()` from `lib/toast-store.ts`) · `form-error-summary.tsx` (`FormErrorSummary`, the inline validation banner half of AC-7's shared error pattern; renders nothing when `errors` is empty) · `spinner.tsx` · `badge.tsx` (variants: default, accent, success, error)

**Shared** — `lib/cn.ts` (`cn`, the class merge helper) · `lib/focus-ring.ts` (`focusRing`, the one focus treatment every interactive component uses) · `lib/toast-store.ts` (module level store behind the toast system)

**AC-7, the shared validation error pattern:** a form has two tools, used together. `FormErrorSummary` is the inline banner a Server Action backed form renders from its returned error state (the primary pattern for this project's forms, since AGENTS.md's `Result` return shape fits a render time banner better than an imperative call tied to an async action). `toast({ variant: "error", ... })` is for a transient failure not tied to a specific form, e.g. a background save failing.

## Responsive & accessibility direction

WCAG AA baseline (from `AGENTS.md`) applies everywhere: every interactive element keyboard
operable with a visible focus ring (`focusRing` from `lib/focus-ring.ts`, never `outline: none`
without it), every icon only control has an `aria-label`, every image that isn't decorative has
real `alt` text, color never the only signal. `Container` and `Grid` collapse to a single column
under 640px; touch targets stay at or above 44×44px at mobile widths. Full checklist:
`.claude/skills/develop/checklist.md` (bundled with the `/develop` skill).

## Known gap

Validation errors surface only at the form or toast level, not per field (`FormErrorSummary`
lists every error together; individual `Input`/`Select`/etc. only get a red border and
`aria-invalid`, no adjacent per field message). This is a recorded tradeoff, not an oversight:
revisit if the CSV import or account settings forms (both multi field) show real confusion in
use. See spec 0004's Consequences and Follow-up.

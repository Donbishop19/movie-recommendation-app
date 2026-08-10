# 0004. Design system and UI foundation

**Date**: 2026-08-10
**Status**: In Progress

## Summary

This decision sets the visual language and base component set every screen in the app will be built from: a dark only, cinematic color and type system on top of Tailwind CSS and shadcn/ui (Radix UI primitives you own in the repo, not an external package). It covers design tokens (color, type, spacing), a full set of accessible base components (buttons, inputs, cards, navigation, dialogs, toasts, and more), a small in app showcase page to check them, and a `design.md` that documents all of it. Nothing about it needs a database or a server action; it is presentation layer only.

## Requirements

**User stories**:

- As the person building every later feature, I want a consistent, accessible set of tokens and base components, so I do not reinvent colors, spacing, and component behavior for each new page.
- As a user relying on a keyboard or screen reader, I want every interactive element to be reachable and clearly focused, so I can use the app without a mouse.
- As a user on a slow connection or with a missing poster image, I want loading and missing image states to look intentional, so the app never looks broken while data loads.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: Design tokens (color palette, typography scale, spacing scale, radius scale) are defined once as CSS custom properties and consumed through Tailwind's theme; no component hardcodes a raw color or spacing value outside the token set.
- **AC-2**: The confirmed dark only, amber on near black palette and the Geist Sans / Geist Mono fonts render correctly through the root layout, at WCAG AA contrast for text and interactive elements.
- **AC-3**: Every base component in the four confirmed categories, Core interactive (button, input, select, checkbox, radio, label), Layout and structure (container, stack, card), Navigation (header/nav bar, tabs, link), and Feedback and overlays (dialog, toast, spinner/skeleton, badge), is implemented, typed, and renders without errors.
- **AC-4**: Every interactive component is fully keyboard operable (tab order, enter/space activation, escape to close overlays) and shows the visible accent colored focus ring; none suppress the outline without a replacement.
- **AC-5**: Skeleton loading placeholders are available for card and list style content and match the shape of the content they replace.
- **AC-6**: A missing poster or avatar image renders the solid color placeholder with icon or initials, never a broken image icon.
- **AC-7**: Form level validation errors display through a reusable toast/banner summary component, usable by any future form.
- **AC-8**: All motion (transitions, hover, open/close effects) respects `prefers-reduced-motion` by disabling or reducing to instant state changes.
- **AC-9**: A `/dev/components` showcase route renders every base component and its key states (default, hover/focus, disabled, error, loading where applicable), for manual visual and accessibility checks.
- **AC-10**: `design.md` documents the color palette, typography scale, spacing scale, and the full component inventory with usage guidance.
- **AC-11**: The create-next-app boilerplate (`page.module.css`, the default home page content, the starter links) is removed and replaced by the new foundation.

## Decision

**Chosen option**: Option 1: shadcn/ui on Tailwind CSS

Build the design system on Tailwind CSS v4 (its CSS first `@theme` config, no `tailwind.config.js`) with shadcn/ui components (Radix UI primitives, copied into the repo and owned outright, not an external package), lucide-react for icons, a dark only amber on near black palette, and Geist Sans/Mono for type.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`), for the server component/client component split (interactive components need `"use client"`, purely presentational ones do not) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`), for typing component variants (button/badge/input state unions) precisely

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:
None. This feature introduces no new persisted entities; it is presentation layer only. No table, column, or migration is needed.

**State transitions**:
N/A, no entity state machine. (Individual components have UI states, covered as component variants below, not a data state machine.)

**API surface**:
None. No new Server Actions or Route Handlers. The `/dev/components` showcase route is a plain React Server Component page with no data fetching; every component it renders uses static or client side only state.

**Value sourcing**:
Not applicable. No acceptance criterion here depends on a value produced from user input, a database read, or an external call; tokens and component states are static, defined in code and CSS, not sourced at runtime.

**Key invariants**:

- Every color, spacing, and radius value a component uses resolves through a design token (a CSS custom property / Tailwind theme value); no raw hex or pixel literal appears in a component file.
- Every interactive element has a visible focus indicator; `outline: none` is never set without a replacement that meets the same contrast bar.
- Every component that has a loading, disabled, or error state exposes it as a prop, rather than callers hand rolling that state with ad hoc class overrides.
- All transitions respect `prefers-reduced-motion: reduce`.

**Security model**:
Not applicable. No data access, no authentication or authorization boundary; these are presentational UI primitives with no awareness of who is signed in.

**Critical test scenarios** (manual, per `AGENTS.md`'s "no automated suite yet, verify with typecheck plus manual `/check verify`"):

- Happy path: open the `/dev/components` showcase route and tab through every interactive component using the keyboard only, confirm each shows the visible focus ring and activates on enter/space, verifies **AC-4**, **AC-9**
- Failure case: trigger a validation error on a component using the shared error pattern, confirm the toast/banner summary renders with clear, actionable text, verifies **AC-7**
- Accessibility: check the amber on near black palette's text and interactive element contrast with a browser contrast tool, confirm it meets WCAG AA, verifies **AC-2**, **AC-4**

## Build plan

1. [x] Set up Tailwind CSS v4 and the shadcn/ui CLI (install dependencies, configure `components.json` with path aliases into `src/design-system/`, adopt Tailwind v4's CSS first `@theme` config instead of a `tailwind.config.js`), satisfies **AC-1**
2. [x] Define the design tokens (the dark only palette anchored on the amber accent, the Geist based type scale, the spacing scale, the radius scale) as CSS custom properties in `src/design-system/tokens.css`, consumed through Tailwind's `@theme`, satisfies **AC-1**, **AC-2**
3. [x] Wire the tokens into the root layout (`src/app/layout.tsx`): dark color scheme, font variables, base typography and background, satisfies **AC-2**
4. [x] Build and export the Core interactive components (button, input, select, checkbox, radio, label) with shadcn/ui plus Radix primitives, `cva` based variants, and the visible focus ring, satisfies **AC-3**, **AC-4**
5. [x] Build and export the Layout and structure components (container, stack/grid, card), including the card's skeleton loading variant and the image fallback placeholder, satisfies **AC-3**, **AC-5**, **AC-6**
6. [x] Build and export the Navigation components (header/nav bar, tabs, link), satisfies **AC-3**, **AC-4**
7. [x] Build and export the Feedback and overlays components (dialog/modal, toast/banner, spinner, badge), including the shared form error toast pattern, satisfies **AC-3**, **AC-4**, **AC-7**
8. [x] Apply the reduced motion rule (`prefers-reduced-motion`) to every transition defined in the token set and the components built above, satisfies **AC-8**
9. [x] Build the `/dev/components` showcase route rendering every component and its key states, satisfies **AC-9**
10. [x] Write `design.md` documenting the palette, type scale, spacing scale, and component inventory with usage guidance, satisfies **AC-10**
11. [x] Remove the create-next-app boilerplate (`page.module.css`, the default `Home` markup, the starter links) and replace the home page with a minimal shell using the new components, satisfies **AC-11**

## Consequences

**Positive**:

- Every later feature (core discovery loop, CSV import, vibe search, account settings, the landing page) builds on one consistent, accessible base instead of inventing styling per page.
- shadcn/ui's copy-in-repo model means full ownership of every component; nothing to fight as a black box dependency when a component needs to diverge from the default.
- Dark only scope removes an entire class of theming bugs: no duplicated light/dark tokens, no flash of the wrong theme on load, no theme switching library needed at all.

**Negative / tradeoffs**:

- Toast/banner only validation errors are a real accessibility tradeoff against inline field errors: a screen reader user has to correlate a summary message back to the specific field themselves. This should be revisited if usability testing on the CSV import or account settings forms, both multi field, surfaces confusion.
- No Storybook means no isolated component development environment or visual regression tooling; the in app showcase route is a reasonable substitute for one person but will not scale to a team without revisiting.
- Committing to dark mode only now means adding light mode later is a real redesign, not a toggle; if user research later shows real demand for it, the tokens need a second pass.

**Neutral**:

- The entire create-next-app boilerplate is removed; the app is a genuinely blank, styled shell until the first real feature (core discovery loop) consumes these components.
- shadcn/ui pulls in `class-variance-authority`, `clsx`, and `tailwind-merge` as new runtime dependencies.

## Follow-up

- [ ] Consider adding `eslint-plugin-jsx-a11y` as an automated enforcement mechanism for the WCAG AA baseline `AGENTS.md` already requires.
- [ ] Revisit the toast/banner only validation error pattern if usability testing on the CSV import or account settings forms surfaces confusion; inline field level errors are the safer default for forms with several fields.
- [ ] Agent Skill / MCP search for Tailwind CSS, shadcn/ui, and lucide-react was declined by the engineer on 2026-08-10; do not re-offer unless asked again.
- [ ] Gate or remove the `/dev/components` showcase route (for example a dev only guard, or `noindex`) before the public landing page (scope item 11) ships, so it is not a public surface.

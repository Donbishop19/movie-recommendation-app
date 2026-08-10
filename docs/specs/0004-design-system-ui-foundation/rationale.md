# 0004. Design system and UI foundation, rationale

## Context

The project is a blank Next.js 16 scaffold. `src/app/page.tsx` and `src/app/layout.tsx` still hold create-next-app's placeholder markup and CSS Modules boilerplate, and there is no shared UI code anywhere in `src/`. Every feature on the scope's Foundation and later tiers (core discovery loop, Letterboxd CSV import, vibe search, account and privacy settings, the public landing page) renders real UI, and each would otherwise invent its own colors, spacing, and components as it goes, producing visible inconsistency and duplicated accessibility work across five or six independent feature builds.

`AGENTS.md` already commits the project to a WCAG AA accessibility baseline, TypeScript strict mode, named exports only, and organizing source by feature under `src/<feature>/`, but records no visual language, component conventions, or styling approach; specs 0001 (stack) and 0002 (data model) settled the server side and data layers only. The project is built and operated by one person under a Tracer Bullet approach, so the foundation needs to be provable quickly, one real page rendering real, working components, rather than fully speculative up front, and it needs to stay consistent without a design team or an existing Figma file, since none exists yet for this product.

Without this decision, the very next Foundation item to touch UI (core discovery loop) would be forced to invent tokens, components, and accessibility patterns under feature specific time pressure, and every feature after it would either copy that ad hoc choice or diverge from it: the exact inconsistency a design system exists to prevent.

## Options considered

### Option 1: shadcn/ui on Tailwind CSS (chosen)

Radix UI primitives copied into the repo through the shadcn/ui CLI, styled with Tailwind CSS utility classes and a CSS custom property token layer.

**Pros**:

- Copy-in-repo model: components live as real, editable TypeScript files in `src/design-system/`, no black box dependency to fight when a component needs to diverge from the default
- Radix primitives already supply correct keyboard interaction, focus management, and ARIA wiring, most of the WCAG AA work for interactive components done for free
- The default pairing for Next.js and Tailwind projects today, so examples and AI assistance are abundant

**Cons**:

- Adds Tailwind's utility class approach and `cva`/`clsx`/`tailwind-merge` to the dependency graph, a real shift from the CSS Modules the scaffold currently uses

### Option 2: Tailwind CSS + hand rolled components

Tailwind for styling, but every component built from scratch with no headless primitives library.

**Pros**:

- No dependency on Radix's API surface or release cadence; full control over every interaction
- A slightly smaller dependency footprint than Option 1

**Cons**:

- Re-implementing correct keyboard interaction and ARIA attributes for a dialog, a select, or a combobox from scratch is exactly the work Option 1 gets for free, and is easy to get subtly wrong in ways that only show up in a screen reader

### Option 3: CSS Modules (current scaffold) + hand rolled components

Keep the create-next-app default styling approach; no utility framework, no headless primitives library.

**Pros**:

- Zero new dependencies, keeps the exact styling approach already in the scaffold
- Familiar to anyone who dislikes utility class styling

**Cons**:

- The slowest path to a consistent system: every spacing and color value is typed by hand per file, with no shared token mechanism enforcing reuse
- Still carries all of Option 2's accessibility re-implementation cost, with none of Tailwind's speed benefit

### Option 4: Vanilla Extract (or another CSS-in-TS)

Type safe, zero runtime CSS written in TypeScript.

**Pros**:

- Compile time type safety on style props, catching some classes of styling bugs Tailwind cannot

**Cons**:

- Meaningfully more setup than Tailwind for a project this size, and far less common in the current Next.js ecosystem, so less community and AI support when something goes wrong

## Rationale

Option 1 wins on the forces named in Context. The solo engineer, Tracer Bullet approach means the fastest path to a real, accessible component provable end to end today beats a technically purer approach with more setup cost (rules out Option 4). The WCAG AA baseline already recorded in `AGENTS.md` makes the accessibility work Radix primitives supply for free a forcing function, not a nice to have (rules out Options 2 and 3, which both re-implement that work by hand). The engineer confirmed this pick directly, the strongest consensus decision in this spec.

Two smaller choices deviated from the recommended pick, worth naming plainly rather than smoothing over:

- **Color mode**: the recommendation was light and dark, defaulting to the system preference, for the wider reach and lower complexity of letting the OS decide. The engineer chose dark only, for a cinematic brand feel. A legitimate product call; the tradeoff (light mode later is a redesign, not a toggle) is recorded in Consequences.
- **Validation error display**: the recommendation was inline field level errors, the more accessible default for multi field forms. The engineer chose toast/banner summary only, for simplicity. Also a legitimate call; the tradeoff (harder for screen reader users to correlate an error back to its field) is recorded in Consequences and flagged in Follow-up for the CSV import and settings forms specifically, both multi field.

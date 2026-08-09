<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Movie Recommendation App

## Stack

- **Language / Runtime**: TypeScript, Node.js
- **Framework**: Next.js 16 (App Router), Server Actions and Route Handlers
- **Key dependencies**: Supabase (Postgres, Auth, Storage, pgvector), Inngest (jobs), Sentry (observability), hosted on Vercel
- **Package manager**: pnpm

## Build approach

**Tracer Bullet**: each feature built end to end through every layer, working; prove the whole pipe connects before building any part of it fully.

## Commands

```bash
# Install
pnpm install
# Dev server
pnpm dev
# Build
pnpm build
# Lint / format
pnpm run lint
pnpm run format
# Test
pnpm run typecheck   # no automated test runner yet, see Rules
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Rules

- Functional style: pure functions by default, immutable data (`const`, `readonly`), side effects pushed to the edges. Compose functions rather than reaching for classes or inheritance.
- Avoid `null`; use explicit `undefined` with union types, and `Result`/`Either` style returns for expected failures instead of throwing.
- TypeScript strict mode everywhere, no `any`. Organize source by feature under `src/<feature>/`, not by technical layer.
- One consistent error handling pattern across every server action and route handler. Validate every required env var at startup; fail loudly if one is missing.
- Named exports only, no default exports. Naming: kebab case file names, PascalCase components, camelCase functions and variables.
- Document exported functions, server actions, and route handlers with a short comment. WCAG AA accessibility baseline on all UI.
- Lint / format: ESLint + Prettier, enforced. Pre-commit: lint, format, and typecheck must all pass before a commit is allowed.
- Testing: no automated suite yet; verify with typecheck plus manual `/check verify`. `/test` sets up the real runner when it's needed. CI not set up yet.
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, and so on).
- Data access boundary: all reads and writes go through Server Actions and Route Handlers using the Supabase service role key; Row Level Security (RLS) is on for every table with deny by default policies as a second layer. The anon key is used only for the sign in handshake.
- Schema changes are SQL files in `supabase/migrations/`, applied via the Supabase CLI (`supabase db push` in CI); staging is a separate Supabase project, and Vercel preview deployments point at staging, not production.

## Git

- integration: on
- branch prefix: feat/
- commit: per-milestone

## Agent skills

- [nextjs-app-router-patterns](.agents/skills/nextjs-app-router-patterns/): `wshobson/agents`, Next.js App Router conventions (server components, streaming, data fetching)
- [typescript-advanced-types](.agents/skills/typescript-advanced-types/): `wshobson/agents`, advanced TypeScript type patterns
- [supabase](.agents/skills/supabase/): `supabase/agent-skills`, Supabase client, auth, and CLI usage
- [supabase-postgres-best-practices](.agents/skills/supabase-postgres-best-practices/): `supabase/agent-skills`, schema, RLS, and query conventions for Postgres on Supabase
- [deploy-to-vercel](.agents/skills/deploy-to-vercel/): `vercel-labs/agent-skills`, deploying and previewing on Vercel
- [inngest-durable-functions](.agents/skills/inngest-durable-functions/): `inngest/inngest-skills`, durable background jobs and retries
- [sentry-get-started](.agents/skills/sentry-get-started/): `getsentry/sentry-for-ai`, Sentry error tracking setup

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

# TellaMovie

A movie recommendation app: import your Letterboxd ratings, get a personalized feed, and search by vibe (natural-language, embedding-based search) instead of just title or genre.

## Stack

- **Language / runtime**: TypeScript, Node.js
- **Framework**: Next.js 16 (App Router), Server Actions and Route Handlers
- **Database**: Supabase Postgres (+ pgvector), accessed via Drizzle ORM
- **Auth**: Supabase Auth
- **Background jobs**: Inngest
- **Search**: OpenAI embeddings over movie data (pgvector similarity search)
- **Catalog data**: TMDB
- **Observability / analytics**: Sentry, PostHog
- **Hosting**: Vercel
- **Package manager**: pnpm

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy the variable names below into `.env.local` and fill in real values (ask a maintainer for staging credentials, or provision your own Supabase/TMDB/OpenAI/Inngest/Sentry/PostHog accounts). Each is validated at startup by the owning feature's `env.ts` — the app fails loudly if one is missing.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=          # pooled connection string, transaction mode
DIRECT_URL=            # direct, non-pooled connection string (drizzle-kit only)

# App
NEXT_PUBLIC_SITE_URL=

# Movie catalog (TMDB)
TMDB_READ_ACCESS_TOKEN=
CATALOG_REFRESH_SECRET=

# Vibe search (OpenAI + Inngest)
OPENAI_API_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Observability
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
POSTHOG_HOST=
```

## Commands

```bash
pnpm dev             # dev server
pnpm build            # production build
pnpm start            # run a production build
pnpm run lint          # ESLint
pnpm run lint:fix       # ESLint, auto-fix
pnpm run format         # Prettier, write
pnpm run format:check    # Prettier, check only
pnpm run typecheck       # tsc --noEmit
pnpm run db:pull        # pull the DB schema via drizzle-kit
```

There's no automated test suite yet; correctness is verified with `pnpm run typecheck` plus manual verification. Pre-commit runs lint, format, and typecheck via Husky.

## Project structure

Source is organized by feature, not by technical layer:

```
src/
  analytics/       PostHog event tracking (server + client)
  app/             Next.js App Router routes
  auth/            Supabase Auth, sessions, onboarding
  db/              Drizzle client and schema
  design-system/   Shared UI components and design tokens
  imports/         Letterboxd CSV import and matching
  movies/          Movie catalog (TMDB) and poster rendering
  observability/   Sentry setup
  search/          Vibe search: embeddings, vector queries, rate limiting
  shared/          Cross-feature utilities (e.g. Result type)
```

Each feature that needs environment variables validates them in its own `env.ts`.

## Database

Schema changes are SQL files in `supabase/migrations/`, applied with the Supabase CLI:

```bash
supabase db push
```

Row Level Security is on for every table with deny-by-default policies. Staging is a separate Supabase project; Vercel preview deployments point at staging, not production.

## Specs

Feature specs live in `docs/specs/` (`NNNN-title.md`), written by `/architect` before a feature is built.

## Contributing

See [AGENTS.md](./AGENTS.md) for the full set of conventions (functional style, error handling, naming, commit format, and the agent skills used to build this project).

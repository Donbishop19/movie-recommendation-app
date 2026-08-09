# 0001. Stack and architecture

**Date**: 2026-08-08
**Status**: Accepted

## Summary

This decision sets the technology stack for the whole movie recommendation app. We are building one Next.js web app in TypeScript, using Supabase for the database, sign in, and file storage, hosted on Vercel. This lets one person build fast with very little day to day operations work, while still giving the app a real sign in flow with Google, a real database, and the vector search that the vibe search feature will need later.

## Decision

**Chosen option**: Option 1: Managed full stack on Supabase

Build the app as one Next.js (TypeScript) application. Use Supabase for the database (Postgres), sign in (auth), and file storage. Host on Vercel. Use Inngest for background jobs and Sentry for error tracking.

**Implementation skills**: `nextjs-app-router-patterns` (`wshobson/agents`, `.agents/skills/nextjs-app-router-patterns/`) · `typescript-advanced-types` (`wshobson/agents`, `.agents/skills/typescript-advanced-types/`) · `supabase` (`supabase/agent-skills`, `.agents/skills/supabase/`) · `supabase-postgres-best-practices` (`supabase/agent-skills`, `.agents/skills/supabase-postgres-best-practices/`) · `deploy-to-vercel` (`vercel-labs/agent-skills`, `.agents/skills/deploy-to-vercel/`) · `inngest-durable-functions` (`inngest/inngest-skills`, `.agents/skills/inngest-durable-functions/`) · `sentry-get-started` (`getsentry/sentry-for-ai`, `.agents/skills/sentry-get-started/`)

## Proposed stack

| Layer                        | Choice                                                                                                                                                                                                                                                                                                             | Reason                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language                     | TypeScript                                                                                                                                                                                                                                                                                                         | Type safety across the whole app, the standard choice for this ecosystem                                                                                                                                                           |
| Framework                    | Next.js (App Router), Server Actions and Route Handlers                                                                                                                                                                                                                                                            | One codebase for UI and server logic, no separate API layer to build and deploy for a solo project                                                                                                                                 |
| Primary database             | Supabase Postgres, with the pgvector extension                                                                                                                                                                                                                                                                     | A real relational database for the catalog, ratings, swipes, and imports; pgvector stores the embeddings vibe search will need, in the same database                                                                               |
| Auth                         | Supabase Auth                                                                                                                                                                                                                                                                                                      | Email sign in and Google sign in (OAuth) built in, matches what the core discovery loop feature needs on day one, no separate auth service to run                                                                                  |
| File storage                 | Supabase Storage                                                                                                                                                                                                                                                                                                   | Bundled with the same account; ready if the app needs to store files (for example, avatars) later                                                                                                                                  |
| Background jobs              | Inngest                                                                                                                                                                                                                                                                                                            | Managed scheduled and durable functions for tasks like refreshing the movie catalog cache and recomputing feed recommendations, pairs well with serverless hosting                                                                 |
| Hosting                      | Vercel                                                                                                                                                                                                                                                                                                             | Built by the Next.js team, deploys with almost no setup, free tier carries the first slices                                                                                                                                        |
| Observability                | Sentry                                                                                                                                                                                                                                                                                                             | Standard error tracking with a first class Next.js integration, catches problems before users report them                                                                                                                          |
| Data access boundary         | Server side only: all reads and writes go through Server Actions and Route Handlers using the Supabase service role key. Row level security (RLS) is turned on for every table anyway, with deny by default policies, as a second layer of protection. The anon key is used only for the sign in handshake         | Keeps one clear trust boundary that matches "no separate API layer", while RLS still protects the data if a server side check is ever missed                                                                                       |
| Recommendation reasons       | Template generated from taste profile overlap (for example, "because you rated X highly"), not a live call to a language model on every feed load                                                                                                                                                                  | Predictable, fast, and free to run on every page view; a language model generated reason can be added later as an upgrade, once the simple version is working                                                                      |
| Embeddings (for vibe search) | OpenAI `text-embedding-3-small`, 1536 dimensions                                                                                                                                                                                                                                                                   | Fits under pgvector's 2000 dimension limit for an indexed column, so the data model spec can size the vector column correctly now instead of guessing; changing this later means re-embedding the whole catalog, so it is set here |
| Background jobs, in detail   | Inngest handles the Letterboxd CSV import (parsing and matching thousands of rows) and the catalog embedding backfill, both of which need durability and retries. The simple, regular catalog metadata refresh uses Supabase's built in `pg_cron` instead, so a second vendor is not added just for one cron job   | Matches each job to the tool that actually earns its keep, instead of routing everything through Inngest by default                                                                                                                |
| Migrations and environments  | Schema changes are tracked as SQL files in the repo (`supabase/migrations`) using the Supabase CLI, applied through CI with `supabase db push`. A second Supabase project is used as staging, which fits inside the free tier's two project limit, and Vercel preview deployments point at staging, not production | Prevents an in progress migration on a preview branch from touching real production data, which matters especially under the Tracer Bullet approach where schema changes happen often                                              |

## Consequences

**Positive**:

- One person can build and ship fast; almost no servers to manage day to day
- Google sign in and a real database are ready from day one, matching the "build it end to end, for real" approach this project uses (see Rationale)
- pgvector means vibe search does not need a separate vector database service
- The free tiers on Supabase and Vercel cover the first two slices (core discovery loop, CSV import) at no cost

**Negative / tradeoffs**:

- The app becomes tied to Supabase and Vercel; moving off either later is real work, not a config change
- Server Actions and Route Handlers are Next.js specific. If a separate mobile app is ever added, a proper API layer (for example REST) would need to be built then; there is no separate API today
- Inngest and Sentry are two more external accounts to set up and keep working, even though both have free tiers
- Free tiers have real limits that this project will hit, not just a hypothetical: Vercel's Hobby tier is for non commercial use only, which matters once the deferred monetization feature ships (budget Vercel Pro, about $20 a month, at that point); Supabase's free project pauses after about 7 days of inactivity and a real catalog's embeddings need more memory than the free instance comfortably gives (budget Supabase Pro, about $25 a month, once vibe search and a real catalog land, roughly slice 3)

**Neutral**:

- This spec does not choose an ORM or query library (for example Drizzle, Prisma, or the plain Supabase client); that is decided in the data model spec, alongside the actual tables
- No table schema is fixed here; the data model spec designs the entities that live in this database

## Follow-up

- [ ] Design the data model (spec): `/architect data model`. It should use a `vector(1536)` column for embeddings (matching the `text-embedding-3-small` choice above), enable RLS with deny by default policies on every table, and account for the CSV import and catalog cache entities Inngest and pg_cron will write to
- [ ] Design movie catalog integration (spec): `/architect movie catalog integration`
- [ ] Run `/audit` (scope feature 2) to write the project's `AGENTS.md`; it is currently missing, and should record this stack, the build approach, and the skills listed above so later work does not have to rediscover them
- [ ] Pick an ORM or query layer (for example Drizzle, Prisma, or the plain `supabase-js` client) when the data model spec runs; if a pooled connection is used (Supabase's transaction mode pooler), confirm the chosen ORM's compatibility mode (for example Prisma needs `pgbouncer=true` on the connection string)
- [ ] Connect the MCP servers chosen during this design, when ready (each is a one time login step in your own terminal):
  - Supabase: `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp"`, then run `/mcp` in Claude Code and authenticate
  - Vercel: `claude mcp add --transport http vercel https://mcp.vercel.com`, then run `/mcp` and authenticate
  - Sentry: `claude plugin install sentry-mcp@sentry-mcp` (Sentry's official Claude Code plugin, handles the connection and sign in together; the raw endpoint is `https://mcp.sentry.dev/mcp` if a manual `claude mcp add` is ever needed instead)

## Rationale

Reasoning and options considered: see [rationale.md](rationale.md).

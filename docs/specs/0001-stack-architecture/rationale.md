# 0001. Stack and architecture: rationale

## Context

This is a brand new project (no code exists yet). The app is a movie recommendation product: users sign in, onboard either by swiping through movies or by importing a Letterboxd CSV export, then see a personalized feed with a short reason attached to each recommendation, plus a natural language "vibe" search over the movie catalog.

It is being built by one person (or a very small team), and the stated goal is to move fast with as little day to day operations work as possible, not to prepare for large scale from day one. There are no hosting or infrastructure commitments already in place, and no hard technology constraints.

The project's build approach (recorded at the top of `docs/scope/scope.md`) is Tracer Bullet: each feature is built end to end through every real layer before being polished, rather than mocking the backend behind a UI shell (a Facade approach). This matters for the stack choice, because the very first buildable feature (scope feature 7, "Core discovery loop") needs real sign in (including Google OAuth), a real database, and a real feed, not stand ins.

Several forces shape the choice:

- A relational data model is needed: users, a movie catalog cache, ratings, swipes, CSV imports, feed items, and recommendation reasons, all related to each other (see the separate data model spec).
- Vibe search (a later slice) needs to search the catalog by meaning, not just keywords, which usually means storing and querying vector embeddings.
- Sign in must support both email and Google OAuth from the first buildable feature.
- Background work will be needed at some point (for example, keeping the movie catalog cache fresh), even if not on day one.
- The team is small enough that every extra service to operate is a real cost, not a rounding error.

## Options considered

### Option 1: Managed full stack on Supabase

One Next.js (TypeScript) app, using Supabase for the database (Postgres), authentication, and file storage, hosted on Vercel, with Inngest for background jobs and Sentry for error tracking.

**Pros**:

- Fewest services to wire together yourself: database, auth, and storage come from one account
- Supabase Postgres includes the pgvector extension, so vibe search can store and query embeddings in the same database instead of standing up a separate vector database
- Supabase Auth supports email and Google OAuth out of the box, matching what the core discovery loop needs immediately
- Vercel and Next.js are built by the same team and deploy together with almost no configuration

**Cons**:

- Ties the app to the Supabase and Vercel ecosystems; leaving either later is real migration work
- Free tiers have real limits (compute, bandwidth, monthly active users); meaningful growth will require paid plans

### Option 2: Next.js with Convex as a reactive backend

Same Next.js frontend, but Convex replaces Supabase as the backend: a reactive, strongly typed backend with its own database, functions, and real time updates, still hosted on Vercel.

**Pros**:

- Very strong end to end type safety between frontend and backend, often cited as an excellent experience for a solo developer
- Real time updates (for example, a live feed) come essentially for free
- Also removes the need to run a separate backend service

**Cons**:

- Convex's data model is its own document and function based system, not plain SQL; the relational shape this project needs (catalog, ratings, swipes, imports, feed items all related to each other) is a better natural fit for a relational database
- Convex does have built in vector search, so this is not a missing feature, but it is a filtered top match over a document field that then needs a second lookup for the full record. Vibe search wants to blend vector similarity with the user's taste profile and other filters in one query, which is a natural fit for SQL and an awkward one in Convex's model
- Smaller ecosystem and community than Postgres, so fewer existing patterns and less prior art to draw on

### Option 3: Fully assembled stack

Next.js frontend and API, with a separately managed Postgres database, a self hosted auth library (for example Auth.js), object storage from a separate provider (for example an S3 compatible service), and a general purpose host (for example Render or Railway) instead of Vercel.

**Pros**:

- No single vendor lock in; every piece can be swapped independently
- Full control over each service's configuration and limits

**Cons**:

- Far more setup and glue code before any feature can be built: connecting auth, database, and storage by hand is exactly the kind of work Option 1 avoids
- More services means more day to day operational surface for one person to keep working, directly against the stated goal of moving fast with low ops overhead
- No clear benefit for a project at this stage; the independence this buys is not needed yet

## Rationale

Option 1 is chosen because it best matches the two strongest forces in Context: a solo or small team optimizing for build speed and low operations work, and a genuine need for a relational data model plus vector search for vibe search.

Supabase gives a real Postgres database (fitting the relational shape of catalog, ratings, swipes, and imports) with pgvector built in, so the vibe search feature does not need a second database service later. Its auth also directly satisfies the Core discovery loop feature's requirement for email and Google sign in, and because this project follows a Tracer Bullet approach, that feature needs real auth and a real database from the start, not a placeholder.

Option 2 (Convex) was a close alternative and would serve a less relational domain well. It does support vector search, but this project's core entities are naturally relational, and vibe search wants to blend vector similarity with the user's taste profile and other filters in a single query, which SQL handles more naturally than Convex's document model. Option 3 (assembling every piece separately) was rejected because it adds real setup and ongoing operational cost with no corresponding benefit at this project's current size; that independence is worth paying for only if a specific limit of the managed option is actually hit later, which can be reassessed then.

## References

**Project sources** (verifiable, in this repo):

- `docs/scope/scope.md`: the project's build approach (Tracer Bullet) and the feature list this stack must support (sign in with Google OAuth, swipe and CSV onboarding, feed with reasons, vibe search)
- The skills registry (verified live via `npx skills add <owner>/<repo> --list` during this design): `wshobson/agents`, `supabase/agent-skills`, `vercel-labs/agent-skills`, `inngest/inngest-skills`, `getsentry/sentry-for-ai`

**Practices & standards**:

- Monolith first for a small team, extract services only when a specific bottleneck forces it
- Boring, proven technology over new and exciting, absent a specific constraint the boring choice cannot meet
- A relational database as the default for data with clear relationships, reserving NoSQL for the cases it specifically fits

**Links** (web verified during this design):

- Next.js: https://nextjs.org
- Supabase pricing: https://supabase.com/pricing
- Supabase MCP setup: https://supabase.com/docs/guides/getting-started/mcp
- pgvector: https://github.com/pgvector/pgvector
- Inngest: https://www.inngest.com
- Vercel pricing: https://vercel.com/pricing
- Vercel MCP: https://vercel.com/docs/agent-resources/vercel-mcp
- Sentry MCP: https://mcp.sentry.dev

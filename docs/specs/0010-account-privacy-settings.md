# 0010. Account and privacy settings

**Date**: 2026-08-13
**Status**: Accepted

## Summary

This spec gives users a real account page: read the privacy policy and terms, sign out, and delete
their account with the data tied to it. Deletion is a hard, immediate delete driven through
Supabase's Auth Admin API, which relies on the cascade already built into the schema to remove
every owned row (ratings, imports, feed history). No new database tables are needed. The existing
"Account" tab in the bottom navigation currently signs the user out directly with no real page
behind it; this spec replaces that shortcut with the actual page.

## Context

The app has no self service account surface. Signing out already works (`signOut` in
`src/auth/actions.ts`), but it is wired directly to the bottom tab labeled "Account", so tapping
that tab signs the user out immediately with nothing else behind it. There is no privacy policy or
terms page, and no way for a user to delete their account or confirm their data is actually gone.
For a consumer app that stores personal taste data (ratings, an imported watch history from
Letterboxd), this is a real gap, and the scope entry for this feature explicitly calls out account
deletion behavior (hard vs soft delete, cascade scope) as the open, load bearing question blocking
it from being buildable.

The data model (spec 0002) already anticipated this: every user owned table (`profiles`, `ratings`,
`imports`, `import_rows`, `feed_items`) has a foreign key back to `profiles.id` with `on delete
cascade`, and `profiles.id` itself cascades from `auth.users`. Any deletion design should lean on
that existing chain rather than build something new around it.

There is no stated compliance driver (no GDPR or CCPA obligation named for this product), and the
project is a single engineer working in thin, end to end slices (Tracer Bullet). That argues
against adding infrastructure, such as a grace period job or a durable audit log table, that the
team does not clearly need yet, while still taking the deletion itself seriously.

## Requirements

**User stories**:

- As a signed in user, I want a real account page so I can see my account and manage it in one
  place instead of the "Account" tab silently signing me out.
- As a user, I want to read the privacy policy and terms of service before deciding to trust the
  app with my data.
- As a user, I want to delete my account and be confident my ratings and imported data are actually
  gone, not just hidden.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: A signed in user can open `/account` and see their email, a Sign out action, and a
  Legal section linking to `/privacy` and `/terms`.
- **AC-2**: Anyone, signed in or not, can open `/privacy` and read the privacy policy.
- **AC-3**: Anyone, signed in or not, can open `/terms` and read the terms of service.
- **AC-4**: The bottom navigation's "Account" tab links to `/account` instead of triggering sign
  out directly; sign out happens from inside the account page.
- **AC-5**: From the account page's Danger zone, a user can start account deletion, must type a
  confirmation phrase before the delete action becomes available, and canceling leaves the account
  fully untouched.
- **AC-6**: On confirmed deletion, the account and every row it owns (profile, ratings, imports,
  import rows, feed items) are irreversibly removed, verified by the user no longer being able to
  sign in and no owned rows remaining for that user id.
- **AC-7**: After a successful deletion, the user's session is cleared and they land signed out on
  `/signin`, not on an error page.
- **AC-8**: If deletion fails (for example an Admin API error), the user sees a clear error, is not
  partially signed out, and their account remains fully intact.
- **AC-9**: Only the authenticated caller can delete their own account; an unauthenticated request,
  or one that tries to target a different user id, is rejected before anything is deleted.
- **AC-10**: `/privacy` and `/terms` carry basic page metadata (title, description) so they are
  properly indexable public pages.

## Options considered

### Option 1: Hard delete, immediate

Deleting the account calls the Supabase Auth Admin API to delete the `auth.users` row, which
triggers the existing foreign key cascade through `profiles` down to every owned table in the same
database operation.

**Pros**:

- Reuses the cascade the schema was already built with; no new state, no new table.
- Satisfies "confirm data removed" literally and immediately, not eventually.
- Nothing new to operate: no scheduled job, no pending state to reason about.

**Cons**:

- Irreversible. A misclick or a moment of frustration has no undo path.

### Option 2: Soft delete with a grace period

Mark the account for deletion, keep the data for a fixed window (for example 30 days), then a
scheduled job hard deletes it if the user has not signed back in to cancel.

**Pros**:

- Forgiving of mistakes; a common pattern in consumer apps (Netflix and Spotify both do this).

**Cons**:

- Needs a new `pending_deletion` state on `profiles`, a scheduled job (the project already runs
  Inngest for the vibe search pipeline, so the mechanism exists, but the job itself does not), and a
  decision about what a "pending deletion" account can and cannot do if the user signs back in.
- Meaningfully more to build and keep correct for a single engineer project at this stage, for a
  benefit (an undo window) nobody has asked for yet.

### Option 3: Deactivate only, never truly delete

Disable sign in and hide the account, but never actually remove the underlying rows.

**Pros**:

- Simplest to build; no risk of losing data.

**Cons**:

- Does not satisfy the scope's own requirement that ratings and import data be confirmed removed.
  This option does not meet the bar the feature was asked to meet, it avoids it.

## Decision

**Chosen option**: Option 1: Hard delete, immediate

Account deletion calls the Supabase Auth Admin API to delete the `auth.users` row, and the existing
`on delete cascade` chain removes every owned row in the same operation. No new tables, no new
state machine.

The Admin API needs privileged access this project does not yet have a client for. The existing
data access path (`drizzle` over a service role Postgres connection) could technically run
`delete from auth.users` directly, but Supabase documents the `auth` schema as internally managed
and the Admin API (`supabase.auth.admin.deleteUser`) as the supported way to remove a user, since
GoTrue (Supabase's auth server) keeps state around a user that a raw SQL delete does not clean up
consistently. This spec adds a small service role Supabase client, alongside the existing anon key
session client, used only for this one call.

**Implementation skills**: `supabase` (`supabase/agent-skills`, `.agents/skills/supabase/`) ·
`supabase-postgres-best-practices` (`supabase/agent-skills`,
`.agents/skills/supabase-postgres-best-practices/`) · `posthog-instrumentation`
(`posthog/posthog-for-claude`, `.agents/skills/posthog-instrumentation/`) · `sentry-get-started`
(`getsentry/sentry-for-ai`, `.agents/skills/sentry-get-started/`)

## Rationale

The schema (spec 0002) was already built with this decision in mind, every user owned table
cascades from `profiles`, which cascades from `auth.users`. Reusing that chain is simpler and safer
than building a parallel deletion mechanism. Option 2's grace period is a real, common pattern, but
nothing about this project's stage or the scope entry calls for it, and it would add a state machine
and a scheduled job to maintain for a benefit that was explicitly deferred in the design
conversation. Option 3 was ruled out because it does not actually do what the feature was asked to
do.

On the deletion mechanism itself: using the Admin API over raw SQL costs one new small client and
one new environment variable, in exchange for staying on Supabase's supported path for a
destructive, security sensitive operation. That trade favors correctness over strict reuse of the
existing drizzle pattern.

## Feature design

**Data model sketch**:
No new tables or columns. Deletion relies entirely on the existing chain from spec 0002:

- `auth.users` (Supabase managed) to `public.profiles` (`profiles.id` references `auth.users.id`,
  `on delete cascade`)
- `public.profiles` to `public.ratings`, `public.imports`, `public.import_rows`,
  `public.feed_items` (each `user_id` references `profiles.id`, `on delete cascade`)
- `public.movies` is a shared catalog, not user owned, and is unaffected by account deletion
  (`ratings`/`import_rows` reference it with `on delete restrict`, the other direction).

**State transitions**:
Account: `active` to `deleted`. One transition, immediate and irreversible, triggered only by the
account owner completing the type to confirm step. No intermediate or pending state.

**API surface**:

| Endpoint                        | Method     | Key inputs                       | Key outputs                                      | Auth                        | Key errors                                                                 |
| ------------------------------- | ---------- | -------------------------------- | ------------------------------------------------ | --------------------------- | -------------------------------------------------------------------------- |
| `/account`                      | GET (page) | none                             | email, Sign out action, Legal links, Danger zone | session required            | redirects to `/signin` if unauthenticated                                  |
| `/privacy`                      | GET (page) | none                             | static policy content                            | public                      | none                                                                       |
| `/terms`                        | GET (page) | none                             | static terms content                             | public                      | none                                                                       |
| `deleteAccount` (Server Action) | action     | confirmation phrase (form field) | redirect to `/signin` on success                 | session required, self only | confirmation phrase mismatch, unauthorized (no session), Admin API failure |

`signOut` (Server Action) already exists and is reused as is, not rebuilt.

**Value sourcing** (name the source of every value each action produces, computes, or displays; a
required value with no named source is an undecided input to resolve now, never one for the build
to invent):

| Action                         | Value produced / displayed | Source                                                                                                                                                                                                        |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/account` page                | displayed email            | `Session` currently only carries `userId` (`src/auth/session.ts`); extend it to also read `user.email` from the same `supabase.auth.getUser()` call already made in `requireSession`, no extra request needed |
| `deleteAccount`                | which account gets deleted | `userId` from `requireSession()`, always server derived, never accepted from client input                                                                                                                     |
| `deleteAccount`                | confirmation match         | a form field compared server side against a fixed phrase (for example `DELETE`), in addition to the client side check that gates the submit button                                                            |
| deletion analytics/audit event | the `userId` property      | `requireSession()`'s `userId`, captured and sent before the delete call runs, since the row (and the id's meaning) is gone immediately after                                                                  |

**Key invariants**:

- Every user owned table has a foreign key to `profiles.id` with `on delete cascade`; deleting
  `auth.users` always fully removes owned data, no orphan rows are possible by construction.
- `deleteAccount` only ever targets the caller's own id; the id never comes from client input.
- The confirmation phrase must match server side before the delete call executes, regardless of
  what the client already checked.

**Security model**:

- `/account` requires an authenticated session, the same `requireSession()` pattern already used by
  `/feed` and `/search`.
- `/privacy` and `/terms` are public, no session required.
- `deleteAccount` requires a session and only ever deletes the caller's own `auth.users` row via the
  new service role Admin client. The service role key is read server side only
  (`SUPABASE_SERVICE_ROLE_KEY`), never sent to the browser, matching the project's existing rule
  that only the anon key is used client side.
- No new RLS policies are needed: the Admin API call happens outside RLS (service role), and no new
  tables were added.

**Configuration required**:

- `SUPABASE_SERVICE_ROLE_KEY`: the Supabase project's service role secret, used only by the new
  server side admin client to call `auth.admin.deleteUser`. Validated at startup alongside the rest
  of `src/auth/env.ts`, never exposed through a `NEXT_PUBLIC_` variable.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: a signed in user opens `/account`, types the confirmation phrase in the Danger zone,
  submits, and lands signed out with the account and all owned rows gone, verifies **AC-5**,
  **AC-6**, **AC-7**
- Failure case: a confirmation phrase mismatch keeps the submit disabled client side, and is also
  rejected server side if bypassed, leaving the account untouched, verifies **AC-5**, **AC-8**
- Auth/permission: an unauthenticated request to `deleteAccount` is rejected as unauthorized and
  nothing is deleted, verifies **AC-9**

## Build plan

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `src/auth/env.ts`'s validated env vars, and a new server only
   admin Supabase client module for the Auth Admin API, satisfies **AC-6**
2. Extend `Session`/`requireSession()` (`src/auth/session.ts`) to also expose the signed in user's
   email from the existing `getUser()` call, satisfies **AC-1**
3. Build the `/account` page: email, a Sign out action (reusing `signOut`), and a Legal section
   linking to `/privacy` and `/terms`; update the bottom tab bar (`src/app/feed/page.tsx`,
   `src/app/search/page.tsx`, `src/app/onboarding/layout.tsx`) so the "Account" entry is a
   `TabBarItem` linking to `/account` instead of a `TabBarAction` that signs out directly,
   satisfies **AC-1**, **AC-4**
4. Build `/privacy` and `/terms` as static pages with placeholder policy content and page metadata,
   linked from the account page's Legal section and the signed out `/signin` page footer, satisfies
   **AC-2**, **AC-3**, **AC-10**
5. Add an `account_deletion_completed` event to `AnalyticsEventMap`
   (`src/analytics/events.ts`), following the existing typed event convention, supports **AC-6**
6. Build the `deleteAccount` Server Action: `requireSession`, validate the confirmation phrase
   server side, capture the Sentry breadcrumb and the PostHog event with the `userId` before
   deleting, call the admin client's `auth.admin.deleteUser`, then clear the session and redirect to
   `/signin`, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**
7. Build the Danger zone UI on `/account`: a type to confirm modal wired to `deleteAccount`, submit
   disabled until the typed phrase matches, canceling leaves the account untouched, satisfies
   **AC-5**

No migration is needed; the data model target (spec 0002) already covers this feature in full.

## Consequences

**Positive**:

- Users can exercise basic control over their data: read the policy, delete their account, and
  trust that deletion is real.
- The "Account" tab finally does what its label and icon already promised.
- Zero migration risk: the feature builds entirely on the cascade the schema already has.

**Negative / tradeoffs**:

- Hard delete is irreversible. There is no recovery window if a user deletes by mistake or in a
  moment of frustration.
- A Sentry breadcrumb is not a durable, queryable audit trail; if support ever needs to look up past
  deletions systematically, this will not be enough and a real audit table would be needed then.
- The placeholder privacy policy and terms text must not reach real users until replaced with real
  legal copy.

**Neutral**:

- The codebase now has three distinct ways of getting privileged Supabase access: the anon key
  session client (sign in handshake), the service role Postgres connection through `drizzle`
  (regular reads and writes), and this new service role Admin API client (user deletion only).
  Worth knowing for whoever touches auth code next.

## Follow-up

- [ ] Replace the placeholder privacy policy and terms of service text with real legal copy before
      public launch.
- [ ] Once the public landing page (scope feature 11) is built, link `/privacy` and `/terms` from
      its footer too.
- [ ] Profile editing (display name, avatar) was explicitly deferred; consider it as its own future
      feature, the columns already exist on `profiles`.
- [ ] A "download my data" export was explicitly deferred; revisit if a compliance requirement
      (GDPR/CCPA) becomes real for this product.

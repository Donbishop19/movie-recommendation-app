# 0005. Product analytics foundation: rationale

## Context

Nothing measures user behavior in this app yet. Sentry is already wired up, but it watches for errors, not for whether onboarding finishes or the feed gets used. The scope names feed engagement as the product's chosen success metric, so without this foundation there is no way to know whether the app is working for real users once it has any.

Two things make this decision harder than "just add analytics." First, the feature that will actually fire the interesting events (core discovery loop: sign in, swipe, and the feed) has not been built yet, so this foundation has to define a contract another feature will consume later, not wire up real call sites today. Second, the app has no analytics or tracking of any kind installed, so this is also a first time provider pick with real, if modest, cost and privacy implications: what data leaves the app, who else can see it, and what it costs as usage grows.

## Options considered

### Option 1: PostHog

An open source product analytics platform, available as a managed cloud service or self hosted, with separate SDKs for client (`posthog-js`) and server (`posthog-node`) capture, built in support for linking an anonymous visitor to a signed in user later, and official Next.js App Router integration guidance including the reverse proxy pattern this spec adopts.

**Pros**:

- One vendor covers both client and server capture with first party SDKs for each, matching the "both, per event" capture origin decision
- Generous free tier fits a solo, pre revenue project
- Built in identify/alias support means the anonymous to authenticated merge this project may want later (slice 5, the landing page) does not require a second tool
- Official, current Next.js App Router documentation, including the exact reverse proxy setup this spec uses

**Cons**:

- A third vendor account and dashboard to manage, on top of TMDB and Sentry
- Self hosting PostHog (the only way to avoid any per event cost at scale) is real operational weight neither wanted nor needed here; this spec deliberately does not choose that

### Option 2: Mixpanel

A long established, dashboard first product analytics tool known for strong funnel and retention analysis.

**Pros**:

- Best in class analytics UI for exploring funnels, retention, and cohorts once data exists
- Mature, widely used product with a large support community

**Cons**:

- No self host option and, more relevantly here, no natural extension into this project's other needs (session replay, feature flags) the way PostHog offers if this foundation grows
- Its free tier has gotten stingier over successive pricing changes, a real risk for a project with no revenue yet
- Server side Next.js integration is thinner in its own documentation than PostHog's

### Option 3: Amplitude

A product analytics platform similar in depth to Mixpanel, with a strong free tier and enterprise grade retention and funnel tooling.

**Pros**:

- Powerful funnel/retention analysis, comparable to Mixpanel
- A usable free tier for a small project

**Cons**:

- Leans enterprise in its setup and configuration surface (organizations, projects, governance features) that a solo project does not need
- Heavier initial setup than this foundation's scope warrants

### Option 4: Vercel Analytics

Web analytics built directly into the Vercel hosting this project already uses, with a lightweight custom events API.

**Pros**:

- Zero new vendor account; already available through the existing Vercel deployment
- Simplest possible setup for basic page view and web vitals data

**Cons**:

- Its custom event support has no `identify()` concept and no funnel or segmentation UI, a poor fit for measuring "did onboarding complete" or "did this feed item get engaged with" as named, structured events with properties
- Not built for the event taxonomy and per user analysis this feature's acceptance criteria require

## Rationale

PostHog is the only option that cleanly satisfies the "both, per event" client and server capture decision with one first party SDK family, rather than stitching a client tool to a separate server side event API. Its free tier and lack of any up front commitment fit a solo, pre revenue project better than Mixpanel's tightening free tier or Amplitude's enterprise leaning setup. Vercel Analytics was ruled out early: it cannot express the four core events (each needs named properties, not just a page view count) or support later funnel analysis, so it does not meet this feature's acceptance criteria at all, only a much smaller one.

Self hosting PostHog was considered and rejected: it would remove the largest listed con (a third managed vendor), but at the cost of running ClickHouse and several supporting services, which is meaningfully more operational surface than anything else this project currently runs. PostHog Cloud, US region, was chosen over self hosting and over the EU region because there is no stated EU/GDPR requirement yet; a region change is a low cost migration if that changes later, not a reason to add operational weight now.

Disabling autocapture and session replay by default follows directly from the PII policy already decided in this design conversation (ids and categorical data only): autocapture in particular scrapes DOM content indiscriminately, which works against a deliberate, typed event map. The reverse proxy (`/ingest`) is not optional polish; PostHog's own guidance is explicit that a meaningful share of client side events (5 to 30%) are silently dropped by ad and tracker blockers without it, which would directly undermine the feed engagement metric this whole foundation exists to make measurable.

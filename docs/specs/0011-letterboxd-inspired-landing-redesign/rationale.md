# 0011. Rationale: Letterboxd inspired landing page redesign

## Context

The engineer looked at the shipped home page and said plainly it was not close to what they
wanted, pointing at letterboxd.com as the actual reference: "i have seen what we build and im not
impress, it is not close to what i want... wire this app closely to that base on what we have
already, from the home page." letterboxd.com returned HTTP 403 to both `WebFetch` and a direct
request this session (bot protection), so this decision is built from well established, generally
known facts about Letterboxd's real design (dark charcoal canvas, dense poster grids and poster
wall imagery, a 5 star rating convention, minimal chrome) rather than a live fetch of the current
page; the engineer confirmed proceeding this way over asking for a screenshot.

The home page currently lives inside `.marketing-backdrop`, a light lavender gradient page
background with the actual content floated as a rounded dark card on top. This pattern was added
in a 2026-08-15 commit ("rebrand to TellaMovie with a navy/blue marketing redesign") that reused
spec 0007's design system tokens but was never itself run through `/architect`: scope feature 11
("Public landing page & SEO") has no linked spec at all in `docs/scope/scope.md`, and `design.md`
documents the lavender treatment as a fact of the current build, not a deliberated decision. That
gap is exactly why this is the first real spec for the home page's own visual direction, distinct
from spec 0007, which governs the authenticated app shell (tab bar, hero spotlight, feed poster
grid) and is not changing here.

A second forcing fact surfaced during design: every existing movie related Server Action
(`getOrRefreshMovie`, `searchMovies`, `browsePopularMovies`) calls `requireSession()` first. That
is a deliberate product choice in each of those actions, not a technical requirement of the data
layer (all of them already read and write through the Supabase service role key, never the anon
key), but it does mean none of them can be called as they stand from a signed out page. Wanting a
real, catalog backed "Popular right now" row on the home page therefore forces a small, explicit
decision about how a public page reads public movie data, not just a styling change.

## Options considered

See [index.md](index.md#options-considered): full bleed dark canvas with a real poster collage and
popular row (chosen); keep the lavender card and restyle its contents; a full Letterboxd style
rebrand including its green accent color.

## Rationale

Option 1 was chosen because the engineer's own framing, "wire this app closely to that base on
what we have already," names two constraints at once: get visibly closer to letterboxd.com, and do
it on the existing foundation (the current component library, the current accent color, the
current TellaMovie brand) rather than starting over. Option 3 (a full green rebrand) would get
visually closer still, but the engineer explicitly chose to keep the current blue accent rather
than reopen and re-verify AA contrast across a new hue, and a color change also does not fit
building on "what we have already." Option 2 (keep the lavender card, restyle inside it) preserves
the smallest diff but keeps a page chrome pattern that has no counterpart anywhere else in the app
or on letterboxd.com; since the whole point of this request is closing the gap to the reference,
capping the redesign at "reskin the card's contents" would not actually close it.

The new `getPublicPopularMovies` action was scoped as a new function rather than loosening
`browsePopularMovies`'s existing session requirement, so the feed's authenticated action keeps its
current authorization shape (including its `trackServer` analytics call, which assumes a real
`userId`) untouched, and the public read path is easy to find and reason about on its own.

## References

None (references were not requested for this spec).

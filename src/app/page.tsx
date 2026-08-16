import type { Metadata } from "next";
import { Bot, Star } from "lucide-react";
import { getPublicPopularMovies } from "@/app/actions/movies";
import { MoviePoster } from "@/movies/movie-poster";
import { Badge } from "@/design-system/components/badge";
import { buttonVariants } from "@/design-system/components/button";
import { Card, CardContent } from "@/design-system/components/card";
import { Container } from "@/design-system/components/container";
import { Link } from "@/design-system/components/link";
import { NavBar } from "@/design-system/components/nav-bar";
import { PosterWall } from "@/design-system/components/poster-wall";
import { Grid, Stack } from "@/design-system/components/stack";
import { cn } from "@/design-system/lib/cn";

export const metadata: Metadata = {
  title: "TellaMovie — Find the best movies and shows to watch with friends",
  description:
    "Personalized movie and TV recommendations based on your ratings and your friends' tastes, with a feed that explains itself and a natural language vibe search.",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "TellaMovie",
    title: "TellaMovie",
    description:
      "Find the best movies and shows to watch with friends. Personalized recommendations based on your ratings and your friends' tastes.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "TellaMovie",
    description:
      "Find the best movies and shows to watch with friends, with a feed that explains itself.",
  },
};

/** Regenerates the page and its popular movies at most once an hour (AC-9's Value sourcing). */
export const revalidate = 3600;

const HERO_POSTER_COUNT = 20;
const POPULAR_ROW_COUNT = 12;

const steps = [
  {
    number: "1",
    title: "Sign in",
    description: "Email and password, or continue with Google.",
  },
  {
    number: "2",
    title: "Rate a few movies",
    description:
      "Swipe through a quick set, or import your Letterboxd ratings.",
  },
  {
    number: "3",
    title: "Get your feed",
    description:
      "See a personalized feed with reasons, and refine it anytime with vibe search.",
  },
] as const;

/**
 * The public, signed out landing page (spec 0011 / feature 11): the app's SEO entry point.
 * Redesigned to read close to letterboxd.com: full bleed dark canvas, a real poster collage
 * hero, and a real "Popular right now" row, both drawn from the app's own catalog data through
 * the public, session free `getPublicPopularMovies`. Degrades to a plain gradient hero and an
 * omitted popular row (never a visible error) when the catalog has too few posters yet, satisfying
 * AC-5.
 */
export default async function Home() {
  const popularResult = await getPublicPopularMovies(HERO_POSTER_COUNT);
  const popularMovies = popularResult.ok ? popularResult.value.movies : [];
  const rowMovies = popularMovies.slice(0, POPULAR_ROW_COUNT);

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main-content"
        className={cn(
          "sr-only focus:not-sr-only focus:fixed focus:top-sm focus:left-sm focus:z-50",
          "focus:rounded-md focus:bg-surface focus:px-md focus:py-sm focus:text-ink",
          "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        )}
      >
        Skip to main content
      </a>

      <NavBar
        logo={
          <Link
            href="/"
            variant="nav"
            className="flex items-center gap-xs text-lg font-semibold text-ink"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-accent/15 text-accent"
            >
              <Bot className="size-5" />
            </span>
            TellaMovie
          </Link>
        }
        items={[
          { label: "Home", href: "/", active: true },
          { label: "How It Works", href: "#how-it-works" },
        ]}
        actions={
          <Stack direction="row" gap="sm">
            <Link
              href="/signin"
              variant="nav"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
              )}
            >
              Log In
            </Link>
            <Link
              href="/signin"
              variant="nav"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Sign Up
            </Link>
          </Stack>
        }
      />

      <main id="main-content">
        {/* Hero: a real poster collage behind a dark scrim, falling back to a plain gradient
            when the catalog has too few cached posters yet (AC-5). */}
        <section className="relative isolate overflow-hidden border-b border-border">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 bg-linear-to-b from-surface to-canvas"
          />
          <PosterWall
            movies={popularMovies}
            className="absolute inset-0 -z-10 opacity-70"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-t from-canvas via-canvas/90 to-canvas/50"
          />
          <Container className="relative flex min-h-112 flex-col justify-end gap-lg py-2xl sm:min-h-136">
            <Stack gap="lg" className="max-w-(--container-2xl)">
              <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                Find the Best Movies &amp; Shows to Watch With Friends
              </h1>
              <p className="text-lg text-body">
                Personalized recommendations based on your ratings and your
                friends&apos; tastes.
              </p>
              <Stack direction="row" gap="sm" wrap>
                <Link
                  href="/signin"
                  variant="nav"
                  className={cn(buttonVariants({ size: "lg" }))}
                >
                  Create an Account
                </Link>
                <Link
                  href="#how-it-works"
                  variant="nav"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                  )}
                >
                  Learn How It Works
                </Link>
              </Stack>
            </Stack>
          </Container>
        </section>

        {/* Popular right now: omitted entirely on a catalog miss or fetch failure (AC-5). */}
        {rowMovies.length > 0 ? (
          <section
            aria-labelledby="popular-heading"
            className="border-b border-border py-2xl"
          >
            <Container>
              <Stack gap="lg">
                <h2
                  id="popular-heading"
                  className="text-2xl font-medium text-ink"
                >
                  Popular right now
                </h2>
                <div
                  role="region"
                  aria-label="Popular movies right now"
                  tabIndex={0}
                  className={cn(
                    "flex gap-md overflow-x-auto pb-xs",
                    "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                  )}
                >
                  {rowMovies.map((movie) => (
                    <Card
                      key={movie.id}
                      className="w-36 shrink-0 overflow-hidden sm:w-44"
                    >
                      <div className="relative aspect-2/3 w-full bg-canvas">
                        <MoviePoster
                          posterUrl={movie.posterUrl}
                          title={movie.title}
                        />
                        {movie.externalRating ? (
                          <Badge
                            variant="rating"
                            className="absolute right-sm top-sm gap-xxs"
                          >
                            <Star className="size-3" aria-hidden="true" />
                            {movie.externalRating}
                          </Badge>
                        ) : null}
                      </div>
                      <CardContent className="p-sm">
                        <h3 className="line-clamp-1 text-sm font-medium text-ink">
                          {movie.title}
                        </h3>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Stack>
            </Container>
          </section>
        ) : null}

        {/* How it works */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-20 border-b border-border py-2xl"
        >
          <Container>
            <Stack gap="xl">
              <h2
                id="how-it-works-heading"
                className="text-center text-2xl font-medium text-ink"
              >
                How it works
              </h2>
              <Grid cols={3} gap="lg" as="ol">
                {steps.map(({ number, title, description }) => (
                  <Stack
                    as="li"
                    key={number}
                    gap="sm"
                    align="center"
                    className="text-center"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-10 items-center justify-center rounded-full bg-accent text-base font-medium text-on-accent"
                    >
                      {number}
                    </span>
                    <h3 className="text-lg font-medium text-ink">{title}</h3>
                    <p className="text-sm text-body">{description}</p>
                  </Stack>
                ))}
              </Grid>
            </Stack>
          </Container>
        </section>

        {/* Closing CTA */}
        <section className="py-2xl">
          <Container>
            <Stack gap="lg" align="center" className="text-center">
              <h2 className="text-2xl font-medium text-ink">
                Ready to find your next favorite movie?
              </h2>
              <p className="max-w-(--container-xl) text-body">
                It takes a couple of minutes to onboard, and your feed keeps
                improving the more you rate.
              </p>
              <Link
                href="/signin"
                variant="nav"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Sign in to get started
              </Link>
            </Stack>
          </Container>
        </section>

        <footer className="border-t border-border py-lg">
          <Container className="flex flex-col items-center gap-md text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-muted">
              &copy; {new Date().getFullYear()} TellaMovie
            </p>
            <nav aria-label="Footer">
              <Stack direction="row" gap="lg">
                <Link href="/privacy" variant="accent" className="text-sm">
                  Privacy policy
                </Link>
                <Link href="/terms" variant="accent" className="text-sm">
                  Terms of service
                </Link>
                <Link href="/signin" variant="accent" className="text-sm">
                  Sign in
                </Link>
              </Stack>
            </nav>
          </Container>
        </footer>
      </main>
    </div>
  );
}

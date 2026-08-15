import type { Metadata } from "next";
import {
  Bot,
  Clapperboard,
  MessageSquareText,
  Search,
  Sparkles,
  Star,
  ThumbsUp,
  Upload,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/design-system/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/components/card";
import { Container } from "@/design-system/components/container";
import { Input } from "@/design-system/components/input";
import { Grid, Stack } from "@/design-system/components/stack";
import { Link } from "@/design-system/components/link";
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

const features = [
  {
    icon: ThumbsUp,
    title: "Swipe to rate",
    description:
      "Swipe through a quick set of movies and we pick up your taste right away, no long survey.",
  },
  {
    icon: Upload,
    title: "Or import your Letterboxd history",
    description:
      "Already rated hundreds of movies on Letterboxd? Upload your export and skip the swiping.",
  },
  {
    icon: MessageSquareText,
    title: "A feed that explains itself",
    description:
      "Every recommendation carries a short reason, not just a poster and a guess.",
  },
  {
    icon: Sparkles,
    title: "Search by vibe, not just title",
    description:
      "Type something like moody and slow burn like Blade Runner and get a ranked list that matches the mood.",
  },
] as const;

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

const pill = "rounded-full";

/**
 * The public, signed out landing page (spec 0011 / feature 11): the app's SEO entry point.
 * Redesigned 2026-08-15 around a reference image: content floats as rounded dark cards on a
 * light marketing backdrop (see design.md, "Character & direction"), rebranded to TellaMovie.
 */
export default function Home() {
  return (
    <div className="marketing-backdrop min-h-screen">
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

      <Container
        as="main"
        id="main-content"
        className="max-w-7xl py-lg sm:py-xl"
      >
        <Stack gap="lg">
          {/* Nav + hero panel */}
          <section className="overflow-hidden rounded-xl border border-border bg-canvas">
            <div className="flex flex-col gap-sm border-b border-border px-lg py-md sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-md sm:px-xl">
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

              <div className="relative hidden w-full max-w-[20rem] flex-1 md:block">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-sm top-1/2 size-4 -translate-y-1/2 text-muted"
                />
                <Input
                  type="search"
                  placeholder="Search Movies, TV Shows, Actors..."
                  aria-label="Search movies, TV shows, and actors"
                  className={cn(pill, "bg-surface pl-2xl")}
                />
              </div>

              <nav aria-label="Primary" className="hidden lg:block">
                <ul className="flex items-center gap-lg">
                  <li>
                    <Link
                      href="/"
                      variant="nav"
                      data-active
                      aria-current="page"
                    >
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link href="#how-it-works" variant="nav">
                      How It Works
                    </Link>
                  </li>
                </ul>
              </nav>

              <div className="flex items-center gap-sm">
                <Link
                  href="/signin"
                  variant="nav"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    pill,
                  )}
                >
                  Log In
                </Link>
                <Link
                  href="/signin"
                  variant="nav"
                  className={cn(buttonVariants({ size: "sm" }), pill)}
                >
                  Sign Up
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2xl px-lg py-2xl sm:px-xl lg:grid-cols-2 lg:items-center lg:gap-xl">
              <Stack gap="lg" className="min-w-0 max-w-(--container-xl)">
                <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  Find the Best Movies &amp; Shows to Watch With Friends
                </h1>
                <p className="text-lg text-body">
                  Personalized recommendations based on your ratings and your
                  friends&apos; tastes.
                </p>
                <Stack direction="row" gap="sm" wrap className="min-w-0 pt-xs">
                  <Link
                    href="/signin"
                    variant="nav"
                    className={cn(buttonVariants({ size: "lg" }), pill)}
                  >
                    Create an Account
                  </Link>
                  <Link
                    href="#how-it-works"
                    variant="nav"
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "lg" }),
                      pill,
                    )}
                  >
                    Learn How It Works
                  </Link>
                </Stack>
              </Stack>

              <div
                className="relative mx-auto w-full min-w-0 max-w-(--container-md)"
                aria-hidden="true"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-gradient-to-br from-surface via-canvas to-surface">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 70% 20%, rgba(52,145,239,0.28), transparent 60%)",
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-sm pb-lg">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="flex size-16 items-center justify-center rounded-full border border-border bg-surface/80 text-body backdrop-blur-sm sm:size-20"
                      >
                        <Users className="size-8" />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="absolute -left-4 top-6 w-44 rounded-lg border border-border bg-surface p-sm shadow-lg sm:-left-8">
                  <div className="flex gap-sm">
                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-sm bg-canvas text-muted">
                      <Clapperboard className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">
                        Ballerina
                      </p>
                      <p className="text-xs font-semibold text-accent">
                        95% Match
                      </p>
                      <div className="mt-xxs flex gap-px text-accent">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="size-3"
                            fill="currentColor"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -right-4 flex size-20 items-center justify-center rounded-full border-2 border-accent bg-canvas text-accent shadow-lg sm:size-24">
                  <Bot className="size-10" />
                </div>
              </div>
            </div>

            <div className="border-t border-border px-lg py-2xl text-center sm:px-xl">
              <h2 className="text-2xl font-semibold text-ink">
                Top Recommendations for Every Category
              </h2>
              <p className="mx-auto mt-xs max-w-(--container-xl) text-body">
                Discover movies and shows selected based on your ratings and
                your friends&apos; preferences.
              </p>
            </div>
          </section>

          {/* Features */}
          <section
            aria-labelledby="features-heading"
            className="rounded-xl border border-border bg-canvas px-lg py-2xl sm:px-xl"
          >
            <Stack gap="xl">
              <Stack gap="xs" align="center" className="text-center">
                <h2
                  id="features-heading"
                  className="text-2xl font-medium text-ink"
                >
                  Built around your actual taste
                </h2>
                <p className="max-w-(--container-xl) text-body">
                  Two ways to onboard, a feed that shows its work, and a search
                  that understands mood instead of just keywords.
                </p>
              </Stack>
              <Grid cols={2} gap="lg">
                {features.map(({ icon: Icon, title, description }) => (
                  <Card key={title}>
                    <CardHeader>
                      <div className="mb-xs flex size-10 items-center justify-center rounded-md bg-accent/15 text-accent">
                        <Icon aria-hidden="true" className="size-5" />
                      </div>
                      <CardTitle>{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-body">
                        {description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </Grid>
            </Stack>
          </section>

          {/* How it works */}
          <section
            id="how-it-works"
            aria-labelledby="how-it-works-heading"
            className="scroll-mt-20 rounded-xl border border-border bg-canvas px-lg py-2xl sm:px-xl"
          >
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
          </section>

          {/* Closing CTA */}
          <section className="rounded-xl border border-border bg-canvas px-lg py-2xl">
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
                className={cn(buttonVariants({ size: "lg" }), pill)}
              >
                Sign in to get started
              </Link>
            </Stack>
          </section>

          <footer className="rounded-xl border border-border bg-canvas px-lg py-lg">
            <div className="flex flex-col items-center gap-md text-center sm:flex-row sm:justify-between sm:text-left">
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
            </div>
          </footer>
        </Stack>
      </Container>
    </div>
  );
}

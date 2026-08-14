import type { Metadata } from "next";
import { MessageSquareText, Sparkles, ThumbsUp, Upload } from "lucide-react";
import { Badge } from "@/design-system/components/badge";
import { buttonVariants } from "@/design-system/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/components/card";
import { Container } from "@/design-system/components/container";
import { Grid, Stack } from "@/design-system/components/stack";
import { Link } from "@/design-system/components/link";
import { NavBar } from "@/design-system/components/nav-bar";
import { cn } from "@/design-system/lib/cn";

export const metadata: Metadata = {
  title: "Movie Recommendation App — A feed that knows your taste",
  description:
    "Swipe through movies or import your Letterboxd ratings, then get a personalized feed with a reason attached to every recommendation, plus a natural language vibe search.",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "Movie Recommendation App",
    title: "Movie Recommendation App",
    description:
      "A personalized movie feed with reasons, built from your swipes or your Letterboxd history.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Movie Recommendation App",
    description:
      "A personalized movie feed with reasons, and a natural language vibe search.",
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

/**
 * The public, signed out landing page (spec 0011 / feature 11): the app's SEO entry point,
 * replacing the earlier minimal shell now that the design system and product surface are
 * established. Metadata and the sitemap/robots routes point crawlers and social previews here.
 */
export default function Home() {
  return (
    <div>
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
        logo="Movie Recommendation App"
        actions={
          <Link
            href="/signin"
            variant="nav"
            className={buttonVariants({ size: "sm" })}
          >
            Sign in
          </Link>
        }
      />

      <main id="main-content">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-128 bg-accent/15 blur-3xl"
            style={{ clipPath: "ellipse(60% 45% at 50% 0%)" }}
          />
          <Container className="relative flex flex-col items-center gap-xl pt-[calc(var(--spacing-section)+var(--spacing-xl))] pb-section text-center">
            <Badge variant="accent">In development, built in the open</Badge>
            <Stack gap="lg" align="center" className="max-w-(--container-2xl)">
              <h1 className="text-3xl font-medium text-ink sm:text-4xl">
                A movie feed that knows your taste, and can say why.
              </h1>
              <p className="max-w-(--container-xl) text-lg text-body">
                Swipe through movies or import your Letterboxd ratings, then get
                a personalized feed with a reason attached to every
                recommendation, and a natural language search for whatever mood
                you are in.
              </p>
            </Stack>
            <Stack
              direction="row"
              gap="sm"
              wrap
              justify="center"
              className="pt-xs"
            >
              <Link
                href="/signin"
                variant="nav"
                className={buttonVariants({ size: "lg" })}
              >
                Sign in to get started
              </Link>
              <Link
                href="#how-it-works"
                variant="nav"
                className={buttonVariants({
                  variant: "secondary",
                  size: "lg",
                })}
              >
                See how it works
              </Link>
            </Stack>
          </Container>
        </div>

        {/* Features */}
        <Container
          as="section"
          aria-labelledby="features-heading"
          className="py-section"
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
        </Container>

        {/* How it works */}
        <Container
          as="section"
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-20 border-t border-border py-section"
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
        </Container>

        {/* Closing CTA */}
        <Container as="section" className="py-section">
          <Stack
            gap="lg"
            align="center"
            className="rounded-lg border border-border bg-surface px-lg py-2xl text-center"
          >
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
              className={buttonVariants({ size: "lg" })}
            >
              Sign in to get started
            </Link>
          </Stack>
        </Container>
      </main>

      <footer className="border-t border-border">
        <Container className="flex flex-col items-center gap-md py-lg text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} Movie Recommendation App
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
    </div>
  );
}

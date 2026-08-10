import { Badge } from "@/design-system/components/badge";
import { Button } from "@/design-system/components/button";
import { Container } from "@/design-system/components/container";
import { NavBar } from "@/design-system/components/nav-bar";
import { Stack } from "@/design-system/components/stack";

/**
 * The signed out home shell. Deliberately minimal: the design system foundation replaces the
 * create-next-app boilerplate (AC-11), but the real landing page and its content are a later,
 * separate scope item (Slice 5), not this build.
 */
export default function Home() {
  return (
    <div>
      <NavBar
        logo="Movie Recommendation App"
        actions={<Badge variant="accent">In development</Badge>}
      />
      <Container
        as="main"
        className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-section"
      >
        <Stack gap="md" align="center" className="max-w-xl text-center">
          <h1 className="text-3xl font-medium text-ink">
            A movie feed that knows your taste, and can say why.
          </h1>
          <p className="text-body">
            Swipe through movies or import your Letterboxd ratings, then get a
            personalized feed with a reason attached to every recommendation.
          </p>
          <Button size="lg" disabled>
            Sign in (coming soon)
          </Button>
        </Stack>
      </Container>
    </div>
  );
}

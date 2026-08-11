import { Badge } from "@/design-system/components/badge";
import { buttonVariants } from "@/design-system/components/button";
import { Container } from "@/design-system/components/container";
import { Link } from "@/design-system/components/link";
import { NavBar } from "@/design-system/components/nav-bar";
import { Stack } from "@/design-system/components/stack";

/**
 * The signed out home shell. Deliberately minimal: the design system foundation replaces the
 * create-next-app boilerplate (AC-11); the real landing page and its content are a later,
 * separate scope item (Slice 5). The sign in link now points at the real `/signin` (spec 0006).
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
          <Link
            href="/signin"
            variant="nav"
            className={buttonVariants({ size: "lg" })}
          >
            Sign in
          </Link>
        </Stack>
      </Container>
    </div>
  );
}

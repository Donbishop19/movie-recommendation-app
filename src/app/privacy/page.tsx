import type { Metadata } from "next";
import { Badge } from "@/design-system/components/badge";
import { Container } from "@/design-system/components/container";
import { Link } from "@/design-system/components/link";
import { NavBar } from "@/design-system/components/nav-bar";
import { Stack } from "@/design-system/components/stack";

export const metadata: Metadata = {
  title: "Privacy policy — Movie Recommendation App",
  description:
    "What data Movie Recommendation App collects, how it is used, and how to delete your account and data.",
};

/** AC-2, AC-10 of spec 0010: the public privacy policy page. */
export default function PrivacyPage() {
  return (
    <div>
      <NavBar logo="Movie Recommendation App" />
      <Container as="main" className="max-w-(--container-md) py-section">
        <Stack gap="xl">
          <Stack gap="xxs">
            <Badge variant="default">Placeholder, not legal advice</Badge>
            <h1 className="text-2xl font-medium text-ink">Privacy policy</h1>
            <p className="text-body">
              This is a plain language placeholder describing our current data
              practices. It has not been reviewed by a lawyer; treat it as a
              draft to replace with real legal copy before public launch.
            </p>
          </Stack>

          <Stack gap="xs">
            <h2 className="text-xl font-medium text-ink">What we collect</h2>
            <p className="text-body">
              Your email address (for sign in), the movies you rate or import
              from Letterboxd, and basic usage events (for example, that you
              viewed your feed or ran a search) so we can build and improve your
              recommendations.
            </p>
          </Stack>

          <Stack gap="xs">
            <h2 className="text-xl font-medium text-ink">How we use it</h2>
            <p className="text-body">
              Your ratings and imported watch history power your personalized
              feed and search results. We do not sell your data or share it with
              third parties for advertising.
            </p>
          </Stack>

          <Stack gap="xs">
            <h2 className="text-xl font-medium text-ink">
              Deleting your account
            </h2>
            <p className="text-body">
              You can delete your account at any time from your{" "}
              <Link href="/account" variant="accent">
                account page
              </Link>
              . Deletion is immediate and permanent: your profile, ratings,
              imports, and feed history are all removed and cannot be recovered.
            </p>
          </Stack>

          <Stack gap="xs">
            <h2 className="text-xl font-medium text-ink">Questions</h2>
            <p className="text-body">
              See our{" "}
              <Link href="/terms" variant="accent">
                terms of service
              </Link>{" "}
              for the rest of the ground rules.
            </p>
          </Stack>
        </Stack>
      </Container>
    </div>
  );
}

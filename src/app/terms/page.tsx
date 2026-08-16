import type { Metadata } from "next";
import { Badge } from "@/design-system/components/badge";
import { Container } from "@/design-system/components/container";
import { Link } from "@/design-system/components/link";
import { NavBar } from "@/design-system/components/nav-bar";
import { Stack } from "@/design-system/components/stack";

export const metadata: Metadata = {
  title: "Terms of service — TellaMovie",
  description:
    "The ground rules for using TellaMovie: your account, your content, and our liability.",
};

/** AC-3, AC-10 of spec 0010: the public terms of service page. */
export default function TermsPage() {
  return (
    <div>
      <NavBar logo="TellaMovie" />
      <Container as="main" className="max-w-(--container-md) py-section">
        <Stack gap="xl">
          <Stack gap="xxs">
            <Badge variant="default">Placeholder, not legal advice</Badge>
            <h1 className="text-2xl font-medium text-ink">Terms of service</h1>
            <p className="text-body">
              This is a plain language placeholder. It has not been reviewed by
              a lawyer; treat it as a draft to replace with real legal copy
              before public launch.
            </p>
          </Stack>

          <Stack gap="xs">
            <h2 className="text-xl font-medium text-ink">Your account</h2>
            <p className="text-body">
              You are responsible for keeping your sign in credentials secure
              and for the ratings and imports you add to your account.
            </p>
          </Stack>

          <Stack gap="xs">
            <h2 className="text-xl font-medium text-ink">Acceptable use</h2>
            <p className="text-body">
              Use this app to discover and rate movies. Do not attempt to
              disrupt the service, scrape it at scale, or use it to store or
              share content unrelated to movie recommendations.
            </p>
          </Stack>

          <Stack gap="xs">
            <h2 className="text-xl font-medium text-ink">
              Service provided as is
            </h2>
            <p className="text-body">
              This app is provided as is, without warranty of any kind, while it
              is under active development.
            </p>
          </Stack>

          <Stack gap="xs">
            <h2 className="text-xl font-medium text-ink">Your data</h2>
            <p className="text-body">
              See our{" "}
              <Link href="/privacy" variant="accent">
                privacy policy
              </Link>{" "}
              for what we collect and how to delete your account and data.
            </p>
          </Stack>
        </Stack>
      </Container>
    </div>
  );
}

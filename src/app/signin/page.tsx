import type { Metadata } from "next";
import { Container } from "@/design-system/components/container";
import { Stack } from "@/design-system/components/stack";
import { Link } from "@/design-system/components/link";
import { SignInView } from "./sign-in-view";

export const metadata: Metadata = {
  title: "Sign in — Movie Recommendation App",
};

/** AC-1, AC-10: the single sign in / sign up entry point, email+password and Google. */
export default async function SignInPage({
  searchParams,
}: PageProps<"/signin">) {
  const { error } = await searchParams;
  const oauthDenied = error === "oauth_denied";

  return (
    <Container
      as="main"
      className="flex min-h-screen items-center justify-center py-section"
    >
      <Stack gap="xl" align="center" className="w-full max-w-md">
        <Stack gap="xs" align="center" className="text-center">
          <Link href="/" variant="nav" className="text-lg font-medium text-ink">
            Movie Recommendation App
          </Link>
          <p className="text-body">
            Sign in to swipe through movies and get a feed built around your
            taste.
          </p>
        </Stack>
        <SignInView initialOauthDenied={oauthDenied} />
      </Stack>
    </Container>
  );
}

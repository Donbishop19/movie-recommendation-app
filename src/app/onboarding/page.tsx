import type { Metadata } from "next";
import { Sparkles, Upload } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/design-system/components/card";
import { buttonVariants } from "@/design-system/components/button";
import { Link } from "@/design-system/components/link";
import { Stack } from "@/design-system/components/stack";

export const metadata: Metadata = {
  title: "Onboarding — TellaMovie",
};

/** AC-1, spec 0008: lets a not yet onboarded user pick swipe onboarding or Letterboxd CSV import. */
export default function OnboardingChoicePage() {
  return (
    <Stack gap="lg" align="center" className="w-full text-center">
      <Stack gap="xxs" align="center">
        <h1 className="text-2xl font-medium text-ink">
          Let&apos;s learn your taste
        </h1>
        <p className="max-w-(--container-sm) text-body">
          Pick how you&apos;d like to start. Either way, you&apos;ll land on a
          feed built around what you like.
        </p>
      </Stack>

      <Card className="w-full text-left">
        <CardHeader>
          <Sparkles className="size-6 text-accent" aria-hidden="true" />
          <CardTitle>Swipe through movies</CardTitle>
          <CardDescription>
            Like or pass on a handful of picks. Fast, and works even if
            you&apos;ve never rated anything anywhere else.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            href="/onboarding/swipe"
            variant="nav"
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            Start swiping
          </Link>
        </CardFooter>
      </Card>

      <Card className="w-full text-left">
        <CardHeader>
          <Upload className="size-6 text-accent" aria-hidden="true" />
          <CardTitle>Import from Letterboxd</CardTitle>
          <CardDescription>
            Upload your Letterboxd ratings export and we&apos;ll match it
            against our catalog, so your first feed reflects years of taste.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            href="/onboarding/import"
            variant="nav"
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className: "w-full",
            })}
          >
            Import my ratings
          </Link>
        </CardFooter>
      </Card>
    </Stack>
  );
}

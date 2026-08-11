import type { Metadata } from "next";
import { Container } from "@/design-system/components/container";
import { SwipeView } from "./swipe-view";

export const metadata: Metadata = {
  title: "Onboarding — Movie Recommendation App",
};

const ONBOARDING_SWIPE_TARGET = 10;

/** AC-2, AC-3, AC-9: swipe like/pass on movies until the taste profile is seeded. */
export default function OnboardingPage() {
  return (
    <Container
      as="main"
      className="flex min-h-screen flex-col items-center justify-center gap-lg py-section"
    >
      <SwipeView target={ONBOARDING_SWIPE_TARGET} />
    </Container>
  );
}

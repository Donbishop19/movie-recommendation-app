import type { Metadata } from "next";
import { SwipeView } from "../swipe-view";

export const metadata: Metadata = {
  title: "Swipe onboarding — TellaMovie",
};

const ONBOARDING_SWIPE_TARGET = 10;

/** AC-2, AC-3, AC-9 of spec 0006: swipe like/pass on movies until the taste profile is seeded. */
export default function OnboardingSwipePage() {
  return <SwipeView target={ONBOARDING_SWIPE_TARGET} />;
}

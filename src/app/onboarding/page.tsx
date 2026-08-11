import type { Metadata } from "next";
import { Home, User } from "lucide-react";
import { Container } from "@/design-system/components/container";
import {
  TabBar,
  TabBarItem,
  TabBarAction,
} from "@/design-system/components/tab-bar";
import { signOut } from "@/auth/actions";
import { SwipeView } from "./swipe-view";

export const metadata: Metadata = {
  title: "Onboarding — Movie Recommendation App",
};

const ONBOARDING_SWIPE_TARGET = 10;

/** AC-2, AC-3, AC-9: swipe like/pass on movies until the taste profile is seeded. */
export default function OnboardingPage() {
  return (
    <div>
      <Container
        as="main"
        className={[
          "flex min-h-screen max-w-(--container-sm) flex-col items-center justify-center gap-lg",
          "py-section pb-[calc(var(--size-tab-bar)+var(--spacing-lg))]",
        ].join(" ")}
      >
        <SwipeView target={ONBOARDING_SWIPE_TARGET} />
      </Container>
      <TabBar>
        <TabBarItem
          href="/feed"
          label="Feed"
          icon={<Home className="size-5" aria-hidden="true" />}
        />
        <TabBarAction
          label="Account"
          icon={<User className="size-5" aria-hidden="true" />}
          action={signOut}
        />
      </TabBar>
    </div>
  );
}

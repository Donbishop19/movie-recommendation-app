import type { ReactNode } from "react";
import { Home, User } from "lucide-react";
import { Container } from "@/design-system/components/container";
import { TabBar, TabBarItem } from "@/design-system/components/tab-bar";

/** The onboarding app shell: choice screen, swipe deck, and CSV import all share this. */
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div>
      <Container
        as="main"
        className={[
          "flex min-h-screen max-w-(--container-sm) flex-col items-center justify-center gap-lg",
          "py-section pb-[calc(var(--size-tab-bar)+var(--spacing-lg))]",
        ].join(" ")}
      >
        {children}
      </Container>
      <TabBar>
        <TabBarItem
          href="/feed"
          label="Feed"
          icon={<Home className="size-5" aria-hidden="true" />}
        />
        <TabBarItem
          href="/account"
          label="Account"
          icon={<User className="size-5" aria-hidden="true" />}
        />
      </TabBar>
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Home, Search, User } from "lucide-react";
import { Container } from "@/design-system/components/container";
import { TabBar, TabBarItem } from "@/design-system/components/tab-bar";
import { requireSession } from "@/auth/session";
import { AccountView } from "./account-view";

export const metadata: Metadata = {
  title: "Account — TellaMovie",
};

/** AC-1, AC-4 of spec 0010: the account screen, reachable from the bottom tab bar. */
export default async function AccountPage() {
  const session = await requireSession();

  if (!session.ok) {
    redirect("/signin");
  }

  return (
    <div>
      <Container
        as="main"
        className="max-w-(--container-sm) py-section pb-[calc(var(--size-tab-bar)+var(--spacing-lg))]"
      >
        <AccountView email={session.value.email} />
      </Container>
      <TabBar>
        <TabBarItem
          href="/feed"
          label="Feed"
          icon={<Home className="size-5" aria-hidden="true" />}
        />
        <TabBarItem
          href="/search"
          label="Search"
          icon={<Search className="size-5" aria-hidden="true" />}
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

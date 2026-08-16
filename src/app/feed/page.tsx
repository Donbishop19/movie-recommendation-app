import type { Metadata } from "next";
import { Home, Search, User } from "lucide-react";
import { Container } from "@/design-system/components/container";
import { TabBar, TabBarItem } from "@/design-system/components/tab-bar";
import { FeedView } from "./feed-view";

export const metadata: Metadata = {
  title: "Your feed — TellaMovie",
};

/** AC-4, AC-11: the personalized recommendation feed, with reasons and load more. */
export default function FeedPage() {
  return (
    <div>
      <Container
        as="main"
        className="max-w-(--container-sm) py-section pb-[calc(var(--size-tab-bar)+var(--spacing-lg))]"
      >
        <FeedView />
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

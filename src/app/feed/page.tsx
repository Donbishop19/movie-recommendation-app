import type { Metadata } from "next";
import { Home, User } from "lucide-react";
import { Container } from "@/design-system/components/container";
import {
  TabBar,
  TabBarItem,
  TabBarAction,
} from "@/design-system/components/tab-bar";
import { signOut } from "@/auth/actions";
import { FeedView } from "./feed-view";

export const metadata: Metadata = {
  title: "Your feed — Movie Recommendation App",
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
        <TabBarAction
          label="Account"
          icon={<User className="size-5" aria-hidden="true" />}
          action={signOut}
        />
      </TabBar>
    </div>
  );
}

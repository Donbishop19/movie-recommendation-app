import type { Metadata } from "next";
import { Home, Search as SearchIcon, User } from "lucide-react";
import { Container } from "@/design-system/components/container";
import {
  TabBar,
  TabBarItem,
  TabBarAction,
} from "@/design-system/components/tab-bar";
import { signOut } from "@/auth/actions";
import { SearchView } from "./search-view";

export const metadata: Metadata = {
  title: "Vibe search — Movie Recommendation App",
};

/** AC-1, AC-11 of spec 0009: the vibe search screen and its tab in the authenticated shell. */
export default function SearchPage() {
  return (
    <div>
      <Container
        as="main"
        className="max-w-(--container-sm) py-section pb-[calc(var(--size-tab-bar)+var(--spacing-lg))]"
      >
        <SearchView />
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
          icon={<SearchIcon className="size-5" aria-hidden="true" />}
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

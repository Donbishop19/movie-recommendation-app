import type { Metadata } from "next";
import { Container } from "@/design-system/components/container";
import { NavBar } from "@/design-system/components/nav-bar";
import { Button } from "@/design-system/components/button";
import { signOut } from "@/auth/actions";
import { FeedView } from "./feed-view";

export const metadata: Metadata = {
  title: "Your feed — Movie Recommendation App",
};

/** AC-4, AC-11: the personalized recommendation feed, with reasons and load more. */
export default function FeedPage() {
  return (
    <div>
      <NavBar
        logo="Movie Recommendation App"
        actions={
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        }
      />
      <Container as="main" className="py-section">
        <FeedView />
      </Container>
    </div>
  );
}

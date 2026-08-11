"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSwipeDeck, swipeMovie } from "@/app/actions/onboarding";
import type { Movie } from "@/movies/catalog-cache";
import { MoviePoster } from "@/movies/movie-poster";
import {
  Card,
  CardContent,
  CardFooter,
  CardSkeleton,
} from "@/design-system/components/card";
import { Button } from "@/design-system/components/button";
import { Badge } from "@/design-system/components/badge";
import { FormErrorSummary } from "@/design-system/components/form-error-summary";
import { Stack } from "@/design-system/components/stack";
import { toast } from "@/design-system/lib/toast-store";

const LOW_DECK_THRESHOLD = 3;

export interface SwipeViewProps {
  target: number;
}

/** The onboarding swipe deck: one movie at a time, like/pass, until `target` swipes land. */
export function SwipeView({ target }: SwipeViewProps) {
  const router = useRouter();
  const [deck, setDeck] = useState<Movie[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [swipeCount, setSwipeCount] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState(false);
  const [swipePending, setSwipePending] = useState(false);
  const fetchingMoreRef = useRef(false);

  const loadPage = useCallback(async (nextPage: number, isInitial: boolean) => {
    if (!isInitial) {
      fetchingMoreRef.current = true;
    }

    const result = await getSwipeDeck(nextPage);

    if (!result.ok) {
      if (isInitial) {
        setInitialError(true);
        setIsInitialLoading(false);
      } else {
        fetchingMoreRef.current = false;
        toast({
          variant: "error",
          title: "Couldn't load more movies",
          description: "We'll keep what you've already got. Try again shortly.",
        });
      }
      return;
    }

    setDeck((prev) => [...prev, ...result.value.movies]);
    setHasMore(result.value.hasMore);
    setPage(nextPage);
    if (isInitial) {
      setIsInitialLoading(false);
    } else {
      fetchingMoreRef.current = false;
    }
  }, []);

  useEffect(() => {
    // The only state this sets runs after `loadPage`'s internal `await`, never synchronously;
    // this is the standard fetch-on-mount shape, intentionally run once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !isInitialLoading &&
      hasMore &&
      !fetchingMoreRef.current &&
      deck.length <= LOW_DECK_THRESHOLD
    ) {
      void loadPage(page + 1, false);
    }
  }, [deck.length, hasMore, isInitialLoading, page, loadPage]);

  async function handleSwipe(action: "like" | "pass") {
    const current = deck[0];
    if (!current || swipePending) {
      return;
    }

    setSwipePending(true);
    const result = await swipeMovie(Number(current.externalId), action);
    setSwipePending(false);

    if (!result.ok) {
      toast({
        variant: "error",
        title: "That swipe didn't save",
        description: "Try again.",
      });
      return;
    }

    setDeck((prev) => prev.slice(1));
    setSwipeCount((count) => count + 1);

    if (result.value.onboardingComplete) {
      router.replace("/feed");
    }
  }

  if (isInitialLoading) {
    return (
      <Stack gap="md" align="center" className="w-full max-w-sm">
        <CardSkeleton className="aspect-2/3 w-full" />
      </Stack>
    );
  }

  if (initialError) {
    return (
      <Stack gap="md" align="center" className="w-full max-w-sm text-center">
        <FormErrorSummary
          title="Couldn't load the swipe deck"
          errors={["Check your connection and try again."]}
        />
        <Button
          onClick={() => {
            setInitialError(false);
            setIsInitialLoading(true);
            void loadPage(1, true);
          }}
        >
          Try again
        </Button>
      </Stack>
    );
  }

  const current = deck[0];

  if (!current) {
    return (
      <Stack gap="md" align="center" className="w-full max-w-sm text-center">
        <p className="text-body">
          No more movies to show right now. Check back in a bit.
        </p>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" align="center" className="w-full max-w-sm">
      <Badge variant="accent">
        {Math.min(swipeCount, target)} of {target}
      </Badge>

      <Card className="w-full overflow-hidden">
        <div className="relative aspect-2/3 w-full bg-surface">
          <MoviePoster posterUrl={current.posterUrl} title={current.title} />
        </div>
        <CardContent className="pt-lg">
          <h2 className="text-lg font-medium text-ink">
            {current.title}
            {current.releaseYear ? (
              <span className="text-body"> ({current.releaseYear})</span>
            ) : null}
          </h2>
          {current.genres && current.genres.length > 0 ? (
            <p className="mt-xxs text-sm text-body">
              {current.genres.join(" · ")}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-sm">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            isLoading={swipePending}
            onClick={() => void handleSwipe("pass")}
          >
            Pass
          </Button>
          <Button
            type="button"
            size="lg"
            isLoading={swipePending}
            onClick={() => void handleSwipe("like")}
          >
            Like
          </Button>
        </CardFooter>
      </Card>
    </Stack>
  );
}

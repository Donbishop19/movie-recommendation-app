"use client";

import { useCallback, useEffect, useState } from "react";
import { getFeed, engageFeedItem, type FeedItem } from "@/app/actions/feed";
import { MoviePoster } from "@/movies/movie-poster";
import {
  Card,
  CardContent,
  CardSkeleton,
} from "@/design-system/components/card";
import { Button } from "@/design-system/components/button";
import { Badge } from "@/design-system/components/badge";
import { FormErrorSummary } from "@/design-system/components/form-error-summary";
import { Stack } from "@/design-system/components/stack";
import { toast } from "@/design-system/lib/toast-store";

type EngagementStatus = "shown" | "liked" | "disliked";
type FeedRow = FeedItem & { readonly status: EngagementStatus };

/** AC-4, AC-9, AC-11: the personalized feed list, with like/dislike and load more. */
export function FeedView() {
  const [items, setItems] = useState<FeedRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<number | undefined>(
    undefined,
  );

  const load = useCallback(async (isInitial: boolean) => {
    if (!isInitial) {
      setIsLoadingMore(true);
    }

    const result = await getFeed();

    if (!result.ok) {
      if (isInitial) {
        setInitialError(true);
        setIsInitialLoading(false);
      } else {
        setIsLoadingMore(false);
        toast({
          variant: "error",
          title: "Couldn't load more recommendations",
          description: "Try again shortly.",
        });
      }
      return;
    }

    setItems((prev) => [
      ...prev,
      ...result.value.items.map((item) => ({
        ...item,
        status: "shown" as const,
      })),
    ]);
    setHasMore(result.value.hasMore);
    if (isInitial) {
      setIsInitialLoading(false);
    } else {
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    // The only state this sets runs after `load`'s internal `await`, never synchronously;
    // this is the standard fetch-on-mount shape, intentionally run once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEngage(feedItemId: number, action: "like" | "dislike") {
    setPendingItemId(feedItemId);
    const result = await engageFeedItem(feedItemId, action);
    setPendingItemId(undefined);

    if (!result.ok) {
      toast({
        variant: "error",
        title: "That didn't save",
        description: "Try again.",
      });
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.feedItemId === feedItemId
          ? { ...item, status: action === "like" ? "liked" : "disliked" }
          : item,
      ),
    );
  }

  if (isInitialLoading) {
    return (
      <Stack gap="md">
        {[0, 1, 2, 3].map((key) => (
          <CardSkeleton key={key} className="h-36" />
        ))}
      </Stack>
    );
  }

  if (initialError) {
    return (
      <Stack gap="md" align="center" className="text-center">
        <FormErrorSummary
          title="Couldn't load your feed"
          errors={["Check your connection and try again."]}
        />
        <Button
          onClick={() => {
            setInitialError(false);
            setIsInitialLoading(true);
            void load(true);
          }}
        >
          Try again
        </Button>
      </Stack>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-body">No recommendations yet. Check back soon.</p>
    );
  }

  return (
    <Stack gap="lg">
      <h1 className="text-2xl font-medium text-ink">Your feed</h1>
      <Stack gap="md">
        {items.map((item) => (
          <Card key={item.feedItemId} className="flex overflow-hidden">
            <div className="relative h-36 w-24 shrink-0 bg-canvas">
              <MoviePoster
                posterUrl={item.movie.posterUrl}
                title={item.movie.title}
              />
            </div>
            <CardContent className="flex flex-1 flex-col justify-between gap-sm py-md">
              <div>
                <h2 className="text-lg font-medium text-ink">
                  {item.movie.title}
                  {item.movie.releaseYear ? (
                    <span className="text-body">
                      {" "}
                      ({item.movie.releaseYear})
                    </span>
                  ) : null}
                </h2>
                <p className="mt-xxs text-sm text-body">{item.reason}</p>
              </div>
              {item.status === "shown" ? (
                <Stack direction="row" gap="sm">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    isLoading={pendingItemId === item.feedItemId}
                    onClick={() =>
                      void handleEngage(item.feedItemId, "dislike")
                    }
                  >
                    Dislike
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    isLoading={pendingItemId === item.feedItemId}
                    onClick={() => void handleEngage(item.feedItemId, "like")}
                  >
                    Like
                  </Button>
                </Stack>
              ) : (
                <Badge
                  variant={item.status === "liked" ? "success" : "default"}
                >
                  {item.status === "liked" ? "Liked" : "Disliked"}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
      {hasMore ? (
        <Button
          variant="secondary"
          isLoading={isLoadingMore}
          onClick={() => void load(false)}
          className="self-center"
        >
          Load more
        </Button>
      ) : null}
    </Stack>
  );
}

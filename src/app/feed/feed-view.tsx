"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { getFeed, engageFeedItem, type FeedItem } from "@/app/actions/feed";
import { MoviePoster } from "@/movies/movie-poster";
import { AppBackdrop } from "@/design-system/components/app-backdrop";
import {
  Card,
  CardContent,
  CardSkeleton,
} from "@/design-system/components/card";
import { Button } from "@/design-system/components/button";
import { Badge } from "@/design-system/components/badge";
import { Chip, ChipGroup } from "@/design-system/components/chip";
import { HeroSpotlight } from "@/design-system/components/hero-spotlight";
import { FormErrorSummary } from "@/design-system/components/form-error-summary";
import { Stack } from "@/design-system/components/stack";
import { toast } from "@/design-system/lib/toast-store";

type EngagementStatus = "shown" | "liked" | "disliked";
type FeedRow = FeedItem & { readonly status: EngagementStatus };

/**
 * AC-4, AC-5, AC-6, AC-7, AC-9, AC-11 of spec 0007: the personalized feed, a hero spotlight on
 * the top ranked recommendation, a cosmetic category chip row, then the rest as a poster grid.
 */
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
      <Stack gap="lg">
        <CardSkeleton className="aspect-2/3 w-full" />
        <div className="grid grid-cols-2 gap-md">
          {[0, 1, 2, 3].map((key) => (
            <CardSkeleton key={key} className="aspect-2/3 w-full" />
          ))}
        </div>
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

  const [top, ...rest] = items;

  return (
    <>
      <AppBackdrop posterUrl={top?.movie.posterUrl} />
      <Stack gap="lg">
        <h1 className="text-2xl font-medium text-ink">Your feed</h1>
        <ChipGroup label="Categories">
          <Chip active>For You</Chip>
        </ChipGroup>
        {top ? (
          <HeroSpotlight
            className="shadow-lg"
            title={top.movie.title}
            releaseYear={top.movie.releaseYear}
            posterUrl={top.movie.posterUrl}
            reason={top.reason}
            action={
              top.status === "shown" ? (
                <Stack direction="row" gap="sm" className="pt-xs">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    isLoading={pendingItemId === top.feedItemId}
                    onClick={() => void handleEngage(top.feedItemId, "dislike")}
                  >
                    <ThumbsDown className="size-4" aria-hidden="true" />
                    Dislike
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    isLoading={pendingItemId === top.feedItemId}
                    onClick={() => void handleEngage(top.feedItemId, "like")}
                  >
                    <ThumbsUp className="size-4" aria-hidden="true" />
                    Like
                  </Button>
                </Stack>
              ) : (
                <Badge variant={top.status === "liked" ? "success" : "default"}>
                  {top.status === "liked" ? "Liked" : "Disliked"}
                </Badge>
              )
            }
          />
        ) : null}
        {rest.length > 0 ? (
          <div className="grid grid-cols-2 gap-md">
            {rest.map((item) => (
              <Card key={item.feedItemId} className="overflow-hidden shadow-lg">
                <div className="relative aspect-2/3 w-full bg-canvas">
                  <MoviePoster
                    posterUrl={item.movie.posterUrl}
                    title={item.movie.title}
                  />
                  {item.movie.externalRating ? (
                    <Badge
                      variant="rating"
                      className="absolute right-sm top-sm gap-xxs"
                    >
                      <Star className="size-3" aria-hidden="true" />
                      {item.movie.externalRating}
                    </Badge>
                  ) : null}
                </div>
                <CardContent className="p-sm">
                  <h2 className="line-clamp-1 text-sm font-medium text-ink">
                    {item.movie.title}
                  </h2>
                  {item.status === "shown" ? (
                    <Stack direction="row" gap="xs" className="pt-xs">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-label="Dislike"
                        isLoading={pendingItemId === item.feedItemId}
                        onClick={() =>
                          void handleEngage(item.feedItemId, "dislike")
                        }
                      >
                        <ThumbsDown className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        aria-label="Like"
                        isLoading={pendingItemId === item.feedItemId}
                        onClick={() =>
                          void handleEngage(item.feedItemId, "like")
                        }
                      >
                        <ThumbsUp className="size-4" aria-hidden="true" />
                      </Button>
                    </Stack>
                  ) : (
                    <Badge
                      variant={item.status === "liked" ? "success" : "default"}
                      className="mt-xs"
                    >
                      {item.status === "liked" ? "Liked" : "Disliked"}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
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
    </>
  );
}

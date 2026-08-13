"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Search, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  vibeSearch,
  rateSearchResult,
  type SearchResultItem,
} from "@/app/actions/search";
import { MoviePoster } from "@/movies/movie-poster";
import {
  Card,
  CardContent,
  CardSkeleton,
} from "@/design-system/components/card";
import { Button } from "@/design-system/components/button";
import { Badge } from "@/design-system/components/badge";
import { Chip, ChipGroup } from "@/design-system/components/chip";
import { Input } from "@/design-system/components/input";
import { FormErrorSummary } from "@/design-system/components/form-error-summary";
import { Stack } from "@/design-system/components/stack";
import { toast } from "@/design-system/lib/toast-store";

type EngagementStatus = "shown" | "liked" | "disliked";
type ResultRow = SearchResultItem & { readonly status: EngagementStatus };

const PRESET_QUERIES = [
  "Moody & atmospheric",
  "Feel-good",
  "Slow burn",
  "Edge-of-your-seat",
  "Mind-bending",
  "Heartwarming",
];

/** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-10, AC-11 of spec 0009: the vibe search screen. */
export function SearchView() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ResultRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | undefined>(undefined);
  const [pendingMovieId, setPendingMovieId] = useState<string | undefined>(
    undefined,
  );

  const runSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      return;
    }
    setIsSearching(true);
    setSearchError(undefined);

    const result = await vibeSearch(searchQuery);

    setIsSearching(false);
    setHasSearched(true);

    if (!result.ok) {
      const message =
        result.error === "invalid_query"
          ? "That query is too short, too long, or empty."
          : result.error === "rate_limited"
            ? "Too many searches at once. Wait a moment and try again."
            : "Couldn't reach search. Check your connection and try again.";
      setSearchError(message);
      return;
    }

    setItems(result.value.items.map((item) => ({ ...item, status: "shown" })));
    setHasMore(result.value.hasMore);
    setUsedFallback(result.value.usedFallback);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(query);
  }

  function handlePreset(preset: string) {
    setQuery(preset);
    void runSearch(preset);
  }

  async function handleLoadMore() {
    setIsLoadingMore(true);
    const result = await vibeSearch(query, items.length);
    setIsLoadingMore(false);

    if (!result.ok) {
      toast({
        variant: "error",
        title: "Couldn't load more results",
        description: "Try again shortly.",
      });
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
  }

  async function handleRate(movieId: string, action: "like" | "dislike") {
    setPendingMovieId(movieId);
    const result = await rateSearchResult(movieId, action);
    setPendingMovieId(undefined);

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
        item.movie.id === movieId
          ? { ...item, status: action === "like" ? "liked" : "disliked" }
          : item,
      ),
    );
  }

  return (
    <Stack gap="lg">
      <h1 className="text-2xl font-medium text-ink">Search by vibe</h1>

      <form onSubmit={handleSubmit}>
        <Stack direction="row" gap="sm">
          <Input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Moody and slow burn, like Blade Runner…"
            aria-label="Describe the kind of movie you're in the mood for"
            invalid={Boolean(searchError)}
            maxLength={200}
          />
          <Button type="submit" isLoading={isSearching} aria-label="Search">
            <Search className="size-4" aria-hidden="true" />
          </Button>
        </Stack>
      </form>

      <ChipGroup label="Example vibes">
        {PRESET_QUERIES.map((preset) => (
          <Chip key={preset} type="button" onClick={() => handlePreset(preset)}>
            {preset}
          </Chip>
        ))}
      </ChipGroup>

      {isSearching ? (
        <div className="grid grid-cols-2 gap-md">
          {[0, 1, 2, 3].map((key) => (
            <CardSkeleton key={key} className="aspect-2/3 w-full" />
          ))}
        </div>
      ) : null}

      {!isSearching && searchError ? (
        <Stack gap="md" align="center" className="text-center">
          <FormErrorSummary title="Search failed" errors={[searchError]} />
          <Button onClick={() => void runSearch(query)}>Try again</Button>
        </Stack>
      ) : null}

      {!isSearching && !searchError && hasSearched && items.length === 0 ? (
        <p className="text-body">
          No close matches for that vibe yet. Try a different description.
        </p>
      ) : null}

      {!isSearching && !searchError && items.length > 0 ? (
        <>
          {usedFallback ? (
            <p className="text-sm text-muted">
              No close matches for that vibe. Here&apos;s what&apos;s popular
              right now instead.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-md">
            {items.map((item) => (
              <Card key={item.movie.id} className="overflow-hidden shadow-lg">
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
                        isLoading={pendingMovieId === item.movie.id}
                        onClick={() =>
                          void handleRate(item.movie.id, "dislike")
                        }
                      >
                        <ThumbsDown className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        aria-label="Like"
                        isLoading={pendingMovieId === item.movie.id}
                        onClick={() => void handleRate(item.movie.id, "like")}
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
          {hasMore ? (
            <Button
              variant="secondary"
              isLoading={isLoadingMore}
              onClick={() => void handleLoadMore()}
              className="self-center"
            >
              Load more
            </Button>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}

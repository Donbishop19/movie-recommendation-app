"use server";

import * as Sentry from "@sentry/nextjs";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { feedItems, movies, ratings } from "@/db/drizzle/schema";
import { requireSession } from "@/auth/session";
import { isOnboarded } from "@/auth/onboarding";
import { trackServer } from "@/analytics/server";
import { ok, err, type Result, type DataError } from "@/shared/result";
import {
  discoverTmdbPopularMovies,
  discoverTmdbMoviesByGenres,
  reportTmdbError,
  TMDB_GENRE_IDS,
} from "@/movies/tmdb-client";
import { listUpsert, toMovie, type Movie } from "@/movies/catalog-cache";

export type FeedError = DataError | "onboarding_incomplete";

export type FeedItem = {
  readonly feedItemId: number;
  readonly movie: Movie;
  readonly reason: string;
};

export type FeedPage = {
  readonly items: ReadonlyArray<FeedItem>;
  readonly hasMore: boolean;
};

const DEFAULT_BATCH_SIZE = 20;
const MIN_LIKES_FOR_SIGNAL = 3;
const TOP_GENRE_COUNT = 3;
const SHOWN_EXCLUSION_DAYS = 14;
const MAX_CANDIDATE_PAGES = 5;
const LIKED_RATING_VALUE = "4.5";

type Candidate = { readonly row: Awaited<ReturnType<typeof listUpsert>> };

function resolveBatchSize(batchSize: number | undefined): number {
  return batchSize && batchSize > 0
    ? Math.trunc(batchSize)
    : DEFAULT_BATCH_SIZE;
}

/** Top liked genres by count, descending, capped at `TOP_GENRE_COUNT`. */
function topGenres(
  genreLists: ReadonlyArray<ReadonlyArray<string> | undefined>,
): string[] {
  const counts = new Map<string, number>();
  for (const genres of genreLists) {
    for (const genre of genres ?? []) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_GENRE_COUNT)
    .map(([genre]) => genre);
}

function reasonFor(
  candidateGenres: ReadonlyArray<string> | undefined,
  liked: readonly string[],
): string {
  const topMatch = liked.find((genre) => candidateGenres?.includes(genre));
  return topMatch
    ? `Because you liked ${topMatch} movies`
    : "Popular right now";
}

function overlapScore(
  candidateGenres: ReadonlyArray<string> | undefined,
  liked: readonly string[],
): number {
  if (!candidateGenres) return 0;
  return candidateGenres.filter((genre) => liked.includes(genre)).length;
}

/**
 * Builds and persists one batch of the recommendation feed: genre overlap ranked when the
 * caller has enough liked movies, popularity ranked otherwise (AC-6). Excludes every movie the
 * caller has ever rated and any candidate shown to them in the last 14 days (AC-5), so a
 * repeat call (the "load more" action, AC-11) naturally returns a fresh batch. Satisfies AC-4.
 */
export async function getFeed(
  batchSize?: number,
): Promise<Result<FeedPage, FeedError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }
  const { userId } = session.value;

  if (!(await isOnboarded(userId))) {
    return err("onboarding_incomplete");
  }

  try {
    const target = resolveBatchSize(batchSize);

    const likedMovieIds = (
      await db
        .select({ movieId: ratings.movieId })
        .from(ratings)
        .where(
          and(
            eq(ratings.userId, userId),
            eq(ratings.ratingValue, LIKED_RATING_VALUE),
          ),
        )
    ).map((row) => row.movieId);

    const thinSignal = likedMovieIds.length < MIN_LIKES_FOR_SIGNAL;

    let liked: string[] = [];
    let genreIds: number[] = [];
    if (!thinSignal) {
      const likedGenreLists = await db
        .select({ genres: movies.genres })
        .from(movies)
        .where(inArray(movies.id, likedMovieIds));
      liked = topGenres(likedGenreLists.map((row) => row.genres ?? undefined));
      genreIds = liked
        .map((genre) => TMDB_GENRE_IDS[genre])
        .filter((id): id is number => id !== undefined);
    }
    const usePopularityFallback = thinSignal || genreIds.length === 0;

    const ratedIds = new Set(
      (
        await db
          .select({ movieId: ratings.movieId })
          .from(ratings)
          .where(eq(ratings.userId, userId))
      ).map((row) => row.movieId),
    );
    const shownSince = new Date(
      Date.now() - SHOWN_EXCLUSION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const recentlyShownIds = new Set(
      (
        await db
          .select({ movieId: feedItems.movieId })
          .from(feedItems)
          .where(
            and(
              eq(feedItems.userId, userId),
              gte(feedItems.shownAt, shownSince),
            ),
          )
      ).map((row) => row.movieId),
    );
    const excludedIds = new Set([...ratedIds, ...recentlyShownIds]);

    const candidates: Candidate[] = [];
    const seenIds = new Set<string>();
    for (
      let page = 1;
      page <= MAX_CANDIDATE_PAGES && candidates.length < target;
      page++
    ) {
      const result = usePopularityFallback
        ? await discoverTmdbPopularMovies(page)
        : await discoverTmdbMoviesByGenres(genreIds, page);

      if (!result.ok) {
        reportTmdbError("getFeed", result.error);
        if (page === 1) {
          return err("unknown");
        }
        break;
      }

      const rows = await Promise.all(
        result.value.results.map((item) => listUpsert(item.id, item)),
      );
      for (const row of rows) {
        if (!excludedIds.has(row.id) && !seenIds.has(row.id)) {
          seenIds.add(row.id);
          candidates.push({ row });
        }
      }

      if (page >= result.value.totalPages) {
        break;
      }
    }

    const ranked = usePopularityFallback
      ? candidates.slice(0, target)
      : [...candidates]
          .sort((a, b) => {
            const scoreDiff =
              overlapScore(a.row.genres ?? undefined, liked) -
              overlapScore(b.row.genres ?? undefined, liked);
            if (scoreDiff !== 0) return -scoreDiff;
            const ratingDiff =
              Number(b.row.externalRating ?? 0) -
              Number(a.row.externalRating ?? 0);
            return ratingDiff;
          })
          .slice(0, target);

    if (ranked.length === 0) {
      return ok({ items: [], hasMore: false });
    }

    const values = ranked.map((candidate, index) => ({
      userId,
      movieId: candidate.row.id,
      reason: usePopularityFallback
        ? "Popular right now"
        : reasonFor(candidate.row.genres ?? undefined, liked),
      rank: index + 1,
    }));

    const insertedRows = await db
      .insert(feedItems)
      .values(values)
      .returning({ id: feedItems.id });

    const items: FeedItem[] = ranked.map((candidate, index) => ({
      feedItemId: insertedRows[index]!.id,
      movie: toMovie(candidate.row),
      reason: values[index]!.reason,
    }));

    trackServer("feed_viewed", userId, { itemCount: items.length });

    return ok({ items, hasMore: ranked.length >= target });
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

/**
 * Likes or dislikes a shown feed item: updates its status and writes the matching `ratings`
 * row (same fixed mapping as a swipe) so future feed generations reflect it. Satisfies AC-7.
 */
export async function engageFeedItem(
  feedItemId: number,
  action: "like" | "dislike",
): Promise<Result<void, DataError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }

  try {
    const item = await db.query.feedItems.findFirst({
      where: eq(feedItems.id, feedItemId),
      with: { movie: true },
    });

    if (!item || item.userId !== session.value.userId) {
      return err("not_found");
    }

    const ratingValue = action === "like" ? "4.5" : "1.0";
    const status = action === "like" ? "liked" : "disliked";

    await db.transaction(async (tx) => {
      await tx
        .update(feedItems)
        .set({ status, respondedAt: new Date().toISOString() })
        .where(eq(feedItems.id, feedItemId));

      await tx
        .insert(ratings)
        .values({
          userId: session.value.userId,
          movieId: item.movieId,
          ratingValue,
          source: "swipe",
        })
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.movieId],
          set: {
            ratingValue,
            source: "swipe",
            updatedAt: new Date().toISOString(),
          },
        });
    });

    trackServer("feed_item_engaged", session.value.userId, {
      movieId: Number(item.movie.externalId),
      action,
    });

    return ok(undefined);
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

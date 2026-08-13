"use server";

import * as Sentry from "@sentry/nextjs";
import { and, eq, getTableColumns, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { movies, ratings } from "@/db/drizzle/schema";
import { requireSession } from "@/auth/session";
import { trackServer } from "@/analytics/server";
import { ok, err, type Result, type DataError } from "@/shared/result";
import { toMovie, type Movie } from "@/movies/catalog-cache";
import { embedText, reportEmbeddingError } from "@/search/openai-client";
import { checkSearchRateLimit } from "@/search/rate-limit";
import {
  blendVectors,
  parseVectorLiteral,
  toVectorLiteral,
  QUERY_WEIGHT,
} from "@/search/vector";
import { browsePopularMovies } from "./movies";

export type SearchError = DataError | "invalid_query" | "rate_limited";

export type SearchResultItem = {
  readonly movie: Movie;
};

export type SearchPage = {
  readonly items: ReadonlyArray<SearchResultItem>;
  readonly hasMore: boolean;
  readonly personalized: boolean;
  readonly usedFallback: boolean;
};

const MAX_QUERY_LENGTH = 200;
const PAGE_SIZE = 20;
const MIN_LIKES_FOR_PERSONALIZATION = 3;
const LIKED_RATING_THRESHOLD = "4";
/** Initial value; tune once real query traffic exists (spec 0009 Follow-up). */
const EMPTY_RESULT_DISTANCE_THRESHOLD = 0.75;

/**
 * Free text vibe search (spec 0009): embeds `query`, blends it with the caller's taste
 * centroid when they have 3 or more liked movies, and ranks the cached, embedded catalog
 * by cosine similarity. Falls back to popularity ranked results when nothing scores within
 * the similarity threshold. Satisfies AC-1, AC-2, AC-3, AC-4, AC-5, AC-7, AC-8.
 */
export async function vibeSearch(
  query: string,
  offset?: number,
): Promise<Result<SearchPage, SearchError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }
  const { userId } = session.value;

  const trimmed = query.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_QUERY_LENGTH) {
    return err("invalid_query");
  }

  if (!checkSearchRateLimit(userId)) {
    return err("rate_limited");
  }

  try {
    const embedResult = await embedText(trimmed);
    if (!embedResult.ok) {
      reportEmbeddingError("vibeSearch", new Error("query embed failed"));
      return err("unknown");
    }
    const queryEmbedding = embedResult.value;

    let rankingVector = queryEmbedding;
    let personalized = false;

    const [likedCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ratings)
      .where(
        and(
          eq(ratings.userId, userId),
          gte(ratings.ratingValue, LIKED_RATING_THRESHOLD),
        ),
      );

    if ((likedCountRow?.count ?? 0) >= MIN_LIKES_FOR_PERSONALIZATION) {
      const [centroidRow] = await db
        .select({
          centroid: sql<string | null>`avg(${movies.embedding})`,
        })
        .from(ratings)
        .innerJoin(movies, eq(ratings.movieId, movies.id))
        .where(
          and(
            eq(ratings.userId, userId),
            gte(ratings.ratingValue, LIKED_RATING_THRESHOLD),
            sql`${movies.embedding} is not null`,
          ),
        );

      if (centroidRow?.centroid) {
        const taste = parseVectorLiteral(centroidRow.centroid);
        rankingVector = blendVectors(queryEmbedding, taste, QUERY_WEIGHT);
        personalized = true;
      }
    }

    const vectorLiteral = toVectorLiteral(rankingVector);
    const start = offset && offset > 0 ? Math.trunc(offset) : 0;

    const rows = await db
      .select({
        ...getTableColumns(movies),
        distance: sql<number>`${movies.embedding} <=> ${vectorLiteral}::vector`,
      })
      .from(movies)
      .where(sql`${movies.embedding} is not null`)
      .orderBy(sql`${movies.embedding} <=> ${vectorLiteral}::vector`)
      .limit(PAGE_SIZE + 1)
      .offset(start);

    const page = rows.slice(0, PAGE_SIZE);
    const hasMore = rows.length > PAGE_SIZE;
    const hasGoodMatch = page.some(
      (row) => row.distance <= EMPTY_RESULT_DISTANCE_THRESHOLD,
    );

    if (start === 0 && !hasGoodMatch) {
      const fallback = await browsePopularMovies(1);
      if (!fallback.ok) {
        return err("unknown");
      }
      trackServer("vibe_search_performed", userId, {
        resultCount: fallback.value.movies.length,
        personalized: false,
        usedFallback: true,
      });
      return ok({
        items: fallback.value.movies.map((movie) => ({ movie })),
        hasMore: false,
        personalized: false,
        usedFallback: true,
      });
    }

    const items = page.map((row) => ({ movie: toMovie(row) }));

    trackServer("vibe_search_performed", userId, {
      resultCount: items.length,
      personalized,
      usedFallback: false,
    });

    return ok({ items, hasMore, personalized, usedFallback: false });
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

/**
 * Likes or dislikes a vibe search result: writes the same `ratings` row shape and
 * `source = "swipe"` mapping `swipeMovie`/`engageFeedItem` already use, so it feeds the
 * same taste profile. Satisfies AC-6.
 */
export async function rateSearchResult(
  movieId: string,
  action: "like" | "dislike",
): Promise<Result<void, DataError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }

  try {
    const movie = await db.query.movies.findFirst({
      where: eq(movies.id, movieId),
    });
    if (!movie) {
      return err("not_found");
    }

    const ratingValue = action === "like" ? "4.5" : "1.0";

    await db
      .insert(ratings)
      .values({
        userId: session.value.userId,
        movieId,
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

    trackServer("search_result_rated", session.value.userId, {
      movieId: Number(movie.externalId),
      action,
    });

    return ok(undefined);
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

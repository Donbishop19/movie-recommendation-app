"use server";

import * as Sentry from "@sentry/nextjs";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles, ratings } from "@/db/drizzle/schema";
import { requireSession } from "@/auth/session";
import { trackServer } from "@/analytics/server";
import { ok, err, type Result, type DataError } from "@/shared/result";
import {
  discoverTmdbPopularMovies,
  clampTmdbPage,
  reportTmdbError,
} from "@/movies/tmdb-client";
import {
  listUpsert,
  findCachedByTmdbId,
  toMovie,
  type Movie,
} from "@/movies/catalog-cache";

export type SwipeDeck = {
  readonly movies: ReadonlyArray<Movie>;
  readonly hasMore: boolean;
};

export type SwipeAction = "like" | "pass";

const SWIPE_RATING_VALUE: Record<SwipeAction, string> = {
  like: "4.5",
  pass: "1.0",
};

const ONBOARDING_SWIPE_COUNT = 10;

/**
 * One page of the onboarding swipe deck: TMDB's popularity feed, cached, with every movie the
 * caller has already rated (of any value or source) filtered out. Satisfies AC-2, AC-9.
 */
export async function getSwipeDeck(
  page?: number,
): Promise<Result<SwipeDeck, DataError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }

  try {
    const requestedPage = clampTmdbPage(page);
    const result = await discoverTmdbPopularMovies(requestedPage);
    if (!result.ok) {
      reportTmdbError("getSwipeDeck", result.error);
      return err("unknown");
    }

    const rows = await Promise.all(
      result.value.results.map((item) => listUpsert(item.id, item)),
    );

    const rowIds = rows.map((row) => row.id);
    const rated =
      rowIds.length === 0
        ? []
        : await db
            .select({ movieId: ratings.movieId })
            .from(ratings)
            .where(
              and(
                eq(ratings.userId, session.value.userId),
                inArray(ratings.movieId, rowIds),
              ),
            );
    const ratedIds = new Set(rated.map((row) => row.movieId));

    const movies = rows.filter((row) => !ratedIds.has(row.id)).map(toMovie);
    return ok({
      movies,
      hasMore: requestedPage < result.value.totalPages,
    });
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

/**
 * Records a like or pass on one movie during onboarding: upserts the `ratings` row (a repeat
 * swipe updates it instead of duplicating, AC-3) and, on the tenth swipe-sourced rating, sets
 * `profiles.onboarding_completed_at` exactly once inside the same transaction. Satisfies AC-2,
 * AC-3.
 */
export async function swipeMovie(
  tmdbId: number,
  action: SwipeAction,
): Promise<Result<{ onboardingComplete: boolean }, DataError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }

  try {
    const movieRow = await findCachedByTmdbId(tmdbId);
    if (!movieRow) {
      return err("not_found");
    }

    const { userId } = session.value;
    const ratingValue = SWIPE_RATING_VALUE[action];

    const { swipeCount, justCompleted } = await db.transaction(async (tx) => {
      await tx
        .insert(ratings)
        .values({ userId, movieId: movieRow.id, ratingValue, source: "swipe" })
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.movieId],
          set: {
            ratingValue,
            source: "swipe",
            updatedAt: new Date().toISOString(),
          },
        });

      const [countRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(ratings)
        .where(and(eq(ratings.userId, userId), eq(ratings.source, "swipe")));
      const swipeCount = countRow?.count ?? 0;

      let justCompleted = false;
      if (swipeCount >= ONBOARDING_SWIPE_COUNT) {
        const [updated] = await tx
          .update(profiles)
          .set({ onboardingCompletedAt: new Date().toISOString() })
          .where(
            and(
              eq(profiles.id, userId),
              isNull(profiles.onboardingCompletedAt),
            ),
          )
          .returning({ id: profiles.id });
        justCompleted = updated !== undefined;
      }

      return { swipeCount, justCompleted };
    });

    if (swipeCount === 1) {
      trackServer("onboarding_started", userId, { method: "swipe" });
    }
    if (justCompleted) {
      trackServer("onboarding_completed", userId, {
        method: "swipe",
        ratedCount: swipeCount,
      });
    }

    return ok({ onboardingComplete: swipeCount >= ONBOARDING_SWIPE_COUNT });
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

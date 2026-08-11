"use server";

import * as Sentry from "@sentry/nextjs";
import { requireSession } from "@/auth/session";
import { trackServer } from "@/analytics/server";
import { ok, err, type Result, type DataError } from "@/shared/result";
import {
  fetchTmdbMovieDetail,
  searchTmdbMovies,
  discoverTmdbPopularMovies,
  clampTmdbPage,
  reportTmdbError,
} from "@/movies/tmdb-client";
import {
  detailUpsert,
  listUpsert,
  findCachedByTmdbId,
  isFreshDetail,
  toMovie,
  type Movie,
} from "@/movies/catalog-cache";

export type { Movie } from "@/movies/catalog-cache";

export type MovieList = {
  readonly movies: ReadonlyArray<Movie>;
  readonly totalPages: number;
};

/**
 * Looks up one movie by its TMDB id. Returns a cached detail hit less than 7 days old as
 * is; otherwise fetches full details (including cast) from TMDB, upserts, and returns the
 * fresh data. Adult flagged titles are treated as not found and never cached.
 */
export async function getOrRefreshMovie(
  tmdbId: number,
): Promise<Result<Movie, DataError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }

  try {
    const existing = await findCachedByTmdbId(tmdbId);
    if (existing && isFreshDetail(existing)) {
      return ok(toMovie(existing));
    }

    const detailResult = await fetchTmdbMovieDetail(tmdbId);
    if (!detailResult.ok) {
      reportTmdbError("getOrRefreshMovie", detailResult.error);
      return err(
        detailResult.error.kind === "not_found" ? "not_found" : "unknown",
      );
    }

    if (detailResult.value.adult) {
      return err("not_found");
    }

    const row = await detailUpsert(tmdbId, detailResult.value);
    return ok(toMovie(row));
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

/**
 * Searches TMDB's live catalog by title, caching every result through the list upsert.
 * Never reads the local cache first; always returns TMDB's own relevance ranking.
 */
export async function searchMovies(
  query: string,
  year?: number,
  page?: number,
): Promise<Result<MovieList, DataError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }

  try {
    const result = await searchTmdbMovies(query, year, clampTmdbPage(page));
    if (!result.ok) {
      reportTmdbError("searchMovies", result.error);
      return err("unknown");
    }

    const rows = await Promise.all(
      result.value.results.map((item) => listUpsert(item.id, item)),
    );
    return ok({
      movies: rows.map(toMovie),
      totalPages: result.value.totalPages,
    });
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

/**
 * One page of TMDB's popularity ranked movies, caching every result through the list
 * upsert. Defaults to page 1.
 */
export async function browsePopularMovies(
  page?: number,
): Promise<Result<MovieList, DataError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }

  try {
    const result = await discoverTmdbPopularMovies(clampTmdbPage(page));
    if (!result.ok) {
      reportTmdbError("browsePopularMovies", result.error);
      return err("unknown");
    }

    const rows = await Promise.all(
      result.value.results.map((item) => listUpsert(item.id, item)),
    );
    const movies = rows.map(toMovie);
    trackServer("movie_catalog_browsed", session.value.userId, {
      resultCount: movies.length,
      page: clampTmdbPage(page),
    });
    return ok({ movies, totalPages: result.value.totalPages });
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

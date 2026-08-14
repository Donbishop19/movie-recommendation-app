import { asc, eq, and, lt } from "drizzle-orm";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/db/client";
import { movies } from "@/db/drizzle/schema";
import { toUndefined } from "@/db/nullable";
import { inngest } from "@/search/inngest-client";
import {
  toAbsoluteTmdbImageUrl,
  type TmdbMovieDetail,
  type TmdbListMovie,
} from "./tmdb-client";

export const TMDB_SOURCE = "tmdb";

const DETAIL_FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000;
const EPOCH = new Date(0).toISOString();

type MovieRow = typeof movies.$inferSelect;

export type StoredCastMember = {
  readonly tmdbId: number;
  readonly name: string;
  readonly character: string;
  readonly profilePath: string | undefined;
};

export type Movie = {
  readonly id: string;
  readonly externalSource: string;
  readonly externalId: string;
  readonly title: string;
  readonly releaseYear: number | undefined;
  readonly synopsis: string | undefined;
  readonly posterUrl: string | undefined;
  readonly genres: ReadonlyArray<string> | undefined;
  readonly castMembers: ReadonlyArray<StoredCastMember> | undefined;
  readonly runtimeMinutes: number | undefined;
  readonly externalRating: string | undefined;
  readonly cachedAt: string;
};

export function toMovie(row: MovieRow): Movie {
  return {
    id: row.id,
    externalSource: row.externalSource,
    externalId: row.externalId,
    title: row.title,
    releaseYear: toUndefined(row.releaseYear),
    synopsis: toUndefined(row.synopsis),
    posterUrl: toUndefined(row.posterUrl),
    genres: toUndefined(row.genres) as ReadonlyArray<string> | undefined,
    castMembers: toUndefined(row.castMembers) as
      ReadonlyArray<StoredCastMember> | undefined,
    runtimeMinutes: toUndefined(row.runtimeMinutes),
    externalRating: toUndefined(row.externalRating),
    cachedAt: row.cachedAt,
  };
}

/** First 4 characters of TMDB's `YYYY-MM-DD` release date; `undefined` for an unreleased title. */
function parseReleaseYear(releaseDate: string): number | undefined {
  if (!releaseDate) {
    return undefined;
  }
  const year = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
}

function toStoredCastMember(
  member: TmdbMovieDetail["cast"][number],
): StoredCastMember {
  return {
    tmdbId: member.tmdbId,
    name: member.name,
    character: member.character,
    profilePath: member.profilePath,
  };
}

/** A cache hit written by a detail fetch (not just search/browse) less than 7 days old. */
export function isFreshDetail(row: MovieRow): boolean {
  return Date.now() - new Date(row.cachedAt).getTime() < DETAIL_FRESHNESS_MS;
}

export function findCachedByTmdbId(
  tmdbId: number,
): Promise<MovieRow | undefined> {
  return db.query.movies.findFirst({
    where: and(
      eq(movies.externalSource, TMDB_SOURCE),
      eq(movies.externalId, String(tmdbId)),
    ),
  });
}

/**
 * Fires the `movie/cached` event for a row with no embedding yet, so the `embedMovie`
 * Inngest function (spec 0009) picks it up asynchronously. Never blocks or fails the
 * caller: a send failure is reported but the cache write it followed already succeeded.
 */
function requestEmbeddingIfMissing(row: MovieRow): void {
  if (row.embedding) {
    return;
  }
  inngest
    .send({ name: "movie/cached", data: { movieId: row.id } })
    .catch((error: unknown) => {
      Sentry.captureException(error, {
        tags: { feature: "vibe-search", action: "sendMovieCachedEvent" },
      });
    });
}

/** Full detail upsert: writes every column and always sets `cached_at = now()`. */
export async function detailUpsert(
  tmdbId: number,
  detail: TmdbMovieDetail,
): Promise<MovieRow> {
  const values = {
    externalSource: TMDB_SOURCE,
    externalId: String(tmdbId),
    title: detail.title,
    releaseYear: parseReleaseYear(detail.releaseDate),
    synopsis: detail.overview,
    posterUrl: toAbsoluteTmdbImageUrl(detail.posterPath),
    genres: [...detail.genres],
    castMembers: detail.cast.map(toStoredCastMember),
    runtimeMinutes: detail.runtimeMinutes,
    externalRating: detail.voteAverage.toFixed(1),
    cachedAt: new Date().toISOString(),
  };

  const [row] = await db
    .insert(movies)
    .values(values)
    .onConflictDoUpdate({
      target: [movies.externalId, movies.externalSource],
      set: values,
    })
    .returning();

  if (!row) {
    throw new Error("Detail upsert returned no row");
  }
  requestEmbeddingIfMissing(row);
  return row;
}

/**
 * List upsert: writes only the fields search/browse responses carry. On insert it seeds
 * `cached_at` to the Unix epoch so the row reads as needing a detail fetch, and seeds `genres`
 * from the list response's `genre_ids` (the only genre signal a list/discover call carries); on
 * conflict it never touches `cached_at`, `genres`, `cast_members`, or `runtime_minutes`, so it
 * can never downgrade a row that already has real detail data.
 */
export async function listUpsert(
  tmdbId: number,
  item: TmdbListMovie,
): Promise<MovieRow> {
  const shared = {
    title: item.title,
    releaseYear: parseReleaseYear(item.releaseDate),
    synopsis: item.overview,
    posterUrl: toAbsoluteTmdbImageUrl(item.posterPath),
    externalRating: item.voteAverage.toFixed(1),
  };

  const [row] = await db
    .insert(movies)
    .values({
      externalSource: TMDB_SOURCE,
      externalId: String(tmdbId),
      cachedAt: EPOCH,
      genres: [...item.genres],
      ...shared,
    })
    .onConflictDoUpdate({
      target: [movies.externalId, movies.externalSource],
      set: shared,
    })
    .returning();

  if (!row) {
    throw new Error("List upsert returned no row");
  }
  requestEmbeddingIfMissing(row);
  return row;
}

/** Marks a row as freshly checked without changing its detail data (a definitive 404). */
export async function touchCachedAt(movieId: string): Promise<void> {
  await db
    .update(movies)
    .set({ cachedAt: new Date().toISOString() })
    .where(eq(movies.id, movieId));
}

/** Up to `limit` rows needing a detail fetch (no detail yet, or detail 7+ days old), oldest first. */
export function rowsNeedingDetailRefresh(limit: number): Promise<MovieRow[]> {
  const staleBefore = new Date(Date.now() - DETAIL_FRESHNESS_MS).toISOString();
  return db.query.movies.findMany({
    where: lt(movies.cachedAt, staleBefore),
    orderBy: asc(movies.cachedAt),
    limit,
  });
}

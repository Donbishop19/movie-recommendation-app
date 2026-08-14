import * as Sentry from "@sentry/nextjs";
import { ok, err, type Result } from "@/shared/result";
import { moviesEnv } from "./env";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const REQUEST_TIMEOUT_MS = 5000;

export type TmdbError =
  | { readonly kind: "not_found" }
  | {
      readonly kind: "transient";
      readonly retryAfterSeconds: number | undefined;
    }
  | { readonly kind: "unknown" };

export type TmdbCastMember = {
  readonly tmdbId: number;
  readonly name: string;
  readonly character: string;
  readonly profilePath: string | undefined;
  readonly order: number;
};

export type TmdbMovieDetail = {
  readonly id: number;
  readonly title: string;
  readonly overview: string;
  readonly releaseDate: string;
  readonly posterPath: string | undefined;
  readonly voteAverage: number;
  readonly adult: boolean;
  readonly genres: ReadonlyArray<string>;
  readonly runtimeMinutes: number | undefined;
  readonly cast: ReadonlyArray<TmdbCastMember>;
};

export type TmdbListMovie = {
  readonly id: number;
  readonly title: string;
  readonly overview: string;
  readonly releaseDate: string;
  readonly posterPath: string | undefined;
  readonly voteAverage: number;
  readonly genres: ReadonlyArray<string>;
};

export type TmdbListResult = {
  readonly results: ReadonlyArray<TmdbListMovie>;
  readonly totalPages: number;
};

/** Clamps a caller supplied page to TMDB's own 1 to 500 page limit. */
export function clampTmdbPage(page: number | undefined): number {
  if (page === undefined || Number.isNaN(page)) {
    return 1;
  }
  return Math.min(500, Math.max(1, Math.trunc(page)));
}

function tmdbFetch(
  path: string,
  params: Record<string, string>,
): Promise<Response> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${moviesEnv.tmdbReadAccessToken}`,
      accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function retryAfterSeconds(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (!header) {
    return undefined;
  }
  const parsed = Number(header);
  return Number.isNaN(parsed) ? undefined : parsed;
}

async function toErrorResult(response: Response): Promise<TmdbError> {
  if (response.status === 404) {
    return { kind: "not_found" };
  }
  if (response.status === 429 || response.status >= 500) {
    return {
      kind: "transient",
      retryAfterSeconds: retryAfterSeconds(response),
    };
  }
  return { kind: "unknown" };
}

type TmdbApiGenre = { readonly id: number; readonly name: string };
type TmdbApiCastMember = {
  readonly id: number;
  readonly name: string;
  readonly character: string;
  readonly profile_path: string | null;
  readonly order: number;
};
type TmdbApiMovieDetail = {
  readonly id: number;
  readonly title: string;
  readonly overview: string;
  readonly release_date: string;
  readonly poster_path: string | null;
  readonly vote_average: number;
  readonly adult: boolean;
  readonly genres: ReadonlyArray<TmdbApiGenre>;
  readonly runtime: number | null;
  readonly credits: { readonly cast: ReadonlyArray<TmdbApiCastMember> };
};
type TmdbApiListMovie = {
  readonly id: number;
  readonly title: string;
  readonly overview: string;
  readonly release_date: string;
  readonly poster_path: string | null;
  readonly vote_average: number;
  readonly genre_ids: ReadonlyArray<number>;
};
type TmdbApiListResponse = {
  readonly results: ReadonlyArray<TmdbApiListMovie>;
  readonly total_pages: number;
};

function toCastMember(member: TmdbApiCastMember): TmdbCastMember {
  return {
    tmdbId: member.id,
    name: member.name,
    character: member.character,
    profilePath: member.profile_path ?? undefined,
    order: member.order,
  };
}

/** Top 10 cast members by billing order, per this feature's spec. */
function topBilledCast(
  cast: ReadonlyArray<TmdbApiCastMember>,
): ReadonlyArray<TmdbCastMember> {
  return [...cast]
    .sort((a, b) => a.order - b.order)
    .slice(0, 10)
    .map(toCastMember);
}

function toListMovie(movie: TmdbApiListMovie): TmdbListMovie {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    releaseDate: movie.release_date,
    posterPath: movie.poster_path ?? undefined,
    voteAverage: movie.vote_average,
    genres: movie.genre_ids
      .map((id) => TMDB_GENRE_NAMES[id])
      .filter((name): name is string => name !== undefined),
  };
}

/** Fetches full detail (including credits) for one TMDB movie by id, no retry. */
export async function fetchTmdbMovieDetail(
  tmdbId: number,
): Promise<Result<TmdbMovieDetail, TmdbError>> {
  try {
    const response = await tmdbFetch(`/movie/${tmdbId}`, {
      append_to_response: "credits",
    });

    if (!response.ok) {
      return err(await toErrorResult(response));
    }

    const data = (await response.json()) as TmdbApiMovieDetail;
    return ok({
      id: data.id,
      title: data.title,
      overview: data.overview,
      releaseDate: data.release_date,
      posterPath: data.poster_path ?? undefined,
      voteAverage: data.vote_average,
      adult: data.adult,
      genres: data.genres.map((genre) => genre.name),
      runtimeMinutes: data.runtime ?? undefined,
      cast: topBilledCast(data.credits.cast),
    });
  } catch {
    return err({ kind: "transient", retryAfterSeconds: undefined });
  }
}

/** Searches TMDB's live catalog by title, excluding adult content, no retry. */
export async function searchTmdbMovies(
  query: string,
  year: number | undefined,
  page: number,
): Promise<Result<TmdbListResult, TmdbError>> {
  try {
    const response = await tmdbFetch("/search/movie", {
      query,
      page: String(page),
      include_adult: "false",
      ...(year !== undefined ? { primary_release_year: String(year) } : {}),
    });

    if (!response.ok) {
      return err(await toErrorResult(response));
    }

    const data = (await response.json()) as TmdbApiListResponse;
    return ok({
      results: data.results.map(toListMovie),
      totalPages: data.total_pages,
    });
  } catch {
    return err({ kind: "transient", retryAfterSeconds: undefined });
  }
}

/** TMDB's popularity ranked discover feed, excluding adult content, no retry. */
export async function discoverTmdbPopularMovies(
  page: number,
): Promise<Result<TmdbListResult, TmdbError>> {
  try {
    const response = await tmdbFetch("/discover/movie", {
      sort_by: "popularity.desc",
      include_adult: "false",
      page: String(page),
    });

    if (!response.ok) {
      return err(await toErrorResult(response));
    }

    const data = (await response.json()) as TmdbApiListResponse;
    return ok({
      results: data.results.map(toListMovie),
      totalPages: data.total_pages,
    });
  } catch {
    return err({ kind: "transient", retryAfterSeconds: undefined });
  }
}

/** TMDB's fixed movie genre id list (`/genre/movie/list`), stable across the catalog. */
export const TMDB_GENRE_IDS: Readonly<Record<string, number>> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 878,
  "TV Movie": 10770,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

/** The inverse of `TMDB_GENRE_IDS`: list endpoints return `genre_ids`, not names. */
const TMDB_GENRE_NAMES: Readonly<Record<number, string>> = Object.fromEntries(
  Object.entries(TMDB_GENRE_IDS).map(([name, id]) => [id, name]),
);

/**
 * TMDB's popularity ranked discover feed filtered to any of the given genre ids (OR match),
 * excluding adult content, no retry. Feeds this feature's genre overlap ranking.
 */
export async function discoverTmdbMoviesByGenres(
  genreIds: ReadonlyArray<number>,
  page: number,
): Promise<Result<TmdbListResult, TmdbError>> {
  try {
    const response = await tmdbFetch("/discover/movie", {
      sort_by: "popularity.desc",
      include_adult: "false",
      with_genres: genreIds.join("|"),
      page: String(page),
    });

    if (!response.ok) {
      return err(await toErrorResult(response));
    }

    const data = (await response.json()) as TmdbApiListResponse;
    return ok({
      results: data.results.map(toListMovie),
      totalPages: data.total_pages,
    });
  } catch {
    return err({ kind: "transient", retryAfterSeconds: undefined });
  }
}

/** Builds TMDB's absolute poster (or cast profile) URL from a relative path. */
export function toAbsoluteTmdbImageUrl(
  path: string | undefined,
): string | undefined {
  return path === undefined
    ? undefined
    : `https://image.tmdb.org/t/p/w500${path}`;
}

/** Reports a TMDB failure to Sentry, never letting one pass silently, per this feature's spec. */
export function reportTmdbError(action: string, error: TmdbError): void {
  Sentry.captureMessage(`TMDB ${action} failed: ${error.kind}`, {
    level: "error",
    tags: { feature: "movie-catalog", action, kind: error.kind },
  });
}

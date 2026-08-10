export type MoviesEnv = {
  readonly tmdbReadAccessToken: string;
  readonly catalogRefreshSecret: string;
};

/** Reads and validates the movie catalog's env vars, failing loudly if any are missing. */
function readMoviesEnv(): MoviesEnv {
  const tmdbReadAccessToken = process.env.TMDB_READ_ACCESS_TOKEN;
  const catalogRefreshSecret = process.env.CATALOG_REFRESH_SECRET;

  if (!tmdbReadAccessToken) {
    throw new Error(
      "Missing required env var TMDB_READ_ACCESS_TOKEN (TMDB's v4 Bearer read access token).",
    );
  }
  if (!catalogRefreshSecret) {
    throw new Error(
      "Missing required env var CATALOG_REFRESH_SECRET (shared secret the refresh job presents to /api/jobs/refresh-catalog).",
    );
  }

  return { tmdbReadAccessToken, catalogRefreshSecret };
}

export const moviesEnv = readMoviesEnv();

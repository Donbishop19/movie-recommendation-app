import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { moviesEnv } from "@/movies/env";
import { fetchTmdbMovieDetail, reportTmdbError } from "@/movies/tmdb-client";
import {
  detailUpsert,
  touchCachedAt,
  rowsNeedingDetailRefresh,
} from "@/movies/catalog-cache";

const BATCH_SIZE = 25;
const MAX_RETRY_DELAY_SECONDS = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A single retry, only when TMDB's 429 carried a `Retry-After` header; no retry otherwise. */
async function fetchDetailWithRetry(tmdbId: number) {
  const first = await fetchTmdbMovieDetail(tmdbId);
  if (
    first.ok ||
    first.error.kind !== "transient" ||
    first.error.retryAfterSeconds === undefined
  ) {
    return first;
  }
  await sleep(
    Math.min(first.error.retryAfterSeconds, MAX_RETRY_DELAY_SECONDS) * 1000,
  );
  return fetchTmdbMovieDetail(tmdbId);
}

/**
 * Refreshes up to 25 `movies` rows needing a detail fetch, oldest first. A successful
 * refresh or a definitive 404 both mark the row as freshly checked; a transient failure
 * leaves it unchanged so it is retried on the next batch. Called hourly by a `pg_cron`/
 * `pg_net` job over a shared secret header, never reachable by an ordinary client request.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = request.headers.get("x-catalog-refresh-secret");
  if (secret !== moviesEnv.catalogRefreshSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rows = await rowsNeedingDetailRefresh(BATCH_SIZE);
  let refreshedCount = 0;

  for (const row of rows) {
    const tmdbId = Number(row.externalId);

    try {
      const result = await fetchDetailWithRetry(tmdbId);

      if (result.ok) {
        // An adult flagged title is never cached with real detail data (AC-9); still mark
        // it freshly checked so it does not dominate every future batch.
        if (result.value.adult) {
          await touchCachedAt(row.id);
        } else {
          await detailUpsert(tmdbId, result.value);
        }
        refreshedCount += 1;
        continue;
      }

      if (result.error.kind === "not_found") {
        await touchCachedAt(row.id);
        refreshedCount += 1;
        continue;
      }

      // Transient failure: cached_at stays unchanged, retried on the next batch or request.
      reportTmdbError("refresh-catalog", result.error);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { feature: "movie-catalog", action: "refresh-catalog" },
      });
    }
  }

  return NextResponse.json({ refreshedCount });
}

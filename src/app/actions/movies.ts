"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { movies } from "@/db/drizzle/schema";
import { toUndefined } from "@/db/nullable";
import { ok, err, type Result, type DataError } from "@/shared/result";

export type MovieCacheInput = {
  readonly externalSource: string;
  readonly externalId: string;
  readonly title: string;
};

export type Movie = {
  readonly id: string;
  readonly externalSource: string;
  readonly externalId: string;
  readonly title: string;
  readonly synopsis: string | undefined;
  readonly posterUrl: string | undefined;
  readonly cachedAt: string;
};

function toMovie(row: typeof movies.$inferSelect): Movie {
  return {
    id: row.id,
    externalSource: row.externalSource,
    externalId: row.externalId,
    title: row.title,
    synopsis: toUndefined(row.synopsis),
    posterUrl: toUndefined(row.posterUrl),
    cachedAt: row.cachedAt,
  };
}

/**
 * Tracer bullet for the data model: reads and writes the `movies` cache through Drizzle
 * end to end. Returns the existing row on a cache hit, otherwise caches and returns a new one.
 */
export async function getOrCacheMovieAction(
  input: MovieCacheInput,
): Promise<Result<Movie, DataError>> {
  try {
    const existing = await db.query.movies.findFirst({
      where: and(
        eq(movies.externalSource, input.externalSource),
        eq(movies.externalId, input.externalId),
      ),
    });

    if (existing) {
      return ok(toMovie(existing));
    }

    const [created] = await db
      .insert(movies)
      .values({
        externalSource: input.externalSource,
        externalId: input.externalId,
        title: input.title,
      })
      .returning();

    if (!created) {
      return err("unknown");
    }

    return ok(toMovie(created));
  } catch {
    return err("unknown");
  }
}

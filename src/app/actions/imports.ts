"use server";

import * as Sentry from "@sentry/nextjs";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  imports,
  importRows,
  movies,
  profiles,
  ratings,
} from "@/db/drizzle/schema";
import { requireSession } from "@/auth/session";
import { isOnboarded } from "@/auth/onboarding";
import { trackServer } from "@/analytics/server";
import { ok, err, type Result, type DataError } from "@/shared/result";
import {
  parseLetterboxdCsv,
  type LetterboxdCsvError,
} from "@/imports/letterboxd-csv";
import {
  matchLetterboxdRow,
  type MatchResult,
} from "@/imports/letterboxd-matching";
import { toMovie, type Movie } from "@/movies/catalog-cache";

export type ImportError = DataError | LetterboxdCsvError;
export type ResolveError = DataError | "invalid_choice";
export type CompleteError = DataError | "no_matched_rows";

export type ImportRowView =
  | {
      readonly id: number;
      readonly rawTitle: string;
      readonly rawYear: number | undefined;
      readonly matchStatus: "matched";
      readonly movie: Movie;
    }
  | {
      readonly id: number;
      readonly rawTitle: string;
      readonly rawYear: number | undefined;
      readonly matchStatus: "ambiguous";
      readonly candidates: ReadonlyArray<Movie>;
    }
  | {
      readonly id: number;
      readonly rawTitle: string;
      readonly rawYear: number | undefined;
      readonly matchStatus: "unmatched";
    };

export type ImportSummary = {
  readonly importId: number;
  readonly totalRows: number;
  readonly matchedCount: number;
  readonly ambiguousCount: number;
  readonly unmatchedCount: number;
  readonly rows: ReadonlyArray<ImportRowView>;
};

export type ResolveChoice = { readonly movieId: string } | "unmatched";

const CSV_ERROR_MESSAGES: Record<LetterboxdCsvError, string> = {
  invalid_file_type: "That file isn't a .csv file.",
  file_too_large: "That file is larger than the 2MB limit.",
  invalid_header:
    "That doesn't look like a Letterboxd ratings export (unexpected columns).",
  empty_file: "That file has no rows to import.",
  row_limit_exceeded:
    "That file has more than 500 rows; split it and import in batches.",
};

type ImportRowRecord = typeof importRows.$inferSelect;

/** Fetches every matched/candidate movie for a batch of import_rows in one query. */
async function buildRowViews(
  rows: ReadonlyArray<ImportRowRecord>,
): Promise<ReadonlyArray<ImportRowView>> {
  const movieIds = new Set<string>();
  for (const row of rows) {
    if (row.matchedMovieId) {
      movieIds.add(row.matchedMovieId);
    }
    for (const id of row.candidateMovieIds ?? []) {
      movieIds.add(id);
    }
  }

  const movieRows =
    movieIds.size > 0
      ? await db.query.movies.findMany({
          where: inArray(movies.id, [...movieIds]),
        })
      : [];
  const movieById = new Map(movieRows.map((row) => [row.id, toMovie(row)]));

  return rows.map((row): ImportRowView => {
    const rawYear = row.rawYear ?? undefined;

    if (row.matchStatus === "matched" && row.matchedMovieId) {
      const movie = movieById.get(row.matchedMovieId);
      if (movie) {
        return {
          id: row.id,
          rawTitle: row.rawTitle,
          rawYear,
          matchStatus: "matched",
          movie,
        };
      }
    }

    if (row.matchStatus === "ambiguous") {
      const candidates = (row.candidateMovieIds ?? [])
        .map((id) => movieById.get(id))
        .filter((movie): movie is Movie => movie !== undefined);
      return {
        id: row.id,
        rawTitle: row.rawTitle,
        rawYear,
        matchStatus: "ambiguous",
        candidates,
      };
    }

    return {
      id: row.id,
      rawTitle: row.rawTitle,
      rawYear,
      matchStatus: "unmatched",
    };
  });
}

/**
 * Parses, validates, and matches an uploaded Letterboxd `ratings.csv`, writing one `imports`
 * row and one `import_rows` row per parsed line, and a `ratings` row for every row that
 * matches immediately. Satisfies AC-2, AC-3, AC-4, AC-6, AC-8, spec 0008.
 */
export async function uploadLetterboxdImport(
  formData: FormData,
): Promise<Result<ImportSummary, ImportError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }
  const { userId } = session.value;

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return err("invalid_file_type");
  }

  try {
    const alreadyOnboarded = await isOnboarded(userId);
    const text = await file.text();
    const parsed = parseLetterboxdCsv(file.name, file.size, text);

    if (!parsed.ok) {
      await db.insert(imports).values({
        userId,
        filename: file.name,
        status: "failed",
        errorMessage: CSV_ERROR_MESSAGES[parsed.error],
      });
      return err(parsed.error);
    }

    const rows = parsed.value;

    const [createdImport] = await db
      .insert(imports)
      .values({
        userId,
        filename: file.name,
        totalRows: rows.length,
        status: "processing",
      })
      .returning({ id: imports.id });
    if (!createdImport) {
      throw new Error("Import insert returned no row");
    }
    const importId = createdImport.id;

    const classified: ReadonlyArray<MatchResult> = await Promise.all(
      rows.map((row) =>
        row.ratingValue === undefined
          ? Promise.resolve<MatchResult>({ status: "unmatched" })
          : matchLetterboxdRow(row.rawTitle, row.rawYear),
      ),
    );

    // Last row per movie wins the ratings write (spec 0002's dedup rule); every row still gets
    // its own import_rows entry regardless.
    const lastRatingByMovie = new Map<string, string>();
    rows.forEach((row, index) => {
      const match = classified[index]!;
      if (match.status === "matched" && row.ratingValue !== undefined) {
        lastRatingByMovie.set(match.movieId, row.ratingValue);
      }
    });

    const matchedCount = classified.filter(
      (m) => m.status === "matched",
    ).length;
    const unmatchedCount = classified.filter(
      (m) => m.status === "unmatched",
    ).length;

    const insertedRows = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(importRows)
        .values(
          rows.map((row, index) => {
            const match = classified[index]!;
            return {
              importId,
              userId,
              rawTitle: row.rawTitle,
              rawYear: row.rawYear ?? null,
              ratingValue: row.ratingValue ?? null,
              matchStatus: match.status,
              matchedMovieId: match.status === "matched" ? match.movieId : null,
              candidateMovieIds:
                match.status === "ambiguous"
                  ? [...match.candidateMovieIds]
                  : null,
            };
          }),
        )
        .returning();

      for (const [movieId, ratingValue] of lastRatingByMovie) {
        await tx
          .insert(ratings)
          .values({ userId, movieId, ratingValue, source: "csv_import" })
          .onConflictDoUpdate({
            target: [ratings.userId, ratings.movieId],
            set: {
              ratingValue,
              source: "csv_import",
              updatedAt: new Date().toISOString(),
            },
          });
      }

      await tx
        .update(imports)
        .set({
          status: "completed",
          matchedCount,
          unmatchedCount,
          completedAt: new Date().toISOString(),
        })
        .where(eq(imports.id, importId));

      return inserted;
    });

    const rowViews = await buildRowViews(insertedRows);

    if (!alreadyOnboarded) {
      trackServer("onboarding_started", userId, { method: "csv_import" });
    }

    return ok({
      importId,
      totalRows: rows.length,
      matchedCount,
      ambiguousCount: rows.length - matchedCount - unmatchedCount,
      unmatchedCount,
      rows: rowViews,
    });
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

/**
 * Reloads an in progress or completed import's review state. Satisfies AC-9 (ownership).
 */
export async function getImportReview(
  importId: number,
): Promise<Result<ImportSummary, DataError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }

  const importRow = await db.query.imports.findFirst({
    where: eq(imports.id, importId),
  });
  if (!importRow || importRow.userId !== session.value.userId) {
    return err("not_found");
  }

  const rows = await db.query.importRows.findMany({
    where: eq(importRows.importId, importId),
  });
  const rowViews = await buildRowViews(rows);
  const ambiguousCount =
    rows.length - importRow.matchedCount - importRow.unmatchedCount;

  return ok({
    importId,
    totalRows: importRow.totalRows,
    matchedCount: importRow.matchedCount,
    ambiguousCount,
    unmatchedCount: importRow.unmatchedCount,
    rows: rowViews,
  });
}

/**
 * Resolves one `ambiguous` row to a chosen candidate movie, or explicitly to `unmatched`.
 * Writes the matching `ratings` row from that row's own stored `rating_value` when resolved
 * to a movie. Satisfies AC-5, spec 0008.
 */
export async function resolveAmbiguousImportRow(
  importRowId: number,
  choice: ResolveChoice,
): Promise<Result<{ matchStatus: "matched" | "unmatched" }, ResolveError>> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }
  const { userId } = session.value;

  try {
    const row = await db.query.importRows.findFirst({
      where: eq(importRows.id, importRowId),
    });
    if (!row || row.userId !== userId) {
      return err("not_found");
    }
    if (row.matchStatus !== "ambiguous") {
      return err("not_found");
    }

    if (choice !== "unmatched") {
      const candidates = row.candidateMovieIds ?? [];
      if (!candidates.includes(choice.movieId)) {
        return err("invalid_choice");
      }
    }

    const newStatus = choice === "unmatched" ? "unmatched" : "matched";
    const matchedMovieId = choice === "unmatched" ? null : choice.movieId;

    await db.transaction(async (tx) => {
      await tx
        .update(importRows)
        .set({
          matchStatus: newStatus,
          matchedMovieId,
          candidateMovieIds: null,
        })
        .where(eq(importRows.id, importRowId));

      if (newStatus === "matched" && matchedMovieId && row.ratingValue) {
        await tx
          .insert(ratings)
          .values({
            userId,
            movieId: matchedMovieId,
            ratingValue: row.ratingValue,
            source: "csv_import",
          })
          .onConflictDoUpdate({
            target: [ratings.userId, ratings.movieId],
            set: {
              ratingValue: row.ratingValue,
              source: "csv_import",
              updatedAt: new Date().toISOString(),
            },
          });
      }

      await tx
        .update(imports)
        .set(
          newStatus === "matched"
            ? { matchedCount: sql`${imports.matchedCount} + 1` }
            : { unmatchedCount: sql`${imports.unmatchedCount} + 1` },
        )
        .where(eq(imports.id, row.importId));
    });

    return ok({ matchStatus: newStatus });
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

/**
 * Finishes CSV import onboarding: sets `profiles.onboarding_completed_at` (once, if this
 * import or any prior activity produced at least one matched row) and fires the completion
 * analytics event. Satisfies AC-7, spec 0008.
 */
export async function completeCsvImport(
  importId: number,
): Promise<
  Result<{ onboardingComplete: boolean; ratedCount: number }, CompleteError>
> {
  const session = await requireSession();
  if (!session.ok) {
    return session;
  }
  const { userId } = session.value;

  try {
    const importRow = await db.query.imports.findFirst({
      where: eq(imports.id, importId),
    });
    if (!importRow || importRow.userId !== userId) {
      return err("not_found");
    }

    if (importRow.matchedCount === 0) {
      return err("no_matched_rows");
    }

    const [updated] = await db
      .update(profiles)
      .set({ onboardingCompletedAt: new Date().toISOString() })
      .where(
        and(eq(profiles.id, userId), isNull(profiles.onboardingCompletedAt)),
      )
      .returning({ id: profiles.id });
    const justCompleted = updated !== undefined;

    if (justCompleted) {
      trackServer("onboarding_completed", userId, {
        method: "csv_import",
        ratedCount: importRow.matchedCount,
      });
    }

    return ok({ onboardingComplete: true, ratedCount: importRow.matchedCount });
  } catch (error) {
    Sentry.captureException(error);
    return err("unknown");
  }
}

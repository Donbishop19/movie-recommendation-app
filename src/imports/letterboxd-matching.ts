import {
  searchTmdbMovies,
  reportTmdbError,
  type TmdbListMovie,
} from "@/movies/tmdb-client";
import { listUpsert } from "@/movies/catalog-cache";

export type MatchResult =
  | { readonly status: "matched"; readonly movieId: string }
  | {
      readonly status: "ambiguous";
      readonly candidateMovieIds: ReadonlyArray<string>;
    }
  | { readonly status: "unmatched" };

const MAX_CANDIDATES = 5;

/** Lowercase, trimmed, punctuation stripped: comparison only, never stored or displayed. */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

async function searchByTitle(
  rawTitle: string,
  year: number | undefined,
): Promise<ReadonlyArray<TmdbListMovie> | undefined> {
  const result = await searchTmdbMovies(rawTitle, year, 1);
  if (!result.ok) {
    reportTmdbError("matchLetterboxdRow", result.error);
    return undefined;
  }
  return result.value.results;
}

function titleMatches(
  results: ReadonlyArray<TmdbListMovie>,
  normalized: string,
): ReadonlyArray<TmdbListMovie> {
  return results
    .filter((item) => normalizeTitle(item.title) === normalized)
    .slice(0, MAX_CANDIDATES);
}

/**
 * Matches one Letterboxd row against the catalog by a live TMDB title and year search
 * (spec 0008, rationale.md "Matching algorithm detail"): a title search with the row's year,
 * falling back to a title only search when the year constrained search finds nothing (Letterboxd's
 * year can differ from TMDB's release year), classified by how many normalized title matches survive.
 * A TMDB failure at any point degrades to `unmatched` rather than throwing (AC-6): one row's
 * transient failure never fails the whole import.
 */
export async function matchLetterboxdRow(
  rawTitle: string,
  rawYear: number | undefined,
): Promise<MatchResult> {
  const normalized = normalizeTitle(rawTitle);
  if (normalized === "") {
    return { status: "unmatched" };
  }

  const firstPass = await searchByTitle(rawTitle, rawYear);
  if (firstPass === undefined) {
    return { status: "unmatched" };
  }

  let matches = titleMatches(firstPass, normalized);

  if (matches.length === 0 && rawYear !== undefined) {
    const secondPass = await searchByTitle(rawTitle, undefined);
    if (secondPass === undefined) {
      return { status: "unmatched" };
    }
    matches = titleMatches(secondPass, normalized);
  }

  if (matches.length === 0) {
    return { status: "unmatched" };
  }

  if (matches.length === 1) {
    const only = matches[0]!;
    const row = await listUpsert(only.id, only);
    return { status: "matched", movieId: row.id };
  }

  const rows = await Promise.all(
    matches.map((item) => listUpsert(item.id, item)),
  );
  return {
    status: "ambiguous",
    candidateMovieIds: rows.map((row) => row.id),
  };
}

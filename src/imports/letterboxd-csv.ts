import Papa from "papaparse";
import { ok, err, type Result } from "@/shared/result";

/** Upload constraints, spec 0008 AC-2. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_ROWS = 500;

const MIN_RATING = 0.5;
const MAX_RATING = 5;

/** Letterboxd's `ratings.csv` header row, in the order Letterboxd exports it. */
const EXPECTED_HEADERS = [
  "Date",
  "Name",
  "Year",
  "Letterboxd URI",
  "Rating",
] as const;

export type LetterboxdCsvError =
  | "invalid_file_type"
  | "file_too_large"
  | "invalid_header"
  | "empty_file"
  | "row_limit_exceeded";

export type LetterboxdCsvRow = {
  readonly rawTitle: string;
  readonly rawYear: number | undefined;
  /** Undefined when the Rating column is missing, not a number, or outside 0.5 to 5 (spec 0008 AC-3). */
  readonly ratingValue: string | undefined;
};

/**
 * Validates and parses a Letterboxd `ratings.csv` upload. Rejects the whole file before any
 * row is processed (spec 0008 AC-2): wrong extension, over the byte or row cap, or a header row
 * that doesn't match Letterboxd's export shape.
 */
export function parseLetterboxdCsv(
  filename: string,
  byteLength: number,
  text: string,
): Result<ReadonlyArray<LetterboxdCsvRow>, LetterboxdCsvError> {
  if (!filename.toLowerCase().endsWith(".csv")) {
    return err("invalid_file_type");
  }
  if (byteLength > MAX_FILE_BYTES) {
    return err("file_too_large");
  }

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const fields = parsed.meta.fields ?? [];
  const hasExpectedHeader = EXPECTED_HEADERS.every((header) =>
    fields.includes(header),
  );
  if (!hasExpectedHeader) {
    return err("invalid_header");
  }
  if (parsed.data.length === 0) {
    return err("empty_file");
  }
  if (parsed.data.length > MAX_ROWS) {
    return err("row_limit_exceeded");
  }

  return ok(parsed.data.map(toLetterboxdCsvRow));
}

function toLetterboxdCsvRow(row: Record<string, string>): LetterboxdCsvRow {
  const rawTitle = (row.Name ?? "").trim();
  const rawYear = parseRawYear(row.Year);
  const ratingValue = parseRatingValue(row.Rating);

  return { rawTitle, rawYear, ratingValue };
}

function parseRawYear(raw: string | undefined): number | undefined {
  const text = (raw ?? "").trim();
  if (text === "") {
    return undefined;
  }
  const year = Number.parseInt(text, 10);
  return Number.isNaN(year) ? undefined : year;
}

/** Letterboxd ratings are always in 0.5 steps; normalized to one decimal for `ratings.rating_value`. */
function parseRatingValue(raw: string | undefined): string | undefined {
  const text = (raw ?? "").trim();
  if (text === "") {
    return undefined;
  }
  const value = Number.parseFloat(text);
  if (Number.isNaN(value) || value < MIN_RATING || value > MAX_RATING) {
    return undefined;
  }
  return value.toFixed(1);
}

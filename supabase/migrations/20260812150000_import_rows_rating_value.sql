-- Adds import_rows.rating_value: a row's parsed Letterboxd star rating, held here so an
-- ambiguous row's rating survives from upload until the user resolves it (the raw uploaded
-- CSV is never stored). Nullable: null on an unmatched row whose rating never parsed.
-- Spec: docs/specs/0008-letterboxd-csv-import-onboarding/index.md

alter table public.import_rows
  add column rating_value numeric(2, 1);

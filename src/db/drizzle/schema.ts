import {
  pgTable,
  pgSchema,
  foreignKey,
  pgPolicy,
  uuid,
  text,
  timestamp,
  index,
  unique,
  integer,
  jsonb,
  numeric,
  vector,
  check,
  bigint,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// auth.users lives outside the public schema drizzle-kit pull introspects; declared minimally
// here (id only) so the profiles -> auth.users foreign key resolves. Supabase, not this app, owns
// auth.users' real shape.
const authSchema = pgSchema("auth");
export const usersInAuth = authSchema.table("users", {
  id: uuid().primaryKey().notNull(),
});

export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey().notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [usersInAuth.id],
      name: "profiles_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("profiles_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(( SELECT auth.uid() AS uid) = id)`,
    }),
    pgPolicy("profiles_update_own", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
    }),
  ],
);

export const movies = pgTable(
  "movies",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    externalId: text("external_id").notNull(),
    externalSource: text("external_source").notNull(),
    title: text().notNull(),
    releaseYear: integer("release_year"),
    synopsis: text(),
    posterUrl: text("poster_url"),
    genres: text().array(),
    castMembers: jsonb("cast_members"),
    runtimeMinutes: integer("runtime_minutes"),
    externalRating: numeric("external_rating", { precision: 3, scale: 1 }),
    embedding: vector({ dimensions: 1536 }),
    cachedAt: timestamp("cached_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    embeddingUpdatedAt: timestamp("embedding_updated_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("movies_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.asc().nullsLast().op("vector_cosine_ops"),
    ),
    unique("movies_external_unique").on(table.externalId, table.externalSource),
    pgPolicy("movies_select_authenticated", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`true`,
    }),
  ],
);

export const ratings = pgTable(
  "ratings",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({
      name: "ratings_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    userId: uuid("user_id").notNull(),
    movieId: uuid("movie_id").notNull(),
    ratingValue: numeric("rating_value", { precision: 2, scale: 1 }).notNull(),
    source: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ratings_movie_id_idx").using(
      "btree",
      table.movieId.asc().nullsLast().op("uuid_ops"),
    ),
    index("ratings_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.movieId],
      foreignColumns: [movies.id],
      name: "ratings_movie_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.id],
      name: "ratings_user_id_fkey",
    }).onDelete("cascade"),
    unique("ratings_user_movie_unique").on(table.userId, table.movieId),
    pgPolicy("ratings_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(( SELECT auth.uid() AS uid) = user_id)`,
    }),
    pgPolicy("ratings_insert_own", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
    }),
    pgPolicy("ratings_update_own", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
    }),
    pgPolicy("ratings_delete_own", {
      as: "permissive",
      for: "delete",
      to: ["authenticated"],
    }),
    check(
      "ratings_source_check",
      sql`source = ANY (ARRAY['swipe'::text, 'csv_import'::text])`,
    ),
    check(
      "ratings_value_range",
      sql`(rating_value >= 0.5) AND (rating_value <= (5)::numeric)`,
    ),
  ],
);

export const imports = pgTable(
  "imports",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({
      name: "imports_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    userId: uuid("user_id").notNull(),
    filename: text(),
    status: text().default("processing").notNull(),
    totalRows: integer("total_rows").default(0).notNull(),
    matchedCount: integer("matched_count").default(0).notNull(),
    unmatchedCount: integer("unmatched_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("imports_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.id],
      name: "imports_user_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("imports_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(( SELECT auth.uid() AS uid) = user_id)`,
    }),
    pgPolicy("imports_insert_own", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
    }),
    pgPolicy("imports_update_own", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
    }),
    pgPolicy("imports_delete_own", {
      as: "permissive",
      for: "delete",
      to: ["authenticated"],
    }),
    check(
      "imports_status_check",
      sql`status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text])`,
    ),
  ],
);

export const importRows = pgTable(
  "import_rows",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({
      name: "import_rows_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    importId: bigint("import_id", { mode: "number" }).notNull(),
    userId: uuid("user_id").notNull(),
    rawTitle: text("raw_title").notNull(),
    rawYear: integer("raw_year"),
    ratingValue: numeric("rating_value", { precision: 2, scale: 1 }),
    matchedMovieId: uuid("matched_movie_id"),
    candidateMovieIds: uuid("candidate_movie_ids").array(),
    matchStatus: text("match_status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("import_rows_import_id_idx").using(
      "btree",
      table.importId.asc().nullsLast().op("int8_ops"),
    ),
    index("import_rows_matched_movie_id_idx").using(
      "btree",
      table.matchedMovieId.asc().nullsLast().op("uuid_ops"),
    ),
    index("import_rows_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.importId],
      foreignColumns: [imports.id],
      name: "import_rows_import_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.matchedMovieId],
      foreignColumns: [movies.id],
      name: "import_rows_matched_movie_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.id],
      name: "import_rows_user_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("import_rows_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(( SELECT auth.uid() AS uid) = user_id)`,
    }),
    pgPolicy("import_rows_insert_own", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
    }),
    pgPolicy("import_rows_update_own", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
    }),
    pgPolicy("import_rows_delete_own", {
      as: "permissive",
      for: "delete",
      to: ["authenticated"],
    }),
    check(
      "import_rows_match_status_check",
      sql`match_status = ANY (ARRAY['matched'::text, 'unmatched'::text, 'ambiguous'::text])`,
    ),
  ],
);

export const feedItems = pgTable(
  "feed_items",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({
      name: "feed_items_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    userId: uuid("user_id").notNull(),
    movieId: uuid("movie_id").notNull(),
    reason: text().notNull(),
    status: text().default("shown").notNull(),
    rank: integer(),
    shownAt: timestamp("shown_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    respondedAt: timestamp("responded_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("feed_items_movie_id_idx").using(
      "btree",
      table.movieId.asc().nullsLast().op("uuid_ops"),
    ),
    index("feed_items_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    index("feed_items_user_shown_at_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("timestamptz_ops"),
      table.shownAt.desc().nullsFirst().op("timestamptz_ops"),
    ),
    foreignKey({
      columns: [table.movieId],
      foreignColumns: [movies.id],
      name: "feed_items_movie_id_fkey",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [profiles.id],
      name: "feed_items_user_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("feed_items_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(( SELECT auth.uid() AS uid) = user_id)`,
    }),
    pgPolicy("feed_items_insert_own", {
      as: "permissive",
      for: "insert",
      to: ["authenticated"],
    }),
    pgPolicy("feed_items_update_own", {
      as: "permissive",
      for: "update",
      to: ["authenticated"],
    }),
    pgPolicy("feed_items_delete_own", {
      as: "permissive",
      for: "delete",
      to: ["authenticated"],
    }),
    check(
      "feed_items_status_check",
      sql`status = ANY (ARRAY['shown'::text, 'liked'::text, 'disliked'::text, 'dismissed'::text])`,
    ),
  ],
);

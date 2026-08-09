import { defineConfig } from "drizzle-kit";

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  throw new Error(
    "Missing required env var DIRECT_URL (direct, non-pooled Supabase Postgres connection string).",
  );
}

// Schema is introspected from the applied SQL migrations in supabase/migrations/ via
// `drizzle-kit pull`, never pushed from here. supabase/migrations/ stays the source of truth;
// `out` is where `pull` writes the generated schema.ts / relations.ts / snapshot.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/drizzle/schema.ts",
  out: "./src/db/drizzle",
  dbCredentials: {
    url: directUrl,
  },
});

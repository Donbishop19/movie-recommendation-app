export type DbEnv = {
  readonly databaseUrl: string;
  readonly directUrl: string;
};

/** Reads and validates the Postgres connection env vars, failing loudly if either is missing. */
function readDbEnv(): DbEnv {
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  if (!databaseUrl) {
    throw new Error(
      "Missing required env var DATABASE_URL (pooled Supabase Postgres connection string, transaction mode).",
    );
  }
  if (!directUrl) {
    throw new Error(
      "Missing required env var DIRECT_URL (direct, non-pooled Supabase Postgres connection string, used only by drizzle-kit).",
    );
  }

  return { databaseUrl, directUrl };
}

export const dbEnv = readDbEnv();

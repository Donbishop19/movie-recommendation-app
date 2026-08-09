import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dbEnv } from "./env";
import * as schema from "./drizzle/schema";
import * as relations from "./drizzle/relations";

// Transaction-mode pooler; the pooler does not support prepared statements.
const queryClient = postgres(dbEnv.databaseUrl, { prepare: false });

/** The Drizzle client for runtime queries against Supabase Postgres via the pooled connection. */
export const db = drizzle(queryClient, { schema: { ...schema, ...relations } });

import { createClient } from "@supabase/supabase-js";
import { authEnv } from "./env";

/**
 * A Supabase Auth Admin client, service role key only, server side use only. Used solely for
 * operations the Auth Admin API owns (e.g. deleting a user), never for regular data access,
 * which goes through `drizzle` per this project's data access boundary.
 */
export function createAdminClient() {
  return createClient(authEnv.supabaseUrl, authEnv.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

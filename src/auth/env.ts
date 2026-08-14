export type AuthEnv = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  readonly siteUrl: string;
};

/** Reads and validates the Supabase Auth env vars, failing loudly if any is missing. */
function readAuthEnv(): AuthEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing required env var NEXT_PUBLIC_SUPABASE_URL.");
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing required env var NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Missing required env var SUPABASE_SERVICE_ROLE_KEY (used server side only, to call the Supabase Auth Admin API, e.g. account deletion).",
    );
  }
  if (!siteUrl) {
    throw new Error("Missing required env var NEXT_PUBLIC_SITE_URL.");
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey, siteUrl };
}

export const authEnv = readAuthEnv();

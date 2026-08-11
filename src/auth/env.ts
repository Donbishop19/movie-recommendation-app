export type AuthEnv = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly siteUrl: string;
};

/** Reads and validates the Supabase Auth env vars, failing loudly if any is missing. */
function readAuthEnv(): AuthEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!supabaseUrl) {
    throw new Error("Missing required env var NEXT_PUBLIC_SUPABASE_URL.");
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing required env var NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!siteUrl) {
    throw new Error("Missing required env var NEXT_PUBLIC_SITE_URL.");
  }

  return { supabaseUrl, supabaseAnonKey, siteUrl };
}

export const authEnv = readAuthEnv();

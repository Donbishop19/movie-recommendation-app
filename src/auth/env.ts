export type AuthEnv = {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
};

/** Reads and validates the Supabase Auth env vars, failing loudly if either is missing. */
function readAuthEnv(): AuthEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing required env var NEXT_PUBLIC_SUPABASE_URL.");
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing required env var NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return { supabaseUrl, supabaseAnonKey };
}

export const authEnv = readAuthEnv();

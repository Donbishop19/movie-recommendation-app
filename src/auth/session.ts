import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ok, err, type Result, type DataError } from "@/shared/result";
import { authEnv } from "./env";

export type Session = {
  readonly userId: string;
};

/** A Supabase Auth server client bound to the current request's cookies. */
async function createSessionClient() {
  const cookieStore = await cookies();

  return createServerClient(authEnv.supabaseUrl, authEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

/**
 * Reads the caller's Supabase Auth session from the request cookies. Every Server
 * Action and Route Handler that touches the movie catalog calls this first and
 * rejects with `unauthorized` on no valid session, per this feature's security model.
 */
export async function requireSession(): Promise<Result<Session, DataError>> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return err("unauthorized");
  }

  return ok({ userId: user.id });
}

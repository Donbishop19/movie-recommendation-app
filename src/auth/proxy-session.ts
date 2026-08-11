import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authEnv } from "@/auth/env";
import { isOnboarded } from "@/auth/onboarding";

const PROTECTED_PATHS = new Set(["/onboarding", "/feed"]);
const AUTH_PATH = "/signin";

/**
 * Refreshes the Supabase session cookie on every gated request (per Supabase's own SSR
 * pattern: `getClaims()` re-validates and re-issues the token), then enforces this feature's
 * route gating: signed out on `/onboarding` or `/feed` goes to `/signin` (AC-8); signed in
 * lands on `/onboarding` or `/feed` based on `profiles.onboarding_completed_at` (AC-1).
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    authEnv.supabaseUrl,
    authEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not run code between createServerClient and getClaims(): re-ordering this can make
  // users randomly logged out (Supabase's own SSR guidance).
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const { pathname } = request.nextUrl;

  if (!userId) {
    if (PROTECTED_PATHS.has(pathname)) {
      return NextResponse.redirect(new URL(AUTH_PATH, request.url));
    }
    return response;
  }

  const onboarded = await isOnboarded(userId);
  const destination = onboarded ? "/feed" : "/onboarding";

  if (pathname === AUTH_PATH) {
    return NextResponse.redirect(new URL(destination, request.url));
  }
  if (PROTECTED_PATHS.has(pathname) && pathname !== destination) {
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return response;
}

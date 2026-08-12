import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authEnv } from "@/auth/env";
import { isOnboarded } from "@/auth/onboarding";

const AUTH_PATH = "/signin";
/** Spec 0008 AC-8: an already onboarded user must still be able to reach this one route, to re-import. */
const REIMPORT_PATH = "/onboarding/import";

/** `/onboarding` and every onboarding sub-route (`/onboarding/swipe`, `/onboarding/import`, …), plus `/feed`. */
function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/feed" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/")
  );
}

/** Whether `pathname` already is (or is a sub-route of) the given onboarding/feed destination. */
function isAtDestination(
  pathname: string,
  destination: "/feed" | "/onboarding",
): boolean {
  if (destination === "/feed") {
    return pathname === "/feed";
  }
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

/**
 * Refreshes the Supabase session cookie on every gated request (per Supabase's own SSR
 * pattern: `getClaims()` re-validates and re-issues the token), then enforces this feature's
 * route gating: signed out on `/onboarding` or `/feed` goes to `/signin` (spec 0006 AC-8);
 * signed in lands on `/onboarding` or `/feed` based on `profiles.onboarding_completed_at`
 * (spec 0006 AC-1), except `/onboarding/import` stays reachable even once onboarded, so a
 * user can re-import a Letterboxd CSV at any time (spec 0008 AC-8).
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
    if (isProtectedPath(pathname)) {
      return NextResponse.redirect(new URL(AUTH_PATH, request.url));
    }
    return response;
  }

  const onboarded = await isOnboarded(userId);
  const destination = onboarded ? "/feed" : "/onboarding";

  if (pathname === AUTH_PATH) {
    return NextResponse.redirect(new URL(destination, request.url));
  }
  const reimportingWhileOnboarded =
    destination === "/feed" && pathname === REIMPORT_PATH;
  if (
    isProtectedPath(pathname) &&
    !isAtDestination(pathname, destination) &&
    !reimportingWhileOnboarded
  ) {
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return response;
}

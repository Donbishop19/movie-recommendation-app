import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/auth/session";
import { isOnboarded } from "@/auth/onboarding";

/**
 * Exchanges a Google OAuth code for a session, then routes to `/onboarding` or `/feed` based
 * on the caller's onboarding status. AC-10: denial or failure returns to `/signin` with a
 * message and creates no partial account.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError || !code) {
    return NextResponse.redirect(`${origin}/signin?error=oauth_denied`);
  }

  try {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      Sentry.captureException(
        error ?? new Error("No user after code exchange"),
      );
      return NextResponse.redirect(`${origin}/signin?error=oauth_denied`);
    }

    const onboarded = await isOnboarded(data.user.id);
    return NextResponse.redirect(
      `${origin}${onboarded ? "/feed" : "/onboarding"}`,
    );
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.redirect(`${origin}/signin?error=oauth_denied`);
  }
}

import type { NextRequest } from "next/server";
import { updateSession } from "@/auth/proxy-session";

/**
 * Route gating for `/signin`, `/onboarding` (and its sub-routes), `/feed`, `/search`, and
 * `/account`. AC-1, AC-8 of spec 0006; extended to `/onboarding/swipe` and `/onboarding/import`
 * by spec 0008 AC-1, to `/search` by spec 0009 AC-8, and to `/account` by spec 0010 AC-1.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/signin",
    "/onboarding",
    "/onboarding/:path*",
    "/feed",
    "/search",
    "/account",
  ],
};

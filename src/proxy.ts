import type { NextRequest } from "next/server";
import { updateSession } from "@/auth/proxy-session";

/** Route gating for `/signin`, `/onboarding`, and `/feed` (AC-1, AC-8), spec 0006. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/signin", "/onboarding", "/feed"],
};

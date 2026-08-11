import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { profiles } from "@/db/drizzle/schema";

/** Whether the given user has completed swipe or CSV import onboarding. */
export async function isOnboarded(userId: string): Promise<boolean> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { onboardingCompletedAt: true },
  });
  return profile?.onboardingCompletedAt != null;
}

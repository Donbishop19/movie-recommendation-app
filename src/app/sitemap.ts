import type { MetadataRoute } from "next";
import { authEnv } from "@/auth/env";

/** Public, indexable routes only; signed in surfaces (feed, search, onboarding, account) are excluded. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = authEnv.siteUrl;

  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/signin`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}

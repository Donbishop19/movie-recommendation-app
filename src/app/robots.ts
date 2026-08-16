import type { MetadataRoute } from "next";
import { authEnv } from "@/auth/env";

/** Keeps signed in only surfaces out of the crawl and points crawlers at the sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/feed", "/search", "/account", "/onboarding", "/api/"],
    },
    sitemap: `${authEnv.siteUrl}/sitemap.xml`,
  };
}

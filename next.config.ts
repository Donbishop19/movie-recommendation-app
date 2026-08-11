import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const posthogHost = process.env.POSTHOG_HOST;
if (!posthogHost) {
  throw new Error(
    "Missing required env var POSTHOG_HOST (PostHog ingestion host, e.g. https://us.i.posthog.com).",
  );
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        port: "",
        pathname: "/t/p/**",
        search: "",
      },
    ],
  },
  // Proxies the client PostHog SDK's requests through this app's own domain (AC-6):
  // the browser never calls PostHog's domain directly, which keeps ad blockers from
  // silently dropping client side events.
  async rewrites() {
    return [
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`,
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

// Minimal Sentry wrapping: no SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN configured yet,
// so source map upload is skipped until those are added.
export default withSentryConfig(nextConfig, {
  silent: true,
});

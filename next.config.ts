import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {/* config options here */};

// Minimal Sentry wrapping: no SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN configured yet,
// so source map upload is skipped until those are added.
export default withSentryConfig(nextConfig, {
  silent: true,
});

export type ObservabilityEnv = {
  readonly sentryDsn: string;
};

/** Reads and validates the Sentry env var, failing loudly if missing. */
function readObservabilityEnv(): ObservabilityEnv {
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    throw new Error(
      "Missing required env var SENTRY_DSN (used by @sentry/nextjs to report errors).",
    );
  }

  return { sentryDsn };
}

export const observabilityEnv = readObservabilityEnv();

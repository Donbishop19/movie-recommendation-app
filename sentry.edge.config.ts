import * as Sentry from "@sentry/nextjs";
import { observabilityEnv } from "@/observability/env";

Sentry.init({
  dsn: observabilityEnv.sentryDsn,
  tracesSampleRate: 1,
});

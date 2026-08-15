import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1,
  });
} else {
  console.error(
    "Missing NEXT_PUBLIC_SENTRY_DSN: client side error reporting is disabled.",
  );
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

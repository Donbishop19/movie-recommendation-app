export type SearchEnv = {
  readonly openaiApiKey: string;
  readonly inngestEventKey: string;
  readonly inngestSigningKey: string;
};

/** Reads and validates vibe search's env vars, failing loudly if any are missing. */
function readSearchEnv(): SearchEnv {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const inngestEventKey = process.env.INNGEST_EVENT_KEY;
  const inngestSigningKey = process.env.INNGEST_SIGNING_KEY;

  if (!openaiApiKey) {
    throw new Error(
      "Missing required env var OPENAI_API_KEY (used to embed vibe search queries and movies).",
    );
  }
  if (!inngestEventKey) {
    throw new Error(
      "Missing required env var INNGEST_EVENT_KEY (used to send events to Inngest, e.g. movie/cached).",
    );
  }
  if (!inngestSigningKey) {
    throw new Error(
      "Missing required env var INNGEST_SIGNING_KEY (used by Inngest to verify calls to /api/inngest).",
    );
  }

  return { openaiApiKey, inngestEventKey, inngestSigningKey };
}

export const searchEnv = readSearchEnv();

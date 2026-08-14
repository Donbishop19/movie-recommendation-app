import OpenAI from "openai";
import * as Sentry from "@sentry/nextjs";
import { ok, err, type Result } from "@/shared/result";
import { searchEnv } from "./env";

/** The embedding model spec 0001 committed to; vector(1536) on `movies.embedding` is sized for it. */
export const EMBEDDING_MODEL = "text-embedding-3-small";
const REQUEST_TIMEOUT_MS = 8000;

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: searchEnv.openaiApiKey,
      timeout: REQUEST_TIMEOUT_MS,
    });
  }
  return client;
}

export type EmbedError = "unknown";

/** Embeds one piece of text with `text-embedding-3-small`; used for both a query and a movie. */
export async function embedText(
  text: string,
): Promise<Result<number[], EmbedError>> {
  try {
    const response = await getClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      return err("unknown");
    }
    return ok(embedding);
  } catch {
    return err("unknown");
  }
}

/** Reports an embedding failure to Sentry, matching `reportTmdbError`'s shape for the catalog. */
export function reportEmbeddingError(action: string, error: unknown): void {
  Sentry.captureMessage(`OpenAI embedding ${action} failed`, {
    level: "error",
    tags: { feature: "vibe-search", action },
    extra: { error: error instanceof Error ? error.message : String(error) },
  });
}

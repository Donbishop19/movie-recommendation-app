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

export type EmbedError =
  | { readonly kind: "quota_exceeded" }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "transient" }
  | { readonly kind: "unknown" };

/** True for errors that will fail again on retry (bad/exhausted credentials), never transient ones. */
export function isPermanentEmbedError(error: EmbedError): boolean {
  return error.kind === "quota_exceeded" || error.kind === "unauthorized";
}

function classifyOpenAiError(error: unknown): EmbedError {
  if (error instanceof OpenAI.APIError) {
    if (error.code === "insufficient_quota") {
      return { kind: "quota_exceeded" };
    }
    if (error.status === 401 || error.status === 403) {
      return { kind: "unauthorized" };
    }
    if (
      error.status === 429 ||
      (error.status !== undefined && error.status >= 500)
    ) {
      return { kind: "transient" };
    }
  }
  return { kind: "unknown" };
}

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
      return err({ kind: "unknown" });
    }
    return ok(embedding);
  } catch (error) {
    return err(classifyOpenAiError(error));
  }
}

/** Reports an embedding failure to Sentry, matching `reportTmdbError`'s shape for the catalog. */
export function reportEmbeddingError(action: string, error: EmbedError): void {
  Sentry.captureMessage(`OpenAI embedding ${action} failed: ${error.kind}`, {
    level: "error",
    tags: { feature: "vibe-search", action, kind: error.kind },
  });
}

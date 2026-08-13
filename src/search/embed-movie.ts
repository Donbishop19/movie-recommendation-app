import { eq } from "drizzle-orm";
import { staticSchema } from "inngest";
import { db } from "@/db/client";
import { movies } from "@/db/drizzle/schema";
import { embedText, reportEmbeddingError } from "./openai-client";
import { inngest } from "./inngest-client";

/** Compile time only typing for the `movie/cached` event's data; no runtime validation. */
const movieCachedSchema = staticSchema<{ movieId: string }>();

/** Title, synopsis, and genres joined into one embedding input (spec 0009's chosen shape). */
function embeddingInputText(row: {
  readonly title: string;
  readonly synopsis: string | null;
  readonly genres: string[] | null;
}): string {
  const parts = [row.title, row.synopsis ?? "", (row.genres ?? []).join(", ")];
  return parts.filter(Boolean).join(". ");
}

/**
 * Embeds one movie's title, synopsis, and genres and writes `movies.embedding` plus
 * `embedding_updated_at`. Triggered by a `movie/cached` event whenever a movie is cached
 * without an embedding yet (spec 0009, AC-9). A throw inside a step lets Inngest retry;
 * a row simply stays un-embedded, and so invisible to vibe search, until the next attempt.
 */
export const embedMovie = inngest.createFunction(
  {
    id: "embed-movie",
    triggers: { event: "movie/cached", schema: movieCachedSchema },
    retries: 3,
  },
  async ({ event, step }) => {
    const { movieId } = event.data;

    const row = await step.run("load-movie", () =>
      db.query.movies.findFirst({ where: eq(movies.id, movieId) }),
    );

    if (!row || row.embedding) {
      return { skipped: true as const };
    }

    const embedding = await step.run("embed", async () => {
      const result = await embedText(embeddingInputText(row));
      if (!result.ok) {
        reportEmbeddingError("embedMovie", new Error(`movie ${movieId}`));
        throw new Error("Embedding call failed, Inngest will retry");
      }
      return result.value;
    });

    await step.run("write-embedding", () =>
      db
        .update(movies)
        .set({ embedding, embeddingUpdatedAt: new Date().toISOString() })
        .where(eq(movies.id, movieId)),
    );

    return { embedded: true as const };
  },
);

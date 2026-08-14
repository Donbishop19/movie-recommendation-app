import { serve } from "inngest/next";
import { inngest } from "@/search/inngest-client";
import { embedMovie } from "@/search/embed-movie";

/** Inngest's own serve endpoint; verified by the SDK against `INNGEST_SIGNING_KEY`. */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [embedMovie],
});

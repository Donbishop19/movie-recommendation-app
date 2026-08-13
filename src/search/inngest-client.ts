import { Inngest } from "inngest";
import { searchEnv } from "./env";

/** The project's single Inngest client, first wired up by vibe search (spec 0009). */
export const inngest = new Inngest({
  id: "movie-recommendation-app",
  eventKey: searchEnv.inngestEventKey,
  signingKey: searchEnv.inngestSigningKey,
});

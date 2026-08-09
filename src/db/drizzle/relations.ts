import { relations } from "drizzle-orm/relations";
import {
  usersInAuth,
  profiles,
  movies,
  ratings,
  imports,
  importRows,
  feedItems,
} from "./schema";

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [profiles.id],
    references: [usersInAuth.id],
  }),
  ratings: many(ratings),
  imports: many(imports),
  importRows: many(importRows),
  feedItems: many(feedItems),
}));

export const usersInAuthRelations = relations(usersInAuth, ({ many }) => ({
  profiles: many(profiles),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  movie: one(movies, {
    fields: [ratings.movieId],
    references: [movies.id],
  }),
  profile: one(profiles, {
    fields: [ratings.userId],
    references: [profiles.id],
  }),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  ratings: many(ratings),
  importRows: many(importRows),
  feedItems: many(feedItems),
}));

export const importsRelations = relations(imports, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [imports.userId],
    references: [profiles.id],
  }),
  importRows: many(importRows),
}));

export const importRowsRelations = relations(importRows, ({ one }) => ({
  import: one(imports, {
    fields: [importRows.importId],
    references: [imports.id],
  }),
  movie: one(movies, {
    fields: [importRows.matchedMovieId],
    references: [movies.id],
  }),
  profile: one(profiles, {
    fields: [importRows.userId],
    references: [profiles.id],
  }),
}));

export const feedItemsRelations = relations(feedItems, ({ one }) => ({
  movie: one(movies, {
    fields: [feedItems.movieId],
    references: [movies.id],
  }),
  profile: one(profiles, {
    fields: [feedItems.userId],
    references: [profiles.id],
  }),
}));

/**
 * The single source of truth for every analytics event this app can fire. Every
 * property here is an id, a count, a boolean, or a fixed set of named categories,
 * never raw personal data (email, name, free text), per this feature's PII policy.
 */
export type AnalyticsEventMap = {
  readonly onboarding_started: {
    readonly method: "swipe" | "csv_import";
  };
  readonly onboarding_completed: {
    readonly method: "swipe" | "csv_import";
    readonly ratedCount: number;
  };
  readonly feed_viewed: {
    readonly itemCount: number;
  };
  readonly feed_item_engaged: {
    readonly movieId: number;
    readonly action: "like" | "dislike" | "save" | "detail_view";
  };
  readonly movie_catalog_browsed: {
    readonly resultCount: number;
    readonly page: number;
  };
};

export type EventName = keyof AnalyticsEventMap;

export type EventProperties<E extends EventName> = AnalyticsEventMap[E];

-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"external_source" text NOT NULL,
	"title" text NOT NULL,
	"release_year" integer,
	"synopsis" text,
	"poster_url" text,
	"genres" text[],
	"cast_members" jsonb,
	"runtime_minutes" integer,
	"external_rating" numeric(3, 1),
	"embedding" vector(1536),
	"cached_at" timestamp with time zone DEFAULT now() NOT NULL,
	"embedding_updated_at" timestamp with time zone,
	CONSTRAINT "movies_external_unique" UNIQUE("external_id","external_source")
);
--> statement-breakpoint
ALTER TABLE "movies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ratings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"rating_value" numeric(2, 1) NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_user_movie_unique" UNIQUE("user_id","movie_id"),
	CONSTRAINT "ratings_source_check" CHECK (source = ANY (ARRAY['swipe'::text, 'csv_import'::text])),
	CONSTRAINT "ratings_value_range" CHECK ((rating_value >= 0.5) AND (rating_value <= (5)::numeric))
);
--> statement-breakpoint
ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "imports" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "imports_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"filename" text,
	"status" text DEFAULT 'processing' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"matched_count" integer DEFAULT 0 NOT NULL,
	"unmatched_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error_message" text,
	CONSTRAINT "imports_status_check" CHECK (status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text]))
);
--> statement-breakpoint
ALTER TABLE "imports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "import_rows_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"import_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"raw_title" text NOT NULL,
	"raw_year" integer,
	"matched_movie_id" uuid,
	"candidate_movie_ids" uuid[],
	"match_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_rows_match_status_check" CHECK (match_status = ANY (ARRAY['matched'::text, 'unmatched'::text, 'ambiguous'::text]))
);
--> statement-breakpoint
ALTER TABLE "import_rows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feed_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "feed_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'shown' NOT NULL,
	"rank" integer,
	"shown_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "feed_items_status_check" CHECK (status = ANY (ARRAY['shown'::text, 'liked'::text, 'disliked'::text, 'dismissed'::text]))
);
--> statement-breakpoint
ALTER TABLE "feed_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imports" ADD CONSTRAINT "imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_matched_movie_id_fkey" FOREIGN KEY ("matched_movie_id") REFERENCES "public"."movies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movies_embedding_hnsw_idx" ON "movies" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "ratings_movie_id_idx" ON "ratings" USING btree ("movie_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ratings_user_id_idx" ON "ratings" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "imports_user_id_idx" ON "imports" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "import_rows_import_id_idx" ON "import_rows" USING btree ("import_id" int8_ops);--> statement-breakpoint
CREATE INDEX "import_rows_matched_movie_id_idx" ON "import_rows" USING btree ("matched_movie_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "import_rows_user_id_idx" ON "import_rows" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "feed_items_movie_id_idx" ON "feed_items" USING btree ("movie_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "feed_items_user_id_idx" ON "feed_items" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "feed_items_user_shown_at_idx" ON "feed_items" USING btree ("user_id" timestamptz_ops,"shown_at" timestamptz_ops);--> statement-breakpoint
CREATE POLICY "profiles_select_own" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = id));--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "movies_select_authenticated" ON "movies" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "ratings_select_own" ON "ratings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id));--> statement-breakpoint
CREATE POLICY "ratings_insert_own" ON "ratings" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "ratings_update_own" ON "ratings" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "ratings_delete_own" ON "ratings" AS PERMISSIVE FOR DELETE TO "authenticated";--> statement-breakpoint
CREATE POLICY "imports_select_own" ON "imports" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id));--> statement-breakpoint
CREATE POLICY "imports_insert_own" ON "imports" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "imports_update_own" ON "imports" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "imports_delete_own" ON "imports" AS PERMISSIVE FOR DELETE TO "authenticated";--> statement-breakpoint
CREATE POLICY "import_rows_select_own" ON "import_rows" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id));--> statement-breakpoint
CREATE POLICY "import_rows_insert_own" ON "import_rows" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "import_rows_update_own" ON "import_rows" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "import_rows_delete_own" ON "import_rows" AS PERMISSIVE FOR DELETE TO "authenticated";--> statement-breakpoint
CREATE POLICY "feed_items_select_own" ON "feed_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id));--> statement-breakpoint
CREATE POLICY "feed_items_insert_own" ON "feed_items" AS PERMISSIVE FOR INSERT TO "authenticated";--> statement-breakpoint
CREATE POLICY "feed_items_update_own" ON "feed_items" AS PERMISSIVE FOR UPDATE TO "authenticated";--> statement-breakpoint
CREATE POLICY "feed_items_delete_own" ON "feed_items" AS PERMISSIVE FOR DELETE TO "authenticated";
*/
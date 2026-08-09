-- Core data model: profiles, movies, ratings, imports, import_rows, feed_items
-- Spec: docs/specs/0002-data-model/index.md

-- ============================================================================
-- Extensions
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ============================================================================
-- Tables
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  external_source text not null,
  title text not null,
  release_year integer,
  synopsis text,
  poster_url text,
  genres text[],
  cast_members jsonb,
  runtime_minutes integer,
  external_rating numeric(3, 1),
  embedding vector(1536),
  cached_at timestamptz not null default now(),
  embedding_updated_at timestamptz,
  constraint movies_external_unique unique (external_source, external_id)
);

create table public.ratings (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  movie_id uuid not null references public.movies (id) on delete restrict,
  rating_value numeric(2, 1) not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ratings_user_movie_unique unique (user_id, movie_id),
  constraint ratings_value_range check (rating_value >= 0.5 and rating_value <= 5),
  constraint ratings_source_check check (source in ('swipe', 'csv_import'))
);

create table public.imports (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  filename text,
  status text not null default 'processing',
  total_rows integer not null default 0,
  matched_count integer not null default 0,
  unmatched_count integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  constraint imports_status_check check (status in ('processing', 'completed', 'failed'))
);

create table public.import_rows (
  id bigint generated always as identity primary key,
  import_id bigint not null references public.imports (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  raw_title text not null,
  raw_year integer,
  matched_movie_id uuid references public.movies (id) on delete restrict,
  candidate_movie_ids uuid[],
  match_status text not null,
  created_at timestamptz not null default now(),
  constraint import_rows_match_status_check check (match_status in ('matched', 'unmatched', 'ambiguous'))
);

create table public.feed_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  movie_id uuid not null references public.movies (id) on delete restrict,
  reason text not null,
  status text not null default 'shown',
  rank integer,
  shown_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint feed_items_status_check check (status in ('shown', 'liked', 'disliked', 'dismissed'))
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Foreign key indexes (every FK column, per the project's Postgres best practices)
create index ratings_user_id_idx on public.ratings (user_id);
create index ratings_movie_id_idx on public.ratings (movie_id);
create index imports_user_id_idx on public.imports (user_id);
create index import_rows_import_id_idx on public.import_rows (import_id);
create index import_rows_user_id_idx on public.import_rows (user_id);
create index import_rows_matched_movie_id_idx on public.import_rows (matched_movie_id);
create index feed_items_user_id_idx on public.feed_items (user_id);
create index feed_items_movie_id_idx on public.feed_items (movie_id);

-- Feed dedup lookup: "don't repeat what was shown recently" at feed generation time
create index feed_items_user_shown_at_idx on public.feed_items (user_id, shown_at desc);

-- Vibe search similarity index. HNSW (cosine distance) is the default here since it needs
-- no upfront list-count tuning, unlike ivfflat, and movies are cached incrementally rather
-- than bulk loaded. Vibe search (spec 9, see spec 0002's Follow-up) owns revisiting this
-- index type and its tuning once real query patterns exist.
create index movies_embedding_hnsw_idx on public.movies
  using hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- updated_at maintenance
-- ============================================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create trigger ratings_set_updated_at
  before update on public.ratings
  for each row
  execute function public.set_updated_at();

-- ============================================================================
-- profiles row creation on signup
-- ============================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================================
-- Row level security: enabled and forced, deny by default, on every table
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.movies enable row level security;
alter table public.movies force row level security;
alter table public.ratings enable row level security;
alter table public.ratings force row level security;
alter table public.imports enable row level security;
alter table public.imports force row level security;
alter table public.import_rows enable row level security;
alter table public.import_rows force row level security;
alter table public.feed_items enable row level security;
alter table public.feed_items force row level security;

-- profiles: owner can read and update their own row; no client role inserts or deletes
-- (the signup trigger, security definer, owns creation; auth.users cascade owns deletion)
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- movies: shared catalog cache, authenticated read only; all writes go through the
-- service role (Server Actions, Route Handlers, Inngest/pg_cron jobs), which bypasses RLS
create policy movies_select_authenticated on public.movies
  for select to authenticated
  using (true);

-- ratings: owner scoped on every command
create policy ratings_select_own on public.ratings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ratings_insert_own on public.ratings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ratings_update_own on public.ratings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ratings_delete_own on public.ratings
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- imports: owner scoped on every command
create policy imports_select_own on public.imports
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy imports_insert_own on public.imports
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy imports_update_own on public.imports
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy imports_delete_own on public.imports
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- import_rows: owner scoped directly on its own denormalized user_id (not an exists
-- join against imports), so the policy stays a single indexed lookup on large imports
create policy import_rows_select_own on public.import_rows
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy import_rows_insert_own on public.import_rows
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy import_rows_update_own on public.import_rows
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy import_rows_delete_own on public.import_rows
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- feed_items: owner scoped on every command
create policy feed_items_select_own on public.feed_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy feed_items_insert_own on public.feed_items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy feed_items_update_own on public.feed_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy feed_items_delete_own on public.feed_items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =============================================================================
-- Cycling Training Planner — initial schema
--
-- Apply with one of:
--   • Supabase Studio  → SQL Editor → paste this file → Run
--   • Supabase CLI     → put as supabase/migrations/<timestamp>_init.sql and run
--                        `supabase db push`
--   • psql             → psql "$DATABASE_URL" -f supabase/migrations.sql
--
-- Row-Level Security is enabled on every table. Every policy isolates rows by
-- auth.uid() = user_id. The service-role key (used only on the FastAPI server)
-- bypasses RLS, so backend sync code can write on behalf of users.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- profiles  — one row per Supabase Auth user
-- =============================================================================
create table if not exists public.profiles (
    id           uuid primary key references auth.users on delete cascade,
    display_name text,
    created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
    on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
    on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
    on public.profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row when a new auth.users entry is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name',
            new.email
        )
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =============================================================================
-- oauth_connections  — Strava & Whoop tokens, encrypted at rest (Fernet)
-- =============================================================================
create table if not exists public.oauth_connections (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references auth.users on delete cascade,
    provider          text not null check (provider in ('strava', 'whoop')),
    access_token      text not null,   -- Fernet ciphertext
    refresh_token     text not null,   -- Fernet ciphertext
    expires_at        timestamptz,
    scope             text,
    provider_user_id  text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique (user_id, provider)
);

create index if not exists oauth_connections_user_idx
    on public.oauth_connections (user_id);

alter table public.oauth_connections enable row level security;

drop policy if exists "oauth_owner_all" on public.oauth_connections;
create policy "oauth_owner_all"
    on public.oauth_connections for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- =============================================================================
-- routes  — hand-drawn (Mapbox) or GPX-imported polylines
-- =============================================================================
create table if not exists public.routes (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references auth.users on delete cascade,
    name              text not null,
    distance_km       numeric not null check (distance_km >= 0),
    elevation_gain_m  numeric not null default 0 check (elevation_gain_m >= 0),
    geojson           jsonb not null,
    source            text not null check (source in ('drawn', 'gpx')),
    created_at        timestamptz not null default now()
);

create index if not exists routes_user_idx on public.routes (user_id);

alter table public.routes enable row level security;

drop policy if exists "routes_owner_all" on public.routes;
create policy "routes_owner_all"
    on public.routes for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- =============================================================================
-- activities  — Strava activities (planned sessions match against these)
--
-- IMPORTANT (Strava TOS):
--   • Strava data MAY ONLY be shown to its owner. RLS enforces this.
--   • Strava data MUST NEVER feed an AI/ML model. Any future smart-adjustment
--     feature must use Whoop or manual input instead.
-- =============================================================================
create table if not exists public.activities (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references auth.users on delete cascade,
    strava_id         bigint not null,
    name              text not null,
    type              text not null,
    start_date        timestamptz not null,
    distance_km       numeric not null check (distance_km >= 0),
    moving_time_s     integer not null check (moving_time_s >= 0),
    elevation_gain_m  numeric not null default 0,
    average_speed_kmh numeric,
    average_hr        numeric,
    max_hr            numeric,
    polyline          text,
    raw               jsonb,
    synced_at         timestamptz not null default now(),
    unique (user_id, strava_id)
);

create index if not exists activities_user_date_idx
    on public.activities (user_id, start_date desc);

alter table public.activities enable row level security;

drop policy if exists "activities_owner_all" on public.activities;
create policy "activities_owner_all"
    on public.activities for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- =============================================================================
-- planned_sessions  — the user's training plan
-- =============================================================================
create table if not exists public.planned_sessions (
    id                     uuid primary key default gen_random_uuid(),
    user_id                uuid not null references auth.users on delete cascade,
    date                   date not null,
    type                   text not null check (
        type in ('endurance', 'intervals', 'recovery', 'rest', 'race', 'other')
    ),
    title                  text not null,
    description            text,
    target_distance_km     numeric check (target_distance_km is null or target_distance_km >= 0),
    target_duration_min    integer check (target_duration_min is null or target_duration_min >= 0),
    target_tss             integer check (target_tss is null or target_tss >= 0),
    route_id               uuid references public.routes on delete set null,
    completed_activity_id  uuid references public.activities on delete set null,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now()
);

create index if not exists planned_sessions_user_date_idx
    on public.planned_sessions (user_id, date);

alter table public.planned_sessions enable row level security;

drop policy if exists "planned_sessions_owner_all" on public.planned_sessions;
create policy "planned_sessions_owner_all"
    on public.planned_sessions for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Keep updated_at in sync on every UPDATE.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists planned_sessions_touch_updated on public.planned_sessions;
create trigger planned_sessions_touch_updated
    before update on public.planned_sessions
    for each row execute function public.touch_updated_at();

drop trigger if exists oauth_connections_touch_updated on public.oauth_connections;
create trigger oauth_connections_touch_updated
    before update on public.oauth_connections
    for each row execute function public.touch_updated_at();

-- =============================================================================
-- whoop_metrics  — one row per (user, date) with recovery, HRV, strain, sleep
-- =============================================================================
create table if not exists public.whoop_metrics (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references auth.users on delete cascade,
    date                date not null,
    recovery_score      integer check (recovery_score is null or (recovery_score between 0 and 100)),
    hrv_ms              numeric,
    resting_hr          numeric,
    strain              numeric,
    sleep_performance   numeric,
    sleep_duration_min  integer,
    raw                 jsonb,
    synced_at           timestamptz not null default now(),
    unique (user_id, date)
);

create index if not exists whoop_metrics_user_date_idx
    on public.whoop_metrics (user_id, date desc);

alter table public.whoop_metrics enable row level security;

drop policy if exists "whoop_metrics_owner_all" on public.whoop_metrics;
create policy "whoop_metrics_owner_all"
    on public.whoop_metrics for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

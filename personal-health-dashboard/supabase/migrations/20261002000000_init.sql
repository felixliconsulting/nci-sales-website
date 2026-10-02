-- Personal Health Dashboard — core schema + RLS
-- Apply in order. Requires pgcrypto for checksums/gen_random_uuid.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums / helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- source_connections
-- ---------------------------------------------------------------------------

create table if not exists public.source_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('oura', 'garmin', 'motivation', 'craft')),
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connected', 'error', 'expired')),
  scopes text[] not null default '{}',
  last_sync_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source)
);

create trigger source_connections_updated_at
before update on public.source_connections
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- oauth_tokens (server-only; revoke browser grants)
-- ---------------------------------------------------------------------------

create table if not exists public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('oura', 'garmin')),
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source)
);

create trigger oauth_tokens_updated_at
before update on public.oauth_tokens
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- raw_ingest_events
-- ---------------------------------------------------------------------------

create table if not exists public.raw_ingest_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  external_id text,
  captured_at timestamptz not null default now(),
  payload jsonb not null,
  checksum text not null,
  parser_version text not null default '1',
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'rejected', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

create unique index if not exists raw_ingest_events_user_source_checksum_uidx
  on public.raw_ingest_events (user_id, source, checksum);

create index if not exists raw_ingest_events_user_captured_idx
  on public.raw_ingest_events (user_id, captured_at desc);

-- ---------------------------------------------------------------------------
-- activity_sessions
-- ---------------------------------------------------------------------------

create table if not exists public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  external_id text,
  started_at_utc timestamptz not null,
  local_date date not null,
  sport text,
  duration_sec integer,
  distance_m numeric,
  pace_sec_per_km numeric,
  elevation_m numeric,
  avg_hr integer,
  max_hr integer,
  training_load numeric,
  raw_event_id uuid references public.raw_ingest_events (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create index if not exists activity_sessions_user_local_date_idx
  on public.activity_sessions (user_id, local_date desc);

create trigger activity_sessions_updated_at
before update on public.activity_sessions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sleep_daily
-- ---------------------------------------------------------------------------

create table if not exists public.sleep_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  external_id text,
  sleep_date date not null,
  total_sleep_sec integer,
  time_in_bed_sec integer,
  efficiency numeric,
  score numeric,
  resting_hr numeric,
  hrv numeric,
  raw_event_id uuid references public.raw_ingest_events (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, sleep_date)
);

create trigger sleep_daily_updated_at
before update on public.sleep_daily
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- readiness_daily
-- ---------------------------------------------------------------------------

create table if not exists public.readiness_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  external_id text,
  local_date date not null,
  readiness numeric,
  body_battery numeric,
  stress numeric,
  raw_event_id uuid references public.raw_ingest_events (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, local_date)
);

create trigger readiness_daily_updated_at
before update on public.readiness_daily
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- motivation_checkins
-- ---------------------------------------------------------------------------

create table if not exists public.motivation_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  motivation integer not null check (motivation between 1 and 10),
  energy integer not null check (energy between 1 and 10),
  soreness integer not null check (soreness between 1 and 10),
  confidence integer not null check (confidence between 1 and 10),
  note text,
  tags text[] not null default '{}',
  asked_at timestamptz,
  answered_at timestamptz not null default now(),
  capture_source text not null default 'app'
    check (capture_source in ('grokbot', 'app', 'craft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);

create trigger motivation_checkins_updated_at
before update on public.motivation_checkins
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- daily_features
-- ---------------------------------------------------------------------------

create table if not exists public.daily_features (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  has_sleep boolean not null default false,
  has_readiness boolean not null default false,
  has_activity boolean not null default false,
  has_motivation boolean not null default false,
  sleep_total_sec integer,
  sleep_efficiency numeric,
  sleep_score numeric,
  sleep_hrv numeric,
  readiness numeric,
  activity_load numeric,
  activity_duration_sec integer,
  motivation integer,
  energy integer,
  soreness integer,
  confidence integer,
  prev_sleep_total_sec integer,
  prev_activity_load numeric,
  rolling_sleep_7d numeric,
  rolling_load_7d numeric,
  rolling_motivation_7d numeric,
  weekday smallint,
  tags text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);

create trigger daily_features_updated_at
before update on public.daily_features
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- insight_snapshots
-- ---------------------------------------------------------------------------

create table if not exists public.insight_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_key text not null,
  method text not null,
  window_start date not null,
  window_end date not null,
  sample_size integer not null,
  missing_rate numeric,
  effect numeric,
  uncertainty numeric,
  direction text,
  caveat text not null,
  details jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists insight_snapshots_user_generated_idx
  on public.insight_snapshots (user_id, generated_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.source_connections enable row level security;
alter table public.oauth_tokens enable row level security;
alter table public.raw_ingest_events enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.sleep_daily enable row level security;
alter table public.readiness_daily enable row level security;
alter table public.motivation_checkins enable row level security;
alter table public.daily_features enable row level security;
alter table public.insight_snapshots enable row level security;

-- Browser-readable health tables: owner only
create policy source_connections_owner on public.source_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy raw_ingest_events_owner_select on public.raw_ingest_events
  for select using (auth.uid() = user_id);

create policy activity_sessions_owner on public.activity_sessions
  for select using (auth.uid() = user_id);

create policy sleep_daily_owner on public.sleep_daily
  for select using (auth.uid() = user_id);

create policy readiness_daily_owner on public.readiness_daily
  for select using (auth.uid() = user_id);

create policy motivation_checkins_owner on public.motivation_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy daily_features_owner on public.daily_features
  for select using (auth.uid() = user_id);

create policy insight_snapshots_owner on public.insight_snapshots
  for select using (auth.uid() = user_id);

-- Server ingestion uses the service role; grant it explicitly.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;

-- oauth_tokens: NO policies for authenticated/anon — service role only
revoke all on public.oauth_tokens from anon, authenticated;
grant all on public.oauth_tokens to service_role;

-- raw inserts from browser not allowed; service role / server only for ingest writes
revoke insert, update, delete on public.raw_ingest_events from anon, authenticated;
revoke insert, update, delete on public.activity_sessions from anon, authenticated;
revoke insert, update, delete on public.sleep_daily from anon, authenticated;
revoke insert, update, delete on public.readiness_daily from anon, authenticated;
revoke insert, update, delete on public.daily_features from anon, authenticated;
revoke insert, update, delete on public.insight_snapshots from anon, authenticated;

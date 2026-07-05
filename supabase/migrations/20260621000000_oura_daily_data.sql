-- Oura daily summary data synced from the Oura Ring API v2.
-- Rows are upserted by (user_id, day) each time the user triggers a sync.
-- Tokens are never stored here; they live in connected_oura_accounts (server-only).

create table if not exists public.oura_daily_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  oura_user_id text,
  day date not null,

  -- Extracted scores (null if Oura did not return data for that day)
  readiness_score smallint,
  sleep_score smallint,
  activity_score smallint,
  steps integer,
  resting_heart_rate integer,
  average_hrv integer,

  -- Full API response payloads for forward-compatibility
  raw_readiness_json jsonb,
  raw_sleep_json jsonb,
  raw_activity_json jsonb,

  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, day)
);

alter table public.oura_daily_data enable row level security;

-- No client-facing RLS policies.
-- All reads and writes go through server routes that use the Supabase service role key.

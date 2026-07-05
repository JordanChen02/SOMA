-- Oura OAuth V2 connection storage.
-- Tokens are encrypted by the Next.js server before insertion and are never exposed to clients.

create table if not exists public.connected_oura_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  oura_user_id text,
  connected boolean not null default false,
  scopes text[] not null default '{}',
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.connected_oura_accounts enable row level security;

-- No client-facing RLS policies are defined intentionally.
-- Server route handlers use the Supabase service role to read/write encrypted tokens.

-- Run this in the Supabase SQL editor to set up the database

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text not null,
  last_name text not null,
  gym_location text,
  training_frequency text not null default '',
  injuries text,
  coach_sharing_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

-- User goals
create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  goal text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- Journal entries
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  entry_date date not null,
  goal text not null,
  answers jsonb not null default '{}',
  completion_status text not null default 'missed',
  created_at timestamptz not null default now(),
  unique(user_id, entry_date, goal)
);

-- Coach links
create table public.coach_links (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles on delete cascade not null,
  coach_id uuid references public.profiles on delete cascade not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(client_id, coach_id)
);

-- Coach notes
create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.journal_entries on delete cascade not null,
  coach_id uuid references public.profiles on delete cascade not null,
  note text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.journal_entries enable row level security;
alter table public.coach_links enable row level security;
alter table public.coach_notes enable row level security;

-- profiles: own row only
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- user_goals: own rows only
create policy "Users can manage own goals" on public.user_goals for all using (auth.uid() = user_id);

-- journal_entries: own rows, plus coaches can read linked clients
create policy "Users can manage own entries" on public.journal_entries for all using (auth.uid() = user_id);
create policy "Coaches can read client entries" on public.journal_entries for select using (
  exists (
    select 1 from public.coach_links cl
    join public.profiles p on p.id = cl.client_id
    where cl.coach_id = auth.uid()
      and cl.client_id = journal_entries.user_id
      and cl.is_active = true
      and p.coach_sharing_enabled = true
  )
);

-- coach_links: coaches see their own links
create policy "Coaches can see their links" on public.coach_links for select using (auth.uid() = coach_id or auth.uid() = client_id);
create policy "Admins can manage links" on public.coach_links for all using (auth.uid() = coach_id);

-- coach_notes: coaches can insert, clients can read on their own entries
create policy "Coaches can insert notes" on public.coach_notes for insert with check (auth.uid() = coach_id);
create policy "Coaches can read own notes" on public.coach_notes for select using (auth.uid() = coach_id);
create policy "Clients can read notes on their entries" on public.coach_notes for select using (
  exists (
    select 1 from public.journal_entries je
    where je.id = coach_notes.entry_id and je.user_id = auth.uid()
  )
);

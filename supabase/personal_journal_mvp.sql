-- Personal Fitness Journal MVP tables.
-- Run after schema.sql. These tables avoid trainer/client requirements and
-- support the Edgeboard personal journal UI.

create table if not exists public.personal_journal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  log_date date not null default current_date,
  log_type text not null check (log_type in ('workout', 'weight', 'meal_photo', 'progress_photo', 'measurement', 'note', 'goal')),
  title text not null,
  subtitle text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  goal_tags text[] not null default '{}',
  notes text not null default '',
  favorite boolean not null default false,
  last_used date,
  times_used integer not null default 0,
  activities jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_journal_preferences (
  user_id uuid references public.profiles on delete cascade primary key,
  focus_goals text[] not null default '{}',
  tracked_activities text[] not null default '{}',
  visible_measurements text[] not null default '{}',
  daily_goals jsonb not null default '[]',
  targets jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.personal_journal_logs enable row level security;
alter table public.workout_templates enable row level security;
alter table public.user_journal_preferences enable row level security;

create policy "Users manage own personal logs" on public.personal_journal_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own workout templates" on public.workout_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own journal preferences" on public.user_journal_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

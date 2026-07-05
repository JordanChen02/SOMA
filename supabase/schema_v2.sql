-- Run this AFTER schema.sql to add trainer/client platform tables

-- Add account_type to profiles
alter table public.profiles add column if not exists account_type text not null default 'client';
-- 'trainer' | 'client'

-- Measurements
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles on delete cascade not null,
  trainer_id uuid references public.profiles on delete cascade not null,
  measured_at date not null default current_date,
  neck numeric,
  chest numeric,
  left_bicep numeric,
  right_bicep numeric,
  left_forearm numeric,
  right_forearm numeric,
  waist numeric,
  hips numeric,
  left_thigh numeric,
  right_thigh numeric,
  left_calf numeric,
  right_calf numeric,
  body_weight numeric,
  body_fat_pct numeric,
  notes text,
  created_at timestamptz not null default now()
);

-- Assessments (Overhead Squat)
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles on delete cascade not null,
  trainer_id uuid references public.profiles on delete cascade not null,
  assessed_at date not null default current_date,
  compensations jsonb not null default '[]',
  -- array of strings from the checklist
  trainer_notes text,
  follow_up text,
  created_at timestamptz not null default now()
);

-- Workout logs
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles on delete cascade not null,
  trainer_id uuid references public.profiles,
  logged_at date not null default current_date,
  title text not null,
  exercises jsonb not null default '[]',
  -- [{name, sets:[{reps,weight,rpe}], notes}]
  coach_note text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Calendar events
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles on delete cascade not null,
  trainer_id uuid references public.profiles,
  event_date date not null,
  event_type text not null,
  -- 'workout'|'rest'|'assessment'|'measurement'|'cardio'|'custom'
  title text not null,
  status text not null default 'scheduled',
  -- 'scheduled'|'completed'|'missed'|'rest'|'assessment'
  workout_log_id uuid references public.workout_logs,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Calendar change log
create table if not exists public.calendar_changes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.calendar_events on delete cascade not null,
  changed_by uuid references public.profiles not null,
  change_description text not null,
  created_at timestamptz not null default now()
);

-- Client info (sessions, renewal)
create table if not exists public.client_info (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles on delete cascade unique not null,
  trainer_id uuid references public.profiles on delete cascade not null,
  sessions_remaining integer not null default 0,
  renewal_date date,
  resubscription_date date,
  last_session_date date,
  status text not null default 'active',
  -- 'active'|'renew_soon'|'out_of_sessions'|'inactive'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exercise library
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  subcategory text,
  primary_muscles text[],
  equipment text[],
  difficulty text,
  instructions text,
  video_url text,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.measurements enable row level security;
alter table public.assessments enable row level security;
alter table public.workout_logs enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_changes enable row level security;
alter table public.client_info enable row level security;
alter table public.exercises enable row level security;

-- measurements: trainer can CRUD, client can read own
create policy "Trainer manages measurements" on public.measurements for all using (auth.uid() = trainer_id);
create policy "Client reads own measurements" on public.measurements for select using (auth.uid() = client_id);

-- assessments: trainer can CRUD, client can read own
create policy "Trainer manages assessments" on public.assessments for all using (auth.uid() = trainer_id);
create policy "Client reads own assessments" on public.assessments for select using (auth.uid() = client_id);

-- workout_logs: trainer can CRUD, client can read+update own
create policy "Trainer manages workout logs" on public.workout_logs for all using (auth.uid() = trainer_id);
create policy "Client reads own workout logs" on public.workout_logs for select using (auth.uid() = client_id);
create policy "Client updates completion" on public.workout_logs for update using (auth.uid() = client_id);

-- calendar_events: trainer can CRUD, client can read own + update status
create policy "Trainer manages calendar" on public.calendar_events for all using (auth.uid() = trainer_id);
create policy "Client reads own calendar" on public.calendar_events for select using (auth.uid() = client_id);
create policy "Client updates event status" on public.calendar_events for update using (auth.uid() = client_id);

-- client_info: trainer can CRUD, client can read own
create policy "Trainer manages client info" on public.client_info for all using (auth.uid() = trainer_id);
create policy "Client reads own info" on public.client_info for select using (auth.uid() = client_id);

-- calendar_changes: linked users can read
create policy "Read calendar changes" on public.calendar_changes for select using (
  exists (select 1 from public.calendar_events ce where ce.id = calendar_changes.event_id
    and (ce.trainer_id = auth.uid() or ce.client_id = auth.uid()))
);
create policy "Insert calendar changes" on public.calendar_changes for insert with check (auth.uid() = changed_by);

-- exercises: anyone can read, trainers can create
create policy "Anyone reads exercises" on public.exercises for select using (true);
create policy "Trainers create exercises" on public.exercises for insert with check (auth.uid() = created_by);

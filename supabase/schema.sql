-- ============================================================
-- Speak Easy — Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable uuid extension
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------
-- profiles
-- One row per authenticated user, created automatically
-- ----------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile row on new user sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------
-- user_goals
-- Practice targets set in Settings
-- ----------------------------------------------------------
create table if not exists public.user_goals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  target_wpm          int not null default 140,
  sessions_per_week   int not null default 3,
  minutes_per_session int not null default 10,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id)
);

alter table public.user_goals enable row level security;

create policy "Users can manage their own goals"
  on public.user_goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------
-- practice_sessions
-- One row per completed (or in-progress) session
-- ----------------------------------------------------------
create table if not exists public.practice_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  topic        text not null,
  prep_seconds int not null default 0,
  speech_seconds int not null default 0,
  word_count   int,
  wpm          numeric(6,2),
  completed_at timestamptz not null default now()
);

alter table public.practice_sessions enable row level security;

create policy "Users can manage their own sessions"
  on public.practice_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------
-- Handy view: weekly actuals (current ISO week)
-- ----------------------------------------------------------
create or replace view public.weekly_actuals as
select
  user_id,
  count(*)                                      as sessions_completed,
  coalesce(sum(speech_seconds) / 60.0, 0)      as minutes_practiced,
  coalesce(avg(wpm), 0)                         as avg_wpm
from public.practice_sessions
where completed_at >= date_trunc('week', now())
group by user_id;

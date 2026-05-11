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

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
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

drop policy if exists "Users can manage their own goals" on public.user_goals;
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
  final_wpm    numeric(6,2),
  audio_url    text,
  transcribed_text text,
  transcription_status text not null default 'not_requested',
  transcription_error text,
  completed_at timestamptz not null default now()
);

alter table public.practice_sessions add column if not exists final_wpm numeric(6,2);
alter table public.practice_sessions add column if not exists audio_url text;
alter table public.practice_sessions add column if not exists transcribed_text text;
alter table public.practice_sessions add column if not exists transcription_status text not null default 'not_requested';
alter table public.practice_sessions add column if not exists transcription_error text;
alter table public.practice_sessions add column if not exists analysis_json jsonb;

alter table public.practice_sessions enable row level security;

drop policy if exists "Users can manage their own sessions" on public.practice_sessions;
create policy "Users can manage their own sessions"
  on public.practice_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'practice_sessions_transcription_status_check'
  ) then
    alter table public.practice_sessions
      add constraint practice_sessions_transcription_status_check
      check (transcription_status in ('not_requested', 'pending', 'ready', 'failed'));
  end if;
end;
$$;

-- ----------------------------------------------------------
-- Storage: session-audio bucket
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'session-audio',
  'session-audio',
  false,
  52428800,
  array['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4']
)
on conflict (id) do nothing;

drop policy if exists "Users can upload own session audio" on storage.objects;
create policy "Users can upload own session audio"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'session-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can read own session audio" on storage.objects;
create policy "Users can read own session audio"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'session-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own session audio" on storage.objects;
create policy "Users can delete own session audio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'session-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------
-- Handy view: weekly actuals (current ISO week)
-- ----------------------------------------------------------
create or replace view public.weekly_actuals as
select
  user_id,
  count(*)                                      as sessions_completed,
  coalesce(sum(speech_seconds) / 60.0, 0)      as minutes_practiced,
  coalesce(avg(coalesce(final_wpm, wpm)), 0)    as avg_wpm
from public.practice_sessions
where completed_at >= date_trunc('week', now())
group by user_id;

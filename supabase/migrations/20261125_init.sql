-- Quasy sync, stage 1: tables + Row Level Security. Run once in Supabase → SQL Editor.
-- Every row belongs to one signed-in user; nobody (not even signed-out visitors) can read anyone else's rows.
-- No camera video, frames or landmarks are ever stored: only the numbers the app already saves.

-- Profile (name, weight, avatar path). One row per account.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  weight_kg real check (weight_kg is null or weight_kg between 20 and 300),
  photo_path text check (photo_path is null or char_length(photo_path) <= 200),
  updated_at timestamptz not null default now()
);

-- Workouts. id = the UUID the phone creates (crypto.randomUUID), so a retried upload never duplicates.
create table public.workouts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  elapsed_ms integer not null check (elapsed_ms >= 0),
  active_ms integer not null check (active_ms >= 0),
  total_jumps integer not null check (total_jumps >= 0),
  avg_jpm real not null,
  max_jpm real not null,
  max_streak integer not null check (max_streak >= 0),
  calories real not null,
  target integer,
  planned_ms integer,
  weight_kg real,
  benchmark_ms integer check (benchmark_ms is null or benchmark_ms in (60000, 180000)),
  lost_breaks integer not null default 0,
  tracking_loss_ms integer not null default 0,
  log jsonb not null, -- { jumps: number[], trips: number[], pauses: number[] } on the workout clock (ms)
  has_tricks boolean not null default false, -- false = saved before trick recognition existed ("no data", not "0 tricks")
  updated_at timestamptz not null default now(),
  deleted_at timestamptz -- soft delete, so other devices learn about it
);
create index workouts_user_updated_idx on public.workouts (user_id, updated_at);

-- Recognized trick runs (beta). Natural key prevents duplicates.
create table public.trick_events (
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trick_id text not null check (
    trick_id in ('jogging-step', 'side-straddle', 'skier', 'can-can', 'criss-cross', 'side-swing', 'pushup-fake', 'butt-bounce')
  ),
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null check (end_ms >= start_ms),
  score real not null check (score between 0 and 1),
  primary key (workout_id, trick_id, start_ms)
);
create index trick_events_user_idx on public.trick_events (user_id);

-- Learning status set by the user in the Trick Library. Separate from detection on purpose.
create table public.trick_mastery (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trick_id text not null check (char_length(trick_id) <= 40),
  status text not null check (status in ('not-started', 'learning', 'mastered')),
  updated_at timestamptz not null default now(),
  primary key (user_id, trick_id)
);

-- updated_at is set by the server, so "changed since my last sync" works across devices.
create function public.touch_updated_at() returns trigger language plpgsql
set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before insert or update on public.profiles for each row execute function public.touch_updated_at();
create trigger workouts_touch before insert or update on public.workouts for each row execute function public.touch_updated_at();
create trigger trick_mastery_touch before insert or update on public.trick_mastery for each row execute function public.touch_updated_at();

-- Row Level Security: on for every table, own rows only.
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.trick_events enable row level security;
alter table public.trick_mastery enable row level security;

create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own workouts" on public.workouts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- a trick event must belong to the user AND to one of the user's own workouts
create policy "own trick events" on public.trick_events for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
  );

create policy "own mastery" on public.trick_mastery for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- API access: signed-in users only. Signed-out visitors (anon) get nothing.
revoke all on public.profiles, public.workouts, public.trick_events, public.trick_mastery from anon;
grant select, insert, update, delete on public.profiles, public.workouts, public.trick_events, public.trick_mastery to authenticated;

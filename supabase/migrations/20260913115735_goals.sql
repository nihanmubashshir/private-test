-- Goals (US-012). One number, tracked against one thing. Progress is always derived, never stored.

create type public.goal_kind as enum ('target', 'streak');

-- The things a goal can point at. The draft used a polymorphic subject_type + subject_id with no
-- foreign key; there is no tracker table here (roadmap D1), so the built-in trackers are enum
-- values and a workout is a real FK -- deleting an exercise cannot leave a goal pointing at nothing.
create type public.goal_subject as enum ('weight', 'running', 'gym', 'workout');

create type public.goal_status as enum ('active', 'paused', 'completed');

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind public.goal_kind not null,
  subject public.goal_subject not null,
  workout_id uuid references public.workouts(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),

  -- kind = 'target'
  target_value numeric(8, 2) check (target_value is null or target_value > 0),
  -- Where a bidirectional target started, so losing weight fills the bar instead of emptying it.
  start_value numeric(8, 2),
  -- For a workout target: which best-set measure counts.
  target_metric text check (target_metric is null or target_metric in ('weight', 'reps', 'volume')),

  -- kind = 'streak'
  target_count int check (target_count is null or target_count between 1 and 365),
  -- Trailing window in days; null means "in a row".
  window_days int check (window_days is null or window_days between 1 and 365),

  status public.goal_status not null default 'active',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint goals_workout_subject check ((subject = 'workout') = (workout_id is not null)),
  constraint goals_target_fields check (kind <> 'target' or target_value is not null),
  constraint goals_target_subjects check (kind <> 'target' or subject in ('weight', 'workout')),
  constraint goals_workout_target_metric check (
    not (kind = 'target' and subject = 'workout') or target_metric is not null
  ),
  constraint goals_streak_fields check (kind <> 'streak' or target_count is not null),
  constraint goals_streak_fits_window check (window_days is null or target_count is null or target_count <= window_days),
  constraint goals_completed_at check ((status = 'completed') = (completed_at is not null))
);

create index goals_owner_status on public.goals (owner_id, status);

create trigger goals_set_updated_at before update on public.goals
  for each row execute function private.set_updated_at();

alter table public.goals enable row level security;

create policy "owner can do everything" on public.goals for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "require aal2" on public.goals as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

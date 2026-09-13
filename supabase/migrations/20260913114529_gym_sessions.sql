-- Gym sessions and their sets (US-011).
--
-- gym_sessions follows the timed-entity template (overview §6.3) exactly, so it plugs straight into
-- the global stopwatch registry (US-003): Home's recent activity, the mini "still running" bar and
-- the elapsed-time maths all work without a line of gym-specific code. That is why this is a real
-- timed entity rather than a session table with a denormalised activity row beside it.
create table public.gym_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,                                         -- null while running
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  duration_seconds integer generated always as
    (floor(extract(epoch from (ended_at - started_at)))::integer) stored,

  -- Entity-specific columns, after time_zone per the template.
  --
  -- on delete set null + a copied name: deleting a plan must never destroy training history, so the
  -- session keeps the day's name even once the day it came from is gone.
  plan_day_id uuid references public.plan_days(id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  note text check (note is null or char_length(note) between 1 and 500),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_sessions_ends_after_start check (ended_at is null or ended_at > started_at),
  constraint gym_sessions_no_overlap exclude using gist (
    owner_id with =,
    tstzrange(started_at, coalesce(ended_at, 'infinity'::timestamptz), '[)') with &&
  )
);

create unique index gym_sessions_one_running on public.gym_sessions (owner_id) where ended_at is null;
create index gym_sessions_owner_started on public.gym_sessions (owner_id, started_at desc);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references public.gym_sessions(id) on delete cascade,
  workout_id uuid not null references public.workouts(id),
  -- Set number within this exercise in this session, 1-based.
  position int not null check (position between 1 and 100),

  -- Only the columns named in the workout's `tracks` are written; the rest stay null.
  reps int check (reps is null or reps between 1 and 100),
  weight numeric(6, 2) check (weight is null or (weight >= 0 and weight <= 1000)),
  duration_s int check (duration_s is null or duration_s between 1 and 86400),
  distance_m int check (distance_m is null or distance_m between 1 and 100000),

  completed_at timestamptz not null,
  is_warmup boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A set has to record something.
  constraint set_logs_has_a_value check (
    reps is not null or weight is not null or duration_s is not null or distance_m is not null
  )
);

create index set_logs_session on public.set_logs (session_id, workout_id, position);
-- "Last time you did this" -- the prefill source for a new set.
create index set_logs_workout_recent on public.set_logs (owner_id, workout_id, completed_at desc);

create trigger gym_sessions_set_updated_at before update on public.gym_sessions
  for each row execute function private.set_updated_at();
create trigger set_logs_set_updated_at before update on public.set_logs
  for each row execute function private.set_updated_at();

alter table public.gym_sessions enable row level security;
alter table public.set_logs enable row level security;

create policy "owner can do everything" on public.gym_sessions for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "require aal2" on public.gym_sessions as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "owner can do everything" on public.set_logs for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "require aal2" on public.set_logs as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

/*
 * Starting a session copies the plan day's exercises into set-less rows? No -- deliberately not.
 *
 * The session's exercise list is derived from plan_day_id at read time, and `name` is copied so the
 * header survives the plan being deleted. Snapshotting every item would double the write on start
 * for a list that only changes if the owner edits the plan mid-session, which the day name already
 * covers for history.
 */

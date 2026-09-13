-- Pause/resume a running reading session, so a break doesn't inflate its pace (US-016 follow-up).
--
-- Deliberately specific to reading rather than a change to the shared timed-entity template
-- (overview §6.3): the global stopwatch registry's generic actions and mini "still running" bar
-- (US-003) know nothing about pause and keep treating a paused session as running, which is
-- accurate (it hasn't ended) even though their elapsed display free-runs during a pause. The
-- tracker's own screen is pause-aware and is where reading is actually started and stopped.
alter table public.reading_sessions
  add column paused_at timestamptz,
  add column paused_seconds integer not null default 0 check (paused_seconds >= 0);

alter table public.reading_sessions
  add constraint reading_sessions_paused_before_end check (paused_at is null or ended_at is null);

-- A generated column's expression can't be altered in place -- drop and recreate it to subtract
-- accumulated pause time, so `duration_seconds` (and the pace/ETA it feeds) reflects active
-- reading rather than raw wall-clock time.
alter table public.reading_sessions drop column duration_seconds;
alter table public.reading_sessions add column duration_seconds integer generated always as (
  floor(extract(epoch from (ended_at - started_at)) - paused_seconds)::integer
) stored;

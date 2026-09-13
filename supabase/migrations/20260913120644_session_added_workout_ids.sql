-- Exercises added to a session on the spot (US-011, reversing D4 after owner feedback).
--
-- 20260913120418_session_added_exercises.sql was meant to carry this change, but a scripting error
-- pushed it to hosted EMPTY. A migration already applied to hosted is never rewritten
-- (docs/setup.md), so that file stays as an applied no-op and the change lands here instead.
--
-- Why the column: a session's exercise list is derived from its plan day at read time, plus
-- anything with sets logged. An exercise added mid-session has no sets yet, so without somewhere to
-- remember it, it would vanish on the next refresh. And an ad-hoc session (no plan day) had no way
-- to get any exercises at all, which made "Start anyway" a dead end with nothing to log.
--
-- An array rather than a join table: order matters, there are a handful per session, and they are
-- only ever read together with the session. Array elements cannot carry a foreign key, so a deleted
-- workout simply drops out when getSession() looks the ids up.
alter table public.gym_sessions
  add column added_workout_ids uuid[] not null default '{}';

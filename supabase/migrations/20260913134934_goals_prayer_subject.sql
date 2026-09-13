-- US-015: prayer streaks. A new enum value must land in its own migration/transaction — Postgres
-- won't let a new enum value be used by a CHECK constraint added in the same transaction that
-- creates it (see the follow-up migration).
alter type public.goal_subject add value 'prayer';

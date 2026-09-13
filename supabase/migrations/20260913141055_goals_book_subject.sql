-- US-016: a target goal for "finish this book". Own migration/transaction, same reason as
-- goals_prayer_subject (US-015) — a new enum value can't be used by a constraint added alongside it.
alter type public.goal_subject add value 'book';

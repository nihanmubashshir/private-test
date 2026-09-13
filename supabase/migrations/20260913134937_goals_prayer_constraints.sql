-- US-015: a prayer streak counts consecutive logged *waqts*, not qualifying days (overview §6.3 —
-- see src/lib/goals/types.ts). "Trailing N days" has no meaning at that grain, so a prayer streak
-- is always "in a row" and window_days must stay null.
alter table public.goals
  add constraint goals_prayer_no_window check (subject <> 'prayer' or window_days is null);

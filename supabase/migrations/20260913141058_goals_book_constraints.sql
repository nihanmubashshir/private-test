-- US-016: a book target, same shape as a workout target (US-012) — an FK rather than a polymorphic
-- id, so deleting a book cascades to its goal instead of leaving one pointing at nothing.
alter table public.goals
  add column book_id uuid references public.books(id) on delete cascade;

alter table public.goals
  add constraint goals_book_subject check ((subject = 'book') = (book_id is not null)),
  -- "Finish this book" has no meaningful streak — it's a single number to reach, not a
  -- day-repeatable habit.
  add constraint goals_book_target_only check (subject <> 'book' or kind = 'target');

alter table public.goals
  drop constraint goals_target_subjects,
  add constraint goals_target_subjects check (kind <> 'target' or subject in ('weight', 'workout', 'book'));

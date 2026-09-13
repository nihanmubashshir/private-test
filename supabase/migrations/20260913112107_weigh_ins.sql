-- Weight readings (US-009).
--
-- Deliberately NOT the timed-entity template (overview §6.3): a weigh-in is an instant, not a
-- session. It has no ended_at, no duration, and two readings on the same morning are legal, so the
-- template's one-running index and no-overlap exclusion would all be wrong here.
create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- When the reading was taken, not when it was typed.
  measured_at timestamptz not null,
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  -- Kilograms to two decimals of storage, one of input. The range is a typo guard, not a medical
  -- claim: it catches a mis-keyed 824 without rejecting anyone plausible.
  value_kg numeric(5, 2) not null check (value_kg >= 20 and value_kg <= 400),
  note text check (note is null or char_length(note) between 1 and 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every read is "this owner's readings, newest first" or a range scan over the same.
create index weigh_ins_owner_measured on public.weigh_ins (owner_id, measured_at desc);

-- "Not in the future" is enforced in the Server Action, not here: a CHECK constraint may only use
-- immutable expressions, and now() is not one. Same call as runs (US-004 §4.3).

create trigger weigh_ins_set_updated_at
  before update on public.weigh_ins
  for each row execute function private.set_updated_at();

alter table public.weigh_ins enable row level security;

create policy "owner can do everything"
  on public.weigh_ins for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "require aal2"
  on public.weigh_ins as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

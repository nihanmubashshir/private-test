-- Prayer tracker (US-015).
--
-- Deliberately NOT the timed-entity template (overview §6.3): a prayer log is an instant, not a
-- session — it has no duration to track, only when it happened and how.
create type public.waqt as enum ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');
create type public.prayer_status as enum ('mosque', 'home', 'qadha');

create table public.prayers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  waqt public.waqt not null,
  status public.prayer_status not null,
  -- When it was prayed, not when it was logged.
  prayed_at timestamptz not null,
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  -- The calendar day this waqt belongs to, in the zone above. Computed by the Server Action (never
  -- trusted from the client) so a re-log of the same day's Isha upserts instead of duplicating —
  -- the server can't derive this itself without formatting a date (overview §6.2 forbids that).
  prayer_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One log per waqt per day; logging again replaces it rather than piling up entries.
  unique (owner_id, prayer_date, waqt)
);

create index prayers_owner_date on public.prayers (owner_id, prayer_date desc);

create trigger prayers_set_updated_at
  before update on public.prayers
  for each row execute function private.set_updated_at();

alter table public.prayers enable row level security;

create policy "owner can do everything"
  on public.prayers for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "require aal2"
  on public.prayers as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

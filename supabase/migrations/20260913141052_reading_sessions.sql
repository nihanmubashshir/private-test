-- Timed-entity template (overview §6.3), entity = reading_sessions, plus book_id/start_page/end_page
-- after time_zone per the template. Plugs into the global stopwatch registry (US-003).
--
-- end_page is nullable: stopping from the generic "still running" bar (which only ever sets
-- ended_at, the same as every other kind) must still succeed. The book's current_page only moves
-- when a page is actually supplied, from the tracker's own Finish flow.
create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,                                         -- null while running
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  duration_seconds integer generated always as
    (floor(extract(epoch from (ended_at - started_at)))::integer) stored,

  book_id uuid not null references public.books(id) on delete cascade,
  start_page int not null check (start_page >= 0),
  end_page int check (end_page is null or end_page >= start_page),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_sessions_ends_after_start check (ended_at is null or ended_at > started_at),
  constraint reading_sessions_no_overlap exclude using gist (
    owner_id with =,
    tstzrange(started_at, coalesce(ended_at, 'infinity'::timestamptz), '[)') with &&
  )
);

create unique index reading_sessions_one_running on public.reading_sessions (owner_id) where ended_at is null;
create index reading_sessions_owner_started on public.reading_sessions (owner_id, started_at desc);
create index reading_sessions_book_started on public.reading_sessions (book_id, started_at desc);

create trigger reading_sessions_set_updated_at
  before update on public.reading_sessions
  for each row execute function private.set_updated_at();

alter table public.reading_sessions enable row level security;

create policy "owner can do everything"
  on public.reading_sessions for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "require aal2"
  on public.reading_sessions as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

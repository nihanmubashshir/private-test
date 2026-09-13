-- Timed-entity template (overview §6.3), entity = runs.
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,                                         -- null while running
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  duration_seconds integer generated always as
    (floor(extract(epoch from (ended_at - started_at)))::integer) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint runs_ends_after_start check (ended_at is null or ended_at > started_at),
  constraint runs_no_overlap exclude using gist (
    owner_id with =,
    tstzrange(started_at, coalesce(ended_at, 'infinity'::timestamptz), '[)') with &&
  )
);

create unique index runs_one_running on public.runs (owner_id) where ended_at is null;
create index runs_owner_started on public.runs (owner_id, started_at desc);

create trigger runs_set_updated_at
  before update on public.runs
  for each row execute function private.set_updated_at();

alter table public.runs enable row level security;

create policy "owner can do everything"
  on public.runs for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "require aal2"
  on public.runs as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

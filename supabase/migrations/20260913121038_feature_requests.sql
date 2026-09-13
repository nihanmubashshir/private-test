-- Feature request log (US-013). Deliberately inert: no relation to anything else in the schema.

create table public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  note text check (note is null or char_length(note) between 1 and 500),
  -- Open while null. The draft had a `status` column beside `done_at`; two columns that must agree
  -- are a constraint the database would have to police, and one of them is always derivable.
  -- Client-supplied, like every user-meaningful instant (overview §6.2).
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Open items newest first, done items below: both read off created_at within the owner.
create index feature_requests_owner_created on public.feature_requests (owner_id, created_at desc);

create trigger feature_requests_set_updated_at before update on public.feature_requests
  for each row execute function private.set_updated_at();

alter table public.feature_requests enable row level security;

create policy "owner can do everything" on public.feature_requests for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "require aal2" on public.feature_requests as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2') with check ((select auth.jwt() ->> 'aal') = 'aal2');

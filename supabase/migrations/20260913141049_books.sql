-- Reading tracker (US-016). A book and its page progress.
create type public.book_status as enum ('reading', 'finished');

create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  total_pages int not null check (total_pages > 0 and total_pages <= 20000),
  -- Denormalised rather than derived from reading_sessions on every read: it also needs to move on
  -- an untimed page bump, which has no session row at all (§5).
  current_page int not null default 0 check (current_page >= 0),
  status public.book_status not null default 'reading',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint books_current_page_within_total check (current_page <= total_pages)
);

create index books_owner_status on public.books (owner_id, status, created_at desc);

create trigger books_set_updated_at
  before update on public.books
  for each row execute function private.set_updated_at();

alter table public.books enable row level security;

create policy "owner can do everything"
  on public.books for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "require aal2"
  on public.books as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

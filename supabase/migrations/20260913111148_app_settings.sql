-- App-wide settings, one row per owner (US-008).
--
-- The time zone lives here rather than being read from the device (overview §6.2, amended by this
-- story): the owner travels and uses a VPN, so a device-derived zone silently changes what "today"
-- means. Instants are still stored as UTC and still formatted client-side with an explicit zone —
-- only the source of that zone changes.
create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- An IANA name, e.g. 'Europe/London'. Length-checked here; resolvability is checked in the
  -- Server Action with Intl, which the database has no equivalent of.
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Settings are a singleton per owner. A unique index rather than application code, so a double
-- submit inserts a second row over the app's dead body.
create unique index app_settings_one_per_owner on public.app_settings (owner_id);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function private.set_updated_at();

alter table public.app_settings enable row level security;

create policy "owner can do everything"
  on public.app_settings for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "require aal2"
  on public.app_settings as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

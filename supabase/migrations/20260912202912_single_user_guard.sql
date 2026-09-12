create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.enforce_single_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('enforce_single_user'));
  if exists (select 1 from auth.users) then
    raise exception 'This is a single-user instance; a user already exists.';
  end if;
  return new;
end;
$$;

create trigger enforce_single_user
  before insert on auth.users
  for each row execute function private.enforce_single_user();

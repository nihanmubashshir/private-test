-- Needed for the no-overlap exclusion constraint in the timed-entity template.
create extension if not exists btree_gist with schema extensions;

-- Shared updated_at trigger for all tables.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

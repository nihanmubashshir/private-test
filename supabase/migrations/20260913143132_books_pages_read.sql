-- Fix (US-016): `current_page` read as a bookmark (the page reached), but progress is meant to be
-- cumulative pages actually read — a 45→50 session is 5 pages, not "now at page 50". Renaming makes
-- the column say what it holds; the Server Action now adds each session's (end - start) instead of
-- overwriting it with end_page.
alter table public.books rename column current_page to pages_read;
alter table public.books rename constraint books_current_page_within_total to books_pages_read_within_total;

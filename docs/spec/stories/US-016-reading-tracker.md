# US-016 — Reading tracker

> Status: **Done** · Depends on: [US-003](US-003-global-stopwatch.md), [US-008](US-008-app-time-zone.md), [US-012](US-012-goals.md)

## 1. User story

> **As** someone reading a book with a page-count goal,
> **I want** to set up the book's total pages, track which page I'm on, and optionally time how
> long a stretch of reading takes,
> **so that** I can see my percent complete and an estimated time to finish.

## 2. Data

Two migrations: `20260913141049_books.sql` and `20260913141052_reading_sessions.sql`.

`books` is a plain owner-scoped table (title, `total_pages`, a denormalised `current_page`, and a
`reading`/`finished` status) — not a timed entity itself. `reading_sessions` **is** the timed-entity
template (overview §6.3), so it plugs into the global stopwatch registry (US-003): the mini "still
running" bar and the elapsed-time maths work for reading the same as for a run or a gym session.
`book_id`, `start_page` and `end_page` are added after `time_zone`, per the template.

`current_page` is denormalised on `books` rather than derived from `max(reading_sessions.end_page)`
on every read, because it also has to move on an **untimed page bump** — reading pages without
timing them — which has no session row at all (§5).

## 3. Screens

| Where | What |
|-------|------|
| `/reading` | Every book, with a percent badge; "Add a book" opens a create sheet. |
| `/reading/[id]` | Progress bar + ETA, Start/Finish/Discard for the one reading session that can be running, a "Jump to a page" untimed shortcut, and a session history list. "Add a goal" links to `/goals?new=book`. |
| Settings → App | A "Reading" row |

## 4. Goals integration

Adds `'book'` to `goal_subject`, with its own FK column (`book_id`), mirroring the workout target
(US-012 §3): a real foreign key rather than a polymorphic id, so deleting a book cascades to its
goal. Target-only — "finish this book" has no repeatable habit to streak
(`goals_book_target_only`). The target value is the book's own page count, read server-side at
creation exactly like a weight goal's `start_value` — never sent from the client.

## 5. Tasks

| # | Task |
|---|------|
| T1 | Migrations: `books`, `reading_sessions` (timed-entity template) |
| T2 | `lib/reading/{types,queries}.ts`, Server Actions (start/finish/discard a session, create/delete a book, untimed page bump) |
| T3 | Register `reading` in the stopwatch registry (`src/lib/stopwatch/registry.ts`) |
| T4 | `ReadingProgress` (bar + ETA), `BookDetail`, `CreateBookSheet`, `FinishSessionSheet`, `BumpPageSheet` |
| T5 | `/reading` and `/reading/[id]` screens, Settings row |
| T6 | Goals: `'book'` subject, target-only, create-sheet support |
| T7 | Docs pass |

## 6. Acceptance criteria

1. Creating a book with 300 pages shows `Page 0 / 300` and "Time a session to estimate how long is
   left."
2. Starting a session from page 0, finishing at page 20 after 10 minutes: the book shows
   `Page 20 / 300`, and a second session's ETA reflects ~30s/page from that history.
3. Only one reading session can run at a time, across every book — starting a second one is
   blocked by the table's own one-running-row constraint, the same as running or gym.
4. "Jump to a page" moves `current_page` forward with no session row and no elapsed time recorded.
5. A book goal shows `current_page / total_pages` and flips to Completed the render after the last
   page is read, exactly like every other goal (US-012 §4).
6. Deleting a book removes its sessions and any goal pointed at it, and touches nothing else.
7. `pnpm typecheck` passes.

## 7. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | "Tap any page in a grid" became a plain page-number field | A literal grid of individually tappable pages doesn't hold up past a couple hundred pages — the schema allows books up to 20,000 pages, and rendering that many buttons is neither usable nor performant on a phone. A numeric field with the OS numeric keypad covers "enter the page" from the original ask; "click any page" is served by editing the number directly rather than scanning a grid. |
| D2 | `end_page` is nullable | The stopwatch registry's generic "still running" bar can stop **any** registered kind by only ever setting `ended_at` (it has no way to ask kind-specific questions) — the same shape of trade-off gym already makes (its generic-stop path saves no `note` either). A session stopped that way still records its duration; it just doesn't move `current_page`, which the owner can still do via a page bump. |
| D3 | No radial-menu entry | Unlike a prayer log (one tap, no choices), starting a reading session needs a book and a page first — there's no single quick action to bind to a wheel node without adding a book picker to the wheel itself. Reachable from Settings and the mini "still running" bar instead. |
| D4 | No editing a book's title or page count after creation | Same call as goals (US-012 D7) — changing `total_pages` after the fact would silently rewrite what "percent complete" meant for every session already logged against it. Delete and recreate is explicit. |
| D5 | `pnpm db verify` not run | Same limitation as US-015 D5 / US-012 D9 — `SUPABASE_DB_URL` is empty in `.env.local`. Both tables' RLS/policies were written by hand against the overview §6 template. |

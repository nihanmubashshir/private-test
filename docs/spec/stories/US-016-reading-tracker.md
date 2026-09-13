# US-016 — Reading tracker

> Status: **Done** · Depends on: [US-003](US-003-global-stopwatch.md), [US-008](US-008-app-time-zone.md), [US-012](US-012-goals.md)

## 1. User story

> **As** someone reading a book with a page-count goal,
> **I want** to set up the book's total pages, track which page I'm on, and optionally time how
> long a stretch of reading takes,
> **so that** I can see my percent complete and an estimated time to finish.

## 2. Data

Migrations: `20260913141049_books.sql`, `20260913141052_reading_sessions.sql`, and two follow-ups —
`20260913143132_books_pages_read.sql` (a fix, §7) and `20260913143133_reading_session_pause.sql`
(pause/resume, §5.1).

`books` is a plain owner-scoped table (title, `total_pages`, a denormalised `pages_read`, and a
`reading`/`finished` status) — not a timed entity itself. `reading_sessions` **is** the timed-entity
template (overview §6.3), so it plugs into the global stopwatch registry (US-003): the mini "still
running" bar and the elapsed-time maths work for reading the same as for a run or a gym session.
`book_id`, `start_page`, `end_page`, `paused_at` and `paused_seconds` are added after `time_zone`,
per the template.

`pages_read` is **cumulative pages actually read** — the sum of every session's `(end_page -
start_page)`, plus every untimed bump — not a bookmark. Reading pages 45→50 always adds exactly 5,
regardless of where `current_page` (now `pages_read`) stood before; it is not set to `end_page`.
It's denormalised on `books` rather than derived from `reading_sessions` on every read because it
also has to move on an **untimed page bump**, which has no session row at all (§5).

### 2.1 Pause

`paused_at` (set while paused, null otherwise) and `paused_seconds` (accumulated total) let a
session's clock stop for a break without ending it. `duration_seconds` — a generated column per the
template — is redefined to subtract `paused_seconds`, so the pace/ETA a session feeds
(`estimateSecondsLeft`) reflects active reading time, not wall-clock time including the break.
Finishing a session while it's still paused folds the open pause into `paused_seconds` first, so
Finish always works without requiring a Resume first.

## 3. Screens

| Where | What |
|-------|------|
| `/reading` | Every book, with a percent badge; "Add a book" opens a create sheet. |
| `/reading/[id]` | Progress bar + ETA, Start/Pause/Resume/Finish/Discard for the one reading session that can be running, an "Add pages read" untimed shortcut, and a session history list. "Add a goal" links to `/goals?new=book`. |
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
| T2 | `lib/reading/{types,queries}.ts`, Server Actions (start/pause/resume/finish/discard a session, create/delete a book, untimed page bump) |
| T3 | Register `reading` in the stopwatch registry (`src/lib/stopwatch/registry.ts`) |
| T4 | `ReadingProgress` (bar + ETA), `ReadingSessionTimer` (pause-aware elapsed), `BookDetail`, `CreateBookSheet`, `FinishSessionSheet`, `BumpPageSheet` |
| T5 | `/reading` and `/reading/[id]` screens, Settings row |
| T6 | Goals: `'book'` subject, target-only, create-sheet support |
| T7 | Docs pass |

## 6. Acceptance criteria

1. Creating a book with 300 pages shows `0 / 300 pages` and "Time a session to estimate how long is
   left."
2. Starting a session at page 45, finishing at page 50 after 10 minutes: `pages_read` becomes
   `+5` (not `50`), regardless of what it was before, and a second session's ETA reflects
   ~2 min/page from that history.
3. Pausing a running session freezes its elapsed display; resuming continues the same session's
   timer. A session finished while still paused still saves correctly, with the pause excluded
   from `duration_seconds`.
4. Only one reading session can run at a time, across every book — starting a second one is
   blocked by the table's own one-running-row constraint, the same as running or gym.
5. "Add pages read" adds a page count to `pages_read` with no session row and no elapsed time.
6. A book goal shows `pages_read / total_pages` and flips to Completed the render after
   `pages_read` reaches the total, exactly like every other goal (US-012 §4).
7. Deleting a book removes its sessions and any goal pointed at it, and touches nothing else.
8. `pnpm typecheck` passes.

## 7. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | "Tap any page in a grid" became a plain page-number field | A literal grid of individually tappable pages doesn't hold up past a couple hundred pages — the schema allows books up to 20,000 pages, and rendering that many buttons is neither usable nor performant on a phone. A numeric field with the OS numeric keypad covers "enter the page" from the original ask; "click any page" is served by editing the number directly rather than scanning a grid. |
| D2 | `end_page` is nullable | The stopwatch registry's generic "still running" bar can stop **any** registered kind by only ever setting `ended_at` (it has no way to ask kind-specific questions) — the same shape of trade-off gym already makes (its generic-stop path saves no `note` either). A session stopped that way still records its duration; it just doesn't move `pages_read`, which the owner can still do via a page bump. |
| D3 | No radial-menu entry | Unlike a prayer log (one tap, no choices), starting a reading session needs a book and a page first — there's no single quick action to bind to a wheel node without adding a book picker to the wheel itself. Reachable from Settings and the mini "still running" bar instead. |
| D4 | No editing a book's title or page count after creation | Same call as goals (US-012 D7) — changing `total_pages` after the fact would silently rewrite what "percent complete" meant for every session already logged against it. Delete and recreate is explicit. |
| D5 | `pnpm db verify` not run | Same limitation as US-015 D5 / US-012 D9 — `SUPABASE_DB_URL` is empty in `.env.local`. Both tables' RLS/policies were written by hand against the overview §6 template. |
| D6 (fix) | `current_page` renamed to `pages_read`; a session now **adds** `(end_page - start_page)` instead of setting it as the new absolute page | The original build treated `end_page` as a bookmark — finishing a 45→50 session set the stored value to `50`, not `+5`. Caught after shipping: the intent was always cumulative pages read, so the column was renamed to say what it holds and the write path fixed to match (§2). `bumpPage` changed the same way, from "jump to page N" to "add N pages read". |
| D7 | Pause/resume is reading-only, not a change to the shared timed-entity template | Adding `paused_at`/`paused_seconds` to every timed entity (runs, gym) was out of scope for a reading-specific request. The registry's generic stop/discard and the mini bar stay unaware of pause — a paused session still reads as "running" there, which is technically true, though the bar's own elapsed display free-runs through a pause. The tracker's own screen is pause-aware. |

# US-013 — Feature request log

> Status: **Done** · Depends on: [US-007](US-007-app-shell.md)
> Part of the [design-2 roadmap](../design-2-roadmap.md). Renumbered from the designer's draft
> [`US-008-feature-requests.md`](../../design/design-2-stories/US-008-feature-requests.md).

## 1. User story

> **As** the only user and the one giving myself feedback,
> **I want** a lightweight place to jot down things I want the app to do while I'm using it,
> **so that** ideas survive past the moment I have them, without turning into a ticket system.

## 2. Data

`supabase/migrations/20260913121038_feature_requests.sql` — one table, deliberately inert: no
relation to anything else in the schema.

| Column | Notes |
|--------|-------|
| `title` | 1–120 chars |
| `note` | Optional, 1–500 chars |
| `done_at` | **Open while null.** Client-supplied instant (overview §6.2) |

The draft had a `status` column beside `done_at`. Two columns that must agree are a constraint the
database would have to police, and one of them is always derivable from the other — so there is only
`done_at`.

## 3. Screen — `/settings/requests`

| # | Element | Details |
|---|---------|---------|
| 1 | Add row | **Sticky under the app bar**, so it is reachable without scrolling however long the list gets. "What should the app do?" + Add; "+ details" reveals an optional note |
| 2 | Open list | Newest first. A round checkbox (44px target), the title, the note, and the day it was added |
| 3 | Done | A collapsed `<details>` "Done (N)", newest-done first, struck through at 70% opacity. The checkbox reopens |
| 4 | Edit | Tap a title to edit in place; commits on blur or Enter, Escape reverts. One write per edit, not per keystroke (US-010 D5) |
| 5 | Delete | A trash button on every row, **no confirmation** — low stakes, easily written again |

## 4. Optimistic writes

Every change goes through `useOptimistic`, which is also the rollback: optimistic state only lives
for the length of the transition. On success the Server Action revalidates and the refreshed list
already holds the change when the transition ends. On failure nothing does, so the row snaps back and
a **Retry toast** appears — the replacement for the offline queue this app deliberately does not have
(roadmap L2).

A row that exists only optimistically carries a `pending-` id, and its checkbox, title and delete are
disabled until the real row arrives: there is nothing on the server to act on yet.

## 5. Tasks

| # | Task |
|---|------|
| T1 | Migration: `feature_requests` + RLS + aal2 |
| T2 | `lib/requests/{types,queries}.ts` and the Server Actions |
| T3 | `/settings/requests`: sticky add row, open list, done section, inline edit, delete — all optimistic |
| T4 | Settings row, changelog, docs |

The radial menu's quick-capture sheet, which writes into this list from any screen, is US-014.

## 6. Acceptance criteria

1. Adding a title with no note creates an entry immediately, optimistically, dated today.
2. Marking an open item done moves it into Done with no page transition.
3. Reopening a done item returns it to the open list in its newest-first position.
4. Delete is available in both sections and asks for no confirmation.
5. The add row is reachable without scrolling with 50+ entries.
6. Every row and the add control are at least 44px tall.
7. A failed write reverts the row and offers Retry.

## 7. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | No `status` column; open/done is `done_at` alone | §2. |
| D2 | Delete is a button, not swipe-left | Swipe conflicts with page scroll; consistent with US-009 D4 and US-010 D2. |
| D3 | The actions take typed arguments, not `FormData` | They are called from optimistic transitions, not form posts. The argument still crosses the network, so each is parsed whole with zod and typed `unknown`. |
| D4 | `pnpm db verify` not run | `SUPABASE_DB_URL` is empty in `.env.local`; see US-008 D3. |

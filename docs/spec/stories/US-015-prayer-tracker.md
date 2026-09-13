# US-015 — Prayer tracker

> Status: **Done** · Depends on: [US-008](US-008-app-time-zone.md), [US-012](US-012-goals.md)

## 1. User story

> **As** someone trying to stay consistent with the 5 daily prayers,
> **I want** to log each waqt as prayed at the mosque, at home, or as Qadha,
> **so that** I can see my daily record and track a streak toward a goal like "next 100 waqt."

## 2. Data

`supabase/migrations/20260913134917_prayers.sql` — one `prayers` table plus `waqt` and
`prayer_status` enums.

Deliberately **not** the timed-entity template (overview §6.3): a prayer log is an instant, not a
session. `prayer_date` is a real column rather than derived at read time, so the table can enforce
"one log per waqt per day" with a plain unique constraint — logging the same waqt again upserts
instead of piling up rows. Per overview §6.2, the server never formats a date, so `prayer_date` is
computed **client-side** (`dateKey(prayedAt, appTimeZone)`) and sent alongside `prayedAt` and
`timeZone`, the same way every other client-supplied instant already works in this codebase.

## 3. Screens

| Where | What |
|-------|------|
| `/prayers` | Today's 5 fixed slots (Fajr…Isha); tap opens a sheet to mark Mosque / Home / Qadha, or Clear. Below it, a "Recent days" list — one row per past day, a dot per waqt. |
| Radial menu (US-014) | "Log prayer" node opens the sheet directly for the next unlogged waqt today (or Isha, to review, once all five are in) — no navigation needed for the multiple-times-a-day case. |
| Settings → App | A "Prayers" row, for browsing history |

"Today" needs the app zone, which is only known on the client — matching the goals pattern (US-012
§4), a configured zone renders correctly on first paint; only an unconfigured install waits behind
a skeleton.

## 4. Goals integration

Adds `'prayer'` to `goal_subject` (`20260913134934_goals_prayer_subject.sql`, its own migration —
Postgres won't let a new enum value be used by a CHECK constraint added in the same transaction
that creates it). Streak-only: the existing `goals_target_subjects` constraint already excludes it
from `target`.

## 5. Tasks

| # | Task |
|---|------|
| T1 | Migration: `prayers`, `waqt`/`prayer_status` enums |
| T2 | `lib/prayers/{types,queries}.ts`, Server Actions (`logPrayer`, `clearPrayer`) |
| T3 | `PrayerChecklist`, `LogPrayerSheet`, `PrayerHistory` |
| T4 | `/prayers` screen, Settings row |
| T5 | Goals: `'prayer'` subject, streak-by-waqt progress, create-sheet support |
| T6 | Radial menu: "Log prayer" node, `RadialMenuSlot` data |
| T7 | Docs pass |

## 6. Acceptance criteria

1. Marking Fajr "Mosque" today shows a check and a Mosque badge on that row; re-opening the sheet
   shows Mosque already selected.
2. Marking the same waqt again on the same day replaces the log rather than creating a second one.
3. A day with no logs shows all 5 slots as "Not logged"; history never fabricates a "missed" state
   for a slot nobody logged.
4. A "100 waqt in a row" streak goal: logging Mosque, Home, and Qadha all advance it; a day that
   passes with an unlogged waqt resets it to 0; today's not-yet-logged remaining waqts never break
   an in-progress run.
5. Holding the radial menu button and releasing on "Log prayer" opens the sheet for the next
   unlogged waqt today, with no page navigation.
6. `pnpm typecheck` passes.

## 7. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | Prayer streaks count consecutive **logged waqts**, not qualifying **days** like every other streak (US-012 §4) | "Trailing N days" has no meaning at waqt granularity — the owner's goal is "the next 100 prayers," an event count, not a day count. Implemented as its own walk in `src/lib/goals/types.ts` (`prayerStreakProgress`) rather than generalizing the day-based one, since the two only share the "today doesn't break it yet" exception and nothing else. |
| D2 | A prayer streak is always "in a row" — `window_days` must be null (`goals_prayer_no_window`) | A trailing 7/30-*day* window doesn't translate to a waqt count either; forcing "in a row" avoids inventing a meaning for it. |
| D3 | Qadha counts toward the streak the same as Mosque/Home; only a fully unlogged waqt breaks it | Owner's explicit call: the goal is consistency of logging/praying at all, not punctuality. |
| D4 | The radial menu's `RADIUS` grew from 172 to 206 to fit a 7th node | Nodes are spaced evenly across a fixed 90° arc by count; a 7th tightened adjacent spacing from 18° to ~15°, which at the old radius put 48px nodes closer than their own diameter. Bumping the radius restores roughly the original few-px clearance instead of shrinking touch targets below the 44px minimum (hard rule 1). |
| D5 | `pnpm db verify` not run | `SUPABASE_DB_URL` is empty in `.env.local` — same limitation as US-012 D9. The `prayers` table's RLS/policies were written by hand against the template (overview §6). |

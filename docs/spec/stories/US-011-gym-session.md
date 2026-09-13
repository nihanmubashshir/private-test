# US-011 — Gym session: timed, with per-exercise logging

> Status: **Done** · Depends on: [US-010](US-010-gym-plans.md)
> Part of the [design-2 roadmap](../design-2-roadmap.md). Renumbered from the designer's draft
> [`US-006-gym-session.md`](../../design/design-2-stories/US-006-gym-session.md).

## 1. User story

> **As** someone mid-workout with one hand free and a phone in the other,
> **I want** the whole session timed from the moment I start, and each set logged in one or two
> taps,
> **so that** I get an accurate record of the session and of every lift without breaking rhythm.

## 2. Data

`supabase/migrations/20260913114529_gym_sessions.sql`.

`gym_sessions` follows the **timed-entity template** (overview §6.3) exactly and is registered as a
stopwatch kind. That is the whole design: Home's recent activity, the mini "still running" bar, the
drift-free elapsed maths and the past-sessions list all come from the registry with no gym-specific
code. The designer's draft instead proposed writing a denormalised `entry` row on the "Gym" duration
tracker at finish, purely so sessions appeared in one feed — a shadow row that can disagree with the
thing it shadows.

Entity-specific columns after `time_zone`:

| Column | Notes |
|--------|-------|
| `plan_day_id` | `on delete set null` — deleting a plan unlinks history, never destroys it |
| `name` | Copied from the plan day at start, so the header survives that day being deleted |
| `note` | Session-level only |

`set_logs` holds one row per set: `position` (1-based within the exercise in this session), the four
nullable value columns, `completed_at`, `is_warmup`. A CHECK requires at least one value column to
be non-null — a set has to record something. Indexed on `(owner_id, workout_id, completed_at desc)`
for "last time you did this".

**Derived, never stored:** duration (a generated column from the template), volume, set count.

### 2.1 The exercise list is derived, not snapshotted

`getSession()` builds the exercise list from `plan_day_id` **at read time**, then appends anything
with logged sets that the plan no longer lists. Editing a plan mid-session therefore adds and
removes rows, but can never lose work already logged. The draft snapshotted the list at start; that
doubles the write on start to protect against an edit the copied `name` already covers for history.

## 3. Screens

| Route | What |
|-------|------|
| `/gym/session` | The active session. Redirects to `/` when nothing is running |
| `/gym/sessions` | Past sessions, via the generic `ActivityList` |
| `/gym/sessions/[id]` | The read-only record, with Delete |

**No back chevron on the active session.** Leaving is Minimise (returns Home, session still
running); a back button there reads as "cancel", and the mini bar is what brings you back.

### 3.1 Set inputs

Generated from the exercise's `tracks` via one spec table — a new tracked field is a row there and
nothing else. Steppers for the common adjustment (reps ±1, weight ±0.5kg, duration ±15s, distance
±50m), long-press for a coarser jump, and a tap on the number opens the keypad sheet.

**The OS keyboard never opens.** Mid-set with one hand free, a keyboard covering half the screen is
the worst possible control.

The keypad from US-009 is generalised to take `KeypadRules`, so reps, load, seconds and metres all
reuse it. Integer-only rules render a dead spacer where the decimal key would be, so the 3×4 grid
keeps its shape and `0` never moves between contexts.

Prefill order: the last set of this exercise **in this session**, then the plan target, then the
last working set from any past session.

### 3.2 Rest timer

Counts **up** from the last logged set. A target rest is a setting this app does not have, and
guessing one would be wrong more often than useful. Elapsed is recomputed from the timestamp on
every tick, so backgrounding does not freeze it. One haptic pulse at 90s; no notification, no sound.

## 4. Tasks

| # | Task |
|---|------|
| T1 | Migration: `gym_sessions` on the timed-entity template, `set_logs` |
| T2 | Registry entry, `session-queries.ts`, `session-types.ts`, Server Actions |
| T3 | Generalise the keypad; `set-inputs.tsx` |
| T4 | `/gym/session`: timer hero, exercise blocks, log/delete set, warmup |
| T5 | Rest timer; Start/Resume on the Home card |
| T6 | Finish, discard, and the summary at `/gym/sessions/[id]` |
| T7 | `/gym/sessions` past-session list |
| T8 | Docs pass |

## 5. Acceptance criteria

1. Starting from today's plan card creates the session with that plan day and lands on the session
   screen with the timer running from 0.
2. Backgrounding for 5 minutes and reopening shows about 5 minutes elapsed.
3. Force-quitting and reopening returns Home with a live session bar; tapping it reopens the session.
4. A second session cannot be started while one is running (`gym_sessions_one_running`).
5. An exercise tracking only `reps` shows only a reps input; `duration + weight` shows both and no
   reps field.
6. Logging a set keeps the values for the next set and the row appears immediately.
7. Weight steps in 0.5kg, long-press in 2.5kg, and the keypad accepts one decimal.
8. Deleting a set updates the set count and volume.
9. The rest timer starts on every logged set and clears on the next one or on Skip.
10. Finish is disabled until at least one set is logged.
11. A finished session appears in Home's recent activity **through the registry**, with no shadow row.
12. Discarding writes no session and leaves no `set_logs`.
13. The OS keyboard does not open anywhere during a session.
14. Deleting a plan leaves its past sessions readable, showing their stored day name.

## 6. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | No `entry` row on a "Gym" tracker | §2 — `gym_sessions` *is* a timed entity, so the registry already provides the one feed the shadow row existed to produce. |
| D2 | The exercise list is derived at read time, not snapshotted at start | §2.1. |
| D3 | No PR badge | Needs a best-ever lookup per set against every past session; it is a nice-to-have the draft itself scoped to "nothing more, no celebration". Revisit with goals (US-012), which computes bests anyway. |
| D4 | No "add exercise mid-session", skip, or replace | Adding to the plan day achieves the same thing and keeps one source of truth for what the day contains. |
| D5 | No abandoned-session (>6h) recovery UI | The elapsed time is derived, so a long session is merely long, not wrong. Discard and Finish are both reachable from the session screen at any point. Worth adding if it bites. |
| D6 | No Wake Lock on the session screen | `focus-view.tsx` already holds one for a running stopwatch; adding a second holder needs care about release ordering. Not attempted rather than half-done. |
| D7 | No editing of a past session's times or sets | Delete is offered. Editing needs a form over derived-vs-stored values that is worth its own pass. |
| D8 | `pnpm db verify` not run | `SUPABASE_DB_URL` is empty in `.env.local`; see US-008 D3. |

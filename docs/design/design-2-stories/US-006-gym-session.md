# US-006 — Today's gym session, timed, with per-exercise logging

> Status: **Draft** · Depends on: US-005
> Read [`00-overview.md`](./00-overview.md) first.

## 1. User story

> **As** someone mid-workout with one hand free and a phone in the other,
> **I want** the whole session timed from the moment I start, and each set logged in one or two taps,
> **so that** I get an accurate record of the session and of every lift without breaking rhythm.

## 2. Scope

### In scope
- Starting a session from today's plan day, or ad hoc with no plan.
- Session-level elapsed timing that survives the app being backgrounded or killed.
- Logging sets per exercise, with fields generated from the workout's `tracks`.
- Prefilling each set from the plan target or the last time that exercise was done.
- A rest timer between sets.
- Adding an exercise mid-session; skipping one.
- Finishing a session, with a summary, and writing one `entry` on the "Gym" duration tracker.
- Editing or deleting a past session and its sets.
- Discarding a session.

### Out of scope
- Progression suggestions, 1RM, volume targets, or PR detection beyond the simple flag in §5.4.
- Per-set rest targets, tempo, RPE, or notes per set (session-level note only).
- Background notifications when the rest timer ends.
- Apple Health / Google Fit sync.
- More than one session running at a time — starting a second is impossible while one is open.

## 3. Data

```
gym_session
  id             uuid pk
  plan_day_id    uuid fk -> plan_day null    -- null for ad-hoc; on delete set null
  name           text                        -- copied from plan_day.name at start, or 'Gym session'
                                             -- denormalised so history survives plan deletion
  started_at     timestamptz
  ended_at       timestamptz null            -- null while running
  note           text null
  entry_id       uuid fk -> entry null       -- the duration entry written on finish

set_log
  id             uuid pk
  session_id     uuid fk -> gym_session on delete cascade
  workout_id     uuid fk -> workout
  position       int                         -- set number within this exercise, 1-based
  reps           int null
  weight         numeric(6,2) null
  duration_s     int null
  distance_m     int null
  completed_at   timestamptz
  is_warmup      boolean default false
```

Only the columns named in the workout's `tracks` are written; the rest stay null.
Partial unique index enforcing at most one session with `ended_at is null`. Index on
`(workout_id, completed_at desc)` for "last time" lookups.

**Derived, never stored:** session duration (`ended_at - started_at`), total volume
(`sum(reps × weight)`), set count.

## 4. Session lifecycle

```
none ──start──▶ running ──finish──▶ completed
                   │
                   └──discard──▶ (deleted)
```

- **Start** creates the row with `started_at = now()`, copies today's day name off the **active** plan,
  and redirects to `/gym/session`. The session's exercise list is snapshotted at start, so activating a
  different plan or editing the plan mid-session does not change the session in progress.
- **Running** is global state: any screen knows a session is open. Home shows it; a compact live bar
  appears on other screens (US-002 §2).
- **Finish** sets `ended_at`, creates an `entry` on the Gym tracker with matching timestamps and
  `source = 'live'`, links it via `entry_id`, and pushes the summary screen.
- **Discard** deletes the session and its sets after a confirm sheet. No entry is written.
- **Abandoned sessions:** if a running session's `started_at` is more than 6 hours ago, Home offers
  "Finish" (ending it at the last `completed_at`, or at `started_at + 1h` when no sets exist) or
  "Discard" rather than showing an absurd elapsed time.

Elapsed time is always `now - started_at`, recomputed on a 1s tick and re-derived on `visibilitychange`.
No counter is ever incremented.

## 5. Active session screen (`/gym/session`)

Pushed, full screen. **No back chevron** — leaving is via "Minimise" (returns to Home with the session
still running) or finishing. A back gesture behaves as Minimise.

### 5.1 Header

Sticky. Left: "Minimise" (chevron-down). Centre: the session name. Right: "Finish" as a compact accent
button, enabled only once at least one set is logged.

### 5.2 Timer block

The hero. Elapsed time in mono at 40px with a 8px green dot beside it, the start time beneath in 13px
muted ("Started 18:04"). Under it a thin progress line showing exercises completed out of planned, and a
line of live stats: `8 sets · 2,240 kg`.

### 5.3 Exercise list

One block per exercise, in plan order. A block is collapsed unless it is the current one.

**Collapsed:** 32px chip, name, and a right-aligned status — `3 / 3` in mono green when complete,
`1 / 3` in mono muted when partial, the target (`3 × 8 · 100 kg`) in muted when untouched. Tap to expand;
expanding collapses the previous one.

**Expanded:**

| # | Element | Details |
|---|---------|---------|
| 1 | Name row | Name, target beneath, and a `⋯` menu: Skip exercise · Replace · Remove from session · Edit targets |
| 2 | Last time | One muted line, mono: `Last: 3 × 8 · 100 kg, 6 days ago`. Absent on a first-ever attempt. |
| 3 | Logged sets | One row per set: set number in mono muted, then the values (`8 × 100 kg`), then a check. Tap to edit inline, swipe-left to delete. Warmup sets show a `W` instead of a number. |
| 4 | Next set inputs | Generated from `tracks`. Each field is a **tap target that opens a keypad sheet**, not an inline OS-keyboard input: reps as a stepper with a tappable number, weight as a value chip with `−`/`+` at 0.5kg (long-press for 2.5kg) plus tap-to-keypad, duration as mm:ss, distance in metres. Prefilled from the last logged set of this exercise in this session, else the plan target, else last session's value. |
| 5 | Log set | Full-width primary, 52px: "Log set 3". After logging: the row animates into the list, the rest timer starts, the inputs keep their values for the next set, and a haptic tick fires. |
| 6 | Warmup | A small "Warmup" toggle beside Log set; a warmup set is excluded from volume. |

### 5.4 Rest timer

After a set is logged, a compact bar pins above the bottom of the screen: elapsed rest in mono, a `+30s`
chip, and Skip. Counts **up** by default — a target rest is out of scope. It clears on the next Log set,
or on Skip. Optional single haptic pulse at 90s. No notifications, no sound.

### 5.5 Bottom actions

Below the list: "Add exercise" (secondary, opens the US-005 picker, session-scoped only) and a muted
"Discard session".

### 5.6 PR flag

When a logged set beats the best `reps × weight` ever recorded for that workout, the row gets a small
accent `PR` badge. Nothing more — no celebration, no toast.

## 6. Finish and summary

"Finish" opens a confirm sheet when any planned exercise is untouched: "2 exercises not started. Finish
anyway?" Otherwise it finishes directly.

**Summary screen** (replaces the session screen; back goes to Home):

| # | Element |
|---|---------|
| 1 | "Session complete" with the day name |
| 2 | Four stats in a 2×2 grid, mono: Duration · Sets · Volume (kg) · Exercises |
| 3 | Per-exercise recap: name, sets logged, best set, and any PR badge |
| 4 | Optional session note field |
| 5 | Primary "Done" → Home |

## 7. Past sessions

Reached from the Gym tracker detail (`/t/[gymTrackerId]`), which lists sessions newest first: date, name,
duration in mono, set count. A row opens a read-only version of the summary with an Edit affordance that
allows changing start/end times, editing or deleting sets, and deleting the session. Editing recomputes
the linked `entry`.

## 8. Acceptance criteria

1. Starting a session from today's plan card creates it with today's plan day and lands on the session
   screen with the timer running from 0.
2. Backgrounding the app for 5 minutes and reopening shows about 5 minutes elapsed.
3. Force-quitting and reopening the app returns to Home with a live session bar showing correct elapsed
   time; tapping it reopens the session.
4. A second session cannot be started while one is running.
5. An exercise tracking only `reps` shows only a reps input; one tracking `duration + weight` shows both
   and no reps field.
6. Logging a set prefills the next set with the same values, and the set appears in the list immediately,
   before the server confirms.
7. Weight `−`/`+` move in 0.5kg steps and long-press moves in 2.5kg steps; the keypad accepts one decimal.
8. Deleting a logged set updates the session's set count and volume immediately.
9. The rest timer starts on every logged set and clears on the next one or on Skip.
10. "Finish" is disabled until at least one set is logged.
11. Finishing writes exactly one `entry` on the Gym tracker whose `occurred_at`/`ended_at` match the
    session, and the session appears in Home's recent activity.
12. Discarding a session writes no entry and leaves no `set_log` rows.
13. A session left running for over 6 hours offers Finish or Discard on Home instead of a live timer.
14. The OS keyboard does not open anywhere during a session except the session note field.
15. At 320px no element overflows; Log set is at least 52px tall and every other target at least 44px.
16. With the network off, sets log locally, the session finishes, and everything syncs on reconnect.

## 9. Open questions

| # | Question | Default |
|---|----------|---------|
| Q1 | Should the rest timer count down to a target instead of up? | Counts up. A target-rest setting can come later. |
| Q2 | Auto-advance to the next exercise when a set target is met? | No — expanding is a deliberate tap. Too easy to fight the user mid-set. |
| Q3 | Track bodyweight exercises' load from the weight tracker? | No. Bodyweight lifts log reps only. |
| Q4 | Keep the session screen awake? | Yes if `navigator.wakeLock` is available, released on finish or minimise. Nice-to-have. |

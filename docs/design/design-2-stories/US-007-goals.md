# US-007 — Goals

> Status: **Draft** · Depends on: US-002, US-003, US-005/US-006
> Read [`00-overview.md`](./00-overview.md) first.

## 1. User story

> **As** someone who tracks things to actually move a number,
> **I want** to set a goal on almost anything I track and see how close I am,
> **so that** logging isn't just a diary — it points somewhere.

## 2. Scope

### In scope
- One `goal` entity, attachable to a tracker or a specific workout.
- Two goal kinds for v1: **target** (reach a single number) and **streak** (do it on N of the last M days,
  or "M days in a row").
- A progress bar / ring wherever a goal is shown, computed from existing `entry`/`set_log` data — goals
  never introduce their own logging.
- A Goals summary on Home; full detail lives with the thing it's attached to.
- Creating, editing, pausing and completing a goal.

### Out of scope
- Multi-step or compound goals ("lose 5kg AND run 3x/week").
- Deadlines/due dates — v1 goals are open-ended.
- Notifications or reminders about goal progress.
- Social/sharing, leaderboards, badges beyond a simple "Completed" state.
- Goals on things that don't produce numeric history yet (e.g. the changelog).

## 3. What a goal is

Deliberately narrow: **one number, tracked against one thing.**

| Kind | Question it answers | Example | Progress source |
|------|---------------------|---------|------------------|
| `target` | "Have I reached X?" | 400kg deadlift · 78kg bodyweight · 40kg dumbbell curl | The best/latest matching value ever logged, vs `target_value`. |
| `streak` | "Am I doing this consistently?" | Gym 5 days this week · Weigh in every day this month | Count of qualifying days in the trailing window, vs `target_count`. |

A goal always points at exactly one **subject**:
- a `tracker` (weight, running) — target reads its `entry.value` or session duration;
- a specific `workout` inside the gym system (deadlift) — target reads `set_log` best set
  (`reps × weight` for a weight target, `weight` alone if `reps` is fixed at 1, i.e. a 1RM-style target).

## 4. Data

```
goal
  id             uuid pk
  kind           text                     -- 'target' | 'streak'
  subject_type   text                     -- 'tracker' | 'workout'
  subject_id     uuid                     -- fk into tracker or workout, resolved by subject_type
  label          text                     -- 'Deadlift 400kg' — shown everywhere, editable
  target_value   numeric(8,2) null        -- kind='target': the number to reach
  target_metric  text null                -- kind='target' on a workout: 'weight' | 'reps' | 'best_set_load'
  target_count   int null                 -- kind='streak': how many qualifying days
  window_days    int null                 -- kind='streak': trailing window, e.g. 7 or 30; null = "in a row"
  status         text default 'active'    -- 'active' | 'completed' | 'paused'
  completed_at   timestamptz null
  created_at     timestamptz
```

One partial unique-ish rule enforced in the UI (not the DB, since it's a soft rule): creating a second
active goal on the same `(subject_type, subject_id)` warns rather than blocks — a bodyweight goal and a
lift-goal on the same tracker never collide, but two active weight targets would just be confusing.

**Progress calculation is always derived, never stored:**
- `target` on a tracker: `latest entry.value` (weight-style, "closer is further along regardless of
  direction from the start") vs `target_value`. Percentage is `min(100, current / target_value * 100)` when
  the metric increases toward the goal (deadlift), or a symmetric distance-closed calculation when it can
  move either way (bodyweight) — see §5.2.
- `target` on a workout: best `set_log` ever for that workout's chosen metric.
- `streak`: count distinct qualifying days with at least one `entry`/`set_log` for the subject, within the
  window, then `count / target_count`.

A goal reaches `completed` automatically the moment its computed progress hits 100%, and stays visible
(collapsed, with a checkmark) for 7 days before dropping into an archive the owner can still reach from
Settings.

## 5. Screens

### 5.1 Goals summary on Home

Sits directly under the header, above the day's session card. Present only when at least one goal exists.

| # | Element | Details |
|---|---------|---------|
| 1 | Eyebrow | "GOALS" muted label, plus a `⋯` → "Manage goals" |
| 2 | Row per active goal | Chip inherited from the subject (dumbbell for a workout, scale for weight) · label · a compact progress bar (target) or a 7-dot streak strip (streak) · the number right-aligned (`312 / 400 kg`, or `4 / 5 days`) |
| 3 | Order | Nearest-to-complete first, so the summary always leads with the goal closest to paying off. |
| 4 | Tap | Opens the goal's detail sheet (§5.3), not the underlying tracker. |
| 5 | Cap | Shows at most 3; a 4th+ collapses into "+2 more goals". |

### 5.2 Progress bar / ring

- **Target goals:** a horizontal bar, 6px tall, track `neutral-800`, fill gold, rounded ends. When the
  subject can move in either direction (bodyweight), the bar instead centers on the starting value and
  fills toward the target from wherever the current value sits — labelled with both ends
  (`82.4 → 78.0 kg`), so a goal to *lose* weight doesn't render as an empty bar creeping backward.
- **Streak goals:** a strip of `window_days` (or, for "in a row", a rolling 14-day view) small squares,
  filled gold for a qualifying day, hollow `neutral-800` otherwise, today outlined in accent if not yet
  qualified.
- Both carry an `aria-label` stating the plain-language progress ("312 of 400 kilograms", "4 of the last 5
  days").

### 5.3 Goal detail sheet

Opens from the Home row or from "Add goal" on a tracker/workout screen.

| # | Element | Details |
|---|---------|---------|
| 1 | Header | Label, editable inline · Cancel/Done |
| 2 | Big progress | The same bar/strip as §5.2, scaled up, with the current and target numbers in mono above it |
| 3 | Kind-specific fields | Target: a single numeric field (keypad, unit inherited from the subject). Streak: a stepper for `target_count` and a segmented `window_days` control (7 / 30 / "in a row"). |
| 4 | Subject | Read-only once created — shown as a chip + name, e.g. "Deadlift". Changing the subject means deleting and recreating the goal. |
| 5 | Actions | Pause/Resume · Delete. A completed goal instead shows "Completed 12 Sep" and only Delete. |

### 5.4 Adding a goal from its subject

Every tracker detail screen and every workout's row in the library picks up a muted "Add goal" affordance
when it has none, and shows its live progress bar inline when it does (directly under the hero number on a
tracker, under the exercise name in the library and in the plan editor's exercise row).

## 6. Acceptance criteria

1. Creating a target goal of 400kg on Deadlift shows `0 / 400 kg` until a set is logged, then updates to
   the best `reps × weight` (or `weight` when `target_metric = 'weight'` for a 1RM-style target) after every
   session, with no separate goal-logging step.
2. A bodyweight target to reach 78kg from a starting point of 84kg renders progress growing as the number
   falls, not as an empty bar.
3. A streak goal "5 days in the last 7" counts distinct calendar days with a Gym entry, recomputed live as
   sessions are logged, and reads `aria-label` correctly at 0, partial and full.
4. A goal automatically flips to Completed the render after its computed progress reaches 100%, with no
   user action.
5. A completed goal shows a checkmark on Home for 7 days, then only appears from Settings' archive.
6. Pausing a goal removes it from the Home summary but keeps its progress computation intact for when it's
   resumed.
7. Home's Goals summary never shows more than 3 rows plus an overflow line.
8. Deleting a goal does not delete or alter any `entry`/`set_log` data.
9. Attempting a second active target on a subject that already has one shows a warning, not a hard block.

## 7. Open questions

| # | Question | Default |
|---|----------|---------|
| Q1 | Should goals support a deadline later? | Not in v1 — open questions like this get their own story once the flexible-goal need proves out. |
| Q2 | Can a streak goal span multiple trackers ("any workout")? | No — one subject per goal, kept simple. |
| Q3 | What happens to a goal if its subject (a workout) is archived? | The goal pauses automatically with a note, rather than silently going stale. |

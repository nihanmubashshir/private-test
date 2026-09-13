# US-005 — Workout library and gym plans

> Status: **Draft** · Depends on: US-002
> Read [`00-overview.md`](./00-overview.md) first.
> Pairs with [US-006](./US-006-gym-session.md), which runs the session this story sets up.

## 1. User story

> **As** someone who trains on a weekly split that changes every few months,
> **I want** to define my regular exercises once, build several weekly plans from them, and mark one as
> active,
> **so that** when I get to the gym the app already knows what today's session is, and switching blocks is
> one tap rather than a rebuild.

## 2. The three halves

This story is deliberately three things, because each is meaningless without the one below it:

1. **Workout library** — the static-ish list of regular exercises (deadlift, bench press, …), each
   declaring *what gets tracked* when you do it. This is what "custom trackers" means in the gym context:
   a workout decides its own fields.
2. **Plan library** — several named weekly plans ("Push/Pull/Legs", "Winter strength", "Holiday minimal").
   Exactly one is **active** at a time; the active plan is the only one Home reads.
3. **Weekly plan** — within a plan, seven weekday slots, each either a rest day or a named session holding
   an ordered list of exercises with target sets, reps and weight.

### In scope
- CRUD on workouts in the library.
- Per-workout choice of tracked fields.
- CRUD on plans: create, rename, duplicate, delete, and set one as active.
- A weekly plan editor scoped to the plan being edited: name a day, add/remove/reorder exercises, set targets.
- Seeding the library with a starter set of common lifts and one empty starter plan.
- Home showing today's day **from the active plan**.

### Out of scope
- Plan history — which plan was active on a past date is not recorded beyond the session's own snapshot.
- Mesocycles, scheduled plan switches, or week-over-week progression within a plan.
- Plans longer or shorter than seven days.
- Supersets, drop sets, tempo, RPE, rest-timer configuration per exercise.
- Exercise instructions, images, or muscle diagrams.
- Progression logic, 1RM estimates, or suggested weights.
- Sharing or exporting a plan.

## 3. What a workout tracks

Each workout declares which fields its sets record. This is the key extension point.

| Field | Type | Typical exercise |
|-------|------|------------------|
| `reps` | int 1–100 | deadlift, bench, pull-ups |
| `weight` | numeric kg, 0.5 steps | any loaded lift |
| `duration` | seconds | plank, dead hang |
| `distance` | metres | farmer's carry, sled |

Combinations the UI must handle as first-class: `reps + weight` (the common case), `reps` alone
(bodyweight), `duration` alone (holds), `duration + weight` (loaded carries by time),
`distance + weight` (carries by distance). A workout stores `tracks: string[]` and the set-logging UI in
US-006 is generated from it — no per-exercise special cases.

## 4. Data

```
workout                                  -- the library
  id             uuid pk
  name           text unique             -- 'Deadlift'
  group_name     text null               -- 'Back', 'Legs' — for grouping the picker only
  tracks         text[]                  -- ['reps','weight']
  unit_weight    text default 'kg'
  default_sets   int  default 3
  is_archived    boolean default false
  notes          text null               -- 'belt from 120kg'
  created_at     timestamptz

plan                                     -- the plan library
  id             uuid pk
  name           text not null           -- 'Push/Pull/Legs'
  is_active      boolean default false   -- at most one true, see below
  notes          text null
  created_at     timestamptz
  archived_at    timestamptz null

plan_day                                 -- exactly 7 rows per plan, one per weekday
  id             uuid pk
  plan_id        uuid fk -> plan on delete cascade
  weekday        int                     -- 0 = Monday … 6 = Sunday
  name           text null               -- 'Push A'; null means rest day
  is_rest        boolean default true
  unique (plan_id, weekday)

plan_item                                -- an exercise inside a plan day
  id             uuid pk
  plan_day_id    uuid fk -> plan_day on delete cascade
  workout_id     uuid fk -> workout
  position       int                     -- ordering within the day
  target_sets    int null
  target_reps    int null
  target_weight  numeric(6,2) null
  unique (plan_day_id, workout_id)       -- an exercise appears once per day
```

**Active-plan invariant.** Enforced in the database, not in application code:

```sql
create unique index plan_single_active on plan (is_active) where is_active;
```

Activating a plan is one transaction: clear `is_active` everywhere, then set it on the target. A plan with
no active sibling is legal — that state means "no plan", and Home shows the empty card from §5.1.

**Creating a plan** inserts the `plan` row plus all seven `plan_day` rows as rest days in the same
transaction, so the editor never has to create them. The migration seeds one plan named "My week", active,
all seven days rest.

Archiving a workout hides it from the picker but leaves it in existing plan items and past sessions.

**Deleting a plan** cascades its days and items. It is refused while the plan is active — activate another
first, or delete the last plan only when it is the only one left, which also clears the active state.
Past `gym_session` rows reference `plan_day`, so US-006 §3 holds `plan_day_id` as
`on delete set null` plus a denormalised `name` copied at session start; deleting a plan never destroys
training history, it only unlinks it.

## 5. Screens

### 5.1 Today's session card on Home

The first card under the header when today is not a rest day.

| State | Card contents |
|-------|---------------|
| Planned, not started | `dumbbell` chip + the day name ("Push A") · "5 exercises · about 45 min" from targets · primary "Start session" · a muted "View plan" link |
| Running (US-006) | Green dot + live elapsed in mono · "3 of 5 done" · primary "Resume" |
| Done today | Day name · duration in mono · "12 sets · 4,180 kg" · secondary "View session" |
| Rest day | A single quiet row, not a card: "Rest day" with a muted "Start a session anyway" link |
| No active plan | Card: "No active plan." · primary "Choose a plan" when plans exist, "Build your week" when none do |

The card reads only the **active** plan. The plan's name is not shown on the card — the day name is what
matters mid-week — but it appears as a muted line in the plan library and in the plan editor header.

### 5.2 Plan library (`/gym/plans`)

Pushed from the Home card's "View plan" link (which lands on the active plan's editor) via a "All plans"
action in that editor's header, and from Settings. Title "Plans".

| # | Element | Details |
|---|---------|---------|
| 1 | Active plan | A card at the top: plan name (20px/600), "Active" accent badge, a muted summary ("4 sessions · 3 rest days · 22 exercises"), and a secondary "Edit plan". |
| 2 | Other plans | A flat list under an "Other plans" eyebrow. Each row: name, the same summary in 13px muted, and a `⋯` menu — Make active · Edit · Duplicate · Rename · Delete. Tapping the row body opens its editor. |
| 3 | Create | Full-width secondary "New plan" → a small sheet with one Name field and a "Start from" select: *Empty week* or any existing plan (which duplicates it). |
| 4 | Archived | A collapsed "Archived" section at the bottom, if any. |

**Making a plan active** is immediate and optimistic: the badge moves, the row and card swap places with a
180ms cross-fade, and Home reflects it on next visit. No confirm — it is trivially reversible. A toast
confirms with the plan name, because the consequence (today's session changing) is off-screen.

Switching the active plan **never touches a running session**. A session in progress keeps its own copy of
the day name and its items; see US-006 §3.

### 5.3 Weekly plan editor (`/gym/plan/[planId]`)

Pushed, title = the plan's name, editable inline. Header carries an "Active" badge when this is the active
plan, and a `⋯` menu: Make active · Duplicate · Rename · Delete · All plans.

| # | Element | Details |
|---|---------|---------|
| 1 | Week strip | Seven pills, Mon–Sun, horizontally scrollable at 320px. The selected day is filled accent; days with a session show a small dot; today has a 1px accent ring. Tapping selects. |
| 2 | Day header | The day's name as an inline-editable field (placeholder "Name this day"), plus a "Rest day" toggle. Turning on Rest day keeps the items but greys the list and hides it from Home. |
| 3 | Exercise list | One row per `plan_item`: 32px chip, name (16px/600), targets beneath in 13px mono muted (`3 × 8 · 100 kg`), drag handle on the right. Reorder by drag with long-press to lift; swipe-left reveals Remove. |
| 4 | Add | Full-width secondary "Add exercise" → the picker sheet. |
| 5 | Copy | A muted "Copy from another day…" action, which duplicates another day's items. Saves a lot of tapping on an A/B split. |
| 6 | Summary | A muted footer line: "5 exercises · 15 sets planned". |

Every edit saves immediately and optimistically; there is no Save button and no dirty state.

### 5.4 Exercise picker sheet

Opens from "Add exercise". Tall sheet, ~85% of viewport.

| # | Element | Details |
|---|---------|---------|
| 1 | Header | "Add exercise" · Cancel |
| 2 | Search | Single field, filters as you type. This is the one place the OS keyboard is correct. |
| 3 | List | Grouped by `group_name`, each row a chip + name + `tracks` summary in 12px mono muted (`reps · weight`). Already-added exercises are shown disabled with an "Added" badge. |
| 4 | Create | A persistent bottom row: "Create new exercise" → §5.4. |

Tapping a row adds it to the day with `target_sets = default_sets` and, if the exercise has history, the
last-used reps and weight as targets. The sheet stays open for multiple adds; Cancel becomes Done once
something has been added.

### 5.5 Create / edit exercise sheet

| # | Element | Details |
|---|---------|---------|
| 1 | Name | Required, 1–60 chars, unique case-insensitively. Inline error on collision. |
| 2 | Group | Optional select from existing groups plus free text. |
| 3 | Tracks | Chips, multi-select: Reps · Weight · Duration · Distance. At least one required. Defaults to Reps + Weight. |
| 4 | Default sets | Stepper, 1–10, default 3. |
| 5 | Notes | Optional, 0–200 chars. |
| 6 | Save | Full-width primary. Editing also offers Archive, and Delete only when the exercise has no logged sets. |

### 5.6 Workout library (`/gym/workouts`)

Reached from Settings. A flat searchable list of all workouts with their `tracks` summary and a lifetime
set count; rows open the edit sheet. An "Archived" section collapses at the bottom.

## 6. Seed data

The migration seeds a small, opinionated set so the app is usable immediately — roughly: Squat, Deadlift,
Romanian Deadlift, Leg Press, Bench Press, Incline Dumbbell Press, Overhead Press, Barbell Row,
Lat Pulldown, Pull-up, Dumbbell Curl, Triceps Pushdown, Plank. Reps + weight on all but Plank (duration)
and Pull-up (reps). Grouped into Legs, Chest, Back, Shoulders, Arms, Core.

One plan named "My week" is seeded, active, with all seven `plan_day` rows as rest days.

## 7. Acceptance criteria

1. Creating an exercise with tracks `['reps']` produces a set logger in US-006 with only a reps field.
2. A duplicate exercise name is rejected with an inline error, case-insensitively.
3. An exercise cannot be added twice to the same plan day; it appears disabled with "Added" in the picker.
4. Reordering exercises persists across a reload.
5. Toggling a day to Rest removes its card from Home but keeps its exercises when toggled back.
6. "Copy from another day" duplicates items and targets, skipping any that would collide.
7. Deleting an exercise that has logged sets is not offered; archiving is.
8. An archived exercise disappears from the picker but still renders in past sessions and existing plans.
9. On the day matching a non-rest `plan_day` **in the active plan**, Home shows that day's card with the
   correct exercise count. A matching day in an inactive plan changes nothing on Home.
10. At most one plan is `is_active` at any time, enforced by a database index — two concurrent activations
    cannot both succeed.
11. Activating a different plan changes today's Home card to the new plan's day for today, with no reload.
12. Duplicating a plan copies all seven days, their names, rest flags, items, positions and targets, and
    the copy is **not** active.
13. Deleting the active plan is refused with an inline message naming the fix ("Make another plan active
    first").
14. Deleting a plan that has past sessions leaves those sessions intact and still readable, showing their
    stored day name.
15. Renaming a plan updates the editor title, the plan library and the Settings row, and never touches
    session history.
16. With zero plans, Home shows "Build your week" and the plan library shows only "New plan".
17. At 320px the week strip scrolls horizontally and no other element overflows.
18. Every row and control is at least 44px tall; drag handles have a 44px hit area.

## 8. Open questions

| # | Question | Default |
|---|----------|---------|
| Q1 | Can a weekday hold two sessions (AM/PM)? | No. One session per weekday per plan. |
| Q5 | Can plans be archived as well as deleted? | Yes — archive keeps it out of the list without losing it. Delete is for mistakes. |
| Q6 | Should a session record which plan it came from, not just which day? | It stores `plan_day_id` plus a copied day name. Adding `plan_id` too is cheap and worth it if you ever want "sessions on this block". Defaulting to day only. |
| Q2 | Should targets be required? | No — an exercise with no targets is valid and logs freely. |
| Q3 | Estimated duration on the Home card — where from? | `target_sets × 2.5 min`, rounded to 5. Crude but useful; drop it if it annoys. |
| Q4 | Weight increments? | 0.5 kg steps, and the keypad allows any one-decimal value. |

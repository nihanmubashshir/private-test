# US-012 — Goals: target and streak

> Status: **Done** · Depends on: [US-009](US-009-weight-tracking.md), [US-011](US-011-gym-session.md)
> Part of the [design-2 roadmap](../design-2-roadmap.md). Renumbered from the designer's draft
> [`US-007-goals.md`](../../design/design-2-stories/US-007-goals.md).

## 1. User story

> **As** someone who tracks things to actually move a number,
> **I want** to set a goal on almost anything I track and see how close I am,
> **so that** logging isn't just a diary — it points somewhere.

## 2. What a goal is

One number, tracked against one thing. **Goals never introduce their own logging step** — progress
is always derived from `weigh_ins`, `runs`, `gym_sessions` and `set_logs`, and never stored.

| Kind | Subjects | Progress |
|------|----------|----------|
| `target` | weight, an exercise | Weight: distance closed from `start_value` to the target, so losing weight fills the bar. Exercise: the best working set by `target_metric` (heaviest set, most reps, or best set volume) over the target |
| `streak` | weight, running, gym, an exercise | Distinct qualifying **days** — in a trailing 7/30-day window, or consecutively ("in a row") |

## 3. Data

`supabase/migrations/20260913115735_goals.sql` — one `goals` table and three enums.

The draft used a polymorphic `subject_type` + `subject_id` with no foreign key. There is no tracker
table here (roadmap D1), so the built-in trackers are **enum values** and an exercise is a **real
FK** — deleting an exercise cascades to its goals rather than leaving one pointing at nothing.

Every kind-specific rule is a CHECK constraint (a workout subject has a `workout_id` and nothing else
does; a target has a value; a streak's count fits its window; `completed_at` is set iff completed).
The Server Action mirrors them in zod so the owner gets a sentence, not a `23514`.

`start_value` for a weight target is **read by the Server Action** from the latest reading at
creation, not trusted from the client, so the bar has a fixed origin.

## 4. Where progress is computed

**On the client**, in `src/lib/goals/types.ts` (deliberately not `server-only`). A streak counts
*days*, and a day only exists in a time zone — the app zone from US-008. The server ships raw
timestamps via `loadGoalInputs()` (one query per subject actually needed, a year of history), and
the client turns them into progress with an explicit zone, never the server's (overview §6.2).

With a configured zone that happens during SSR with the same zone the client uses, so Home renders
goals in their final order on first paint. Only an unconfigured install waits for mount, behind
fixed-height placeholders.

### 4.1 Auto-completion

A goal flips to `completed` the render after its progress reaches 100% — `use-auto-complete.ts`
calls `completeGoal`, an idempotent write (`where status = 'active'`, so a repeat, a race, or a
paused goal are all no-ops). It is client-triggered because only the client can compute a streak.

The hook's effect depends on a **sorted string of due ids**, not the array: an array rebuilt every
render is a new identity every render, and an effect downstream of an unstable identity re-fires
forever (US-009 §10.1).

## 5. Screens

| Where | What |
|-------|------|
| Home | Up to 3 rows under the header — active nearest-to-done first, then goals completed in the last 7 days with a check — plus "+N more". Hidden when there are none |
| `/goals` | Active, Paused and Completed sections; New goal; a detail sheet with Pause/Resume and Delete. Also the archive for completed goals once they leave Home |
| `/weight` | "Add a goal" → `/goals?new=weight` with Weight preselected |
| Settings | A Goals row |

## 6. Tasks

| # | Task |
|---|------|
| T1 | Migration: `goals`, three enums, CHECK constraints |
| T2 | `lib/goals/{types,queries}.ts` and the Server Actions |
| T3 | `goal-progress.tsx` (bar and streak strip), `use-auto-complete.ts` |
| T4 | Create sheet |
| T5 | `/goals` screen and detail sheet |
| T6 | Home summary, Settings row, `/weight` entry point |
| T7 | Docs pass |

## 7. Acceptance criteria

1. A 180kg heaviest-set target on Deadlift reads `0 / 180 kg` until a set is logged, then the best
   working set after every session, with no goal-logging step.
2. A bodyweight target of 78kg created at 84kg fills as the number falls.
3. "Gym 5 of the last 7 days" counts distinct days with a finished session in the app zone, and its
   `aria-label` reads correctly at 0, partial and full.
4. A goal flips to Completed the render after its progress reaches 100%, with no user action.
5. A completed goal shows on Home with a check for 7 days, then only in `/goals`.
6. Pausing removes a goal from Home but keeps its progress intact for when it's resumed.
7. Home never shows more than 3 goal rows plus an overflow line.
8. Deleting a goal changes no `weigh_ins`, `runs`, `gym_sessions` or `set_logs`.
9. A second active goal of the same kind on the same subject shows a warning, not a block.

## 8. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | Enum subjects + a real FK, not `subject_type` + polymorphic `subject_id` | §3 — no tracker table, and a polymorphic id can't be a foreign key. |
| D2 | Targets only on weight and an exercise; running and gym are streak-only | Neither has a single number to "reach" without inventing one (longest run? total minutes?). Every example in the draft fits this split. |
| D3 | Progress bars and streak squares are **neutral, not gold**; success once reached | Design-system §10.2 names progress bars explicitly as never gold, and the repo's guide outranks a story draft on appearance (§3 precedence). |
| D4 | A Home row opens `/goals?goal=<id>` rather than a sheet over Home | One detail sheet implementation instead of two. |
| D5 | "Add goal" exists on `/weight` only, not on exercise-library or plan-editor rows | Those rows already carry edit, reorder and remove controls; a fourth affordance there crowds a 320px row. `/goals` covers exercises. |
| D6 | The target field is a native number input, so the OS numeric keyboard opens | The keypad lives in an `EntrySheet`, and this field is already inside one; nesting vaul drawers is unreliable. The plan editor's target fields (US-010) have the same trade-off. |
| D7 | No editing a goal after creation — label, target and window are fixed | Changing a target silently rewrites what "progress" meant. Delete and recreate is explicit. |
| D8 | Archiving an exercise does not auto-pause its goals | The goal keeps computing from the sets that exist, which is still true; deleting the exercise removes the goal via the FK. |
| D9 | `pnpm db verify` not run | `SUPABASE_DB_URL` is empty in `.env.local`; see US-008 D3. |

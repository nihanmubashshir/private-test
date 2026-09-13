# US-009 — Weight tracking with trajectory

> Status: **Done** · Depends on: [US-007](US-007-app-shell.md), [US-008](US-008-app-time-zone.md)
> Part of the [design-2 roadmap](../design-2-roadmap.md). Renumbered from the designer's draft
> [`US-003-weight-tracking.md`](../../design/design-2-stories/US-003-weight-tracking.md).

## 1. User story

> **As** someone weighing myself most mornings,
> **I want** to record my weight to one decimal place in a couple of taps, with the time it was
> taken,
> **so that** I can see the trend over weeks rather than react to a single day's number.

## 2. Data

`weigh_ins` (`supabase/migrations/20260913112107_weigh_ins.sql`). **Not** the timed-entity template
(overview §6.3) — a weigh-in is an instant, not a session. It has no `ended_at` and no duration, and
two readings on the same morning are legal, so the template's `one_running` index and `no_overlap`
exclusion would all be wrong.

| Column | Notes |
|--------|-------|
| `measured_at` | When the reading was taken, not when it was typed |
| `time_zone` | The app zone (US-008), stored per record |
| `value_kg` | `numeric(5,2)`, CHECK 20–400 |
| `note` | Optional, 1–140 chars |

Index on `(owner_id, measured_at desc)` — every read is "newest first" or a range scan over it.

"Not in the future" is enforced in the Server Action, **not** as a CHECK constraint: a CHECK may
only use immutable expressions and `now()` is not one. Same call `runs` made in US-004 §4.3.

`numeric` arrives from PostgREST as a **string**, to avoid float rounding. `src/lib/weight/queries.ts`
converts once at the boundary so no caller has to guess.

## 3. The keypad

`src/components/ui/keypad.tsx` + `src/lib/weight/keypad.ts`.

Buttons, not `<input inputMode="decimal">`. `inputMode` only *suggests* a numeric keyboard: it still
opens one, still covers half the screen on a short phone, and still accepts a second decimal point.

Entry rules are **pure string transitions**, not number maths, because `"82."` is a legal
intermediate state no numeric type can hold and parsing early turns a half-typed `"8"` into a
weight. Rules: at most 3 integer digits and 1 decimal; a second `.` is ignored; a leading `.`
becomes `0.`; `0` followed by a digit replaces rather than appends.

**Range is validated on Save, never while typing.** On the way to `82` the value passes through
`8`, and flashing "must be at least 20 kg" mid-entry reads as the keypad rejecting the keypress.

## 4. Screens

### 4.1 Home card
Chip + name linking to `/weight`, hero number in mono, the weekly delta, the timestamp, a
sparkline, and Log weight — primary when nothing is logged today, secondary when something is.

**Neither direction is coloured.** A gain is not an error state, so both arrows are `neutral-300`.

"Logged today" is derived **on the client**, not the server: "today" depends on the app zone, and
until one is configured that is the device's, which only the client knows.

### 4.2 Log sheet
An `EntrySheet` (US-007 T8) holding the value display, keypad, a date + time row, an optional note,
and Save.

The value starts **empty with the last reading as a muted placeholder**, never prefilled. Prefilled
plus a Save button is a one-tap way to silently re-log yesterday's number, which then looks like a
real reading forever.

### 4.3 `/weight` detail
Hero, a `1M · 3M · 6M · 1Y · All` segmented control (never gold, §10.2), the chart, a three-cell
stats row, Log weight, and the readings list.

The range lives in the URL (`?range=`), so it survives a reload and a back navigation.

## 5. The chart

`src/components/charts/weight-chart.tsx`, hand-rolled SVG (roadmap D3 — no charting dependency).

- **The y axis never includes zero.** On a weight chart a zero baseline compresses a real 1kg change
  into nothing, which is worse than no chart. Extent is the data padded 5%; a flat series gets an
  artificial ±0.5kg rather than dividing by a zero range.
- **7-day moving average** behind the raw line, for ranges of 3M and longer. Day-weighted, not
  sample-weighted, so weighing twice one morning and not at all the next does not shift it.
- **A gap over 14 days breaks the line**, so a long pause never renders as a smooth trend.
- Points are drawn only under 40 readings; beyond that the line alone reads better.
- Drag to scrub; the value is announced in an `aria-live` caption, not just drawn.
- Under two readings the chart is replaced by a sentence, not an empty grid.

**Axis labels are positioned HTML, not SVG `<text>`.** The plot stretches to fill the width with
`preserveAspectRatio="none"`, and a non-uniform scale squashes text horizontally. The sparkline
takes the opposite trade — uniform aspect ratio, because stretching would turn its end-point dot
into an ellipse.

## 6. Delete

Optimistic, with an **Undo toast** for 5 seconds rather than a confirm sheet: the row vanishes
immediately and recovery is one tap. A confirm on every delete costs a tap every time to guard
against something trivially reversible.

Undo **re-creates** rather than un-deletes, so the restored row has a new id. Nothing references a
reading by id, and the alternative is a soft-delete column every query then filters on forever.

## 7. Tasks

| # | Task |
|---|------|
| T1 | Migration: `weigh_ins` + RLS + aal2 + index. Pushed to hosted, types regenerated |
| T2 | `lib/weight/{queries,range,limits}.ts` and the create/update/delete Server Actions |
| T3 | `ui/keypad.tsx` + `lib/weight/keypad.ts` |
| T4 | Log-weight sheet |
| T5 | `charts/sparkline.tsx`, `lib/weight/{series,summary}.ts`, Home card |
| T6 | `/weight` detail: hero, range, chart, stats, list |
| T7 | Edit and optimistic delete with Undo |
| T8 | Docs pass |

## 8. Acceptance criteria

1. Logging `82.4` stores `82.40` and displays `82.4 kg`.
2. The OS keyboard never opens anywhere in the log flow except the note field.
3. A second decimal point, or a second digit after it, has no effect.
4. `19.9` or `400.1` cannot be saved and shows an inline range message **on Save**, not while typing.
5. Save with nothing typed is impossible, and the placeholder is never submitted.
6. The time defaults to now, can be edited to any past datetime, and cannot be set in the future.
7. Home shows the most recent reading by `measured_at`, not by insert order.
8. The chart's y axis excludes zero: with readings between 82.0 and 83.5, the lowest gridline is
   above 80.
9. With one reading, sparkline and chart degrade to a message with no broken axes.
10. Switching range re-scales the axis and updates all three stats.
11. Deleting removes optimistically and can be undone from the toast for 5 seconds.
12. Neither an increase nor a decrease is coloured as success or danger.
13. At 320px the keypad fits with no horizontal scroll and keys stay at least 56px tall.
14. The sheet body scrolls, so Save is reachable on a short phone.

## 9. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | No `tracker`/`entry` table; `weigh_ins` is its own table | Roadmap D1. A polymorphic `entry.value` is null for every duration row and the meaning of `occurred_at` changes per kind — a constraint set the database cannot express. |
| D2 | Route is `/weight`, not `/t/[trackerId]` | Roadmap D2 — there is no `tracker` table to key that route on. |
| D3 | No charting library | Roadmap D3. The non-zero axis, the day-weighted average and the 14-day line break are all axis maths a library would have to be fought to produce. |
| D4 | Delete uses an Undo toast, not swipe-to-delete | Swipe conflicts with the horizontal gestures US-010's plan editor needs, and an Undo toast is recoverable where a swipe is not. |
| D5 | The draft's offline criterion (log a weight in airplane mode) is descoped | Roadmap L2 — no offline write queue. |
| D6 | `pnpm db verify` not run | `SUPABASE_DB_URL` is empty in `.env.local`; see US-008 D3. |

## 10. Bugs found on device, after "typecheck and build pass"

Recorded because all three passed every automated check in this repo:

1. **The keypad appeared to do nothing.** `useWriteTimeZone()` returned a new function identity on
   every render and sat in the reset effect's dependency array, so the effect re-ran on every render
   and called `setValue("")` — each digit was appended and wiped before paint. Fixed by memoising
   the getter and resetting only on the open transition. **Any hook returning a function must be
   memoised**; an unstable identity silently re-fires every effect downstream of it.
2. **Range validation fired while typing** (§3).
3. **The sheet body did not scroll**, so the keypad pushed Save off a short screen (US-007 T8 now
   always scrolls the body).

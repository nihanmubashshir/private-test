# US-003 — Weight tracking to one decimal, with trajectory over time

> Status: **Draft** · Depends on: US-002
> Read [`00-overview.md`](./00-overview.md) first.

## 1. User story

> **As** someone weighing myself most mornings,
> **I want** to record my weight to one decimal place in a couple of taps, with the time it was taken,
> **so that** I can see the trend over weeks rather than react to a single day's number.

## 2. Scope

### In scope
- A `measurement` tracker kind, seeded with one instance: Weight, unit `kg`, precision 1.
- Logging a weight in a bottom sheet with a purpose-built decimal keypad.
- The reading's timestamp, defaulted to now, editable.
- A Weight card on Home: latest value, change since a chosen baseline, and a sparkline.
- A tracker detail screen with a full chart, range selector, stats, and the list of readings.
- Editing and deleting a reading.
- At most one reading per day is the norm, but more are allowed.

### Out of scope
- Goal weight, target lines, or projections.
- Body fat, measurements, photos.
- Importing from a scale, Apple Health, or Google Fit.
- Reminders or notifications.
- lb support (see overview Q1).

## 3. Terminology note

"See the trajectory on a map" is read here as **a line chart over time**, not a geographic map. If a map
was meant literally — plotting where a reading was taken — say so and it becomes a separate story.

## 4. Data

Uses the shared `entry` table from the overview:

- `value` — `numeric(7,2)`, stored in kg. Accepted range 20.0–400.0. Rejected outside that.
- `occurred_at` — when the reading was taken, not when it was typed. Defaults to now, editable, may not be
  in the future.
- `ended_at` — always null for measurements.
- `source` — `'manual'` always for this story.
- `note` — optional, 0–140 chars, e.g. "after gym".

Constraints: `value` not null when the tracker's kind is `measurement`; `occurred_at <= now()`.
Index on `(tracker_id, occurred_at desc)`.

A "day" for grouping and for "today" is computed in the app's configured timezone (overview Q2).

## 5. Screens

### 5.1 Weight card on Home

| # | Element | Details |
|---|---------|---------|
| 1 | Chip + name | `scale` icon in a 40px chip, "Weight", chevron to the right — the whole card header is the link to detail. |
| 2 | Hero number | The latest reading, mono, 40px, with the unit at 16px in muted grey: `82.4 kg`. This is the largest thing on the card. |
| 3 | Delta | Change vs the reading closest to 7 days ago: `−0.6 kg this week`, 14px. Green when moving toward nothing in particular — **no colour judgement on direction**; use `neutral-300` for both up and down, with an arrow glyph. A gain is not an error state. |
| 4 | Timestamp | `Today, 07:12` / `Yesterday, 07:40` / `Fri 5 Sep, 07:20`, 13px muted. |
| 5 | Sparkline | Last 30 days, ~48px tall, 1.5px gold line, no axes, no fill, last point marked with a 3px dot. Renders as a flat muted line when there are fewer than 2 readings. |
| 6 | Action | "Log weight" — primary if there is no reading today, secondary if there is. |

**Empty state:** hero shows `—`, body reads "No readings yet.", action is a primary "Log your first weight".

### 5.2 Log-weight sheet

Slides up from the bottom. Height fits content; no scrolling.

| # | Element | Details |
|---|---------|---------|
| 1 | Header | "Log weight" left, "Cancel" right, both 44px. |
| 2 | Value display | Mono, 48px, centered, with the unit beside it. Shows the in-progress value; a thin gold caret marks the insertion point. Starts **empty with the last reading as a placeholder in muted grey**, so tapping Save with no input does nothing rather than re-logging yesterday's number. |
| 3 | Keypad | A custom 3×4 grid: `1–9`, `.`, `0`, backspace. Keys are at least 56px tall, mono 24px, `neutral-900` with a `neutral-800` hairline, active state `neutral-800`. The OS keyboard never opens. |
| 4 | Time row | "Today, 07:12" with an edit affordance. Tapping opens a compact date + time picker in the same sheet. |
| 5 | Note | Optional single-line field, collapsed behind "Add note". |
| 6 | Save | Full-width primary, 52px, "Save". Disabled until the value parses and is in range. |

**Input rules:** one decimal point maximum; at most one digit after it; a leading `.` becomes `0.`; the
value is clamped to 20.0–400.0 with an inline message rather than silent correction. Haptic tick on each
key if the API is available.

### 5.3 Weight detail screen (`/t/[weightTrackerId]`)

Pushed, back chevron, title "Weight".

| # | Element | Details |
|---|---------|---------|
| 1 | Hero | Latest value at 40px mono + its timestamp, matching the card. |
| 2 | Range selector | A segmented control: `1M · 3M · 6M · 1Y · All`. Default `1M`. Selection persists. |
| 3 | Chart | See §6. |
| 4 | Stats row | Three cells: `Change` over the selected range (signed), `Lowest`, `Highest`, each mono with its date beneath in 12px muted. |
| 5 | Action | "Log weight" — secondary, full width. |
| 6 | Readings list | Grouped by month with a sticky-ish month label. Each row: date + time on the left (time in mono muted, 13px), value right-aligned in mono 16px, and the day-over-day delta in 12px muted under the value. Tap a row → edit sheet. Swipe or long-press → Delete, with an undo toast. |

## 6. The chart

Detail matters here; a badly scaled weight chart is worse than no chart.

- **Type:** line chart. 2px gold line, round joins, no area fill, no gradient.
- **Y axis:** scaled to the data in the selected range, padded by 5% above and below. **Never starts at
  zero** — a 1kg change must be visible. Two or three gridlines at round values, `neutral-800`, 1px, with
  labels in 11px mono `neutral-500` on the left, inside the plot.
- **X axis:** 3–5 date labels, 11px mono `neutral-500`, format matched to the range (`5 Sep`, `Sep`).
- **Trend line:** a 7-day moving average as a 1.5px `neutral-500` line behind the raw line, shown for
  ranges of 3M and longer. This is the "trajectory" — the raw line is noisy by nature.
- **Gaps:** days without a reading are interpolated by a straight segment, not broken. Readings more than
  14 days apart break the line, so a long pause does not read as a smooth trend.
- **Points:** drawn only when the range holds fewer than 40 readings; otherwise line only.
- **Interaction:** drag anywhere on the chart to scrub — a vertical `neutral-600` guide follows the touch
  and a small label above it shows that reading's value and date. Release dismisses it. No zoom, no pinch.
- **Sizing:** 180px tall on the detail screen, full card width, plus 12px of padding inside the plot so the
  first and last points are not clipped.
- **Accessibility:** the chart carries `role="img"` and an `aria-label` summarising range, direction and
  net change, e.g. "Weight, last 30 days: down 0.9 kilograms, from 83.3 to 82.4."
- **Fewer than two readings:** the chart is replaced by a one-line message, not an empty grid.

## 7. Acceptance criteria

1. Logging `82.4` from the keypad stores `82.40` and displays `82.4 kg`.
2. The OS keyboard never appears anywhere in the log-weight flow.
3. Typing a second decimal point, or a second digit after the point, has no effect.
4. A value of `19.9` or `400.1` cannot be saved and shows an inline range message.
5. Saving with no input typed is impossible — Save is disabled and the placeholder is never submitted.
6. The reading's time defaults to now, can be edited to any past datetime, and cannot be set in the future.
7. On Home, the card shows the most recent reading by `occurred_at`, not by insert order.
8. The chart's y axis excludes zero: with readings between 82.0 and 83.5, the lowest gridline is above 80.
9. With one reading, both sparkline and chart degrade to a message with no broken axes.
10. Switching range re-scales the axis and updates all three stats.
11. Deleting a reading removes it optimistically and can be undone from the toast for 5 seconds.
12. Neither an increase nor a decrease is coloured as success or danger.
13. At 320px wide the keypad fits with no horizontal scroll and keys stay at least 56px tall.

## 8. Open questions

| # | Question | Default |
|---|----------|---------|
| Q1 | Baseline for the card delta — 7 days, or since the start of the range? | Closest reading to 7 days ago, labelled "this week". |
| Q2 | More than one reading a day — average them or show the latest? | Show the latest on Home; plot all points on the chart. |
| Q3 | Does the keypad need a unit toggle? | No. One app-wide unit. |

# US-004 — Running tracker

> Status: **Ready** · Depends on: [US-003 Global stopwatch](US-003-global-stopwatch.md) (must be done first)
> Read [`../00-overview.md`](../00-overview.md) §6 and [`../01-design-system.md`](../01-design-system.md) first.

## 1. User story

> **As** the sole owner,
> **I want** to time my runs with the global stopwatch or add them by hand, each with a **date, start time, stop time, and a derived
> duration**, and see them in a list I can edit,
> **so that** I have a clean, trustworthy running log to analyze later.

## 2. Scope

### In scope
- `runs` table (timed-entity template) and the `running` registry entry.
- `/running`: stopwatch control, "Add run manually", and the runs list.
- `/running/new`: manual entry.
- `/running/[id]`: edit and delete.
- `/` (home): replace the "You're signed in." placeholder with a tracker entry point.

### Out of scope (future)
- **Analytics** (totals, streaks, charts, trends). The data model is ready for it (§3.3), but nothing is built now.
- Distance, pace, notes, route/GPS, heart rate, perceived effort. A later story adds columns.
- Import/export, bulk edit.

## 3. Data

### 3.1 Entry fields

| Field (UI) | Stored as | Notes |
|------------|-----------|-------|
| Date | not stored | Derived in the client: `dateKey(started_at, time_zone)` / `formatDate` |
| Start time | `started_at timestamptz` (UTC ISO from the client) | |
| Stop time | `ended_at timestamptz` (UTC ISO from the client) | `null` while the stopwatch runs |
| Time zone | `time_zone text` (IANA, from the client) | Kept separate from the timestamps |
| Duration | `duration_seconds integer`, **generated** | Never sent by the client |

### 3.2 Migration `supabase/migrations/<ts>_runs.sql`

Copy the **timed-entity template (overview §6.3)** with `<entity>` = `runs`, including RLS, the aal2 policy, the one-running index,
the no-overlap constraint, the `(owner_id, started_at desc)` index, and the `updated_at` trigger. Add nothing else.

Then:
- The operator applies it to the hosted project (SQL Editor).
- Regenerate `src/lib/supabase/database.types.ts`. `pnpm db:types` targets a local stack that isn't available, so use
  `supabase gen types typescript --project-id <ref>` (after `supabase login`) and add this as a `db:types:remote` script. If that isn't possible,
  hand-edit the types to match the migration exactly and note it under Deviations.
- Verify the US-003 §5.1 note: an `authenticated` update fires the `updated_at` trigger.

### 3.3 Why this shape suits future analytics
`duration_seconds` is precomputed, `started_at` is indexed, and the local calendar day is available in SQL as
`(started_at at time zone time_zone)::date`. No schema change is needed for totals per day, week, or month.

### 3.4 Registry
Add `running: { table: "runs", label: "run", activeLabel: "Running", href: "/running" }` to `src/lib/stopwatch/registry.ts`.

### 3.5 Queries — `src/lib/runs/queries.ts` (`import "server-only"`)

| Function | Query |
|----------|-------|
| `listCompletedRuns(supabase, limit)` | `select id, started_at, ended_at, time_zone, duration_seconds from runs where ended_at is not null order by started_at desc limit $limit` |
| `getRun(supabase, id)` | Single row by id, or null |
| `getLastCompletedRun(supabase)` | `listCompletedRuns(…, 1)[0] ?? null` |

Queries return raw ISO strings and time zone names. **No formatting on the server.**

## 4. Screens

Design them from the system (01-design-system §7). Signed-in layout: top bar + `max-w-[1120px] mx-auto px-4`. On mobile, page content uses
a single column, `max-w-md` from `sm:` up (centered), and 20–24px vertical gaps.

All date/time text below is rendered by **client components** from ISO + `time_zone` via `src/lib/time/format.ts`. Times and
durations use DM Mono with tabular digits.

### 4.1 `/` (home)

- h1 `Dashboard` (`text-h1`), 28px top padding.
- Eyebrow `TRACKERS`, then one `Card` per registry entry. For now there is one: **Running**.
- Running card, a full-card link to `/running` (≥56px, hover `surface-hover`, focus ring):
  - Left: `Running` (`text-control` weight 600) and a subline (`text-body-sm` `neutral-400`):
    - running → a `success-400` dot + `Running · ` + `StopwatchElapsed size="bar"` (inline, 14px)
    - else, a last run exists → `Last run · Sun, 13 Sep · 32m 10s`
    - else → `No runs yet`
  - Right: a `›` chevron in `neutral-500`.
- Remove the `aal2` badge and the "You're signed in." placeholder.

### 4.2 `/running`

Top to bottom:
1. Back link: ghost `sm` button `‹ Dashboard` → `/`.
2. h1 `Running`.
3. `StopwatchControl kind="running"` (US-003). The primary button reads `Start run` / `Stop`.
4. Secondary full-width button (link) `Add run manually` → `/running/new`.
5. Section eyebrow `RUNS`.
6. **Runs list** (`src/app/(app)/running/run-list.tsx`, `'use client'`), given the completed rows:
   - Group by `dateKey(started_at, time_zone)`. Group header row: `formatDate` (eyebrow style, `neutral-500`) on the left, and the day's total
     `formatDuration(sum)` (DM Mono 13px `neutral-400`) on the right.
   - A row per run, which is a link to `/running/[id]` with min height 56px, an 800 hairline between rows, and hover `surface-hover`:
     - Left: `06:42 – 07:14` (DM Mono 15px `neutral-50`). If `ended_at` falls on a later local date than `started_at`, append ` +1`
       (`neutral-500`). If `time_zone` ≠ device zone (after mount), a second line `GMT+6` in 11px DM Mono `neutral-500`.
     - Right: `32m 10s` (DM Mono 15px `neutral-300`). If `duration_seconds > 12h`, also show a warning `Badge` `Check times`
       (likely a forgotten stopwatch).
   - Empty state (no completed runs): `No runs yet. Start the stopwatch or add one manually.` (`text-body-sm` `neutral-400`).
   - Below the list, if more runs may exist: secondary button (link) `Show more` → `/running?show=<current+30>`. Default 30, max 500.
     The `show` param is validated with zod; invalid values fall back to 30.
7. The running session (if any) is shown only in the control, never in the list.

### 4.3 `/running/new` and `/running/[id]`: run form

Shared client component `src/app/(app)/running/run-form.tsx`. **JavaScript is required** (converting times needs the client). The submit
button is disabled until hydrated.

| # | Element | Details |
|---|---------|---------|
| 1 | Back link | ghost `sm` `‹ Running` → `/running` |
| 2 | h1 | New: `Add run` · Edit: `Edit run` |
| 3 | Date | `Input type="date" name="date" required`. New: defaults to today in the device zone. Edit: `fromIso(started_at, time_zone).date`. |
| 4 | Start time | `Input type="time" name="start" required` (minute precision) |
| 5 | Stop time | `Input type="time" name="stop" required` |
| 6 | Duration preview | Live, `aria-live="polite"`: `Duration 32m 10s` in DM Mono. If stop < start: `Ends the next day` (`neutral-400`) and the duration counts the next day. If stop = start: field error on Stop, `Stop time must be after the start time.` |
| 7 | Time zone note | `text-sm neutral-500`. New: `Times in Asia/Dhaka (this device)`. Edit: `Times in <time_zone>`. **Edits interpret inputs in the run's stored zone**, and the zone is not changed. |
| 8 | Alert | Action error (one, above submit) |
| 9 | Submit | primary `lg` full width. New: `Save run` · Edit: `Save changes`. Pending: `Saving…` |
| 10 | Delete (edit only) | danger full-width `Delete run`, placed after a 32px gap below Save. It opens the `Sheet`: title `Delete this run?`, description `This can't be undone.`, confirm `Delete`. |

**Client-side submit logic:**
1. Zone: new → `getDeviceTimeZone()`; edit → the run's `time_zone`.
2. `startedAt = toIso({ date, time: start, timeZone })`. `endDate = stop < start ? addDays(date, 1) : date`,
   `endedAt = toIso({ date: endDate, time: stop, timeZone })`.
3. **Seconds preservation (edit):** if `date` and `start` are unchanged from the initial values, send the original `started_at` instead
   (keeps stopwatch seconds). Do the same for `stop`/`ended_at`.
4. Submit `id` (edit), `startedAt`, `endedAt`, `timeZone`.

**Server Actions** — `src/app/(app)/running/actions.ts`:

`createRun` / `updateRun` / `deleteRun`:
1. `await requireFull()`.
2. zod: `startedAt`/`endedAt` via `isoInstant`, `timeZone` via the `timeZone` schema, `id` uuid (update/delete). Rules:
   `endedAt > startedAt`; duration ≤ **24h**; `startedAt ≤ now + SKEW_TOLERANCE`; `endedAt ≤ now + SKEW_TOLERANCE` (no future runs).
3. Insert / `update … where id = $id and ended_at is not null` (a running session can't be edited here) / delete by id.
4. Errors: `23P01` → `This overlaps another run.`; `23514` → `Stop time must be after the start time.`; no row updated →
   `This run no longer exists.`; validation → field-specific message (`Runs can't be longer than 24 hours.`,
   `Runs can't be in the future.`); anything else → `Couldn't save the run. Try again.`
5. Success: `revalidatePath("/running")`, `revalidatePath("/")`, `redirect("/running")`.

**Edit page rules:** an invalid uuid or missing run → `notFound()`. A run that is still running → `redirect("/running")`.

## 5. Files

```
supabase/migrations/<ts>_runs.sql
src/lib/supabase/database.types.ts        (regenerated)
src/lib/stopwatch/registry.ts             (modified)
src/lib/runs/queries.ts
src/app/(app)/page.tsx                    (replaced)
src/app/(app)/running-card.tsx            ('use client')
src/app/(app)/running/page.tsx
src/app/(app)/running/run-list.tsx        ('use client')
src/app/(app)/running/run-form.tsx        ('use client')
src/app/(app)/running/actions.ts
src/app/(app)/running/new/page.tsx
src/app/(app)/running/[id]/page.tsx
package.json                              (db:types:remote script)
```

## 6. Tasks (in order)

Each task ends with `pnpm typecheck` green and one commit (`US-004 T<n>: …`).

| # | Task | Done when |
|---|------|-----------|
| T1 | **Migration + types + registry** (§3.2–3.4). | Hosted DB has `runs` with all constraints. Types regenerated. `updated_at` trigger verified. Typecheck green. |
| T2 | **`/running` with stopwatch + list** (§3.5, §4.2). | Start → wait → Stop creates a row that appears in the list with correct date, times, and duration. |
| T3 | **Manual add** (§4.3, create). | A manual run saves and appears in the correct day group. |
| T4 | **Edit + delete** (§4.3, update/delete). | Editing keeps seconds when times are untouched. Delete confirms via sheet. |
| T5 | **Home** (§4.1). | The card reflects running / last run / empty states. |
| T6 | **Verification** (§8) + README "Trackers" section + 01-design-system §8 rows for any new patterns (tracker card, list row). | Every AC checked by hand. |

## 7. Acceptance criteria

1. **Stopwatch run.** From `/running`: Start → wait ≥ 1 min → Stop. A new row shows the date and `HH:MM – HH:MM` in the device's zone, plus the
   correct duration. The DB row has UTC `started_at`/`ended_at`, the IANA `time_zone`, and a `duration_seconds` matching the UI.
2. **US-003 AC 5–11 pass** using the `running` kind (tap-time capture, retry, idempotent start, persistence across reload/PWA/devices,
   stale stop, global bar on `/` but not on `/running`, time zone stored separately).
3. **Discard.** Start → Discard → confirm: no row remains and the control is idle.
4. **Manual entry.** Adding `13 Sep, 06:00 – 06:45` saves a 45m run under Sun, 13 Sep 2026.
5. **Past midnight.** Adding `23:40 – 00:15` saves a 35m run grouped under the start date and shows `+1`.
6. **Validation.** Stop = start → field error. A run > 24h → error. A future run → error. A run overlapping another run (or the running
   session) → `This overlaps another run.`, and nothing is saved.
7. **Edit keeps seconds.** Editing only the date of a stopwatch run keeps the seconds of both times. Changing the start time sets its seconds to 00.
8. **Edit respects the stored zone.** A run recorded in `Asia/Dhaka`, edited from a browser with its time zone overridden to `Europe/London`, still
   shows and saves Dhaka wall times. The list shows a `GMT+6` label for it on that browser.
9. **Delete.** Delete → confirm removes the run, returns to `/running`, and the day total updates.
10. **Running session isolation.** A running session isn't listed, can't be opened at `/running/[id]` (redirects), and the edit
    action refuses it.
11. **Home card** shows `Running · <elapsed>` while running, `Last run · <date> · <duration>` otherwise, and `No runs yet` on an empty table.
12. **Security.** RLS is enabled with owner + aal2 policies. A request with an aal1 session reads zero rows and cannot insert.
    (This also closes US-001 AC 12, which was deferred.)
13. **Mobile quality.** `/`, `/running`, `/running/new`, and `/running/[id]` at 320px and 375px: no horizontal scroll, targets ≥44px, inputs
    ≥16px. The global bar never covers content.
14. **No server formatting.** US-003 AC 12 holds for all new files.

## 8. Manual verification plan

Mobile viewport (375px, then 320px) against the hosted project:
- Walk through AC 1–11 and 13 in order. Use devtools throttling/offline for US-003 AC 5–6, a second browser or the installed PWA for AC 7–9,
  and devtools time zone override for AC 8.
- AC 12: in the SQL Editor, confirm `relrowsecurity` is on and the policies exist. From the app, sign in without completing TOTP (aal1) and
  confirm the protected pages redirect. Via the Supabase REST API with an aal1 access token, confirm `select` returns `[]`.
- Inspect DB rows in the SQL Editor for AC 1, 4, 5, and 7.

## 9. Open questions (defaults apply)

| # | Question | Default |
|---|----------|---------|
| Q1 | Maximum run length for manual entries | 24h. Stopwatch runs can be longer, but runs over 12h get a `Check times` badge. |
| Q2 | List size | 30 most recent, with `Show more` in steps of 30 (max 500). |
| Q3 | Quick Start button on the home card? | No. The card links to `/running`, one tap away. |

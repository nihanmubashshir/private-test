# US-003 — Global stopwatch pattern

> Status: **Done** · Depends on: US-001 (done)
> **UX superseded by [US-005](US-005-mobile-redesign.md)** where screens, layout, or navigation differ. Data, security, validation, and time rules here still apply.
> Read [`../00-overview.md`](../00-overview.md) (especially §6 time handling and timed entities) and
> [`../01-design-system.md`](../01-design-system.md) first.
> This story builds a **reusable foundation with no tracker of its own**. The first consumer is
> [US-004 Running tracker](US-004-running-tracker.md), which is where the full flow is verified end to end.

## 1. User story

> **As** the sole owner,
> **I want** one consistent start/stop stopwatch that any tracker (running today, others later) can use, and that keeps
> going across pages, reloads, closing the app, and switching devices,
> **so that** every timed activity is recorded the same way and I never lose a session because I navigated away.

## 2. Scope

### In scope
- **Time utilities** (`src/lib/time/`): client-side formatting, time zone validation, and wall-time ↔ ISO conversion.
- **Timed-entity contract**: the SQL template (overview §6.3) plus a support migration (btree_gist, `updated_at` trigger function).
  **No entity table is created in this story.**
- **Stopwatch registry**: how a tracker opts in to the stopwatch.
- **Server data layer and Server Actions**: start, stop, discard, list active. All generic over the registry.
- **Client components**: the ticking elapsed display, the stopwatch control panel for a tracker page, and the global active-stopwatch bar.
- **Bottom sheet / dialog** component (from the design README), needed for the "Discard" confirmation.
- **App shell**: mount the global bar in `src/app/(app)/layout.tsx`.
- A shared `requireFull()` auth helper for protected pages and actions.
- Dev gallery (`/dev/ui`) sections for the new components, using mocked data.

### Out of scope
- Any concrete tracker or table (US-004 adds the first one).
- Pause/resume, laps, and splits. The data model is a single start and stop per session.
- Offline queueing, background notifications, lock-screen widgets.
- Analytics.
- Limiting the app to one running stopwatch in total. Each tracker can have one running at a time, and different trackers may run at once.

## 3. Concepts

| Term | Meaning |
|------|---------|
| **Timed entity** | A table whose rows are timed sessions (e.g. `runs`). It follows the template in overview §6.3: `started_at`, `ended_at`, `time_zone`, generated `duration_seconds`. |
| **Session** | One row. **Running** = `ended_at is null`. **Completed** = `ended_at` set. |
| **Kind** | A registry key for a timed entity (e.g. `running`). |
| **Stopwatch** | The UI + actions that create a running row (start), close it (stop), or delete it (discard). The stopwatch owns no data of its own. Its state *is* the entity row. |

Consequences:
- A running stopwatch survives reloads, closing the app, and other devices, because it lives in the database as a row with `ended_at` null.
- At most one running session per kind, enforced by a partial unique index (template).
- Completed sessions are ordinary rows. Manual entries (US-004) are inserted directly with both timestamps and never touch the stopwatch.

## 4. Time handling (applies overview §6.2)

1. **The client supplies every session timestamp.** At the moment of the tap, the client sends:
   - `at`: `new Date().toISOString()` (UTC ISO 8601, e.g. `2026-09-13T00:42:07.512Z`)
   - `timeZone`: `Intl.DateTimeFormat().resolvedOptions().timeZone` (IANA name, e.g. `Asia/Dhaka`), sent on start only
2. **They are stored separately:** `started_at` / `ended_at` (`timestamptz`, a UTC instant) and `time_zone` (`text`). The time zone is captured
   at start and applies to the whole session.
3. **The server never converts or formats times.** It never relies on its own time zone (Vercel runs in UTC), and it never uses `now()` for
   session timestamps. The server uses the current time only to **validate** client timestamps.
4. **All display conversion happens in client components**, using `src/lib/time/format.ts`, which always passes an **explicit `timeZone`
   (the session's `time_zone`)** and the fixed app locale. Because of that, server-side rendering of a client component produces the same output as the browser,
   so there are no hydration mismatches. Anything that depends on the *device's* time zone or the current time (e.g. "different time zone" labels) renders
   only after mount.
5. **Elapsed time** = `Date.now() − Date.parse(started_at)`, recomputed on every tick and clamped to ≥ 0. Never accumulate a counter.

## 5. Database

### 5.1 Migration `supabase/migrations/<ts>_timed_entity_support.sql`

```sql
-- Needed for the no-overlap exclusion constraint in the timed-entity template.
create extension if not exists btree_gist with schema extensions;

-- Shared updated_at trigger for all tables.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

- The `private` schema is revoked from `authenticated` (US-001 migration). **Verify in US-004** that the trigger fires for
  an `authenticated` update. If it doesn't, grant `usage on schema private to authenticated` plus `execute` on this one function, or make it
  `security definer`. Record the fix under Deviations.
- Hosted project: the operator applies migrations through the SQL Editor (see US-001 Deviations). The file in `supabase/migrations/`
  remains the source of truth.

### 5.2 Error codes the data layer must map

| Postgres code | Cause | Meaning to the stopwatch |
|---------------|-------|--------------------------|
| `23505` on `<table>_one_running` | A running session already exists | Start is idempotent: return the existing running session |
| `23P01` on `<table>_no_overlap` | Time range overlaps another session | "This overlaps an existing entry." |
| `23514` on `<table>_ends_after_start` | Stop ≤ start | "Stop time must be after the start time." |

## 6. Code

### 6.1 Time utilities — `src/lib/time/`

All functions are pure and take explicit inputs. They are safe to import from both client and server code, but **only client components call the
formatting functions** (§4.4).

| File | Exports |
|------|---------|
| `locale.ts` | `APP_LOCALE = "en-GB"`, `HOUR_CYCLE = "h23"` (single place to change) |
| `zone.ts` | `isValidTimeZone(tz)`: `try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true } catch { return false }`, with length ≤ 64. `getDeviceTimeZone()` (client only). |
| `format.ts` | `formatDate(iso, tz)` → `Sun, 13 Sep 2026` · `formatTime(iso, tz)` → `06:42` · `dateKey(iso, tz)` → `2026-09-13` (for grouping) · `formatElapsed(ms)` → `4:07` below 1h, `1:02:15` from 1h · `formatDuration(seconds)` → `45s`, `32m 10s`, `1h 02m` · `formatTimeZoneShort(iso, tz)` → `GMT+6` |
| `wall-time.ts` | `toIso({ date: "YYYY-MM-DD", time: "HH:MM", timeZone })` → UTC ISO · `fromIso(iso, timeZone)` → `{ date, time, seconds }` · `addDays(date, n)`. Implement with `date-fns` + `@date-fns/tz` (`TZDate`) so DST is handled. Document what happens with nonexistent or ambiguous local times (DST gaps). |
| `validate.ts` | zod schemas: `isoInstant` (`z.iso.datetime({ offset: true })` → Date), `timeZone` (refined with `isValidTimeZone`), plus `SKEW_TOLERANCE_MS = 5 * 60_000` |

Dependencies to add: `date-fns`, `@date-fns/tz`, and `server-only`.

### 6.2 Registry — `src/lib/stopwatch/registry.ts`

```ts
export interface StopwatchKindConfig {
  table: TimedTableName;        // a public table that follows the timed-entity template
  label: string;                // "run" – used in "Start run", "Run saved"
  activeLabel: string;          // "Running" – shown in the global bar
  href: string;                 // tracker page, e.g. "/running"
}

export const stopwatchKinds = {
  // Added by tracker stories. US-004 adds:
  // running: { table: "runs", label: "run", activeLabel: "Running", href: "/running" },
} satisfies Record<string, StopwatchKindConfig>;

export type StopwatchKind = keyof typeof stopwatchKinds;
```

- `TimedTableName` is derived from `Database["public"]["Tables"]`: names whose `Row` has `started_at`, `ended_at`, `time_zone`,
  `duration_seconds`. If deriving it is impractical with the generated types, use a hand-written union, which each tracker story extends.
- **Everything must typecheck with an empty registry.**
- Adding a tracker = add a migration from the template, regenerate types, and add one registry entry. No stopwatch code changes.

### 6.3 Auth helper — `src/lib/auth/require-full.ts`

`requireFull(): Promise<SupabaseClient<Database>>` creates the server client, runs `getAuthState`, and calls `redirect(homeFor(state))` unless
the state is `FULL`. Use it at the top of every protected page, data loader, and Server Action from now on. It replaces the inline check in
`(app)/layout.tsx`.

### 6.4 Server data layer — `src/lib/stopwatch/server.ts` (`import "server-only"`)

All functions take the request-scoped Supabase client and a `kind`, and resolve the table from the registry.

| Function | Behavior |
|----------|----------|
| `getActiveStopwatches(supabase)` | For every kind, in parallel: `select id, started_at, time_zone from <table> where ended_at is null limit 1`. Returns `ActiveStopwatch[] = { kind, id, startedAt, timeZone }[]`. |
| `startStopwatch(supabase, kind, { at, timeZone })` | Validate `at`: `now − 24h ≤ at ≤ now + SKEW_TOLERANCE`. Insert `{ started_at: at, time_zone: timeZone }` (`owner_id` defaults to `auth.uid()`). `23505` → `{ status: "already_running", active }` (fetch and return it). `23P01` → `{ status: "overlap" }`. Success → `{ status: "started", active }`. |
| `stopStopwatch(supabase, kind, { id, at })` | Fetch the running row by `id` (`ended_at is null`). None → `{ status: "not_running" }`. Validate `started_at < at ≤ now + SKEW_TOLERANCE`, otherwise `{ status: "invalid_time" }`. `update … set ended_at = at where id = $id and ended_at is null returning id, started_at, ended_at, duration_seconds`. No row updated → `not_running` (a race with another device). `23P01` → `overlap`. Success → `{ status: "stopped", session }`. |
| `discardStopwatch(supabase, kind, { id })` | `delete from <table> where id = $id and ended_at is null`. Returns `discarded` or `not_running`. |

`id` is required for stop and discard. That way a stale screen can never stop or delete a *different* session started later on another device.

### 6.5 Server Actions — `src/lib/stopwatch/actions.ts`

`startStopwatchAction`, `stopStopwatchAction`, `discardStopwatchAction`, each with the signature `(prev, formData) => StopwatchActionResult`:
1. `await requireFull()`.
2. zod: `kind` ∈ registry keys; `at` (`isoInstant`); `timeZone` (start only); `id` (uuid; stop and discard).
3. Call the data layer and map the status to `{ ok: boolean, status, message: string | null, tone }`:
   - `started` / `stopped` / `discarded` → ok. Stopped message: `"<Label> saved · <formatDuration>"` (success). The message is built on the
     client from the returned `session`, because the server does not format.
   - `already_running` → ok, no message (the UI simply shows the running state).
   - `not_running` → `"This stopwatch was already stopped."` (neutral).
   - `overlap` → `"This overlaps an existing entry."` (danger).
   - `invalid_time` / validation failure → `"Couldn't save that time. Check your device clock and try again."` (danger).
4. `revalidatePath("/", "layout")` after any change, so the global bar and tracker pages update.

### 6.6 Client components — `src/components/stopwatch/`

**`stopwatch-elapsed.tsx`** (`'use client'`)
- Props: `startedAt: string | null`, `size: "display" | "bar"`.
- Renders `formatElapsed(Date.now() − Date.parse(startedAt))`. Ticks by setting a `setTimeout` to the next whole second, then every 1000ms. Recomputes
  immediately on `visibilitychange` → visible. Clean up on unmount.
- `startedAt` null → `0:00` in `neutral-600`.
- DM Mono, `tabular-nums`. `role="timer"`, with `aria-live="off"` (screen readers must not announce every second) and an `aria-label`
  that updates at most every minute.
- Respects `prefers-reduced-motion`: nothing animates except the digits.

**`use-stopwatch-action.ts`** (hook)
- Wraps a stopwatch Server Action with `useActionState`/`useTransition`. **Captures `at = new Date().toISOString()` at click time**
  and keeps it in state. If the action fails (network error or thrown), the UI shows `"Couldn't reach the server."` with a **Retry** button,
  and the retry sends the **same `at`**. The saved time is the moment of the tap, not the moment of the successful request.
- Exposes `pending`, `result`, `run(formDataExtras)`, and `retry()`.

**`stopwatch-control.tsx`** (`'use client'`), the panel for a tracker page
- Props: `kind`, `active: ActiveStopwatch | null`, and `labels` from the registry.
- Layout (inside `Card`, full width):
  1. Eyebrow (11px DM Mono uppercase `0.1em` `neutral-500`): `STOPWATCH`.
  2. `StopwatchElapsed size="display"`: `text-display` DM Mono, centered.
  3. Running only: `Started 06:42` (`text-body-sm` `neutral-400`), formatted in the session's `time_zone`. After mount, if that zone ≠
     the device zone, append ` · GMT+6`.
  4. Idle: primary `lg` full-width **`Start <label>`**. Running: primary `lg` full-width **`Stop`**, then a ghost full-width
     **`Discard`**, which opens the confirm sheet.
  5. Result alert (one, directly above the primary button, per the design rules), or Retry.
- **JavaScript is required** (the client supplies `at` and `timeZone`). Buttons render `disabled` until hydrated.
- Pending: the button shows its spinner, and the label swaps to `Starting…` / `Stopping…`.
- Refreshes data (`router.refresh()`) on `visibilitychange` → visible and on window `focus`, throttled to once per 10s. That's how a session
  started or stopped on another device shows up.

**`active-stopwatch-bar.tsx`** (`'use client'`), mounted globally
- Props: `actives: ActiveStopwatch[]`.
- Hidden when there's nothing to show. Hides any item whose `href` matches the current `usePathname()`, because that page already shows the control.
- Fixed to the bottom: `fixed inset-x-0 bottom-0 z-20`, `bg-neutral-900`, `border-t border-neutral-800`,
  `padding-bottom: env(safe-area-inset-bottom)`. Content row `max-w-[1120px] mx-auto px-4`, min height 56px per active item.
- Row: an 8px `success-400` status dot, then a link to `href` (fills the remaining width, ≥44px tall) containing `activeLabel` (`text-body-sm`
  weight 600) and `StopwatchElapsed size="bar"` (DM Mono 20px, `neutral-50`), then a **secondary** `Stop` button (md, 44px). No gold here,
  because the page underneath may have its own primary action.
- Multiple actives stack as rows, separated by an 800 hairline.
- The layout adds bottom padding to `<main>` equal to the bar's height, so content is never covered (e.g. a CSS variable set by the bar, or
  a spacer rendered by the server layout from `actives.length`).
- Uses the same refresh-on-focus behavior as the control.

### 6.7 Bottom sheet — `src/components/ui/sheet.tsx` (`'use client'`)

Build the "Modal / bottom sheet" component **exactly as specified in `docs/design/README.md`**: a bottom sheet on mobile and a centered
dialog from `sm:`, with the scrim, grab handle, stacked actions (destructive first) on mobile and a row (Cancel then destructive) from `sm:`, focus
trap, Esc to close, `role="dialog" aria-modal="true"`, and the reduced-motion fallback. Use the native `<dialog>` element if it satisfies all of that.
Props: `open`, `onClose`, `title`, `description`, `confirmLabel`, `confirmVariant` (`danger` by default), `onConfirm`, `pending`.

Discard confirm copy: title `Discard this <label>?`, description `The stopwatch will stop and nothing will be saved.`,
confirm `Discard`.

### 6.8 App shell — `src/app/(app)/layout.tsx`

- Replace the inline auth check with `requireFull()`.
- Load `getActiveStopwatches(supabase)` and render `<ActiveStopwatchBar actives={…} />` after `<main>`.
- Make the brand in the top bar a link to `/` (tracker pages need a way home).

## 7. Files

```
supabase/migrations/<ts>_timed_entity_support.sql
src/lib/time/{locale,zone,format,wall-time,validate}.ts
src/lib/auth/require-full.ts
src/lib/stopwatch/registry.ts
src/lib/stopwatch/server.ts
src/lib/stopwatch/actions.ts
src/components/stopwatch/stopwatch-elapsed.tsx
src/components/stopwatch/use-stopwatch-action.ts
src/components/stopwatch/stopwatch-control.tsx
src/components/stopwatch/active-stopwatch-bar.tsx
src/components/ui/sheet.tsx
src/app/(app)/layout.tsx          (modified)
src/app/dev/ui/page.tsx           (modified: new sections)
```

## 8. Tasks (in order)

Each task ends with `pnpm typecheck` green and one commit (`US-003 T<n>: …`). Before using a Next.js API, read the matching guide in
`node_modules/next/dist/docs/` (see AGENTS.md).

| # | Task | Done when |
|---|------|-----------|
| T1 | **Support migration** (§5.1). Operator applies it to the hosted project. | Migration file committed; `btree_gist` and `private.set_updated_at` exist on the hosted DB. |
| T2 | **Time utilities** (§6.1) + dependencies. | Spot-checked in a scratch script: `toIso`/`fromIso` round-trip for `Asia/Dhaka`, `UTC`, and a DST zone (`Europe/London` on a change date). Formatters match the examples in §6.1. |
| T3 | **`requireFull` + registry + data layer + actions** (§6.2–6.5). Refactor `(app)/layout.tsx` to use `requireFull`. | Typecheck green with an empty registry. App behavior is unchanged. |
| T4 | **`StopwatchElapsed`, `useStopwatchAction`, `StopwatchControl`, `ActiveStopwatchBar`** (§6.6). | Dev gallery shows: elapsed idle, at 0:05, at 1:02:15 (mocked `startedAt`); control idle, running, pending, and each alert tone; bar with 1 and 2 actives. |
| T5 | **Sheet** (§6.7). | Gallery shows the sheet at 375px (bottom sheet) and ≥640px (dialog). Focus trap and Esc work. |
| T6 | **App shell** (§6.8): bar mounted, brand links home, main bottom padding. | With an empty registry the app looks exactly as before, apart from the brand link. |
| T7 | **Docs**: record new components in 01-design-system §8, and update §5 (sheet built). | Rows present. |

## 9. Acceptance criteria

Most of these can only be fully verified once US-004 registers the first kind. AC 1–4 are checked in this story, and AC 5–12 are checked again in US-004.

1. `pnpm typecheck` passes with an empty registry, and the app renders unchanged, apart from the brand linking to `/`.
2. The elapsed display never drifts. After 10 minutes in a background tab, returning shows the correct elapsed time immediately.
3. The elapsed display is correct across the 1-hour boundary (`59:59` → `1:00:00`) and uses tabular digits (no layout jitter).
4. The sheet meets every README requirement (mobile sheet, desktop dialog, focus trap, Esc, reduced motion).
5. **Start captures the tap moment.** With the network throttled so the request takes 5s, the saved `started_at` equals the tap time (±1s), not the response time.
6. **Retry keeps the original time.** With the network offline, Start shows the error. Coming back online and pressing Retry saves the original tap time.
7. **Idempotent start.** Double-tapping Start, or starting on two devices, results in exactly one running session.
8. **Survives everything.** A running stopwatch is still running, with the correct elapsed time, after a reload, after closing and reopening the installed PWA, and on a second device.
9. **Stale stop is safe.** Device A stops the session. Device B (stale screen) presses Stop: it shows "This stopwatch was already stopped." and changes nothing.
10. **Global bar.** While a session runs, every app page except its own tracker page shows the bar. Stop in the bar works. Page content is never hidden behind the bar at 320px/375px.
11. **Time zone stored separately.** The DB row holds a UTC `started_at` and the device's IANA `time_zone`. Changing the device time zone after starting does not change the displayed start time, which stays in the session's zone, with the zone label shown.
12. **Server never formats.** No `Intl.DateTimeFormat`, `toLocale*String`, or `date-fns` formatting in Server Components or Server Actions (`grep` of `src/app/**/page.tsx`, `layout.tsx`, `actions.ts`, and `src/lib/stopwatch/server.ts`).

## 10. Manual verification

In a 375px mobile viewport against the hosted project, check AC 1–4 using the dev gallery. AC 5–12 are walked through in US-004's plan. Use
devtools network throttling/offline for AC 5–6, two browsers for AC 7 and 9, and devtools "Sensors → Location/timezone override" for AC 11.

## 11. Open questions (defaults apply)

| # | Question | Default |
|---|----------|---------|
| Q1 | Allow several trackers running at once? | Yes: one running session **per tracker**, several trackers at once. |
| Q2 | Clock format | 24-hour, `en-GB` date style, set in `src/lib/time/locale.ts`. |
| Q3 | Show times in the session's recorded zone or the device's current zone? | The session's recorded zone, with a zone label when it differs from the device. |
| Q4 | Pause/resume? | Not supported. One continuous start → stop. |

# Design-2 roadmap

> Status: **Ready** · Last updated: 2026-09-13
> Audience: implementation agents. Read [`00-overview.md`](00-overview.md) and
> [`01-design-system.md`](01-design-system.md) first, then the story file you are building.

This is the plan for the feature wave described in [`docs/design/design-2-brief.md`](../design/design-2-brief.md).
It resolves that brief's open conflicts, fixes the story order, and lists the tasks.
The per-story files under [`stories/`](stories/) are the specs; this file is the map.

## 1. Story map

The designer's drafts in `docs/design/design-2-stories/` are numbered `US-002`–`US-009` and collide
with this repo's shipped `US-002`–`US-005`. Renumbering is explicitly free (brief, LOCKED), so the
drafts are renumbered into this repo's sequence:

| New | Draft | Title | Status | Depends on |
|-----|-------|-------|--------|------------|
| [US-006](stories/US-006-changelog.md) | US-004 | What's new (changelog) + Settings screen | Done | — |
| [US-007](stories/US-007-app-shell.md) | US-002 | App shell rework — Home as the only root | Done | US-006 |
| [US-008](stories/US-008-app-time-zone.md) | — | App-wide time zone setting | Done | US-006 |
| [US-009](stories/US-009-weight-tracking.md) | US-003 | Weight tracking with trajectory | Done | US-007, US-008 |
| [US-010](stories/US-010-gym-plans.md) | US-005 | Workout library and gym plans | Done | US-007 |
| [US-011](stories/US-011-gym-session.md) | US-006 | Gym session — timed, per-exercise logging | Done | US-010 |
| [US-012](stories/US-012-goals.md) | US-007 | Goals — target and streak | Done | US-009, US-011 |
| [US-013](stories/US-013-feature-requests.md) | US-008 | Feature request log | Planned | US-007 |
| [US-014](stories/US-014-radial-menu.md) | US-009 | Radial quick-action menu | Planned | US-013 |

**Why this order.** US-006 is first because the owner locked it — the changelog is how they follow
progress on their phone while the rest is built. US-008 (time zone) comes before US-009 because
"today" on the weight card is meaningless until the app has one authoritative zone. Gym is
contiguous (US-010 → US-011) because a plan with no session is inert. US-014 is last because it
fans out to actions the other stories create.

US-002 (password reset) stays paused. Do not build it.

## 2. Decisions this roadmap makes

Five come from the brief and are not open. Four are the implementer's call, made here.

### 2.1 Locked by the owner (brief §"Decisions already made")

| # | Decision |
|---|----------|
| L1 | **Time zone is a single app-wide value in Settings**, not the device zone. Amending AGENTS.md rule 10 and overview §6.2 is part of US-008. |
| L2 | **No offline write queue.** Optimistic UI with rollback and a Retry toast. No service worker, no IndexedDB outbox, no background sync. |
| L3 | **Architecture is the implementer's call** — take the screens and the feature set from the handoff, not its data model. |
| L4 | **Changelog first.** Order after that is open. |
| L5 | **Story numbering does not matter.** Renumbered in §1 above; no further effort spent on it. |
| L6 | **A signed-in owner never sees a 404.** An unknown route inside the app bounces to Home. Plus a custom error screen — the repo has neither `not-found.tsx` nor `error.tsx` today. Built as US-007 T1–T2. |
| L7 | **The radial menu's drawn layout is not binding.** The wheel is circular and sweeps from the bottom of the screen round to the right edge, not the draft's 200°–340° arc. US-014 designs it from the system. |
| L8 | **Framer Motion (`motion`) is approved** as a UI dependency, overriding design-system §9.1's list. CSS stays the default for simple state transitions; Motion is for gesture-driven and orchestrated movement — the radial wheel, sheets, shared-element pushes — where hand-rolled CSS would be worse. This is a phone, so nothing animates a property that forces layout.

### 2.2 Made here (the brief's L3 delegation)

**D1 — Concrete per-feature tables, not the designer's generic `tracker`/`entry`.**

The draft `00-overview.md` proposes a `tracker` table plus a polymorphic `entry` table carrying
`occurred_at` / `ended_at` / `value`, with gym sessions writing a denormalised `entry` row purely so
they appear in recent activity. This repo already has a better mechanism for exactly that:
`runs` on the timed-entity template (overview §6.3), plus the stopwatch registry
(`src/lib/stopwatch/registry.ts`), whose `listCompletedSessions()` already merges every registered
kind into one newest-first feed. Registering a kind is what puts it on Home — no shadow row needed.

So:

| Feature | Table(s) | Shape |
|---------|----------|-------|
| Running | `runs` (exists) | timed-entity template |
| Gym session | `gym_sessions` | timed-entity template, + `plan_day_id`, `name`; registered as a stopwatch kind |
| Gym sets | `set_logs` | child of `gym_sessions` |
| Gym library | `workouts`, `plans`, `plan_days`, `plan_items` | plain owner-scoped tables |
| Weight | `weigh_ins` | plain owner-scoped table — **not** a timed entity; a reading is an instant, not a session |
| Goals | `goals` | plain, progress always derived |
| Requests | `feature_requests` | plain, deliberately inert |
| Settings | `app_settings` | single owner row |

A polymorphic `entry.value` would be null for every duration row and a `numeric` for every
measurement row, with the meaning of `occurred_at` changing per `kind` — a constraint set the
database cannot express and every query has to re-check. Separate tables let each one carry its own
`check` constraints, and `gym_sessions` inherits the one-running / no-overlap / ends-after-start
guarantees already proven by `runs`.

**D2 — Routes stay concrete.** `/weight`, `/gym`, `/running`, not the draft's `/t/[trackerId]`.
There is no `tracker` table to key that route on, and a typed route per feature lets each screen
render the right thing (a run, a weigh-in, a session) instead of branching on `kind`.

**D3 — Charts are hand-rolled inline SVG** in `src/components/charts/`. No charting dependency.
Design-system §9.1 requires asking before adding a UI dependency, and the spec's requirements
(y axis that never includes zero, a 7-day moving average behind the raw line, a 14-day gap that
breaks the line, drag-to-scrub) are all axis and path maths that a library would have to be fought
to produce anyway.

**D4 — `app_settings` stores the time zone only.** Units stay kg and km, hardcoded. The draft
stories descope lb and mi, so a units picker would be a control that changes nothing.

## 3. Conflicts from the brief, resolved

| # | Conflict | Resolution |
|---|----------|------------|
| C1 | The shell rework deletes work US-005 shipped days ago | Intended. US-007 is a teardown *and* a rebuild, planned as such: `shell/tab-bar.tsx` and the `(tabs)` group are deleted, `/activity` is deleted, and `trackers/activity-list.tsx` is **kept and repurposed** as the per-tracker history list — `/running` already shares it, so it was never Activity-specific. Pull-to-refresh is removed entirely (owner instruction, US-007 D5). |
| C2 | The designer's `00-overview.md` disagrees with the repo's on the data model and time handling | The repo's is authoritative, except where L1 overrides §6.2. The draft's data model is superseded by D1. |
| C3 | The changelog draft asserts a **unit test** for ordering, but this repo has no test runner | Replaced by a module-level invariant in `src/content/changelog.ts` that throws at import time, so a bad array fails `pnpm build` rather than a test suite that does not exist. See US-006 T1. |
| C4 | `/settings` does not exist; the changelog lives under it | US-006 builds `/settings` as a **stack** screen — the shape it keeps after US-007 — and reaches it from a gear button in Home's header, which is the entry point the redesign specifies. The `/account` tab redirects to it until US-007 deletes the tab bar. The changelog does not wait for the shell rework, and nothing built in US-006 is thrown away by it. |
| C5 | The draft's offline acceptance criteria (log a weight in airplane mode, sets sync on reconnect) | Descoped by L2. Each story's Deviations section records it. |

## 4. Tasks

**Every task below is independently pushable to production.** That means each one, on its own,
leaves `main` deployable: `pnpm typecheck` passes, no route 404s or renders a broken screen, no code
references a column that is not in the hosted database, and no half-migrated shell exists at any
commit. Where a task needs schema, the migration is applied to hosted **in that same task**, before
the code that reads it — see §5.

### US-006 — What's new + Settings *(Ready)*

| # | Task | Deployable on its own because |
|---|------|-------------------------------|
| T1 | `src/content/changelog.ts`: types, seed entries for 0.1.0–0.5.0, `LATEST_VERSION`, and the order/uniqueness invariant that throws at import | Pure data module, imported by nothing yet |
| T2 | `/settings` and `/settings/whats-new` stack screens, `loading.tsx` skeleton, gear button in Home's header, `/account` → redirect, tab-bar relabel | Every route it adds resolves and every link it adds has a target |
| T3 | Unseen-version dot (`localStorage`) on the Home gear and the Settings row | Additive; hydration-only, no layout shift |
| T4 | Docs: story Deviations, design-system §8 rows, overview §9 index, AGENTS.md command table fix | Docs only |

### US-007 — App shell rework

| # | Task | Notes |
|---|------|-------|
| T1 | `not-found.tsx`: a signed-in owner never sees a 404 — an unknown route inside `(app)` redirects to Home (L6). The signed-out case keeps a real 404 screen | The repo has no `not-found.tsx` at all today. `notFound()` is already called in `running/[id]`, `running/[id]/edit` and `stopwatch/[kind]`, so this changes what a stale link does |
| T2 | `error.tsx` + `global-error.tsx`: a custom error screen with Try again and Go home (L6) | Also none today — errors currently fall through to Next's default |
| T3 | Add `motion` (L8); record it in design-system §9.1 and §8 | Dependency only, no behaviour change |
| T4 | Move Home to `(app)/page.tsx`, delete the `(tabs)` group and `shell/tab-bar.tsx`, fold the mini-bar slot into the single layout | |
| T5 | Delete `/activity`; repurpose `trackers/activity-list.tsx` as the per-tracker history list and de-duplicate the `?show=` constants | |
| T6 | Back model: `history.back()` with a fixed-parent fallback, so the Android back button and the iOS edge swipe work without exiting the PWA | |
| T7 | Home layout per the redesign: header, section slots, `max-w-md`, safe areas | |
| T8 | Entry-sheet primitive (`ui/entry-sheet.tsx`) — the bottom sheet every later story's create/edit flow uses, with Motion-driven drag-to-dismiss | |
| T9 | Docs pass | |

### US-008 — App-wide time zone

| # | Task |
|---|------|
| T1 | Migration: `app_settings` single-row table + RLS + aal2 policy; `pnpm db push`, `verify`, `types` |
| T2 | Server read + `AppTimeZoneProvider`, and a `useAppTimeZone()` hook replacing `getDeviceTimeZone()` at every call site |
| T3 | Settings → Time zone picker, defaulting to the device zone on first run |
| T4 | Amend AGENTS.md rule 10 and overview §6.2; record the deviation |

### US-009 — Weight tracking

| # | Task |
|---|------|
| T1 | Migration: `weigh_ins` + RLS + aal2 + index |
| T2 | Queries and Server Actions (zod, range 20.0–400.0, no future readings) |
| T3 | Decimal keypad primitive (`ui/keypad.tsx`) — OS keyboard never opens |
| T4 | Log-weight sheet: keypad, editable time, optional note |
| T5 | Sparkline + Home weight card |
| T6 | `/weight` detail: hero, range selector, chart, stats, readings list |
| T7 | Edit and delete a reading, with optimistic delete and an Undo toast |
| T8 | Docs pass |

### US-010 — Workout library and gym plans

| # | Task |
|---|------|
| T1 | Migration: `workouts`, `plans`, `plan_days`, `plan_items`, the `plan_single_active` partial unique index, and the seed data |
| T2 | Queries and Server Actions for workouts |
| T3 | `/gym/workouts` library + create/edit sheet with the `tracks` chips |
| T4 | `/gym/plans` plan library: activate, duplicate, rename, delete |
| T5 | `/gym/plans/[id]` weekly editor: week strip, day naming, rest toggle |
| T6 | Exercise picker sheet, reorder, copy-from-another-day |
| T7 | Home's today-card reading the active plan |
| T8 | Docs pass |

### US-011 — Gym session

| # | Task |
|---|------|
| T1 | Migration: `gym_sessions` (timed-entity template + `plan_day_id`, `name`), `set_logs` |
| T2 | Register `gym` in the stopwatch registry; generalise what the registry assumes is a plain detail page |
| T3 | Start / minimise / discard, and the abandoned-session (>6h) recovery path |
| T4 | `/gym/session`: timer hero, exercise blocks, `tracks`-generated set inputs |
| T5 | Rest timer, warmup toggle, PR flag |
| T6 | Finish + summary screen |
| T7 | Past sessions: list, read-only summary, edit and delete |
| T8 | Docs pass |

### US-012 — Goals

| # | Task |
|---|------|
| T1 | Migration: `goals` |
| T2 | Derived progress module — `target` and `streak`, both directions |
| T3 | Progress bar and streak strip primitives |
| T4 | Goal detail sheet: create, edit, pause, delete |
| T5 | Home goals summary, capped at 3 |
| T6 | "Add goal" from a tracker and from a workout |
| T7 | Docs pass |

### US-013 — Feature request log

| # | Task |
|---|------|
| T1 | Migration: `feature_requests` |
| T2 | `/settings/requests`: add row, open list, done section, inline edit |
| T3 | Optimistic mark-done / reopen / delete |
| T4 | Docs pass |

### US-014 — Radial quick-action menu

| # | Task |
|---|------|
| T1 | The button: fixed corner, tap-to-Home, placement and hide rules |
| T2 | The wheel: press-and-hold, nodes on a **circular sweep from the bottom edge round to the right edge** (L7), drag-to-highlight, release-to-commit, Motion-driven |
| T3 | Wire the actions, with disabled states |
| T4 | Keyboard equivalent and `prefers-reduced-motion` |
| T5 | Docs pass |

The draft's 200°–340° arc is not built. The owner's call (L7) is a true circle swept from the
bottom of the screen to the right edge, which is also the arc a right thumb actually travels.

## 5. Definition of done — per task

On top of AGENTS.md's list:

1. `pnpm typecheck` passes.
2. The screen is checked at 375px, and at 320px for anything with a grid or a horizontal strip.
3. Every acceptance criterion the task covers is met.
4. **The commit is deployable on its own.** No task leaves a route half-built, an import dangling, or
   a column referenced before it exists.
5. **Migration tasks push to hosted before the code that reads them lands**, in this order:

   ```
   pnpm db new <name>        # write the SQL
   pnpm db push --local
   pnpm db verify --local    # RLS + owner policy + aal2 policy, and nothing granted to anon
   pnpm db types --local
   pnpm db push              # hosted
   pnpm db types             # hosted
   ```

   `pnpm db verify` is the automated check that overview §6's policy template was actually followed,
   so a migration task is not done until it passes.
6. One commit per task, messaged `US-0XX TN: <what>`.

# Personal Dashboard — story map

Single-owner PWA. One user, one device class that matters (phone, installed to home screen).
Read this before any individual story.

## Product in one line

A private tool for tracking a small number of things about myself — time spent, measurements taken, and
gym work done — with no social features, no notifications, and no accounts beyond mine.

## Stories

| # | Story | Status | Depends on |
|---|-------|--------|------------|
| US-001 | Owner sign-in with system-generated credentials and mandatory TOTP | Ready | — |
| US-002 | App shell, navigation and PWA behaviour | **Draft** | US-001 |
| US-003 | Weight tracking to one decimal, with trajectory over time | **Draft** | US-002 |
| US-004 | Changelog ("What's new") as static accordions | **Draft** | US-002 |
| US-005 | Workout library and gym plans (multiple, one active) | **Draft** | US-002 |
| US-006 | Today's gym session — timed, with per-exercise logging | **Draft** | US-005 |
| US-007 | Goals — target and streak, on any tracker or workout | **Draft** | US-002, US-003, US-005/006 |
| US-008 | Feature request log | **Draft** | US-002 |
| US-009 | Radial quick-action menu | **Draft** | US-002, US-003, US-005/006, US-008 |

Existing but not yet written up: the tracker list on Home and the duration tracker (Running) with its
stopwatch and run log. US-002 restructures the shell those screens live in; their own story should be
back-filled as **US-000** so the numbering stays honest.

## Decisions that apply to every story

1. **No bottom tab bar.** Navigation is one scrollable Home plus full-screen pushes. See US-002 §3.
2. **No Activity screen.** Cross-tracker history is dropped. Recent items live on Home; full history lives
   inside each tracker. See US-002 §2.
3. **The app owns its loading UI.** Installed as a PWA there is no browser chrome, no browser spinner and no
   browser back button — the app must supply all three affordances itself. See US-002 §5.
4. **Mobile is the only target.** 320px is the floor, 390–430px is the design centre. Desktop gets the same
   layout centred in a `max-w-md` column. No separate desktop design.
5. **Offline-tolerant, not offline-first.** Reads come from cache when offline; writes queue and retry. A
   running timer is derived from timestamps, never from a `setInterval` count, so it survives the app being
   backgrounded or killed.
6. **Design system.** All screens use the tokens in `Dashboard Design System v2.dc.html`:
   near-black surfaces, one gold accent, green reserved for "live", Manrope + DM Mono.
   Mono is for anything numeric the owner reads as data — durations, weights, reps, times.
7. **UX reference: Wise.** What that means concretely, in priority order:
   - one hero number per screen, set large, in mono;
   - primary actions as a short horizontal row directly under it;
   - flat lists with a leading circular chip, a two-line label, and a right-aligned value;
   - all data entry in a sheet that slides up from the bottom, not on a separate page;
   - numeric entry gets a purpose-built keypad, never the OS keyboard;
   - motion is short and directional — push left/right for hierarchy, up/down for entry;
   - empty states are a sentence and a button, never an illustration.

## Data model shared across stories

```
tracker
  id              uuid pk
  name            text                     -- "Running", "Weight"
  kind            text                     -- 'duration' | 'measurement'
  icon            text                     -- icon key, see US-002 §6
  unit            text null                -- 'kg' for measurement kinds
  precision       int  default 1            -- decimal places for measurement kinds
  sort_order      int
  archived_at     timestamptz null

entry                                       -- one recorded event on a tracker
  id              uuid pk
  tracker_id      uuid fk -> tracker
  occurred_at     timestamptz              -- start for durations, time of reading for measurements
  ended_at        timestamptz null         -- durations only; null while running
  value           numeric(7,2) null        -- measurements only
  note            text null
  source          text                     -- 'live' | 'manual'
```

Gym work does **not** use `entry`. It has its own tables because a set has reps *and* weight *and* an
order within a session — see US-005 §4. Gym sessions do produce one `entry` on a `duration` tracker named
"Gym" so the session shows up in the same recent-activity list as everything else.

Every table is owner-scoped with RLS requiring `aal2`, per US-001.

## Open questions that affect more than one story

| # | Question | Default until answered |
|---|----------|------------------------|
| Q1 | Units — kg or lb, km or mi? | kg and km, as a single app-wide setting in Settings. No per-tracker override. |
| Q2 | Timezone handling? | One fixed timezone stored in Settings. "Today" means today in that zone, not the device's. |
| Q3 | Can trackers be created from the UI, or seeded in the DB? | From the UI, but that flow is its own story (US-007). Until then Weight and Gym are seeded by migration. |
| Q4 | Does anything need exporting? | Not yet. A CSV export story comes after the above. |

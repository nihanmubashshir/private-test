# US-002 — App shell, navigation and PWA behaviour

> Status: **Draft** · Depends on: US-001
> Read [`00-overview.md`](./00-overview.md) first.

## 1. User story

> **As** the only user of this app, which I open from my phone's home screen,
> **I want** navigation and loading to feel like a native app rather than a website in a frame,
> **so that** I can record something in a few seconds without ever waiting on a blank screen or hunting
> for a way back.

## 2. What this story removes

| Removed | Reason | Where its content goes |
|---------|--------|------------------------|
| Bottom tab bar (Home / Activity / Account) | Three tabs for a one-user app is chrome that costs ~56px plus safe-area on every screen and adds nothing. | Home is the root. Account becomes Settings, reached from the header. |
| Activity screen | It duplicated per-tracker history with no added meaning, and with two or three trackers a merged feed is just the same rows in a different order. | Home keeps a short "Recent activity" preview. Full history lives inside each tracker, where it can be typed correctly (runs vs weigh-ins vs sessions). |
| Persistent "running" bar above the tab bar | Redundant with the live state on the tracker card. | The live session is shown on the Home card and in a compact bar that appears **only** when a session is running and the owner is not on that tracker's screen. |

## 3. Navigation model

**Two levels, no more.**

- **Root: Home.** One scrollable page. Always the destination of "back" from any pushed screen.
- **Pushed screens.** Full-screen, slide in from the right, slide out to the right. Every one has a header
  with a back chevron on the left (44px target) and a centered title. Pushed screens: tracker detail,
  weekly plan editor, active gym session, settings, changelog, workout library.
- **Sheets.** Anything that creates or edits a single record is a bottom sheet over the current screen, not
  a push: log a weight, add a run manually, log a set, edit an entry. Dismiss by swipe-down, backdrop tap,
  or a Cancel in the sheet header.

**Back affordances, in order of reliability:** the header chevron (always present), the Android hardware
back button and iOS edge-swipe via `history.back()`, and a swipe-right gesture on pushed screens
(nice-to-have). Never rely on a browser back button existing.

**Route structure**

```
/                       Home
/t/[trackerId]          tracker detail + its history
/gym/plan               weekly plan editor
/gym/session            active session (redirects to / when none is running)
/gym/workouts           workout library
/settings               settings
/settings/whats-new     changelog
```

## 4. Home layout, top to bottom

| # | Element | Notes |
|---|---------|-------|
| 1 | Header | Date line ("Sunday 13 September", 14px, muted) above "Home" (32px/600). Right side: a 40px circular avatar/gear button → `/settings`, carrying an unread dot when the changelog has unseen entries. |
| 2 | Today's gym session, when the weekly plan has one for today | A card: plan-day name, exercise count, and a primary "Start session" — or, if already done today, a completed row with the duration. See US-006. |
| 3 | Tracker cards | One card per `duration` tracker with actions on the card, as in the current design. **Card for the pinned/first tracker, compact rows for the rest** once there are more than two. |
| 4 | Weight card | Hero number + sparkline + "Log weight". See US-003. |
| 5 | Recent activity | Up to 5 rows across all trackers, newest first. A "See all" link is **not** shown — there is no all-activity screen; the rows themselves link to their tracker. |

No floating action button. No "add tracker" affordance in this story — trackers are seeded until US-007.

## 5. Loading and transitions (the PWA-specific work)

The app is installed, so there is no browser tab spinner, no URL bar progress and no native back button.
Every one of those has to be replaced.

1. **App shell paints immediately.** Header, section headings and the shape of each card are static markup
   and render on first paint. Only values are deferred.
2. **Skeletons, not spinners, for first load.** Each card renders its own skeleton (neutral-800 base,
   1.4s shimmer to `#1f2126`) sized to the real content so nothing reflows when data lands. A full-screen
   spinner is never acceptable on Home.
3. **Route transitions.** Pushed screens animate in over 220ms `ease-out-soft` and render their own header
   plus skeleton body instantly — the push never waits on data. A 2px gold progress line at the very top
   appears only if a transition exceeds 400ms.
4. **Optimistic writes.** Logging a weight, starting a session, or completing a set updates the UI before
   the server confirms. On failure the row reverts and a danger toast explains why, with Retry.
5. **Timers are computed, never counted.** Elapsed time is `now - started_at`, recomputed on a 1s tick and
   re-synced on `visibilitychange`. Killing and reopening the app shows the correct elapsed time.
6. **Splash and offline.** A manifest with `display: standalone`, a theme colour matching `neutral-950`,
   maskable icons, and a splash background identical to the app background so there is no flash. When
   offline, a compact non-blocking bar sits under the header: "Offline — changes will sync." Queued writes
   show a small pending badge on the affected row.
7. **Safe areas.** `viewportFit: 'cover'`; header pads with `env(safe-area-inset-top)`, sheets and the live
   session bar with `env(safe-area-inset-bottom)`.
8. **No pull-to-refresh fighting.** `overscroll-behavior-y: contain` on the scroll container. An explicit
   pull-to-refresh on Home is a nice-to-have, not required.
9. **Reduced motion.** `prefers-reduced-motion` replaces slides with a 90ms cross-fade and stops the
   skeleton shimmer.

## 6. Tracker icons

Each tracker stores an `icon` key resolved against a fixed local set (no icon CDN). Keys needed by the
stories so far: `run`, `scale`, `dumbbell`, plus `dot` as the neutral fallback for any tracker created
later without a chosen icon. Rendered in a circular chip: 40px on cards, 32px in list rows, background
`neutral-800`, glyph `neutral-300`.

## 7. Acceptance criteria

1. There is no bottom tab bar and no `/activity` route anywhere in the app.
2. From any pushed screen, the header chevron and the OS back gesture both return to Home.
3. Opening the app cold shows the Home header and card outlines within one frame of the shell loading;
   values fill in without any layout shift.
4. Starting a gym session, force-quitting the app, waiting 60s and reopening shows elapsed time of about
   60s, not 0s.
5. With the network disabled, Home renders cached data, the offline bar appears, and logging a weight
   succeeds locally and syncs when the network returns.
6. On a 390×844 viewport in standalone mode, no content sits under the status bar or the home indicator.
7. Every interactive target is at least 44px tall; no horizontal scroll at 320px.
8. With `prefers-reduced-motion: reduce`, no slide or shimmer animation runs.

## 8. Open questions

| # | Question | Default |
|---|----------|---------|
| Q1 | Is Settings a push or a sheet? | Push — it will grow sub-pages (changelog, units, sign-out). |
| Q2 | Does the app need an install prompt? | A one-time dismissible banner on Home if `beforeinstallprompt` fires and the app is not already standalone. Low priority. |
| Q3 | Should Home show more than 5 recent rows? | No. Five, then each tracker owns its own history. |

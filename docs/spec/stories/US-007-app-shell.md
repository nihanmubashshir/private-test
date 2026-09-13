# US-007 — App shell rework: Home as the only root

> Status: **Ready** · Depends on: [US-006](US-006-changelog.md)
> Part of the [design-2 roadmap](../design-2-roadmap.md). Renumbered from the designer's draft
> [`US-002-app-shell-and-navigation.md`](../../design/design-2-stories/US-002-app-shell-and-navigation.md).

## 1. User story

> **As** the only user of this app, which I open from my phone's home screen,
> **I want** navigation and loading to feel like a native app rather than a website in a frame,
> **so that** I can record something in a few seconds without ever waiting on a blank screen or
> hunting for a way back.

This is a **teardown as well as a rebuild**. US-005 shipped the bottom tab bar and `/activity` days
ago; this story removes both. That is intended (roadmap C1), not a mistake to be worked around.

## 2. Not found — a signed-in owner never sees a 404

Owner decision (roadmap L6). For a one-person app a 404 carries no information: the owner is not
going to fix a typo in a URL they did not type, and the only way they reach one is a stale link —
a deleted run, a plan that no longer exists, an unregistered stopwatch kind.

So `notFound()` anywhere inside the app redirects to Home with a warning toast, rather than
rendering a dead end. Two files, because they catch different things:

| File | Catches | Behaviour |
|------|---------|-----------|
| `src/app/(app)/not-found.tsx` | `notFound()` thrown inside a route in the `(app)` group | `redirect("/?missing=1")` |
| `src/app/not-found.tsx` | URLs that match no route at all, which never enter a route group | `redirect("/?missing=1")` |

Home renders `<ToastOnParam param="missing" tone="warning">` — arriving somewhere you did not ask
for, with no explanation, is worse than the 404 was.

**Neither file reads the session.** `proxy.ts` already redirects an anonymous request to `/login`
whatever the path, so a signed-out visitor bounces Home → proxy → `/login` and lands correctly.
Reading the session in the root boundary instead would opt every route that inherits it — `/login`
and `/verify-2fa` included — out of static rendering, which costs a PWA cold start for no gain.

This changes existing behaviour: `notFound()` is already called in `running/[id]`,
`running/[id]/edit` and `stopwatch/[kind]`, and those now bounce to Home instead of 404ing.

## 3. Errors — a custom screen, not Next's default

Today the repo has no `error.tsx` or `global-error.tsx` anywhere, so a runtime error falls through
to Next's unstyled default: a white page inside a dark, installed PWA with no browser chrome to
escape from.

| File | Catches | Actions |
|------|---------|---------|
| `src/app/error.tsx` | Anything thrown under the root layout | Try again · Go to the dashboard |
| `src/app/global-error.tsx` | The root layout itself failing — replaces `<html>`/`<body>` | Try again only |

Both are Client Components; an error boundary has to be. **Next 16 names the retry prop `retry`,
not `reset`** — check `node_modules/next/dist/docs` rather than memory.

Shared UI is `components/shell/error-screen.tsx`, following the empty-state anatomy (§10.2): icon
circle, one line of title, one of hint, then the actions. A crash should look like part of the app.
`error.digest` renders in mono underneath, so a failure can be matched to a server log. The message
itself is never shown — Next redacts server errors to a digest before they reach the browser, and
overview §4.3 keeps user-facing error copy generic.

`global-error.tsx` has no router above it, so it offers no Home link, and the root layout is what
loads the fonts, so it renders in the fallback stack. Both are deliberate.

## 4. What this story removes

| Removed | Reason | Where its content goes |
|---------|--------|------------------------|
| Bottom tab bar | Three tabs for a one-user app is chrome costing ~56px plus safe area on every screen | Home is the root; Settings is already a push (US-006) |
| `/activity` | It duplicated per-tracker history with no added meaning | Home keeps a 5-row Recent activity preview; full history lives in each tracker |

`components/trackers/activity-list.tsx` is **kept**, not deleted — `/running` already shares it, so
it was never Activity-specific. It becomes the per-tracker history list, and the `?show=` constants
duplicated between `activity/page.tsx` and `running/page.tsx` collapse into one module.

## 5. Navigation model

Two levels. **Root: Home**, one scrollable page. **Pushed screens**, full-screen, each with a back
chevron. **Sheets** for anything that creates or edits a single record.

Back gets a real history-aware affordance: `history.back()` when there is history to go back to,
falling back to the fixed parent route otherwise, so the Android hardware button and the iOS edge
swipe work without the PWA-exit hazard `app-bar.tsx` currently guards against by refusing
`history.back()` entirely.

## 6. Tasks

| # | Task | Deployable on its own because |
|---|------|-------------------------------|
| T1 | `not-found.tsx` at root and in `(app)`, plus the `missing` toast on Home and a `tone` prop on `ToastOnParam` | Additive; changes only what a dead link does |
| T2 | `error.tsx`, `global-error.tsx`, `shell/error-screen.tsx` | Additive; boundaries that previously did not exist |
| T3 | Add `motion`; record it in design-system §8 and §9.1 | Dependency only |
| T4 | Home to `(app)/page.tsx`; delete the `(tabs)` group and `shell/tab-bar.tsx` | Shell moves in one commit — no intermediate state with two Homes |
| T5 | Delete `/activity`; repurpose `activity-list.tsx`; de-duplicate the `?show=` constants | `/running` keeps working; the only lost route is the one being removed |
| T6 | History-aware back in `app-bar.tsx` | Behaviour change behind an existing component |
| T7 | Home layout per the redesign | |
| T8 | `ui/entry-sheet.tsx` — the sheet every later story's create/edit flow uses | New primitive, no caller yet |
| T9 | Docs pass | Docs only |

## 7. Acceptance criteria

1. There is no bottom tab bar and no `/activity` route anywhere in the app.
2. Visiting an unknown URL while signed in lands on Home with a warning toast, never a 404 screen.
3. Opening a deleted run's URL lands on Home with the same toast.
4. `/login` is still statically rendered — the not-found boundary reads no cookies.
5. A thrown runtime error renders the dark error screen with Try again, and Try again re-renders
   the failed segment rather than reloading the document.
6. From any pushed screen, the header chevron and the OS back gesture both return to the parent,
   and neither exits the PWA.
7. At 390×844 in standalone mode no content sits under the status bar or the home indicator.
8. Every interactive target is at least 44px tall; no horizontal scroll at 320px.
9. With `prefers-reduced-motion: reduce`, no slide or shimmer animation runs.

## 8. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | The draft's offline acceptance criterion — Home renders cached data and a queued write syncs on reconnect — is descoped | Roadmap L2: no offline write queue, no service worker. The connectivity banner and optimistic-with-rollback are the whole offline story. |
| D2 | The draft's `/t/[trackerId]` route shape is not built | Roadmap D2: there is no `tracker` table, so routes stay concrete (`/running`, `/weight`, `/gym`). |
| D3 | 404 and error handling were not in the draft at all | Added on owner instruction (roadmap L6). The repo had neither boundary. |
| D4 | `entry-sheet.tsx` is built on vaul, not Motion | Motion was added for gesture work (roadmap L8), but a drag-dismissible bottom sheet is already solved by vaul, which is already in the bundle and already themed. Re-implementing it would be worse. Motion's first real use is the radial wheel (US-014). |
| D5 | Pull-to-refresh is removed, not rebuilt | Owner instruction. US-005 hand-rolled a touch-tracked swipe because a standalone PWA has no browser one; it competes with the page's own scroll and with the plan editor's horizontal week strip, and `NavigationProgress` already reports a refresh. |
| D6 | The list entrance is a CSS keyframe, not a Motion variant | Motion's `initial={{ opacity: 0 }}` ships `opacity: 0` in the SSR HTML, so slow or failed hydration leaves the content invisible — and the changelog accordions are required to work with no JS at all (US-006 AC 4). |

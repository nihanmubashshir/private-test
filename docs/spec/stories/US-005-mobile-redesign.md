# US-005 — Mobile-first redesign: Wise-inspired UX, shadcn/ui + Radix, PWA loading experience

> Status: **Ready** · Depends on: US-001, US-003, US-004 (all done)
> Read first: [`../00-overview.md`](../00-overview.md), [`../01-design-system.md`](../01-design-system.md) (**especially the new §9 shadcn/ui
> and §10 Mobile UX patterns**), then this file.
> Before any Next.js work, read the installed guides: `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`,
> `offline-support.md`, `view-transitions.md`, and `03-api-reference/04-functions/use-link-status.md`.

## 0. The brief in one paragraph

The app is used almost only as an **installed PWA on a phone**. Redesign the **UX**: navigation, screen structure, flows, feedback,
and loading, so it feels like a polished native finance-grade app. Take the interaction patterns from the **Wise mobile app**
(tab-based hub, big clear numbers, list rows with leading icons, tap-through detail screens, bottom sheets, sticky bottom
actions, instant feedback). **Keep our visual system exactly as it is:** dark only, neutral ramp, a single gold accent reserved for the
primary action, Manrope + DM Mono, radii, and spacing. Do **not** copy Wise's colors, illustrations, branding, or copy. Install **shadcn/ui on Radix
primitives** and theme it with our tokens, so we get accessible, battle-tested interactive components. Every screen gets a
**purpose-built loading state**, so nothing ever flashes blank or jumps.

## 1. User story

> **As** the sole owner using the dashboard as an app on my phone,
> **I want** it to open instantly, navigate like a native app, show clear loading and saving feedback, and let me start, stop and log
> activity with as few taps as possible,
> **so that** using it feels effortless, even one-handed and on a bad connection.

## 2. Scope

### In scope
- Install and theme **shadcn/ui (Radix)**. Refactor our primitives onto it where it adds value (§4).
- **New app shell:** bottom tab bar (Home · Activity · Account), large-title tab headers, stack screens with a back bar, a relocated
  mini stopwatch bar, and toasts (§5).
- **Redesigned screens:** Home hub, Activity, Running tracker, Stopwatch focus view, Run detail, Run add/edit, Account, and
  the auth screens' UX (§6).
- **PWA experience:** route skeletons, streamed shell, link-pending feedback, progress bar, optimistic stopwatch, iOS
  startup images, offline fallback + service worker, online/offline banner, standalone polish (§7).
- Small generic data additions to the stopwatch registry and data layer, so screens can be tracker-agnostic (§8).

### Out of scope
- New trackers, analytics/charts, and new data fields (distance, notes…).
- Changing any token value, hue, or font. New tokens are allowed only for sizes and layout, recorded in 01-design-system §8.
- Offline *writes* (queueing saves while offline). Offline shows a clear state; the existing Retry behavior stays.
- Push notifications, widgets, and background timers.
- Behavior and security changes to auth (TOTP, route guard, and actions stay as specified in US-001; only the UX changes).

### Relationship to earlier stories
Where this story's screens, layout, or navigation differ from **US-001 §5, US-003 §6.6–6.8, or US-004 §4**, **this story wins**. All data,
validation, security, and time-handling rules from those stories still apply unchanged (overview §6.2 especially).

## 3. Wise-inspired UX principles (apply everywhere)

| # | Principle | How it shows up here |
|---|-----------|----------------------|
| W1 | **Hub + tabs** | A bottom tab bar with 3 destinations. Home is a hub that surfaces what matters now (a running stopwatch, quick actions, recent activity). |
| W2 | **The number is the hero** | Every key screen leads with one big value (elapsed time, duration) in DM Mono, with a quiet label above it and context below. |
| W3 | **Quick actions up front** | Primary actions sit on the hub card itself (Start, Add). No digging. |
| W4 | **Scannable rows** | Lists use one row pattern: leading icon circle · title + subtitle · trailing value + subvalue. Grouped by day with sticky headers and day totals. |
| W5 | **Tap-through detail** | Rows open a read-only detail screen (hero value + a details list). Edit and Delete live there, never in the list. |
| W6 | **One focus per screen** | Forms and flows are full-screen stack screens with a close/back button, a single sticky bottom primary button, and nothing else competing. |
| W7 | **Sheets for decisions** | Confirmations and small choices open swipe-dismissable bottom sheets (Drawer), not new pages. |
| W8 | **Instant, honest feedback** | Optimistic updates for start/stop, pressed states on every tappable element, toasts for success, inline alerts for errors, skeletons for loading. No blank screens. |
| W9 | **Smart defaults** | Pre-fill whatever can be inferred (date = today, stop = now, start = stop − 30m). Offer one-tap presets. |
| W10 | **Plain language** | Short, human copy. Relative dates ("Today", "Yesterday"). No jargon (`aal2` never appears in the UI). |

## 4. shadcn/ui + Radix

The durable rules live in **01-design-system §9**. Tasks for this story:

### 4.1 Install
1. Commit a clean tree first, so the init diff is reviewable.
2. `pnpm dlx shadcn@latest init`. Choose **Radix** primitives (not Base UI), CSS variables **on**, components alias `@/components/ui`,
   utils `@/lib/utils`, and icon library **lucide**. If the CLI offers to overwrite `globals.css` or `src/lib/utils.ts`, allow it, then
   **immediately reconcile** per §4.2.
3. Add only these components: `drawer`, `dialog`, `dropdown-menu`, `skeleton`, `sonner`, `toggle-group`.
   **Do not `add`** `button`, `input`, `card`, `badge`, `alert`, or `sheet`. Ours are design-exact, and shadcn's `sheet` is a side panel whose name
   collides with ours. If the CLI asks to overwrite an existing file, answer **No**.
4. Dependencies this brings in (expected): `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `vaul`,
   `sonner`, `tw-animate-css`. Nothing else.

### 4.2 Reconcile theming (no visual change allowed)
- `globals.css` keeps **our `@theme` block verbatim** (tokens, fonts, radii, extra tokens). Add shadcn's semantic variables in
  **`:root` only**, mapped to our tokens (table in 01-design-system §9.2). **Delete** shadcn's `.dark` block, its `--radius-*` calc
  lines (our `--radius-sm/md/lg` stay), any `--font-*` it adds, and its base-layer `outline-ring/50` rule. Our `*:focus-visible` gold ring stays.
- `src/lib/utils.ts`: `cn = (...inputs) => twMerge(clsx(inputs))`, using `extendTailwindMerge` so our custom font-size tokens
  (`display`, `h1`, `h2`, `body-sm`, `control`, `otp`) are classified as **font sizes**, not colors. Otherwise `cn("text-body-sm",
  "text-neutral-50")` silently drops one. Verify this with a scratch check.
- **Acceptance for 4.2:** `/dev/ui` looks pixel-identical before and after (compare screenshots at 375px).

### 4.3 Primitive refactors
| Component | Change |
|-----------|--------|
| `button.tsx` | Rebuild on `cva` + Radix `Slot` (`asChild`), keeping the exact variants (`primary`/`secondary`/`ghost`/`danger`), sizes (`sm`/`md`/`lg`), `pending`, and `fullWidth`. Add size `icon` (44×44, `rounded-full`) and `quick` (56×56 round, for quick actions). Add pressed feedback: `active:bg-*` one step darker, plus `motion-safe:active:scale-[0.98]`. Replace the `href` prop with `asChild` + `<Link>`, and update call sites. |
| `sheet.tsx` → **`confirm-sheet.tsx`** | A responsive confirmation: shadcn **Drawer** (vaul, swipe to dismiss, grab handle) below `sm`, shadcn **Dialog** from `sm`. Same props as today. Visuals per the README "Modal / bottom sheet". Delete the old native-`<dialog>` implementation and update imports. |
| `skeleton.tsx` | From shadcn, restyled per README "Loading and skeleton" (base `neutral-800`, shimmer to `skeleton-shine`, 1.4s, static under reduced motion). Add the **120ms fade-in delay** (§7.2). |
| `toaster.tsx` | shadcn **Sonner**, styled per README "Toast" (bg `surface-hover`, border `neutral-700`, radius lg, dot + 14px text + Close/Action). Positioned per §5.6. |
| `dropdown-menu.tsx` | From shadcn, restyled: `neutral-900` surface, `neutral-800` border, radius md, 44px items, `danger-400` destructive item. |
| `toggle-group.tsx` | From shadcn, restyled as a segmented control: `neutral-900` track, selected segment `neutral-800` with `neutral-50` text, 36px tall. **Not gold.** |
| Icons | `lucide-react`, 20px (rows, buttons) or 24px (tab bar), `strokeWidth={1.75}`, `aria-hidden`, colored with neutral tokens only (see 01-design-system §9.4). |

Also update `/dev/ui` with every new or changed component in every state.

## 5. App shell and navigation

### 5.1 Route structure (URLs unchanged unless listed)

```
src/app/(app)/
  layout.tsx                 # requireFull(), providers, Toaster, offline banner, NavigationProgress
  (tabs)/
    layout.tsx               # TabBar + mini stopwatch bar docked above it
    page.tsx                 # /           Home
    activity/page.tsx        # /activity   NEW
    account/page.tsx         # /account    NEW
  (stack)/
    layout.tsx               # no tab bar
    running/page.tsx         # /running
    running/new/page.tsx     # /running/new
    running/[id]/page.tsx    # /running/[id]        → now the read-only DETAIL screen
    running/[id]/edit/page.tsx  # /running/[id]/edit NEW (the form moves here)
    stopwatch/[kind]/page.tsx   # /stopwatch/running  NEW focus view
```

Update every `redirect`/`revalidatePath` in the running actions: save → `/running/[id]` (detail) with a success toast; delete →
`/running` with a toast.

### 5.2 Tab bar — `src/components/shell/tab-bar.tsx` (`'use client'`)
- Fixed bottom, `z-30`, `bg-neutral-900`, top hairline `neutral-800`, height **56px + `env(safe-area-inset-bottom)`**.
- 3 equal items: **Home** (`House`), **Activity** (`ListOrdered`), **Account** (`CircleUser`). Each item is a full-height `<Link>`
  with a 24px icon above an 11px/600 label.
- Active: icon and label `neutral-50`, `aria-current="page"`. Inactive: `neutral-500`. Pressed: `neutral-300`. **No gold.**
- Pending: use `useLinkStatus()` so the tapped item shows its active color immediately, plus a 2px `neutral-50` indicator bar above the icon
  while the route loads.
- Visible only on the three tab roots.

### 5.3 Tab root header — `src/components/shell/large-title.tsx` (`'use client'`)
- At the top, below `env(safe-area-inset-top)` + 12px: an optional eyebrow (e.g. Home shows today's date, rendered after mount) and an h1 (`text-h1`).
  Optional right slot (44px icon button).
- When the h1 scrolls out of view (IntersectionObserver), a **compact sticky bar** fades in: 44px tall + safe-area top, `bg-neutral-950`,
  bottom hairline, title `text-control` 600, centered. It fades 120ms and is instant under reduced motion.

### 5.4 Stack app bar — `src/components/shell/app-bar.tsx`
- Sticky top, `bg-neutral-950`, height 52px + safe-area top, bottom hairline shown only after scrolling.
- Left: a 44×44 icon button, either `ChevronLeft` (back) or `X` (close, used by forms and the focus view), labelled via `aria-label`. Back goes to a
  **fixed parent route** (not `history.back()`, which can exit the PWA when there is no history).
- Center: title `text-control` 600, truncated. Right: an optional 44×44 slot (e.g. `MoreHorizontal` → DropdownMenu).

### 5.5 Mini stopwatch bar (replaces the US-003 bar's placement)
- Same component and behavior as US-003, restyled as a **rounded floating card**: `mx-3`, radius lg, `bg-neutral-900`, border
  `neutral-800`, and 8px gap above whatever is below it.
- On tab roots it docks **above the tab bar**. On stack screens it docks at the bottom (+ safe area).
- **Hidden** on: the item's own tracker page (as before), `/stopwatch/[kind]`, and every form screen (`/running/new`, `/running/[id]/edit`).
- Tapping the label area opens `/stopwatch/[kind]` (was: tracker page). The Stop button is unchanged (secondary).
- Layout exposes `--bottom-inset` = tab bar height + mini bar height (+ gaps), and `<main>` pads its bottom with it.

### 5.6 Toasts
- One `<Toaster />` in `(app)/layout.tsx`, `position="bottom-center"`, offset so toasts sit **above** `--bottom-inset`. Max 1 visible,
  4s auto-dismiss, swipe to dismiss.
- **Success feedback uses toasts:** `Run saved · 32m 10s` (action: `View` → detail), `Run updated`, `Run deleted`, `Stopwatch discarded`.
- **Errors stay inline** (one alert above the relevant primary button, per the design rules). Never error toasts for form errors.

### 5.7 Data loading in layouts (fast shell)
- `(app)/layout.tsx` awaits only `requireFull()`. **Active stopwatches load inside a `<Suspense>` boundary** (fallback: nothing), so
  the tab bar and page skeleton paint before that query finishes.

## 6. Screens

All times and dates are client-formatted from ISO + `time_zone` (overview §6.2). Numbers and times use DM Mono `tabular-nums`. All
content is a single column with `max-w-md mx-auto px-4`, and 24px gaps between blocks.

### 6.1 Home `/` (tab)
1. **LargeTitle**: eyebrow = today's date in the device zone (`Sunday, 13 September`, after mount), h1 `Home`.
2. **Tracker cards**, one per registry kind (generic `TrackerCard`, `src/components/trackers/tracker-card.tsx`):
   - Header row (a link to the tracker page, 56px): 40px icon circle (`neutral-800` bg, tracker icon `neutral-50`) · name
     (`text-control` 600) · `ChevronRight` `neutral-500`.
   - **Idle:** subline `Last run · Yesterday · 32m 10s` or `No runs yet`. Actions row: **primary `Start run`** (`md`, flex-1)
     and **secondary `Add`** with a `Plus` icon (`md`).
   - **Running:** the hero `StopwatchElapsed` at 40px DM Mono, and below it `Started 06:42`. Actions row: **primary `Stop`** (flex-1) and
     secondary `Open` (→ focus view). Uses the optimistic stopwatch (§7.4).
   - Only one gold button per screen. If several trackers exist, only the first card's main action is primary, and the others use secondary.
3. **Recent activity**: a section header row with `Recent activity` (`text-h2`) on the left and a ghost `sm` `See all` → `/activity` on the right.
   The last 5 completed sessions across all kinds, using `ActivityRow` (§6.2). Empty: hidden entirely.

### 6.2 Activity `/activity` (tab)
- LargeTitle h1 `Activity`.
- If the registry has more than one kind: a ToggleGroup filter `All · Running · …` (`?kind=`). Hidden with a single kind.
- A list grouped by the local date of `started_at` in each session's zone. **Sticky group header** (`bg-neutral-950`, 36px): label on the left
  (`Today` / `Yesterday` / `Sun, 13 Sep`; the relative labels swap in after mount), and the day total (DM Mono 13px `neutral-400`) on the right.
- **`ActivityRow`** (`src/components/trackers/activity-row.tsx`), a full-width link to the detail screen, min 64px, pressed
  `surface-hover`:
  - Leading: 40px icon circle.
  - Title `Run` (`text-control` 600 `neutral-50`). Subtitle `06:42 – 07:14` (+ ` +1` / zone label as in US-004), in DM Mono 13px `neutral-400`.
  - Trailing: duration `32m 10s` (DM Mono 15px `neutral-50`). If > 12h, a warning dot plus `Check times` in 11px `warning-400` under it.
  - Rows inside a group are separated by an 800 hairline, indented to start after the icon (64px).
- **Loading more:** when the last row enters the viewport (IntersectionObserver), navigate with `router.replace('?show=N+30', { scroll: false })`.
  A "Show more" button remains as the no-JS/a11y fallback. Show a row skeleton while pending.
- Empty state (centered, 40vh): 56px icon circle, `No activity yet` (`text-h2`), `Start a stopwatch or add a run.`
  (`text-body-sm` `neutral-400`), and a primary `Start run` → `/running`.
- Pull to refresh (§7.6).

### 6.3 Running tracker `/running` (stack)
- AppBar: back → `/`, title `Running`.
- Hero card: `StopwatchControl`, restyled to the hero pattern. Eyebrow `STOPWATCH`, elapsed at `text-display` DM Mono, and `Started …` when
  running. Idle: primary `Start run`. Running: primary `Stop` plus an icon button `Maximize2` → focus view. `Discard` moves to a
  `MoreHorizontal` DropdownMenu in the card header (→ ConfirmSheet).
- Secondary full-width `Add run manually` (`Plus` icon).
- `Runs`: the same grouped list + `ActivityRow` as Activity, filtered to runs, with the same infinite loading.

### 6.4 Stopwatch focus view `/stopwatch/[kind]` (stack, full-screen)
- For the moment of running: huge, glanceable, one thumb.
- AppBar: close `X` → the tracker page. Right slot: `MoreHorizontal` → `Discard` (running only).
- Vertically centered: the tracker name (`text-body-sm` `neutral-400`), elapsed at `clamp(3.5rem, 18vw, 6rem)` DM Mono `tabular-nums`,
  and `Started 06:42` below.
- Bottom (sticky, safe area): primary **`Start run`** or **`Stop`** at 60px height (new token `--spacing-cta: 3.75rem`), full width.
- **Screen Wake Lock** (`navigator.wakeLock.request('screen')`) while running and visible. Re-acquire on `visibilitychange`, release
  on unmount. Feature-detect and fail silently.
- **Haptics:** `navigator.vibrate?.(12)` on successful start and stop (Android; no-op elsewhere).
- After Stop: toast `Run saved · 32m 10s` (action `View`), and stay on the view in the idle state.
- Unknown kind → `notFound()`.

### 6.5 Run detail `/running/[id]` (stack)
- AppBar: back → `/running`, title `Run`, right `MoreHorizontal` → DropdownMenu `Edit` / `Delete` (danger; opens the ConfirmSheet
  `Delete this run?` / `This can't be undone.`).
- Hero (centered): 56px icon circle, duration at `text-display` DM Mono, and below it the date (`Sunday, 13 September 2026`, `text-body-sm`
  `neutral-400`).
- If > 12h: a warning Alert `This run is over 12 hours. Did you forget to stop the stopwatch?` with a ghost `Fix times` → edit.
- **Details card** (`Card`, rows 52px, label `text-body-sm` `neutral-400` on the left, value DM Mono 15px `neutral-50` on the right, hairlines):
  `Date` · `Start` · `Stop` (`07:14 +1` when it ends next day) · `Duration` · `Time zone` (`Asia/Dhaka`).
- Bottom: secondary full-width `Edit run` (duplicating the menu item for thumb reach).
- A running session id → redirect to `/stopwatch/running`. Missing → `notFound()`.

### 6.6 Run add/edit `/running/new`, `/running/[id]/edit` (stack, focused form)
- AppBar: close `X` (→ `/running` for new, → detail for edit), title `Add run` / `Edit run`. If the form is dirty, closing opens a
  ConfirmSheet `Discard changes?` / confirm `Discard`.
- **Live duration hero** at the top: `Duration` eyebrow, value at 40px DM Mono (`—` when incomplete), and `Ends next day` below when applicable.
- **Field list card** (tap-anywhere rows, 56px, hairlines): `Date`, `Start`, `Stop`. Each row is a `<label>` containing the label on the left and the
  formatted value on the right (DM Mono), with the native `<input type="date|time">` visually overlaid across the row (transparent, 16px font) so a tap
  opens the native picker. Call `input.showPicker?.()` on row click as a fallback. The error state turns the row border `danger-400`,
  with the message below the card.
- **Duration presets** under the card: ToggleGroup-styled chips `15m · 30m · 45m · 1h · 1h 30m`. Tapping one sets **Stop = Start + preset**
  (next-day logic applies). Disabled until Start has a value.
- **Smart defaults (new):** stop = now rounded down to 5 min, start = stop − 30 min, date = the local date of start. The hero shows `30m`
  immediately.
- Time zone footnote (`text-sm` `neutral-500`) under the presets, as in US-004.
- **Sticky bottom CTA**: primary `lg` full width (`Save run` / `Save changes`), sitting above the keyboard and the safe area (§7.6). One alert above it for
  server errors.
- Delete is **not** on this screen (it lives on detail).
- All US-004 §4.3 submit logic (zones, seconds preservation, next-day, validation messages) is unchanged.

### 6.7 Account `/account` (tab)
- LargeTitle h1 `Account`.
- Card groups (rows 56px with a leading 20px icon, hairlines, `ChevronRight` where the row navigates):
  1. **Profile**: `Signed in as` + email (read on the server from verified claims).
  2. **Security**: `Two-factor authentication` + a success Badge `On`.
  3. **This device**: `Time zone` + `Asia/Dhaka` (client). `Install app` row, shown only when **not** running standalone
     (`matchMedia('(display-mode: standalone)')`), opens a Drawer with install steps (iOS: Share → Add to Home Screen; Android: menu →
     Install app).
  4. **App**: `Version` + short commit SHA (`VERCEL_GIT_COMMIT_SHA`, first 7 chars, DM Mono; `dev` locally).
- A danger-text row `Sign out` (a form posting to `signOut`, no confirmation).
- The top-bar Sign out button from US-001 is removed (the top bar no longer exists).

### 6.8 Auth screens (UX only; behavior per US-001)
- **Shared:** content column at the top third (not vertically centered, so the keyboard doesn't cover fields). The brand row stays. The primary button is
  **sticky at the bottom** above the keyboard (§7.6).
- **Login:** `enterKeyHint="next"` on email (moves focus to password) and `enterKeyHint="go"` on password. Autofocus nothing (avoids the keyboard jumping on
  launch).
- **Verify 2FA:** **auto-submit** when the 6th digit is entered or a 6-digit code is pasted. On an error, clear the field, refocus, and keep the alert.
  The Verify button stays as a fallback.
- **Setup 2FA:** the same single route becomes a **2-step flow** with client-side step state (no re-enroll between steps). A thin progress bar
  (2px, `neutral-50` fill on `neutral-800`) sits under the brand. **Step 1 "Add to your app":** setup key block + Copy, `Open in authenticator
  app`, and `Scan a QR code instead` opening a Drawer with the QR; sticky primary `Next`. **Step 2 "Enter the code":** OTP with auto-submit,
  ghost `Back`, and the sticky primary `Verify and finish setup`. Sign out remains a ghost at the bottom of step 1.

## 7. PWA experience

### 7.1 Streaming and route skeletons
- Every route that awaits data has a **`loading.tsx`** with a skeleton that mirrors the final layout **exactly** (same heights, gaps, and header),
  so there is zero layout shift when content arrives:
  - `(tabs)/loading.tsx` is not shared; each tab gets its own: Home (large title + tracker card 168px + 5 rows), Activity (large title + 2 group
    headers + 6 rows), Account (large title + 4 card groups).
  - `(stack)/running/loading.tsx` (app bar + hero card + button + 6 rows), `running/[id]/loading.tsx` (app bar + hero + details card),
    `running/[id]/edit/loading.tsx` (app bar + duration hero + field card + sticky CTA placeholder), `stopwatch/[kind]/loading.tsx` (app
    bar + centered elapsed placeholder + CTA placeholder).
- The shell (tab bar, app bar) is **not** part of the skeleton. It comes from the layouts and stays mounted between navigations.
- Build skeletons from `Skeleton` plus the real layout components (LargeTitle and AppBar render their titles immediately, because titles are known
  without data).

### 7.2 No flash for fast loads
- `Skeleton` fades in with `animation: fade-in 120ms 120ms both`, so navigations faster than ~120ms never show a skeleton flash.
  Under reduced motion it appears without a fade, after the same delay.

### 7.3 Navigation feedback
- **Tab bar pending** via `useLinkStatus` (§5.2).
- **Row/button pressed states** on touch (`active:` styles). Every tappable row has one.
- **`NavigationProgress`** (`src/components/shell/navigation-progress.tsx`): a 2px bar fixed at the very top below the safe area, `neutral-300`
  (not gold). It appears after 150ms for any `useTransition` pending state it is given (router.refresh, `?show` loads, action redirects),
  animates to 80%, and completes on settle. Expose a small context so any component can report pending work.
- **View transitions:** follow `view-transitions.md` for the installed version. If it's stable, use a subtle slide for stack push/pop
  (16px + fade, 200ms `ease-out-soft`) and a crossfade between tabs, disabled under reduced motion. If it's still experimental, **skip it**
  and note that under Deviations.

### 7.4 Optimistic stopwatch
- `StopwatchControl`, `TrackerCard`, the focus view, and the mini bar use `useOptimistic`. On **Start** tap, they immediately render the running
  state with `startedAt = at` (the tap timestamp), so the clock starts ticking at once. On **Stop**, they immediately render idle and show the
  pending toast state. They reconcile when the action resolves: success → server state; `already_running` → server's session; failure →
  revert and show the existing inline error + **Retry** (the same `at`, per US-003).
- The global mini bar appears and disappears optimistically, driven by the same state (a shared client store/context seeded by the server `actives`).

### 7.5 Launch, offline, and connectivity
- **iOS startup images:** add `apple-touch-startup-image` links (via `metadata.appleWebApp.startupImage`) for current iPhone portrait
  sizes, generated with `next/og` route handlers like the existing icons: the brand mark centered on `neutral-950`. Android uses the
  manifest `background_color` (already `#08090a`).
- **Service worker** (`public/sw.js`, hand-written, registered from a client component in production only), following
  `offline-support.md` / `progressive-web-apps.md`:
  - Precache: `/offline` page, icons, and fonts/static `_next/static` assets as they're fetched (cache-first for `_next/static` only).
  - Navigations: **network-first**, with a fallback to the cached `/offline` page when the network fails.
  - **Never cache** HTML of authenticated pages, Server Action responses, Supabase requests, or anything with auth cookies. No data is
    stored offline.
  - Versioned cache name, and old caches deleted on `activate`.
- **`/offline` page** (public, excluded from the proxy auth guard): brand mark, `You're offline` (`text-h2`), `Reconnect to see your
  latest activity.`, and a secondary `Try again` (reload).
- **Connectivity banner** (`src/components/shell/offline-banner.tsx`): listens to `online`/`offline`. While offline, a 36px warning strip
  under the safe area says `You're offline. Changes won't save.` When the connection returns, it shows success `Back online` for 2s, then
  `router.refresh()`.

### 7.6 Standalone and touch polish
- Viewport: add `interactiveWidget: "resizes-content"`, so the layout shrinks for the keyboard and sticky bottom CTAs sit above it.
- Global CSS (base layer): `html { -webkit-text-size-adjust: 100%; }`, `body { overscroll-behavior-y: none; }`,
  `-webkit-tap-highlight-color: transparent` on interactive elements, `touch-action: manipulation` on buttons/links/rows, and
  `user-select: none` on tab bar, app bar, buttons, and rows (never on content text or inputs).
- **Pull to refresh** on Home and Activity (`src/components/shell/pull-to-refresh.tsx`): only when scrolled to the top, a 64px threshold,
  a spinner that rotates with pull distance, then `router.refresh()` inside a transition reported to NavigationProgress. Disabled under reduced
  motion (instant refresh on release instead). Needed because iOS standalone PWAs have no browser pull-to-refresh.
- **Sticky bottom CTA container** (`src/components/shell/bottom-cta.tsx`): `sticky bottom-0`, `bg-neutral-950`, top hairline once content scrolls
  under it, padding `12px 16px calc(12px + env(safe-area-inset-bottom))`.

## 8. Data and registry additions (generic, no schema change)

- Registry entries gain `icon` (a lucide component, `Footprints` for running), `name` (`Running`), `newHref`, and
  `detailHref(id)` / `editHref(id)`.
- `src/lib/stopwatch/server.ts` adds `listCompletedSessions(supabase, { kind?, limit })`: it queries each registered table (or one kind),
  merges by `started_at desc`, and returns `CompletedSession[]` including `kind`. It also adds `getLastCompletedSession(supabase, kind)`. Existing
  `src/lib/runs/queries.ts` stays for the run detail/edit pages.
- The focus view route validates `[kind]` against the registry keys.
- No server-side formatting anywhere (overview §6.2 still applies).

## 9. Files (new or substantially changed)

```
components.json
src/app/globals.css                         (reconciled, not re-themed)
src/lib/utils.ts                            (twMerge + extendTailwindMerge)
src/components/ui/{button,confirm-sheet,skeleton,toaster,dropdown-menu,toggle-group,drawer,dialog}.tsx
src/components/shell/{tab-bar,large-title,app-bar,bottom-cta,navigation-progress,offline-banner,pull-to-refresh,sw-register}.tsx
src/components/trackers/{tracker-card,activity-row,activity-list,day-group-header,empty-state}.tsx
src/components/stopwatch/*                  (optimistic store, restyled control, mini bar placement)
src/app/(app)/layout.tsx, (tabs)/layout.tsx, (stack)/layout.tsx
src/app/(app)/(tabs)/{page,activity/page,account/page}.tsx  + loading.tsx each
src/app/(app)/(stack)/running/{page,loading}.tsx
src/app/(app)/(stack)/running/new/page.tsx
src/app/(app)/(stack)/running/[id]/{page,loading}.tsx
src/app/(app)/(stack)/running/[id]/edit/{page,loading}.tsx
src/app/(app)/(stack)/stopwatch/[kind]/{page,loading}.tsx
src/app/offline/page.tsx
src/app/startup-image/[size]/route.tsx      (or similar, next/og)
public/sw.js
src/proxy.ts                                (matcher: exclude /offline, /sw.js, startup images)
src/app/(auth)/**                           (UX changes §6.8)
src/app/dev/ui/page.tsx                     (new components/states)
```

## 10. Tasks (in order)

Each task ends with `pnpm typecheck` + `pnpm build` green, a manual check at 375px **in the installed PWA where relevant**, and one commit
(`US-005 T<n>: …`).

| # | Task | Done when |
|---|------|-----------|
| T1 | **shadcn + Radix install and reconcile** (§4.1–4.2). | `/dev/ui` screenshots are identical before and after. The `cn` merge check passes. Only the listed dependencies were added. |
| T2 | **Primitive refactors** (§4.3) + gallery. | All call sites use `asChild`. ConfirmSheet swipes to dismiss on mobile and is a dialog at ≥640px. Gallery shows all states. |
| T3 | **PWA foundations** (§7.5–7.6 minus pull-to-refresh): viewport, touch CSS, startup images, SW + `/offline`, offline banner. | Airplane mode in the installed PWA shows `/offline` on navigation and the banner in-app. Startup image shows on iOS launch. No authenticated HTML in Cache Storage (devtools check). |
| T4 | **Shell** (§5): route groups, TabBar, LargeTitle, AppBar, BottomCta, mini bar placement, Toaster, Suspense-streamed actives, NavigationProgress. | Tabs switch with pending feedback. Stack screens have correct back targets. Content is never hidden behind bars at 320px. |
| T5 | **Registry and data additions** (§8). | Typecheck green. Home and Activity can render from the generic functions. |
| T6 | **Home** (§6.1) + skeleton. | Idle/running/empty states. Start from Home works in one tap. |
| T7 | **Activity** (§6.2) + skeleton + infinite loading + pull to refresh. | Sticky day headers, relative labels, loading more without jumps, pull to refresh works in iOS standalone. |
| T8 | **Running page + focus view + optimistic stopwatch** (§6.3, §6.4, §7.4) + skeletons. | The clock ticks at the tap instantly on a throttled network. Wake lock keeps the screen on. The failure path reverts and offers Retry. |
| T9 | **Run detail + add/edit** (§6.5, §6.6, §5.1 redirects/toasts) + skeletons. | Presets and smart defaults work. Sticky CTA stays above the keyboard. Dirty-close confirm. Toast `View` opens the detail. |
| T10 | **Account** (§6.7) + skeleton. | Install row only shows in the browser, not standalone. Sign out works. |
| T11 | **Auth UX** (§6.8). | Verify auto-submits. The setup 2-step flow keeps the same secret across steps. CTAs sit above the keyboard. |
| T12 | **View transitions** (§7.3) if stable, and a **polish pass**: every tappable element has a pressed state, no layout shift on any skeleton → content swap. | Checked on a real phone. |
| T13 | **Docs**: 01-design-system §8 rows for every new component/token, overview §8 structure, README screenshots note, Deviations. | Rows present. |

## 11. Acceptance criteria

**Visual system integrity**
1. No token values changed. The palette grep (01-design-system §4.2) is empty. Gold appears only on the one primary button per screen, focus rings, and the
   brand mark (never on tabs, segmented controls, progress bars, or icons).
2. `/dev/ui` primitives that existed before T1 look identical after T1–T2.

**Navigation and structure**
3. Home, Activity, and Account are one tap apart via the tab bar. The tab bar shows only on those roots, and the active tab is indicated without gold.
4. Every stack screen has a working back/close to a fixed parent. Launching the PWA straight onto a deep link (e.g. `/running/<id>`) and tapping back never
   exits the app.
5. At 320px and 375px, no content or CTA is ever covered by the tab bar, mini bar, toast, keyboard, home indicator, or status bar.

**Speed and loading (the PWA brief)**
6. Every data route shows its own skeleton that matches the final layout (no visible layout shift when content streams in).
7. Navigations that resolve in under ~120ms show no skeleton flash.
8. The tab bar item reacts on tap before the route resolves. Actions that refresh show the top progress bar after 150ms.
9. The shell (tab bar or app bar) paints before the active-stopwatch query completes.
10. Start on Home, the tracker page, or the focus view starts ticking **immediately** with the network throttled to "Slow 3G". The saved `started_at`
    equals the tap time. On failure the UI reverts and Retry reuses the tap time.
11. Offline: the in-app banner appears within 1s. Navigating while offline shows `/offline`. Coming back online shows `Back online` and refreshes.
    Cache Storage contains no authenticated page HTML or API responses.
12. Cold launch of the installed PWA on iOS shows the branded startup image, then the shell, with no white flash at any point.

**Flows**
13. Start a run from Home in 1 tap. Stop it from the mini bar on any other tab in 1 tap. Open the focus view from the mini bar.
14. Add a manual run with defaults in 2 taps (`Add` → `Save run`), and a 45-minute run ending now in 3 taps (`Add` → `45m` preset → `Save run`).
15. After saving, a toast `Run saved · <duration>` appears. Its `View` opens the run detail.
16. Row → detail → `Edit` → change the stop time → `Save changes` returns to detail with `Run updated`. Detail → menu → `Delete` → confirm returns to
    `/running` with `Run deleted`.
17. Closing a dirty form asks to discard. Closing a clean form doesn't.
18. The focus view keeps the screen awake while running (Wake Lock supported browsers) and releases it when closed.
19. Verify 2FA submits automatically on the 6th digit. Setup 2FA steps keep the same secret, and Back/Next never re-enrolls.
20. Pull to refresh on Home/Activity in iOS standalone fetches fresh data (e.g. a session stopped on another device disappears).

**Unchanged guarantees**
21. All US-001, US-003, and US-004 acceptance criteria about security, data, validation, and time handling still pass. There's no server-side
    formatting, and every action still calls `requireFull()`.
22. Keyboard and screen reader: tab bar items have names and `aria-current`, sheets trap focus and close on Esc, the timer isn't announced every second,
    and every icon-only button has an `aria-label`.

## 12. Manual verification plan

Test on **a real iPhone with the app installed to the Home Screen** and **Android Chrome installed**, plus desktop Chrome devtools at
320/375px:
- Walk through AC 1–22 in order. Use devtools network throttling (Slow 3G, Offline) for AC 7–11. Use Application → Service Workers / Cache
  Storage for AC 11. Use Performance → Layout shifts (or the CLS overlay) for AC 6. Use a second device for AC 13 and 20.
- Record short screen recordings of AC 10, 12, 13, and 14 in the PR/commit description for future reference.

## 13. Open questions (defaults apply)

| # | Question | Default |
|---|----------|---------|
| Q1 | Tabs | Home · Activity · Account. Trackers are reached from Home, and new trackers don't add tabs. |
| Q2 | Smart default for a new manual run | stop = now (rounded down to 5 min), start = stop − 30 min. |
| Q3 | Undo instead of delete confirmation | No. Keep the confirmation sheet. Revisit later. |
| Q4 | Service worker library (Serwist etc.) | No. A small hand-written `sw.js` with no data caching. |

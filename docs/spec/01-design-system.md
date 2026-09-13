# Design System — Implementation Guide

> Status: **Ready** · Last updated: 2026-09-13
> Audience: implementation agents doing any UI work. Read after [`00-overview.md`](00-overview.md).

## 1. Sources

| File | What it is |
|------|------------|
| [`docs/design/README.md`](../design/README.md) | **The design handoff.** Tokens (`@theme` block), every component and its states, the four US-001 screens, responsive rules, accessibility. Read it fully. |
| `docs/design/Dashboard Design System v2.dc.html` | High-fidelity rendered reference (gold accent). Open it in a browser with `support.js` in the same folder. Use it to check what a screen should look like. |

An earlier amber version of the design exists outside the repo. It is superseded; do not use it.

## 2. The system in one paragraph

Dark only. A cool-grey neutral ramp carries the whole UI, and a single **gold** accent is reserved for primary
actions, focus rings, and the "Open in authenticator app" link. Gold is never decorative. Semantic colors
(success/warning/danger) appear only in feedback. Manrope is used for everything readable. **DM Mono is used for
anything the owner must transcribe** (TOTP secret, 6-digit code, ids, CLI commands). The layout follows a 4px grid. There are no shadows below
the modal layer: surfaces are separated by the 950 → 900 step plus an 800 hairline. Touch targets are ≥44px (48px preferred on auth
screens), and 320px is the hard minimum width.

## 3. Precedence when sources disagree

1. **Behavior, copy, validation, security** → the user story spec (e.g. US-001) wins.
2. **Appearance** (color, type, spacing, radius, states) → `docs/design/README.md` wins.
3. **Contradictions inside the design handoff** → use the resolutions in §6 below.
4. Anything not covered → the drawn screens in the v2 `.dc.html` win over README prose. If neither covers it, make the
   call yourself using the system's rules (§7) and record it.

## 4. Implementing the tokens (read carefully, several gotchas)

### 4.1 `globals.css`
Paste the `@theme` and `@layer base` blocks from the design README **verbatim**, then apply these changes.

**a. Fonts with `next/font`.** `next/font` renames font families (hashed names), so the literal
`Manrope` / `"DM Mono"` in `--font-sans` / `--font-mono` will not match. In `src/app/layout.tsx`:

```ts
import { Manrope, DM_Mono } from 'next/font/google';
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-manrope', display: 'swap' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-mono', display: 'swap' });
// <html lang="en" className={`${manrope.variable} ${dmMono.variable}`}>
```

Remove the two `--font-*` lines from the pasted `@theme` block and add:

```css
@theme inline {
  --font-sans: var(--font-manrope), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-dm-mono), ui-monospace, SFMono-Regular, monospace;
}
```

**b. Extra tokens.** The design uses these values without providing tokens. Add them to `@theme` so components
never need arbitrary hex values or sizes:

```css
  /* added in implementation, values taken from the v2 design file */
  --text-body-sm: 0.875rem;  --text-body-sm--line-height: 1.6;   /* 14px: auth paragraphs, alert body, details label */
  --text-control: 0.9375rem; --text-control--line-height: 1.2;   /* 15px: md buttons, top-bar app name */
  --color-surface-sunken: #0c0d0f;  /* disabled input bg, zebra rows */
  --color-surface-hover:  #16171b;  /* table row hover, toast bg */
  --color-danger-900:     #3a171a;  /* danger button hover bg */
  --color-skeleton-shine: #1f2126;
```

### 4.2 Things that behave differently from stock Tailwind
- `text-sm` is **13px** here, not 14px, and `text-base` has line-height 1.6. Use `text-body-sm` for 14px.
- The `neutral-*` palette is **replaced** by the design's ramp. Never use `gray`, `zinc`, `slate`, `stone`, `amber`, `yellow`,
  `red`, `green`, etc. Check with `grep -rE '(gray|zinc|slate|stone|amber|yellow|red|green|emerald)-[0-9]' src/` (should be empty).
- `--spacing-tap` gives you `h-tap`, `min-h-tap`, `min-w-tap` (44px).
- The base-layer `input { font-size: 1rem }` is lower priority than utilities, so the OTP input's `text-otp` still applies.

### 4.3 Root layout
- `<html className="dark …">` isn't needed. The design is dark only via `color-scheme: dark`.
- `export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#08090a' }`.
- Respect `prefers-reduced-motion`: use `motion-safe:` / `motion-reduce:` variants on the spinner, shimmer, and sheet transitions.

## 5. What to build, and when

| Component (`src/components/ui/`) | Build in | Notes |
|---|---|---|
| `button.tsx` | US-001 | All 4 variants × 3 sizes × all states from the README. `pending` shows the spinner and swaps the label. |
| `spinner.tsx` | US-001 | 18px (12px inside buttons). Used only in pending buttons. |
| `input.tsx` | US-001 | Includes the password variant with the Show/Hide toggle (`aria-pressed`). `size="lg"` = 48px for auth screens. |
| `otp-input.tsx` | US-001 | **One** `<input>`, not six boxes. |
| `card.tsx` | US-001 | Build it, but see §6 #1: the auth screens do not use card chrome. |
| `alert.tsx` + `form-error.tsx` | US-001 | 4 tones. `form-error` = alert with `role="alert"`. |
| `badge.tsx` | US-001 | success, accent, neutral, warning, danger, plus a mono variant. `/` uses the success `aal2` badge. |
| `copy-secret-button.tsx` | US-001 | `'use client'`. 2s "Copied" state, `aria-live="polite"`, copies with spaces stripped. |
| `sheet.tsx` (modal / bottom sheet) | US-003 | Exactly per the README. Used for discard/delete confirmations. |
| `confirm-sheet.tsx` (replaces `sheet.tsx`), `skeleton.tsx`, `toaster.tsx`, `dropdown-menu.tsx`, `toggle-group.tsx`, `drawer.tsx`, `dialog.tsx` | US-005 | On shadcn/Radix, styled per the README (§9). |
| table | **Later**, when a story first needs it | Follow the README exactly when it's built. Don't build it early. |

## 6. Resolved conflicts (design README vs drawn v2 screens)

| # | Topic | README says | v2 drawn screen shows | **Decision** |
|---|-------|-------------|-----------------------|--------------|
| 1 | Auth screen container | "card `w-full max-w-md`" | No card chrome; content sits directly on the `neutral-950` page | **No border, background, or padding card.** Use a plain `w-full max-w-md mx-auto` column inside `px-4`, at every breakpoint. |
| 2 | Top bar on `/` | Right side: accent `aal2` badge + Sign out | Right side: Sign out only | **Sign out only** in the top bar. |
| 3 | `aal2` badge on `/` | "success badge" in content | Success badge above h1 | **Success tone**, above the h1 (it matches). The accent `aal2` badge stays in the component library for later use. |
| 4 | Brand mark size | 18px on auth screens, 20px in top bar | 18px everywhere | **18px** everywhere, radius sm. |
| 5 | Brand name text | — | "Dashboard" | Render `NEXT_PUBLIC_APP_NAME`. The drawn "Dashboard" is placeholder text. |
| 6 | "Setup key" eyebrow | 11px, `accent-500` | 10px, `0.1em`, `neutral-500` | **11px DM Mono uppercase `0.1em` `neutral-500`**. 11px keeps it legible, and the neutral color follows the "gold never decorative" rule. |
| 7 | Secret block | bg `#0c0d0f`, `0.14em` | bg `neutral-900`, `0.12em` | **bg `neutral-900`**, border `neutral-700`, DM Mono 16px, `0.12em`, padding 14px, radius md, `break-all`. |
| 8 | Ghost "Sign out" on auth screens | text `neutral-300`, weight 500 | text `neutral-400`, 15px, weight 500 | **Ghost variant per README** (`neutral-300`), which keeps the component consistent. The 1-step difference is not worth a special case. |
| 9 | Login error alert | Alert component: dot, padding 14/16 | Simplified: no dot, padding 12/14 | **Use the `Alert` component** (with dot). The drawn screen is a simplification. |
| 10 | Rate-limit (429) error tone | Screens section: "danger alert" | Component demo labels 429 as **warning** | **Warning** tone for 429. **Danger** for invalid credentials or code. Both use `role="alert"`, one per form. |
| 11 | `/setup-2fa` h1 size | 24px at 375px | 24px | **24px** (`text-2xl` with h1 tracking and line-height) below `sm:`, `text-h1` (28px) from `sm:`. Login and verify h1 are 28px at all sizes. |
| 12 | QR reveal on `/setup-2fa` | — | Closed on mobile | **Superseded in US-005 T11.** The responsive `<details>` (open from `sm:` up, closed on mobile) is gone — setup is now a 2-step flow, and the QR opens in a `Drawer` from a "Scan a QR code instead" button on any screen size (§6.8). |

| 13 | "Forgot password?" link on `/login` | "No forgot-password link" | Not drawn | **Not in US-001.** When [US-002](stories/US-002-password-reset.md) (paused) is built, add it below the submit button, centered: a text link, 13px weight 600, `neutral-300`, hover `neutral-50`, underline on hover, with a ≥44px tall hit area (`min-h-tap inline-flex items-center`). Neutral, never gold. |

Any further conflict found during implementation: resolve it using §3, then **add a row here**.

## 7. Designing new screens

The handoff is a **design system, not a complete set of screens**. No further design frames will come. Agents design every
screen not drawn in the v2 file themselves (in this story and all future ones), using the system's components,
tokens, and feel. Do not wait for, or ask for, designer frames.

### 7.1 How to design a screen
1. **Start from the closest drawn screen** and reuse its layout: auth-style flows start from `/login`, and signed-in pages start from
   `/` (top bar + `max-w-[1120px]` content).
2. **Compose from `components/ui/`.** Reach for existing variants before inventing anything.
3. **Keep the feel:** calm, sparse, dark. One primary (gold) action per screen at most. Hierarchy comes from type size and the neutral ramp,
   not from color. There are no shadows, gradients, or decorative imagery. Surfaces are separated by the 950 → 900 step and 800 hairlines. Use generous spacing on the
   4px grid (20–24px between blocks on mobile, 32–48px between sections on larger screens).
4. **Mobile first:** design the 375px layout first (320px must still work), then decide what changes from `sm:`/`md:` up.
   Primary actions sit within thumb reach and are full width on mobile.
5. **Follow every rule in the README**, especially: DM Mono for machine values, gold never decorative, ≥44px targets, ≥16px inputs,
   generic auth errors, one alert per form above the submit button.

### 7.2 When something new is needed
You may create a new component, variant, or token when the existing ones truly can't express the screen. Conditions:
- Derive it from existing tokens and component patterns (same radii, borders, state treatments, focus ring). No new hues.
- Put it in `components/ui/` with all its states, and add it to the dev-only `/dev/ui` page.
- Record it in §8 below (name, purpose, key values), so the system stays documented as it grows.

### 7.3 Example
The screen rules for the paused password-reset flow are in [US-002 §5](stories/US-002-password-reset.md). They show how to apply
this section to auth-style screens.

## 8. Additions to the system

Components, variants, and tokens added by agents beyond the handoff. Add a row for every addition.

| Added in | Name | Purpose | Key values |
|----------|------|---------|------------|
| US-001 | `--text-body-sm`, `--text-control`, `--color-surface-sunken`, `--color-surface-hover`, `--color-danger-900`, `--color-skeleton-shine` | Name values the handoff uses without tokens | See §4.1 b |
| US-001 | PWA app icons (`app/icon.tsx`, `app/apple-icon.tsx`, `app/icons/icon-192`, `app/icons/icon-512`, `app/manifest.ts`) | Installable-to-home-screen support | The gold rounded-square brand mark (`accent-500`, radius 22%) centered on the `neutral-950` ground, generated with `next/og` via the shared `src/lib/app-icon.tsx` helper — no new image assets. |
| US-003 | `components/stopwatch/stopwatch-elapsed.tsx` | Live, drift-free elapsed-time readout shared by any tracker's control panel and the global bar | DM Mono, `tabular-nums`, `role="timer"`; `size="display"` = `text-display` centered, `size="bar"` = 20px (`text-xl`); idle (`startedAt` null) renders `0:00` in `neutral-600` |
| US-003 | `components/stopwatch/stopwatch-control.tsx` | The start/stop/discard panel a tracker page composes into itself | Card with a `STOPWATCH` eyebrow (11px DM Mono uppercase `0.1em` `neutral-500`, per §6 #6), the elapsed display, one result alert above the primary button, and the discard confirm `ConfirmSheet` (restyled in US-005 T2/T8: Discard moved into a `MoreHorizontal` dropdown, and success now toasts instead of an inline alert) |
| US-003 | `components/stopwatch/active-stopwatch-bar.tsx` | Global "something is still running" bar mounted in `(app)/layout.tsx` | Fixed to the bottom, `neutral-900` bg, `neutral-800` top hairline, 56px per active row, an 8px `success-400` status dot, a secondary (not gold) Stop button; hidden on the active item's own tracker page |
| US-004 | ~~Tracker card (`app/(app)/running-card.tsx`)~~ | Superseded in US-005 by `components/trackers/tracker-card.tsx` (below) | — |
| US-004 | ~~List row (`app/(app)/running/run-list.tsx`)~~ | Superseded in US-005 by `components/trackers/{activity-row,day-group-header}.tsx` (below) | — |
| US-005 | `--spacing-cta` (60px) | The focus view's primary Start/Stop, and any other full-bleed sticky CTA that needs to stand taller than the `lg` button size | `h-cta` via the `cn` spacing registration in `src/lib/utils.ts` (§9.3) |
| US-005 | `StopwatchElapsed` `size="focus"` | The stopwatch focus view's huge elapsed readout | `clamp(3.5rem, 18vw, 6rem)`, centered |
| US-005 | `components/ui/confirm-sheet.tsx` (replaces `sheet.tsx`), plus restyled shadcn/Radix `skeleton.tsx`, `toaster.tsx` (renamed from the CLI's `sonner.tsx`), `dropdown-menu.tsx`, `toggle-group.tsx`, `drawer.tsx`, `dialog.tsx` | Confirmation sheets, loading skeletons, toasts, overflow menus, and segmented filters, all restyled off the shadcn defaults onto our tokens | See §4.3, §9 |
| US-005 | `components/shell/{tab-bar,large-title,app-bar,bottom-cta}.tsx` | The app shell chrome: bottom tab bar, tab-root collapsing header, stack-screen top bar, sticky bottom action container | §5.2–§5.4, §7.6 |
| US-005 | `components/shell/navigation-progress.tsx` | A 2px top progress bar any component can report pending work to via `useNavigationProgress()`, so the PWA has loading feedback a browser's own chrome would otherwise give for free | Shows after a 150ms delay, `neutral-300` (never gold), §7.3 |
| US-005 | `components/shell/offline-banner.tsx` | Connectivity banner — the whole offline story for this app (§14 Deviations) | `online`/`offline` events; warning while offline, a 2s "Back online" success state, then `router.refresh()` |
| US-005 | ~~`components/shell/pull-to-refresh.tsx`~~ | Removed in US-010 on owner instruction: `NavigationProgress` is refresh feedback enough, and a hand-rolled swipe gesture competes with scroll for no real gain | — |
| US-005 | `components/shell/today-eyebrow.tsx` | Home's "today" eyebrow, rendered after mount in the device's zone | `formatFullDate` |
| US-005 | `components/shell/toast-on-param.tsx` | Fires a success toast when a Server Action redirect carries a `?saved=1`/`?updated=1`/`?deleted=1` flag, then strips it | §5.6 |
| US-005 | `components/trackers/{tracker-card,activity-row,activity-list,day-group-header,empty-state,recent-activity}.tsx` | Tracker-agnostic screen pieces, built from the registry rather than any one tracker: Home's entry card, a completed-session row (shared by Home and Activity), the grouped infinite-loading list, a sticky day header, and a centered empty state | §6.1, §6.2, §10.2 |
| US-005 | `components/stopwatch/focus-view.tsx` | The full-screen "moment of running" view at `/stopwatch/[kind]` | Wake Lock while running, `vibrate(12)` haptics on a successful start/stop, §6.4 |
| US-006 | `components/settings/{settings-group,settings-row}.tsx` | A labelled group of settings rows, and the row itself | Group: 11px mono uppercase `0.1em` `neutral-500` eyebrow, then rows sharing one `neutral-900` surface with `neutral-800` hairlines between them — not a card each. Row: 56px min, 40px leading icon circle, label, trailing value, `neutral-500` chevron, `active:bg-surface-hover` |
| US-006 | `components/shell/settings-button.tsx` | Home's header gear, and the host of the unseen-changelog dot | 40px `neutral-900` circle inside `LargeTitle`'s 44px `rightSlot`. Rendered in Home's `loading.tsx` too — it is static chrome, so skeletoning it would reflow the header |
| US-006 | `components/changelog/{release-accordion,change-badge,release-list,unseen-dot,use-unseen}.tsx` | The What's new screen | Native `<details>`/`<summary>`, so it opens with no JS and is accessible without a Radix dependency; chevron `group-open:rotate-180` over 160ms, `motion-reduce` exempt. `ChangeBadge` is a 22px/11px pill (`added` accent, `improved` neutral, `fixed` success) — smaller than `ui/badge.tsx`, which is 26px and sized for row values |
| US-006 | Unseen dot | Marks unread releases on the Home gear and the Settings row | 6px `accent-500`. The slot is always in the layout and only opacity changes, so the row cannot reflow when the count resolves after hydration |

| US-007 | `src/app/{not-found,error,global-error}.tsx`, `(app)/not-found.tsx`, `components/shell/error-screen.tsx` | The app's own 404 and crash handling — an installed PWA has no browser chrome to escape a white default page with | Not-found redirects Home with a warning toast (owner decision); the error screen follows the empty-state anatomy with Try again + Go home and the `digest` in mono. Next 16 names the retry prop `retry`, not `reset` |
| US-007 | `motion` (Framer Motion) + `src/lib/motion.ts` | Gesture-driven and orchestrated animation | `EASE_OUT_SOFT` mirrors `--ease-out-soft`; `transitions.micro/sheet/push` at 160/180/220ms; `transitions.drag` is a spring. See the CSS-vs-Motion rule in §9.1 |
| US-007 | `enter-up` keyframe + `enterDelay()` | Staggered list and section entrances | `opacity 0 → 1`, `translateY(6px) → 0`, 260ms `--ease-out-soft` `both`, delay `index × 40ms` capped at 240ms. CSS rather than Motion so a list is never briefly invisible when JS is slow or absent |

| US-007 | `components/ui/entry-sheet.tsx` | The sheet every create/edit flow opens — anything writing a single record is a sheet over the current screen, never a push | vaul `Drawer` below `sm:`, `Dialog` above, like `confirm-sheet`. Header is title + Cancel (not an X), so dismiss is thumb-reachable; sticky 52px CTA padded past the home indicator; `tall` fills 85vh and scrolls, for pickers |
| US-007 | ~~`components/shell/navigation-depth.tsx`~~ | Let the app bar use `history.back()` safely | Removed in US-014 with the back chevron itself — no more `AppBar` consumer |
| US-007 | `--spacing-app-bar` (3.25rem), `--spacing-compact-bar` (2.75rem) | Names the shell bar heights, so a sticky offset and the bar it sits under cannot drift | Replaced hardcoded `calc(3.25rem + …)` / `calc(2.75rem + …)` in `app-bar`, `large-title`, `day-group-header` and the stopwatch skeleton |
| US-007 | ~~`components/shell/tab-bar.tsx`~~ | Removed with the tab bar; Home is the only root | — |

| US-009 | `components/ui/keypad.tsx` | Decimal entry where the OS keyboard must never open | 3×4 grid, 56px keys (fits 320px), mono 24px, `neutral-900` on an `800` hairline, `active:bg-surface-hover` + `scale-[0.97]`, `navigator.vibrate(8)` per key. Rules live in `lib/weight/keypad.ts` as pure string transitions |
| US-009 | `components/charts/{sparkline,weight-chart}.tsx` | Hand-rolled SVG charts — no charting dependency (roadmap D3) | Gold line, y axis **never including zero**, 7-day day-weighted moving average behind the raw line, a >14-day gap breaks the line, drag-to-scrub with an `aria-live` caption. Sparkline keeps a uniform aspect ratio (a stretched one turns its end dot into an ellipse); the full chart stretches and therefore puts its axis labels in positioned HTML, since a non-uniform scale squashes SVG `<text>` |
| US-009 | `components/weight/*` | Home card, log/edit sheet, detail screen, reading row | Hero in mono `2.5rem`; direction is never coloured — a gain is not an error state; delete is optimistic with a 5s Undo toast rather than a confirm sheet |

| US-010 | `components/gym/*` | Exercise library, plan library, weekly editor, Home gym card | Week strip is a swipeable `embla-carousel-react` strip of pills (`align: "start"`, `containScroll: "trimSnaps"`, 320px floor — see US-014 addition below); reorder is up/down buttons, not drag, which would fight that scroll and the page's; a rest day is a quiet row, not a card |

| US-011 | `components/gym/{session-screen,set-inputs,rest-timer,session-summary}.tsx` | The active session and its record | Set inputs generated from `tracks` via one spec table; steppers plus tap-to-keypad, never the OS keyboard; rest counts up; no back chevron on the session — Minimise instead, so leaving never reads as cancelling |
| US-011 | `Keypad` takes `KeypadRules` | Reps, load, seconds and metres reuse one keypad | Integer-only rules render a dead spacer where the decimal key sits, so the 3×4 grid keeps its shape and `0` never moves |

| US-012 | `components/goals/goal-progress.tsx` | A goal's bar (target) or day strip (streak) | **Never gold** (§10.2): `neutral-300` fill on `neutral-800`, `success-400` once reached. The bar animates `transform: scaleX`, not `width`, which would force layout per frame. Today, not yet qualified, is ring-outlined — the day isn't over |
| US-012 | `components/gym/workout-picker.tsx` | Search-and-tap exercise list shared by the plan editor and the live session | Replaced the plan editor's private picker when the session needed the same list |

| US-013 | `components/requests/request-list.tsx` | The feature request log | Add row sticky under the app bar (`top: var(--spacing-app-bar) + safe-area`); round checkbox with a 44px target; done rows struck through at 70% opacity inside a collapsed `<details>`; every write optimistic via `useOptimistic`, with a Retry toast on failure |

| US-014 | `components/shell/radial-menu.tsx` + `radial-menu-slot.tsx` | The fixed corner quick-action button and its wheel | 52px `neutral-900` circle with a `neutral-700` ring and an `accent-500` dot, `right: 20px`, `bottom: 20px + safe-area + --mini-bar-height`. Nodes (48px) on a **true quarter circle** of radius 172px from 180° (bottom edge) to 90° (right edge), with the ring drawn; highlight `accent-950` fill + `accent-700` border (focus-like, icons stay neutral). Motion spring fan-out, 25ms stagger, `transform`/`opacity` only; reduced motion shows the final layout. Hidden while any `role="dialog"` is open and on screens whose corner holds a sticky primary action |
| US-014 | `components/requests/quick-capture-sheet.tsx` | One-field request capture from anywhere | Title only; toast carries a View action to the full list |
| US-014 | `components/shell/app-bar.tsx` — back chevron removed | The radial menu's Home action reaches every screen `AppBar` appears on, so a dedicated back control was redundant (owner decision) | `mode="back"` (default) now renders an empty spacer, no `Link`/`history.back()`. `mode="close"` is unchanged — it dismisses an in-progress form, not "go to the previous screen," so it keeps its `X` and a `closeHref` (renamed from `backHref`) |
| US-014 | `embla-carousel-react` dependency | Swipeable weekday strip (see US-010 row above) | Used directly via `useEmblaCarousel`, not the full shadcn `Carousel` wrapper (no prev/next arrows or keyboard nav needed for a touch pill strip) |

## 9. shadcn/ui + Radix (added in US-005)

shadcn/ui components are **copied source** in `src/components/ui/`, built on Radix primitives. They are a behavior and accessibility
foundation. **Their look always comes from our tokens and the README**, never from shadcn defaults.

### 9.1 Rules
- Add components with `pnpm dlx shadcn@latest add <name>`, then restyle to the README before use. Never accept an overwrite of an
  existing design-exact primitive (`button`, `input`, `otp-input`, `card`, `badge`, `alert`, `form-error`, `copy-secret-button`, `confirm-sheet`).
- Do **not** add shadcn's `sheet` (side panel). Bottom sheets use `drawer`, desktop dialogs use `dialog`, and `confirm-sheet` combines them.
- Prefer native inputs on mobile: `<input type="date|time">` over Calendar/Popover pickers, and native `<select>` over Radix Select,
  unless a story says otherwise.
- The only UI dependencies are Radix, `cva`, `clsx`, `tailwind-merge`, `lucide-react`, `vaul`, `sonner`, `tw-animate-css`, and **`motion`** (Framer Motion, added in US-007 on owner instruction). Ask before adding another.
- **CSS for state, Motion for gesture.** A hover, a pressed state, a rotating chevron, a list fading
  in — all CSS, because those run with no JS, off the main thread, and cost nothing on a mid-range
  phone. Reach for `motion` only where the animation follows a finger or has to be orchestrated:
  the radial wheel, sheet drag-to-dismiss, shared-element pushes. Shared durations and easing live
  in `src/lib/motion.ts`; never animate a property that forces layout.

### 9.2 Semantic variable mapping (`:root` only, no `.dark` block)

| shadcn variable | Our token | Note |
|---|---|---|
| `--background` / `--foreground` | `neutral-950` / `neutral-50` | |
| `--card`, `--popover` / `*-foreground` | `neutral-900` / `neutral-50` | |
| `--primary` / `--primary-foreground` | `accent-500` / `on-accent` | Gold, primary action only |
| `--secondary` / `--secondary-foreground` | `neutral-800` / `neutral-50` | |
| `--muted` / `--muted-foreground` | `neutral-900` / `neutral-400` | |
| `--accent` / `--accent-foreground` | `neutral-800` / `neutral-50` | **Not gold.** In shadcn, "accent" is the subtle hover/highlight surface. `bg-accent` ≠ `bg-accent-500`. |
| `--destructive` | `danger-400` | |
| `--border` / `--input` | `neutral-800` / `neutral-700` | |
| `--ring` | `accent-500` | Matches our focus ring |
| `--radius` | `10px` | Our `--radius-sm/md/lg` (6/10/14) stay authoritative. Delete shadcn's calc-based radius lines. |

### 9.3 `cn` and tailwind-merge
`cn` uses `extendTailwindMerge` with our font-size tokens (`display`, `h1`, `h2`, `body-sm`, `control`, `otp`) registered as font sizes, and
`tap`/`cta` as spacing. Any new text or spacing token must be added there too, or class merging will silently drop classes.

### 9.4 Icons
`lucide-react` only. 20px in rows and buttons, 24px in the tab bar, `strokeWidth={1.75}`, `aria-hidden` (the control carries the label).
Neutral colors only (`neutral-50` / `-300` / `-500`). Semantic colors only inside feedback (alerts, badges). **Never gold**, except an icon inside the gold primary button, which uses `on-accent`.
Leading "icon circles" in rows and cards: 40px (56px in heroes), `rounded-full`, `bg-neutral-800`, icon `neutral-50`.

## 10. Mobile UX patterns (added in US-005, apply to every screen)

The app is used mainly as an **installed PWA on a phone**. The UX takes interaction patterns from the Wise mobile app, and the visuals stay 100% this
system. Full rationale and screen-by-screen application: [US-005](stories/US-005-mobile-redesign.md).

### 10.1 Navigation model
- **Tab roots** (bottom tab bar, large-title header): `/`, `/activity`, `/account`. New trackers never add tabs; they appear on Home.
- **Stack screens** (sticky app bar with back `‹` or close `×`, no tab bar): everything else. Back/close always goes to a **fixed parent
  route**, never `history.back()`.
- **Forms and focused tasks** are stack screens with a close button, one sticky bottom primary CTA, and a confirmation when closing with unsaved changes.
- **Confirmations and small choices** use `confirm-sheet`/Drawer. **Success** uses a toast (optionally with one action). **Errors** stay inline, as one
  alert above the relevant primary button.

### 10.2 Screen anatomy
- **Hero first:** the most important value (elapsed time, duration) at the top, large DM Mono `tabular-nums`, with a quiet label above and context below.
- **Rows:** leading icon circle · title + subtitle · trailing value (+ subvalue). Min 64px (56px in detail/field lists), pressed state
  `surface-hover`. Tapping a row opens a read-only detail screen. Edit/Delete live on detail (overflow menu + a bottom button), never in lists.
- **Lists by day:** sticky day headers (`Today` / `Yesterday` / date, relative labels applied after mount) with the day total on the right.
- **Empty states:** icon circle, one-line title, one-line hint, and one action.
- **One gold button per screen.** Tabs, segmented controls, progress bars, and icons are never gold.

### 10.3 Loading and feedback
- Every data route has a `loading.tsx` skeleton that **mirrors the final layout exactly** (no layout shift). Layout chrome (tab bar/app bar) is never inside a
  skeleton. Skeletons fade in after 120ms.
- Links show pending state (`useLinkStatus`). Refreshes and action redirects show the 2px top `NavigationProgress` after 150ms.
- Start/stop and other instant-feeling actions are **optimistic** (`useOptimistic`), revert on failure, and offer Retry.
- Every tappable element has an `active:` pressed state (`motion-safe:active:scale-[0.98]` for buttons).
- Offline shows the connectivity banner. Navigation while offline shows `/offline`. Never cache authenticated HTML or data.

### 10.4 Touch and standalone polish
- Respect all safe-area insets: status bar (top bars), home indicator (tab bar, sticky CTAs, toasts, sheets).
- Keyboard: viewport `interactiveWidget: "resizes-content"`. Sticky CTAs sit above the keyboard. Auth/form content sits in the top third.
- `overscroll-behavior-y: none` on body, `touch-action: manipulation`, no tap highlight, and `user-select: none` on
  chrome/buttons/rows only. **No pull-to-refresh** — removed in US-010; the top progress bar is the refresh affordance.
- Keep screens awake (Wake Lock) only where the user watches a running timer.

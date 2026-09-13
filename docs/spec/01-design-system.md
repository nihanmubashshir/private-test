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
| `toast.tsx`, table, skeleton | **Later**, when a story first needs them | Follow the README exactly when they're built. Don't build them early. |

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
| 12 | QR `<details>` "open from `sm:` up" | — | Closed on mobile | `open` can't be set responsively with CSS. The server renders it **closed**, and a tiny client component sets `open` on mount if `matchMedia('(min-width: 40rem)')` matches. No layout shift on mobile. |

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
| US-003 | `components/stopwatch/stopwatch-control.tsx` | The start/stop/discard panel a tracker page composes into itself | Card with a `STOPWATCH` eyebrow (11px DM Mono uppercase `0.1em` `neutral-500`, per §6 #6), the elapsed display, one result alert above the primary button, and the discard confirm `Sheet` |
| US-003 | `components/stopwatch/active-stopwatch-bar.tsx` | Global "something is still running" bar mounted in `(app)/layout.tsx` | Fixed to the bottom, `neutral-900` bg, `neutral-800` top hairline, 56px per active row, an 8px `success-400` status dot, a secondary (not gold) Stop button; hidden on the active item's own tracker page |
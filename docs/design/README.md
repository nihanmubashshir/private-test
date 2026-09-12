# Handoff: Personal Dashboard design system + US-001 auth screens

## Overview
A dark-only, minimal, mobile-first design system for a single-owner personal dashboard, plus the four
screens from US-001 (owner sign-in with system-generated credentials and mandatory TOTP):
`/login`, `/setup-2fa`, `/verify-2fa`, and the protected `/` placeholder.

The target stack is the one in US-001: Next.js App Router + Tailwind CSS v4 + Supabase. All tokens are
authored as Tailwind v4 `@theme` CSS variables, so no `tailwind.config` file is needed.

## About the Design Files
`Dashboard Design System v2.dc.html` (current, gold accent) and `Dashboard Design System.dc.html`
(earlier amber version, kept for reference) are **design references created in HTML** — prototypes of the
intended look, not production code to copy. Recreate them as React components in the Next.js app using
Tailwind utility classes and the token block below. The prototypes use inline styles only because of the
authoring environment; production code should use Tailwind classes referencing the `@theme` tokens.

Open `Dashboard Design System v2.dc.html` in a browser to see everything rendered.

## Fidelity
**High-fidelity.** Final colors, type, spacing, radii, and all component states are specified. Recreate
faithfully. The one thing left open is imagery/iconography — the prototypes use plain geometric marks
(a gold rounded square as the app mark) rather than a real logo.

## Design Tokens

Paste into `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  /* ---- neutral ramp (cool grey, near-black base) ---- */
  --color-neutral-50:  #f6f6f7;
  --color-neutral-100: #e9eaec;
  --color-neutral-200: #d2d4d8;
  --color-neutral-300: #b0b3ba;
  --color-neutral-400: #868a93;
  --color-neutral-500: #63676f;
  --color-neutral-600: #3c3f45;
  --color-neutral-700: #2a2c31;
  --color-neutral-800: #1c1d21;
  --color-neutral-900: #101114;
  --color-neutral-950: #08090a;

  /* ---- accent (gold) ---- */
  --color-accent-200: #ecd9a8;
  --color-accent-300: #dcbc72;
  --color-accent-500: #c9a349;   /* primary action, focus ring */
  --color-accent-600: #a8862f;   /* hover */
  --color-accent-700: #7d621f;   /* active / border */
  --color-accent-950: #211a0b;   /* tint background */
  --color-on-accent:  #17120a;   /* text on accent fills */

  /* ---- semantic ---- */
  --color-success-400: #3ecf8e;
  --color-success-800: #1e6b46;
  --color-success-950: #0f2419;
  --color-warning-400: #e0913a;
  --color-warning-800: #6b4413;
  --color-warning-950: #2a1a0a;
  --color-danger-400:  #f2555a;
  --color-danger-800:  #7a2328;
  --color-danger-950:  #2a1113;

  /* ---- type ---- */
  --font-sans: Manrope, ui-sans-serif, system-ui, sans-serif;
  --font-mono: "DM Mono", ui-monospace, SFMono-Regular, monospace;

  --text-display: 2.5rem;  --text-display--line-height: 1.05;
  --text-display--letter-spacing: -0.025em;
  --text-h1: 1.75rem;      --text-h1--line-height: 1.15;
  --text-h1--letter-spacing: -0.02em;
  --text-h2: 1.25rem;      --text-h2--line-height: 1.3;
  --text-base: 1rem;       --text-base--line-height: 1.6;
  --text-sm: 0.8125rem;    --text-sm--line-height: 1.55;
  --text-otp: 2rem;        --text-otp--line-height: 1.2;

  /* ---- radius ---- */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  /* ---- motion ---- */
  --ease-out-soft: cubic-bezier(.2,.8,.2,1);

  /* ---- control sizing ---- */
  --spacing-tap: 2.75rem;  /* 44px minimum target */
}

@layer base {
  html { color-scheme: dark; }
  body { @apply bg-neutral-950 text-neutral-50 font-sans antialiased; }
  *:focus-visible { @apply outline-2 outline-offset-2 outline-accent-500; }
  input, select, textarea { font-size: 1rem; } /* stop iOS zoom on focus */
}
```

Fonts (in `src/app/layout.tsx`, via `next/font/google`): Manrope 400/500/600/700, DM Mono 400/500.

### Surface application rules
| Role | Token |
|---|---|
| Page background | `neutral-950` |
| Raised surface (card, top bar, input) | `neutral-900` |
| Hairline / divider | `neutral-800` |
| Input rest border, strong border | `neutral-700` |
| Input hover/filled border | `neutral-600` |
| Body text | `neutral-50` |
| Secondary text | `neutral-300` |
| Muted text, placeholders, helper | `neutral-400` |
| Disabled text | `neutral-600` |

No shadows below the modal layer. Separation comes from the 950 → 900 step plus the 800 hairline.
Centered dialogs are the only exception: `box-shadow: 0 24px 48px -12px rgba(0,0,0,0.8)`.

### Spacing
4px grid. Used steps: 4 (icon gaps), 8 (label→field), 12 (inline), 16 (field stack), 24 (card padding),
32 (block gap), 48 (section gap).

### Typography scale
| Role | Size / line-height / weight / tracking | Family |
|---|---|---|
| display | 40 / 1.05 / 600 / -0.025em | Manrope |
| h1 | 28 / 1.15 / 600 / -0.02em | Manrope |
| h2 | 20 / 1.3 / 600 | Manrope |
| body | 16 / 1.6 / 400 | Manrope |
| small | 13 / 1.55 / 400 | Manrope |
| label | 13 / 1.2 / 600 | Manrope |
| mono | 15 / 1.5 / 500 / 0.06em | DM Mono |
| eyebrow | 11 / uppercase / 0.14em, `accent-500` | DM Mono |

Rule: anything the owner must read character-by-character or transcribe — TOTP secret, 6-digit code,
uuid, CLI command — is DM Mono. Never Manrope.

## Components

### Button — `components/ui/button.tsx`
Props: `variant: 'primary' | 'secondary' | 'ghost' | 'danger'`, `size: 'sm' | 'md' | 'lg'`, `fullWidth`, `pending`, `disabled`.
Sizes: sm 36px / 13px text / radius sm; **md 44px / 15px / radius md (default)**; lg 52px / 16px / radius md.
All form submit buttons are `w-full` on mobile. Weight 600 (500 for ghost).

| variant | rest | hover | focus | pending | disabled |
|---|---|---|---|---|---|
| primary | bg `accent-500`, text `on-accent`, no border | bg `accent-600` | rest + ring | bg `accent-500` at 70% opacity, 12px spinner in `on-accent`, label "Signing in…" | bg `neutral-700`, text `neutral-500` |
| secondary | transparent, border `neutral-700`, text `neutral-50` | bg `neutral-800`, border `neutral-600` | rest + ring | text `neutral-400` | border `neutral-800`, text `neutral-600` |
| ghost | transparent, no border, text `neutral-300` | bg `neutral-800`, text `neutral-50` | rest + ring | text `neutral-500` | text `neutral-600` |
| danger | bg `danger-950`, border `danger-800`, text `danger-400` | bg `#3a171a`, border `danger-400` | ring uses `danger-400` | text `danger-800` | border `neutral-800`, text `neutral-600` |

Focus ring everywhere: `outline: 2px solid accent-500; outline-offset: 2px` (danger uses `danger-400`).
Disabled and pending buttons set `aria-disabled` / `disabled` and keep their 44px height.

### Text input — `components/ui/input.tsx`
Label (13/600) + field + optional error, stacked with 8px gaps. Field: min-height 44px (48px on the auth
screens), radius md, bg `neutral-900`, padding 0 14px, font-size 16px.

| state | border | text |
|---|---|---|
| rest | `neutral-700` | placeholder `neutral-400` |
| filled | `neutral-600` | `neutral-50` |
| focus | `accent-500` + ring | `neutral-50` |
| error | `danger-400` | `neutral-50`, message 13px `danger-400` below |
| disabled | `neutral-800`, bg `#0c0d0f` | `neutral-600`, label `neutral-500` |

Password variant: value in DM Mono with 0.1em tracking; trailing Show/Hide `<button>` — min 44×40px,
text 13/600 `neutral-300`, radius sm, `aria-pressed`, right padding of the field drops to 4px.

### OTP input — `components/ui/otp-input.tsx`
**One real `<input>`, not six boxes** — paste, password managers, and `autoComplete="one-time-code"` keep
working. Attributes: `inputMode="numeric"`, `pattern="[0-9]{6}"`, `maxLength={6}`,
`autoComplete="one-time-code"`. Strip whitespace before submit.
Field: min-height 60px, radius md, bg `neutral-900`, centered, DM Mono 32px, `letter-spacing: 0.35em`
(add `padding-left: 0.35em` when it holds a value, so the tracking on the last glyph stays centered).
Empty state shows six `•` in `neutral-600`. Border: rest `neutral-700`, focus `accent-500` + ring,
error `danger-400` with a 13px `danger-400` message.

### Card / panel — `components/ui/card.tsx`
bg `neutral-900`, border 1px `neutral-800`, radius lg (14px), padding 24px, no shadow.
Secret block inside a card: radius md, bg `#0c0d0f`, border `neutral-700`, padding 14px,
DM Mono 16px, `letter-spacing: 0.14em`, `word-break: break-all`, line-height 1.6.

### Copy button — `components/ui/copy-secret-button.tsx` (`'use client'`)
Secondary button, full width, 44px. On click: copy the secret **with spaces stripped**, swap the label to
"Copied", border → `success-800`, bg → `success-950`, text → `success-400`, and set the secret block's
border to `success-800`. Revert after 2s. Announce via `aria-live="polite"`.

### Alert / form error — `components/ui/form-error.tsx`, `alert.tsx`
Radius md, padding 14px 16px, 8px round dot on the left (7px top offset), body 14/1.55 `neutral-50`,
optional 11px DM Mono meta line in `neutral-400`.

| tone | bg | border | dot |
|---|---|---|---|
| danger | `danger-950` | `danger-800` | `danger-400` |
| warning | `warning-950` | `warning-800` | `warning-400` |
| success | `success-950` | `success-800` | `success-400` |
| neutral | `neutral-900` | `neutral-800` | `neutral-400` |

The login form error is a danger alert with `role="alert"`, placed directly above the submit button.

### Toast — `components/ui/toast.tsx`
bg `#16171b`, border `neutral-700`, radius lg, padding 14px 16px, dot + 14px text + a 44×36px Close ghost
button. Bottom-right on desktop, full-width at the bottom edge on mobile respecting
`env(safe-area-inset-bottom)`. Auto-dismiss 4s, `aria-live="polite"`.

### Badge — `components/ui/badge.tsx`
Height 26px, padding 0 11px, radius full, 12px/600 text, optional 6px dot with 7px gap.
Tones: success / warning / danger / neutral (`neutral-800` bg, `neutral-700` border, `neutral-300` text) /
accent (`accent-950` bg, `accent-700` border, `accent-300` text — used for the `aal2` badge).
A mono variant (11px DM Mono, `neutral-900` bg) labels machine values like `TOTP`.

### Top bar / app shell — `app/(app)/layout.tsx`
56px tall, bg `neutral-900`, bottom border `neutral-800`, sticky top, padding `0 8px 0 16px`, plus
`padding-top: env(safe-area-inset-top)`. Left: 20px gold rounded-square mark (radius sm) + app name
15/600 `-0.01em`. Right: `aal2` accent badge + "Sign out" ghost button (44px, 14/600).
Content area: `max-w-[1120px] mx-auto px-4`.

### Table
Header row bg `neutral-900`, 11px DM Mono uppercase `0.08em` `neutral-500` labels. Rows min 48px,
hairline `neutral-800` between, alternate row bg `#0c0d0f`, hover `#16171b`. Body 14px; machine values in
DM Mono 13px `neutral-300`; status column right-aligned with badges. Horizontal scroll below 520px;
collapse rows into stacked cards under `sm:`.

### Modal / bottom sheet
Scrim `rgba(0,0,0,0.55)`. Mobile: bottom sheet, bg `neutral-900`, top border `neutral-800`,
radius `14px 14px 0 0`, padding 20px, 36×4px `neutral-700` grab handle centered, actions stacked
full-width (destructive first, Cancel second), slide up 200ms `ease-out-soft`.
`sm:` and up: centered dialog, max-width 320px, radius lg, border `neutral-800`, the modal-layer shadow,
actions in a right-aligned row (Cancel then destructive), fade + scale 0.98→1.
Focus is trapped; Esc closes; `role="dialog" aria-modal="true"`.

### Loading and skeleton
Skeleton: radius sm, base `neutral-800`, shimmer to `#1f2126`, 1.4s loop; text bars 14px tall at 60/90/75%
width, control placeholders 44px. Spinner: 18px, 2px border `neutral-700` with `accent-500` top border,
used only inside pending buttons and route transitions. Respect `prefers-reduced-motion` (drop shimmer and
spin, hold a static state).

## Screens / Views

All auth screens share `app/(auth)/layout.tsx`: `min-h-dvh flex flex-col justify-center px-4`, card
`w-full max-w-md mx-auto`, app mark + name centered at the top (18px gold square + 14/600 name, 10px gap).

### 1. `/login`
Purpose: the owner enters the generated email and password.
Vertically centered column, 24px gap between the brand row and the form, 20px between form elements.
- h1 "Sign in" (28/600/-0.02em)
- Email field — `type="email"`, `name="email"`, `autoComplete="username"`, `autoCapitalize="none"`, `spellCheck={false}`, required, 48px tall
- Password field — `type="password"`, `autoComplete="current-password"`, required, with the Show/Hide toggle
- Error alert (danger, `role="alert"`) above the button when present: "Invalid email or password." / "Too many attempts. Try again in a few minutes." on 429
- Submit — primary, full width, 48px, "Sign in"; pending: disabled + "Signing in…"
No sign-up link, no forgot-password link.

### 2. `/setup-2fa`
Purpose: forced TOTP enrollment. Order matters — the setup key comes **before** the QR code, because on a
phone the owner cannot scan their own screen. Top-to-bottom, 20px gaps:
1. h1 "Set up two-factor authentication" (24/600/1.15 at 375px)
2. Paragraph, 14/1.6 `neutral-300`: "Two-factor authentication is required. Add this account to Bitwarden, Google Authenticator, or another authenticator app."
3. Eyebrow "Setup key" → secret block (DM Mono 16px, `0.12em`, grouped in 4s) → "Copy setup key" secondary button (copies without spaces)
4. "Open in authenticator app" — an `<a href={totp.uri}>` styled as an accent-tint button: 44px, radius md, bg `accent-950`, border `accent-700`, text `accent-300` 15/600, centered
5. QR code — inside a `<details>` labelled "Scan a QR code instead" (row: 14px `neutral-300` label + chevron, border `neutral-800`, radius md, padding 14px); open by default from `sm:` up. The `<img>` is at least 200×200 on a **white** background with 16px padding (quiet zone), radius md.
6. OTP input, label "6-digit code from your app"
7. Hidden `factorId` input
8. Submit — primary, full width, 48px, "Verify and finish setup"
9. "Sign out" — ghost, full width, 44px
Error state: danger alert, same QR and secret retained.

### 3. `/verify-2fa`
Purpose: TOTP challenge on later sign-ins. Centered column, 20px gaps.
- h1 "Two-factor authentication" (28/600)
- Paragraph "Enter the 6-digit code from your authenticator app."
- OTP input (focus state on load is acceptable)
- Submit — primary, full width, 48px, "Verify"
- "Sign out" — ghost, full width
- Help text 13/1.6 `neutral-500`: "Lost access to your authenticator? Run `pnpm owner:reset-mfa` on the server." — the command in DM Mono `neutral-400`.
Errors: "Invalid code." / rate-limit message, danger alert above the submit button.

### 4. `/` (protected placeholder)
Top bar (above) + content: 28px 20px padding, 12px gap — an `aal2` success badge, then h1
"You're signed in." (24/600). Nothing else.

## Interactions & Behavior
- Navigation is driven entirely by the US-001 route guard; no client-side routing in these screens.
- Every form posts to a Server Action and works without JS. Sign out is `<form action={signOut}><button>`.
- Pending state comes from `useFormStatus`: button disabled, label swapped, spinner shown.
- Copy button: 2s "Copied" state, strips spaces, polite live announcement.
- QR `<details>`: closed on mobile, `open` from `sm:` up.
- Transitions: 120ms in / 90ms out, `--ease-out-soft`. Sheets 200ms. Nothing animates on route change beyond the spinner.
- Errors never reveal which field was wrong; one alert per form, above the submit button.
- Validation: email format; password 1–256 chars; code `^\d{6}$` after stripping spaces; `factorId` uuid.

## Responsive behavior
Mobile-first, dark only (no light theme in this version).
- 320px is the hard floor: no horizontal scroll anywhere. Auth card `w-full max-w-md` inside `px-4`.
- Every interactive target ≥44px tall; form buttons full width below `sm:`.
- Inputs never below 16px.
- `env(safe-area-inset-top)` on the top bar, `env(safe-area-inset-bottom)` on sheets and toasts.
- Tables scroll horizontally below 520px and stack under `sm:`.
- `viewportFit: 'cover'` in the root layout viewport export.

## State Management
Server-first; no global client state. Client state is limited to:
- `showPassword` (boolean) in the password field
- `copied` (boolean, 2s timer) in the copy button
- `pending` from `useFormStatus` in submit buttons
- `open` on the QR `<details>` (native)
Auth state (`ANON` / `NEEDS_ENROLL` / `NEEDS_VERIFY` / `FULL`) is derived server-side per US-001 §4 — no
client mirror of it.

## Accessibility
- One `role="alert"` container per form for errors.
- Show/Hide password: `aria-pressed`, `aria-label` "Show password" / "Hide password".
- QR `<img alt="QR code for authenticator app">`.
- Focus ring is never removed; `:focus-visible` only.
- Contrast: body `neutral-50` on `neutral-950`, secondary `neutral-300`, muted `neutral-400` used only at
  13px+ on 900/950 grounds. `on-accent` `#17120a` on `accent-500` for primary buttons.
- `prefers-reduced-motion` disables shimmer, spin and sheet slide.

## Assets
None. The app mark is a plain gold rounded square (20px, radius 6px, `accent-500`) standing in for a real
logo — replace it when one exists. No icon library is assumed; the few glyphs used (dot, chevron) are CSS
shapes or text characters. Fonts come from Google Fonts via `next/font`.

## Security notes carried over from US-001
The TOTP secret and QR must never be logged, cached, or persisted by the app. `/setup-2fa` is
`force-dynamic` with `Cache-Control: no-store`; the secret exists only in that one rendered response.

## Files
- `Dashboard Design System v2.dc.html` — **current** system: tokens, all component states, the four screens. Gold accent.
- `Dashboard Design System.dc.html` — earlier version, amber accent. Reference only.

Both open directly in a browser. Every value in this README is taken from the v2 file.

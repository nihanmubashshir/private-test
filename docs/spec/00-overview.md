# Personal Dashboard — Product & Technical Overview

> Status: **Draft v1** · Last updated: 2026-09-13
> Audience: implementation agents. Read this file fully before starting any story, and read
> [`01-design-system.md`](01-design-system.md) before any UI work.

## 1. Product summary

A private, **single-user** personal dashboard. Exactly one human (the *owner*) will ever use it.
There is no sign-up, no invitations, no multi-tenancy, no public pages.

The application is built and maintained by AI agents working from the specs in `docs/spec/`.

### Core principles

| # | Principle | What it means in practice |
|---|-----------|---------------------------|
| P1 | **Mobile first** | Design and build for a ~375px-wide phone screen first, then enhance for larger screens with `sm:`/`md:`/`lg:` Tailwind breakpoints. Everything must be usable one-handed on a phone. |
| P2 | **Single user, locked down** | Signups disabled at every layer. Every page except `/login` requires an authenticated session **with TOTP verified (AAL2)**. |
| P3 | **No extra backend** | Next.js (Server Components, Server Actions, Route Handlers) + Supabase only. No separate API server, no extra hosted services unless a spec says so. |
| P4 | **Follow the design system** | A dark-only, high-fidelity design lives in `docs/design/`. Build it with plain Tailwind CSS and its tokens, no component library. See [`01-design-system.md`](01-design-system.md). |
| P5 | **Secure by default** | Secrets never reach the browser. Row Level Security (RLS) on every table. Access checks are enforced in the database, not only in the UI. |

## 2. Tech stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | **Next.js**, latest stable, **App Router**, TypeScript `strict` | Use Server Actions for mutations. In Next.js 16+ the request interceptor file is `src/proxy.ts`; older versions call it `middleware.ts`. Use whichever the installed version expects. |
| Styling | **Tailwind CSS**, latest stable (v4, CSS-first config via `@theme` in `globals.css`) | Tokens come from `docs/design/README.md`. No UI kit (no shadcn, MUI, etc.). Fonts are Manrope and DM Mono, loaded via `next/font`. |
| Database / Auth | **Supabase** (Postgres + Supabase Auth, including built-in MFA/TOTP) | Use `@supabase/supabase-js` + `@supabase/ssr` for cookie-based sessions. |
| Local dev DB | Supabase CLI (`supabase start`, Docker) | All schema changes are SQL migrations in `supabase/migrations/`. |
| Validation | `zod` | Validate every Server Action input. |
| Package manager | `pnpm` | |
| Unit tests | `vitest` | |
| E2E tests | `@playwright/test` using a **mobile device profile** (e.g. `devices['iPhone 13']`) as the default project | `otplib` (or equivalent) generates TOTP codes in tests. |
| Scripts | `tsx` | For owner-management CLI scripts in `scripts/`. |
| Lint / format | ESLint (Next config) + Prettier | |

> Agents: always check the installed version's official docs before using an API. Library APIs
> change, and this spec describes intent rather than exact function signatures.

## 3. Architecture

```
 Phone browser
     │  HTTPS (cookies: Supabase session)
     ▼
 Next.js app ─────────────────────────────────────────────┐
 │  src/proxy.ts          → refresh session + route guard   │
 │  Server Components     → read data (user's JWT, RLS)     │
 │  Server Actions        → mutations, auth, MFA calls      │
 └──────────────┬──────────────────────────────────────────┘
                │ publishable key + user JWT
                ▼
 Supabase: Auth (password + TOTP MFA) · Postgres (RLS on every table)

 scripts/*.ts (run by the operator from a terminal) ──► Supabase Admin API (secret key)
```

- The **running web app never uses the Supabase secret key.** All app requests act as the logged-in
  user and go through RLS.
- The secret key is used **only** by the operator CLI scripts in `scripts/` (owner creation, lockout recovery).

## 4. Security model

### 4.1 Authentication levels

Supabase issues a JWT with an `aal` (Authenticator Assurance Level) claim:

- `aal1`: password verified only.
- `aal2`: password **and** TOTP verified.

**The app is only usable at `aal2`.** At `aal1` the user can do exactly one of these, depending on state:
enroll TOTP (if no verified factor exists) or verify TOTP (if one does). Both screens also allow signing out.

**Password reset never bypasses TOTP** (applies when US-002, currently paused, is built). A reset link gives only an `aal1` session. The owner must pass TOTP before choosing
a new password, and changing it signs out every session. A compromised inbox alone is not enough.

### 4.2 Defense in depth (all required)

1. **Supabase Auth config:** new signups disabled; TOTP MFA enroll and verify enabled.
2. **DB trigger:** inserting a second row into `auth.users` raises an error (see US-001).
3. **Route guard** in `src/proxy.ts`: redirects based on session and AAL state.
4. **Server-side re-check:** every protected Server Component layout and every Server Action verifies the
   user and `aal2` itself. Do not rely on the proxy alone.
5. **RLS:** every table has RLS enabled, an owner policy, **and** a restrictive `aal2` policy (template in §6).

### 4.3 Rules

- On the server, **never** trust `supabase.auth.getSession()` for authorization. Use `supabase.auth.getClaims()`
  (verifies the JWT) or `supabase.auth.getUser()`.
- No env var containing a secret may be prefixed `NEXT_PUBLIC_`.
- Auth error messages are generic ("Invalid email or password", "Invalid code") and never say which part was wrong.
- Any email-based flow (e.g. US-002, paused) gives the same response whether or not the email matches (no account enumeration).
- One-time tokens from email links are verified only on POST, never on GET, because email scanners pre-fetch links.
- Passwords are never accepted as CLI arguments.
- Never log passwords, TOTP secrets, TOTP codes, or session tokens.
- Security headers are set in `next.config.ts` for all routes:
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`,
  and `X-Robots-Tag: noindex, nofollow`. Also add `robots` metadata with `index: false`.

## 5. Environment variables

| Name | Used by | Description |
|------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | app, scripts | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | app | Publishable key (`sb_publishable_…`). On older projects this is the legacy anon key. |
| `SUPABASE_SECRET_KEY` | **scripts only** | Secret key (`sb_secret_…`). On older projects this is the legacy service_role key. Never imported under `src/`. |
| `NEXT_PUBLIC_APP_NAME` | app | Display name, also used as the TOTP issuer. Default `Personal Dashboard`. |

Commit `.env.example` with every variable and no values. Commit `.env.local` never.

## 6. Database conventions

- Every schema change is a migration in `supabase/migrations/` (`supabase migration new <name>`).
- Every table in `public` must follow this template:

```sql
create table public.example (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.example enable row level security;

create policy "owner can do everything"
  on public.example for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "require aal2"
  on public.example as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');
```

- Grant nothing to `anon`.
- Generate types with `supabase gen types typescript --local > src/lib/supabase/database.types.ts` after each migration.

## 7. Mobile-first UI rules (apply to every screen)

- Build the base styles for phones first. Add larger-screen styles only with `sm:`+ prefixes.
- Content column: `w-full max-w-md mx-auto px-4`. Pages must not scroll horizontally at 320px wide.
- Touch targets must be at least **44×44px** (`min-h-11`). Primary buttons are full-width on mobile.
- Inputs use `text-base` (16px) or larger, which stops iOS from zooming in on focus.
- Set correct `type`, `inputMode`, and `autoComplete` on every input, so password managers such as Bitwarden work.
- Use `min-h-dvh` instead of `h-screen`. Respect safe areas (`env(safe-area-inset-*)`) and export a `viewport` config
  with `viewportFit: 'cover'`.
- Keep the primary action within thumb reach: put it at the bottom of short forms, never hidden behind hover.
- Every form works without client JS where practical (Server Actions + `useActionState` for pending/error state).
- Accessibility: labelled inputs, visible focus rings, errors linked to fields via `aria-describedby`, and `role="alert"` on form errors.

## 8. Project structure

```
.
├── AGENTS.md                     # rules for agents (read first)
├── docs/design/                  # design handoff: README (tokens, components, screens) + rendered v2 reference
├── docs/spec/                    # specs: overview, design-system guide, one file per user story
├── scripts/                      # operator CLI scripts (use the secret key)
├── supabase/
│   ├── config.toml
│   └── migrations/
├── src/
│   ├── proxy.ts                  # session refresh + route guard
│   ├── app/
│   │   ├── layout.tsx            # root layout, viewport, metadata
│   │   ├── globals.css           # tailwind + @theme tokens
│   │   ├── (auth)/               # login, setup-2fa, verify-2fa
│   │   └── (app)/                # protected app (aal2 only)
│   ├── components/ui/            # design-system primitives (Button, Input, OtpInput, Alert, Badge…)
│   └── lib/
│       ├── supabase/             # server/browser/proxy clients, generated types
│       └── auth/                 # pure guard logic, auth helpers
└── tests/
    ├── unit/
    └── e2e/
```

## 9. User stories index

| ID | Title | Status |
|----|-------|--------|
| [US-001](stories/US-001-owner-auth-totp.md) | Owner account, sign-in, and mandatory TOTP | Ready |
| [US-002](stories/US-002-password-reset.md) | Password reset by email | ⏸ Paused (do not implement) |

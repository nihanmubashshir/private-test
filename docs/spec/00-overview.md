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
| Scripts | `tsx` | For owner-management CLI scripts in `scripts/`. |
| Dates & time zones | `Intl` + `date-fns` / `@date-fns/tz` | `Intl.DateTimeFormat` for display; `@date-fns/tz` only for wall-time ↔ ISO conversion. All client-side (§6.2). |
| Format | Prettier | No ESLint, no automated test suite (unit or E2E) — removed deliberately; see US-001 Deviations. Type-checking (`tsc --noEmit`) is the only automated check. |

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

### 6.1 Table template and migrations

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
- Generate types after each migration (`pnpm db:types` locally, or `supabase gen types typescript --project-id <ref>` against the hosted project).

### 6.2 Time handling (all features)

1. **Instants and zones are stored separately.** Any user-meaningful moment is a `timestamptz` column (UTC instant, sent and returned as an
   ISO 8601 string), plus a `time_zone text` column holding the IANA zone of the device where it was recorded.
2. **The client supplies both.** Timestamps come from the client (`new Date().toISOString()` at the moment of the action, or
   converted from form inputs on the client), and the zone comes from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
3. **The server validates, never converts.** Server code (Server Components, Server Actions, data layers) never formats dates, never
   relies on its own time zone (Vercel runs in UTC), and never uses DB `now()` for user-meaningful times. `now()` is used only for
   `created_at`/`updated_at` and for sanity checks such as "not in the future".
4. **The client converts and formats.** All display and wall-time conversion goes through `src/lib/time/`, called from client components
   with an **explicit `timeZone`** and the fixed app locale (`src/lib/time/locale.ts`). This keeps server-rendered HTML and the browser
   render identical. Output that depends on the device zone or the current time renders after mount.
5. Durations are derived in the database (generated columns), never sent by the client.

### 6.3 Timed-entity template

Every table whose rows are timed sessions (started/stopped: runs, and future trackers) uses this template, so it works with the
global stopwatch (US-003). Replace `<entity>`:

```sql
create table public.<entity> (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,                                         -- null while running
  time_zone text not null check (char_length(time_zone) between 1 and 64),
  duration_seconds integer generated always as
    (floor(extract(epoch from (ended_at - started_at)))::integer) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint <entity>_ends_after_start check (ended_at is null or ended_at > started_at),
  constraint <entity>_no_overlap exclude using gist (
    owner_id with =,
    tstzrange(started_at, coalesce(ended_at, 'infinity'::timestamptz), '[)') with &&
  )
);

create unique index <entity>_one_running on public.<entity> (owner_id) where ended_at is null;
create index <entity>_owner_started on public.<entity> (owner_id, started_at desc);

create trigger <entity>_set_updated_at
  before update on public.<entity>
  for each row execute function private.set_updated_at();

alter table public.<entity> enable row level security;
-- plus the two policies from §6 ("owner can do everything", "require aal2")
```

Add columns specific to the entity after `time_zone`. Drop the no-overlap constraint only if the story explicitly says sessions may overlap.

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
│   │   └── (app)/                # protected app (aal2 only): home, trackers (e.g. running/)
│   ├── components/ui/            # design-system primitives (Button, Input, OtpInput, Alert, Badge, Sheet…)
│   ├── components/stopwatch/     # global stopwatch UI (US-003)
│   └── lib/
│       ├── supabase/             # server/browser/proxy clients, generated types
│       ├── auth/                 # pure guard logic, auth helpers, requireFull
│       ├── time/                 # client-side time formatting + wall-time conversion (§6.2)
│       ├── stopwatch/            # registry, server data layer, actions (US-003)
│       └── <tracker>/            # per-tracker server queries (e.g. runs/)
```

There is no `tests/` directory — no automated test suite is maintained (see US-001 Deviations).

## 9. User stories index

| ID | Title | Status |
|----|-------|--------|
| [US-001](stories/US-001-owner-auth-totp.md) | Owner account, sign-in, and mandatory TOTP | Ready |
| [US-002](stories/US-002-password-reset.md) | Password reset by email | ⏸ Paused (do not implement) |
| [US-003](stories/US-003-global-stopwatch.md) | Global stopwatch pattern | Ready |
| [US-004](stories/US-004-running-tracker.md) | Running tracker | Ready (after US-003) |

# US-001 — Owner account, sign-in, and mandatory TOTP

> Status: **Ready** · Depends on: nothing (first story; includes project scaffolding)
> Read [`../00-overview.md`](../00-overview.md) and [`../01-design-system.md`](../01-design-system.md) first.

## 1. User story

> **As** the sole owner of this dashboard,
> **I want** to create my account from the terminal with my own email and password, and then be forced to set up TOTP
> in an authenticator app (Bitwarden, Google Authenticator, etc.),
> **so that** only I can ever access the app, and a leaked password alone is not enough.

## 2. Scope

### In scope
- Scaffolding the project (Next.js, Tailwind, Supabase local, tooling, tests).
- A CLI script that creates the single owner account from an **email and password supplied by the operator**.
- A login page (email + password).
- Mandatory TOTP enrollment the first time the owner signs in.
- A TOTP challenge on every later sign-in.
- A route guard that enforces the state machine in §4.
- Sign out.
- A placeholder protected home page ("Signed in" + sign-out button).
- Operator recovery scripts for lockout: set a new password, remove TOTP factors.
- Design tokens, fonts, and the UI primitives these screens use ([`01-design-system.md`](../01-design-system.md) §5).

### Out of scope (future stories)
- **Password reset by email**: specified in [US-002](US-002-password-reset.md) (paused). Until then, the password can only be
  changed with `pnpm owner:reset-password`.
- Changing the password or email from inside the signed-in app.
- Managing TOTP from the UI (adding a second factor, removing a factor, recovery codes).
- "Remember this device" / skipping TOTP.
- Passkeys/WebAuthn, magic-link sign-in, and any email sending.
- Redirecting back to the originally requested URL after login (always land on `/`).
- Design-system components these screens don't use (toast, table, modal/bottom sheet, skeleton).

### Forward compatibility with US-002
Keep these easy to extend, because US-002 will add a `RECOVERY` state, three routes, and a "Forgot password?" link:
- `AuthState` is a string-literal union, and `resolveRoute` is **table-driven** (a map of state → allowed path + redirect), not nested `if`s.
- Actions redirect with `homeFor(newState)`, never a hard-coded `/`.
- The password policy lives in one shared module (§3.1).

## 3. Operator flow: creating the owner

The owner account is **never** created through the web UI. The operator runs a script once:

```bash
pnpm owner:create --email you@example.com
# prompts: Password (hidden), Confirm password (hidden)
```

### 3.1 Password policy (shared)

Defined once in `src/lib/auth/password-policy.ts` as a zod schema. The **scripts and the app both import it** (it contains
no secrets and no server-only imports).

- Minimum **12** characters, maximum **72** (bcrypt's byte limit; validate UTF-8 byte length ≤ 72).
- No other composition rules. The owner uses a password manager.
- Mirror the minimum in Supabase config (`minimum_password_length = 12`, §6.1) so the server enforces it too.

### 3.2 `scripts/owner-create.ts` requirements

1. Loads env from `.env.local` (e.g. `tsx --env-file=.env.local`). Requires `NEXT_PUBLIC_SUPABASE_URL` and
   `SUPABASE_SECRET_KEY`; if either is missing, exits non-zero with a clear message.
2. Creates an admin client with the secret key (`auth: { autoRefreshToken: false, persistSession: false }`).
3. **Refuses if any user already exists** (`auth.admin.listUsers({ perPage: 1 })`). It exits non-zero with:
   `An owner account already exists. Use pnpm owner:reset-password or pnpm owner:reset-mfa for recovery.`
4. **Email:** taken from `--email`, or prompted if the flag is missing. Trimmed, lowercased, validated with zod.
   Print a reminder to use a **real inbox the owner controls**, because future password reset (US-002) will send email there.
5. **Password:** **never** accepted as a CLI flag (it would leak into shell history and the process list).
   - Interactive (default): hidden prompt, entered twice, must match. Use `node:readline` with muted echo, or a small prompt library.
   - Non-interactive: `--password-stdin` reads the password from stdin (for tests and automation).
   - Validated against the shared password policy. On failure, print the rule and exit non-zero (or re-prompt when interactive).
6. Calls `auth.admin.createUser({ email, password, email_confirm: true })`.
7. Prints `Owner created: <email> (id <uuid>)` and the next steps (`pnpm dev`, sign in, set up TOTP).
   **Never echoes the password.**
8. Exit code `0` on success, non-zero on any failure.

### 3.3 Recovery scripts

| Command | File | Behavior |
|---------|------|----------|
| `pnpm owner:reset-password` | `scripts/owner-reset-password.ts` | The only way to change the password until US-002 ships. Finds the single user (errors if 0 or >1), prompts for a new password the same way as §3.2 #5 (`--password-stdin` supported), updates it with `auth.admin.updateUserById`, signs the user out of all sessions if the admin API supports it, and prints a confirmation without the password. |
| `pnpm owner:reset-mfa` | `scripts/owner-reset-mfa.ts` | Finds the single user, lists their MFA factors (`auth.admin.mfa.listFactors`), deletes every factor (`auth.admin.mfa.deleteFactor`), and prints how many were removed. At next login the owner is sent to enrollment again. Asks for `y/N` confirmation unless `--yes` is passed. |

Shared helpers (admin client, prompts, single-user lookup) live in `scripts/lib/`.

## 4. Auth state machine and route guard

### 4.1 States

Derived on every request from the Supabase session (verified claims) plus
`supabase.auth.mfa.getAuthenticatorAssuranceLevel()` → `{ currentLevel, nextLevel }`:

| State | Condition | Meaning |
|-------|-----------|---------|
| `ANON` | no valid user | Not signed in |
| `NEEDS_ENROLL` | user, `currentLevel = aal1`, `nextLevel = aal1` | Password ok, **no verified TOTP factor** yet |
| `NEEDS_VERIFY` | user, `currentLevel = aal1`, `nextLevel = aal2` | Password ok, has a TOTP factor, not verified this session |
| `FULL` | user, `currentLevel = aal2` | Fully authenticated |

### 4.2 Routing table

| Path | `ANON` | `NEEDS_ENROLL` | `NEEDS_VERIFY` | `FULL` |
|------|--------|----------------|----------------|--------|
| `/login` | ✅ allow | → `/setup-2fa` | → `/verify-2fa` | → `/` |
| `/setup-2fa` | → `/login` | ✅ allow | → `/verify-2fa` | → `/` |
| `/verify-2fa` | → `/login` | → `/setup-2fa` | ✅ allow | → `/` |
| any other page (e.g. `/`) | → `/login` | → `/setup-2fa` | → `/verify-2fa` | ✅ allow |

- Implement this as a **pure function** in `src/lib/auth/route-guard.ts`:
  `resolveRoute(state: AuthState, pathname: string): { action: 'allow' } | { action: 'redirect'; to: string }`.
  Also export `homeFor(state)`, the "allow" destination for each state (`/login`, `/setup-2fa`, `/verify-2fa`, `/`).
  Unit-test **every cell** of the table.
- A separate function `deriveAuthState({ user, aal })` maps Supabase data to `AuthState`. Unit-test it too.
- `src/proxy.ts`:
  1. Builds the Supabase server client with `@supabase/ssr` and refreshes the session cookies (the standard Supabase SSR pattern).
  2. Derives state, calls `resolveRoute`, and redirects if needed. **Refreshed cookies must be copied onto the redirect response.**
  3. Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and static image/font files.
- Server Actions are not reliably covered by the proxy. **Each action re-checks the required state itself**
  (sign in: `ANON`; enroll: `NEEDS_ENROLL`; verify: `NEEDS_VERIFY`; sign out: any signed-in state).
- After any successful auth step, the action re-derives state and redirects to `homeFor(newState)`.
- `src/app/(app)/layout.tsx` re-checks for `FULL` on the server and calls `redirect()` if not. Defense in depth.

## 5. Screens (mobile first)

**Visual spec:** [`docs/design/README.md`](../../design/README.md) → "Screens / Views", with the conflict resolutions in
[`01-design-system.md`](../01-design-system.md) §6. This section defines **behavior and copy**; the design defines **appearance**.
Compare each screen against the drawn 375px frames in `docs/design/Dashboard Design System v2.dc.html`.

All auth screens share `src/app/(auth)/layout.tsx`: a vertically centered column
(`min-h-dvh flex flex-col justify-center px-4`, content `w-full max-w-md mx-auto`, **no card chrome**), with the brand row
(18px gold mark + app name) centered at the top.

Alert tones: **danger** for failed credentials or codes; **warning** for rate limits (429). There is one alert per form, placed directly above the submit button.

### 5.1 `/login`

| Element | Details |
|---------|---------|
| Heading | "Sign in" |
| Email input | `type="email"`, `name="email"`, `autoComplete="username"`, `autoCapitalize="none"`, `spellCheck={false}`, required |
| Password input | `type="password"`, `name="password"`, `autoComplete="current-password"`, required, Show/Hide toggle |
| Alert | Error from the action |
| Submit | Full-width "Sign in". While pending: disabled, label "Signing in…" |

**Server Action `signIn`:**
1. Validate with zod (email format, password 1–256 chars). If invalid, show the generic error.
2. `supabase.auth.signInWithPassword({ email, password })`.
3. On failure: return `"Invalid email or password."` (danger). If the error is a rate limit (HTTP 429), return
   `"Too many attempts. Try again in a few minutes."` (warning). The action returns `{ message, tone }`.
4. On success: `redirect(homeFor(state))`, which will be `/setup-2fa` or `/verify-2fa`.

There is **no** sign-up link and (until US-002) **no** "Forgot password?" link.

### 5.2 `/setup-2fa` (forced enrollment)

**Page load (Server Component + Server Action or Route Handler, agent's choice; document it):**
1. List the user's factors (`supabase.auth.mfa.listFactors()`). **Unenroll every unverified TOTP factor** left over from
   an abandoned attempt. Without this, re-enrolling fails or piles up factors.
2. `supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator', issuer: NEXT_PUBLIC_APP_NAME })`.
   Supabase returns `id` (factorId), `totp.qr_code` (SVG data URI), `totp.secret`, and `totp.uri` (otpauth URI).
   - Use a unique friendly name (e.g. `Authenticator <ISO date>`) if Supabase rejects duplicates.
   - Enrollment must not run twice when React re-renders or on double requests. Do not enroll from a client `useEffect`.
     Enroll on the server during the request, or through an explicit action.

**Layout (top to bottom, phone-first):**

| # | Element | Details |
|---|---------|---------|
| 1 | Heading | "Set up two-factor authentication" |
| 2 | Explanation | "Two-factor authentication is required. Add this account to Bitwarden, Google Authenticator, or another authenticator app." |
| 3 | **Setup key** (shown first, because on a phone the owner can't scan their own screen) | The `totp.secret` shown in groups of 4 characters in DM Mono, with a **Copy setup key** button (shows "Copied" for 2s). The copied value has **no spaces**. |
| 4 | **Open in authenticator app** link | `<a href={totp.uri}>`. Opens the `otpauth://` handler on phones that support it. |
| 5 | **QR code** | `<img src={totp.qr_code} alt="QR code for authenticator app">`, at least 200×200, white background, 16px quiet zone, inside `<details>` "Scan a QR code instead". Closed on mobile, opened from `sm:` up. |
| 6 | Code input | `OtpInput`, label "6-digit code from your app". Strip spaces before submitting. |
| 7 | Hidden input | `factorId` |
| 8 | Submit | Full-width "Verify and finish setup" |
| 9 | Secondary | "Sign out" (ghost) |

**Server Action `verifyEnrollment`:**
1. Re-check state is `NEEDS_ENROLL`. Validate `code` (`^\d{6}$`) and `factorId` (uuid).
2. Confirm `factorId` belongs to the current user's **unverified** TOTP factors (via `listFactors`). Never trust the client value alone.
3. `supabase.auth.mfa.challengeAndVerify({ factorId, code })`, or `challenge` then `verify`.
4. On failure: `"That code didn't work. Check your device's time is correct and try again."`. Keep the same
   factor and QR on screen; **do not** re-enroll on a failed attempt.
5. On success: the session is now `aal2`. `redirect(homeFor(state))`.

**Security notes:** the secret and QR must never be logged, cached, or stored by the app. Set
`Cache-Control: no-store` on this page (`export const dynamic = 'force-dynamic'` plus a header). The secret may appear only in the rendered HTML response.

### 5.3 `/verify-2fa`

| Element | Details |
|---------|---------|
| Heading | "Two-factor authentication" |
| Text | "Enter the 6-digit code from your authenticator app." |
| Code input | `OtpInput` |
| Submit | Full-width "Verify" |
| Secondary | "Sign out" (ghost) |
| Help text | "Lost access to your authenticator? Run `pnpm owner:reset-mfa` on the server." |

**Server Action `verifyChallenge`:**
1. Re-check state is `NEEDS_VERIFY`. Validate the code.
2. Pick the user's verified TOTP factor on the **server** (`listFactors` → first verified `totp`). The client does not send a factorId.
3. `challengeAndVerify`. On failure: `"Invalid code."` (429 → rate-limit warning). On success: `redirect(homeFor(state))`.

### 5.4 `/` (protected placeholder)

- `src/app/(app)/layout.tsx`: server-side `FULL` check, plus the top bar (brand left, "Sign out" right), which respects `safe-area-inset-top`.
- `src/app/(app)/page.tsx`: success `aal2` badge + "You're signed in." That's all.

### 5.5 Sign out

- Server Action `signOut` in `src/lib/auth/actions.ts`: `supabase.auth.signOut()` then `redirect('/login')`.
- Rendered as a `<form action={signOut}><button>Sign out</button></form>` so it works without JS.

## 6. Supabase configuration

### 6.1 `supabase/config.toml` (local), mirrored in the hosted project dashboard

Verify the exact key names against the installed Supabase CLI version.

```toml
[auth]
site_url = "http://localhost:3000"
enable_signup = false               # no new users via the public API
minimum_password_length = 12

[auth.email]
enable_signup = false
enable_confirmations = false        # owner is created pre-confirmed by the script

[auth.mfa]
max_enrolled_factors = 10

[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true

[auth.rate_limit]
sign_in_sign_ups = 10               # per 5 min per IP (lower than default)
token_verifications = 10
```

Write the matching **hosted-project checklist** into `docs/setup.md`: signups off, TOTP on, minimum password length, rate limits,
Site URL set to the production domain.

### 6.2 Migration `supabase/migrations/<timestamp>_single_user_guard.sql`

```sql
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.enforce_single_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('enforce_single_user'));
  if exists (select 1 from auth.users) then
    raise exception 'This is a single-user instance; a user already exists.';
  end if;
  return new;
end;
$$;

create trigger enforce_single_user
  before insert on auth.users
  for each row execute function private.enforce_single_user();
```

Acceptance: running `owner:create` twice fails the second time at the script check. Bypassing the script
(calling `auth.admin.createUser` directly) also fails, at the trigger.

## 7. Code layout for this story

```
scripts/
  lib/admin-client.ts
  lib/prompt.ts                  # hidden password prompt, --password-stdin
  lib/get-single-user.ts
  owner-create.ts
  owner-reset-password.ts
  owner-reset-mfa.ts
supabase/
  config.toml
  migrations/<ts>_single_user_guard.sql
src/
  proxy.ts
  app/
    layout.tsx                   # html lang, fonts, viewport (viewportFit cover), metadata (robots noindex)
    globals.css                  # design tokens, see 01-design-system.md §4
    (auth)/layout.tsx
    (auth)/login/page.tsx
    (auth)/login/actions.ts
    (auth)/setup-2fa/page.tsx
    (auth)/setup-2fa/actions.ts
    (auth)/setup-2fa/qr-details.tsx           # 'use client'; opens <details> from sm: up (01-design-system §6 #12)
    (auth)/verify-2fa/page.tsx
    (auth)/verify-2fa/actions.ts
    (app)/layout.tsx
    (app)/page.tsx
  components/ui/                 # all specs: docs/design/README.md → Components
    button.tsx                   # primary | secondary | ghost | danger; sm | md | lg; pending; fullWidth; link variant
    spinner.tsx
    input.tsx                    # label + field + helper + error; password variant with Show/Hide toggle
    otp-input.tsx                # single <input>, DM Mono 32px
    card.tsx
    alert.tsx                    # danger | warning | success | neutral
    form-error.tsx               # Alert with role="alert"
    badge.tsx
    copy-secret-button.tsx       # 'use client'
    brand.tsx                    # 18px gold mark + app name
  lib/
    supabase/server.ts           # createServerClient for RSC / actions (next/headers cookies)
    supabase/proxy.ts            # updateSession(request) helper used by src/proxy.ts
    supabase/database.types.ts   # generated
    auth/state.ts                # AuthState type, deriveAuthState, getAuthState(supabase)
    auth/route-guard.ts          # resolveRoute, homeFor (pure, table-driven)
    auth/password-policy.ts      # shared zod schema (scripts + app)
    auth/actions.ts              # signOut
```

No `tests/` directory — see the Deviations section for why.

A browser Supabase client (`lib/supabase/client.ts`) is **not needed** for this story. Add it only when a later story requires it.

## 8. Implementation tasks (in order)

Each task ends with `pnpm typecheck` passing (no lint step, no automated test suite — see Deviations). Make one commit per task.

| # | Task | Done when |
|---|------|-----------|
| T1 | **Scaffold**: `create-next-app` (TS, App Router, Tailwind, `src/`, pnpm), Prettier, `.env.example`, `.gitignore`, `package.json` scripts (`dev`, `build`, `typecheck`, `owner:*`, `db:reset`, `db:types`). Security headers + noindex. Root layout with viewport export. | `pnpm dev` serves a page. `pnpm typecheck` is green. |
| T2 | **Supabase local**: `supabase init`, config from §6.1, migration (§6.2), `docs/setup.md` (local setup + hosted checklist). | `supabase start && supabase db reset` succeeds. Signups are rejected. |
| T3 | **Password policy + owner scripts** (§3). | `pnpm owner:create --email …` creates the owner from prompted input. A second run refuses. Reset scripts work against local Supabase. The password never appears in output. |
| T4 | **Auth core**: `lib/supabase/*`, `lib/auth/state.ts`, `lib/auth/route-guard.ts`, `src/proxy.ts`. | An unauthenticated visit to `/` redirects to `/login`. |
| T5 | **Design system**: tokens and fonts in `globals.css`/`layout.tsx` (01-design-system §4), the primitives in `components/ui/*` with all README states, and the `(auth)` layout. Add a dev-only `/_dev/ui` page that renders every primitive in every state for visual comparison with the v2 file. It must return 404 in production builds. | Primitives match the v2 file side by side. Renders at 320px without horizontal scroll. Palette grep (01-design-system §4.2) is empty. |
| T6 | **Login** (§5.1) + sign out (§5.5). | Owner can sign in and lands on `/setup-2fa`. |
| T7 | **Enrollment** (§5.2). | Owner can enroll with Bitwarden or Google Authenticator and lands on `/`. |
| T8 | **Verify** (§5.3) + protected placeholder (§5.4). | A second sign-in requires a code. The app is reachable only at aal2. |
| T9 | **Manual verification** (§9.2) + README quickstart. | Every scenario in the manual test plan is checked by hand against local Supabase. |

## 9. Acceptance criteria and tests

### 9.1 Acceptance criteria (Given/When/Then)

1. **No sign-up path.** Given the app is running, there is no sign-up UI, and calling Supabase `auth.signUp` with the publishable key fails.
2. **Owner creation.** Given an empty database, when `pnpm owner:create --email a@b.co` runs with a valid password entered twice,
   then the owner is created and the script exits 0 without printing the password. A password shorter than 12 characters or a mismatched
   confirmation is rejected. `--password` is not a recognized flag. Running the script again exits non-zero and creates no user.
3. **Unauthenticated access.** Given no session, visiting `/`, `/setup-2fa`, `/verify-2fa`, or any unknown path redirects to `/login`.
4. **Wrong credentials.** Submitting a wrong password shows "Invalid email or password." with no hint about which field was wrong.
5. **Forced enrollment.** Given valid credentials and no TOTP factor, after sign-in the owner lands on `/setup-2fa`, and every
   attempt to open `/` redirects back to `/setup-2fa`.
6. **Enrollment UX on mobile.** On a 375px viewport, the setup key is visible without scrolling past the QR code,
   the Copy button copies the secret without spaces, and the "Open in authenticator app" link has an `otpauth://totp/` href
   containing the issuer.
7. **Enrollment verify.** Entering a wrong code shows an error and keeps the same QR code and secret. Entering a correct code redirects to `/`.
8. **Abandoned enrollment.** Given the owner left `/setup-2fa` without verifying, when they come back they get a new
   secret, and only one unverified factor exists.
9. **Challenge on later sign-ins.** Given an enrolled owner signs out and signs in again, they land on `/verify-2fa`, cannot reach `/`
   until a valid code is entered, and reach `/` after entering one.
10. **Full session.** At aal2, visiting `/login`, `/setup-2fa`, or `/verify-2fa` redirects to `/`.
11. **Sign out** from any signed-in state returns to `/login`, after which `/` redirects to `/login`.
12. **DB-level enforcement.** Given a session at aal1, a query to any RLS-protected table returns no rows.
    (Verify with a throwaway test table in the E2E/integration setup, or defer this check to the first story that adds a table.)
13. **Operator recovery.** `pnpm owner:reset-mfa --yes` removes the factors, and the next sign-in lands on `/setup-2fa`.
    `pnpm owner:reset-password` sets the prompted password: the old one stops working and the new one works.
14. **Mobile quality.** Every auth screen at 320px and 375px wide: no horizontal scroll, all buttons ≥44px tall,
    inputs ≥16px font size.
15. **Design fidelity.** At 375px, each screen matches its drawn frame in `docs/design/Dashboard Design System v2.dc.html`
    (with the 01-design-system §6 resolutions). The TOTP secret, code input, and CLI command are in DM Mono. Gold appears only on
    primary buttons, focus rings, the brand mark, and the "Open in authenticator app" link.

### 9.2 Manual verification plan (mobile viewport, against local Supabase)

There is no automated test suite (see Deviations). Verify by hand, in a real mobile-width browser
window (375px and 320px) against `supabase start`, before marking T9 done:

- **Setup:** `supabase db reset`, then `pnpm owner:create` to create the owner.
- **TOTP codes:** enroll for real in an authenticator app (Bitwarden, Google Authenticator, or
  `otplib`'s `authenticator.generate(secret)` run ad hoc in a Node REPL) to produce codes.
- **Scenarios:** walk through AC 1–15 by hand, one at a time, including the negative cases (wrong
  password, wrong code, abandoned enrollment, direct navigation to protected routes at each auth state).
- Check `document.documentElement.scrollWidth` and button bounding boxes in devtools at 320px/375px for AC 6/14.

## 10. Definition of done

- All tasks T1–T9 are complete and all acceptance criteria pass (verified manually per §9.2).
- `pnpm typecheck` and `pnpm build` are green. There is no `pnpm lint`, `pnpm test`, or `pnpm test:e2e`.
- No `SUPABASE_SECRET_KEY` usage under `src/` (`grep -r SUPABASE_SECRET_KEY src/` is empty).
- `README.md` quickstart covers: install, `supabase start`, env setup, `pnpm owner:create`, `pnpm dev`, enrolling TOTP.
- `docs/setup.md` covers the hosted Supabase checklist.
- Any deviation from this spec is written back into this file under a **"Deviations"** heading with the reason.

## 11. Open questions (defaults apply until answered)

| # | Question | Default used |
|---|----------|--------------|
| Q1 | Session lifetime / idle timeout? | Supabase defaults. |
| Q2 | Hosting target (Vercel, self-hosted…)? | Unspecified. Nothing in this story may depend on a specific host. |
| Q3 | Recovery codes in the UI? | No. A lost authenticator is recovered with the operator script only. |

## 12. Deviations

- **No ESLint, no automated test suite (Vitest/Playwright/otplib).** The operator decided not to carry
  linting or automated testing in this project; all mentions of `pnpm lint`, `pnpm test`, `pnpm test:e2e`,
  unit tests, and E2E tests have been removed from this story and from `00-overview.md`/`AGENTS.md`.
  `pnpm typecheck` (`tsc --noEmit`) is the only automated check. Every acceptance criterion is instead
  verified manually per §9.2. Tasks T3 and T4, which originally called for unit tests, and T9, which
  originally built the E2E suite, are scoped down accordingly.
- **Development done against a hosted Supabase project, not local Docker.** The build environment's
  user account lacks Docker socket permissions (and granting them is a persistent, root-equivalent
  system change out of scope to make unilaterally), so `supabase start`/`supabase db reset` were not
  used. Instead the operator created a hosted Supabase project and supplied its credentials in
  `.env.local`. The environment also has no outbound IPv6 route, and Supabase's direct Postgres host
  is IPv6-only, so the migration in §6.2 was applied by the operator via the hosted project's SQL
  Editor rather than `supabase db push`. `supabase/config.toml` and `supabase/migrations/` are
  unaffected — they remain the source of truth and apply identically to local Docker once available;
  see `docs/setup.md` for the hosted checklist this makes necessary (settings that `config.toml` only
  applies to a local stack).

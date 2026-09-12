# US-002 — Password reset by email

> Status: **⏸ Paused. Do not implement.** Kept for the future. The owner will change the status to Ready.
> Depends on: [US-001](US-001-owner-auth-totp.md) done, plus a decision on hosted email delivery (§6.2).
> Read [`../00-overview.md`](../00-overview.md) and [`../01-design-system.md`](../01-design-system.md) first.
> When resumed, re-check this spec against the code as it exists then. File paths and helpers refer to the US-001 layout.

## 1. User story

> **As** the sole owner of this dashboard,
> **I want** to reset my password by email if I forget it,
> **so that** I can recover without server access, while a compromised inbox alone is still not enough to take over the account.

## 2. Scope

### In scope
- A "Forgot password?" link on `/login`.
- Request a reset link (`/forgot-password`), open it (`/auth/confirm`), pass TOTP, set a new password (`/reset-password`),
  get signed out everywhere.
- A new `RECOVERY` auth state and its routes.
- Supabase email template and config. Local email testing through the Supabase mail catcher.
- Unit and E2E tests.

### Out of scope
- Changing the password or email from inside the signed-in app.
- Magic-link sign-in, or any email other than the reset email.
- Recovering a lost authenticator by email. That still uses `pnpm owner:reset-mfa`.

## 3. Security principles

1. **Password reset never bypasses TOTP.** A reset link gives only an `aal1` session. The owner must pass TOTP (or enroll, if they never
   did) before choosing a new password.
2. **No account enumeration.** The forgot-password response is identical whether or not the email matches.
3. **Tokens are verified only on POST.** Email security scanners pre-fetch links, and a GET would use up the one-time token.
4. **Changing the password signs out every session.**
5. Nothing from the URL is rendered or used as a redirect target, except fixed allowlisted flags.

## 4. Auth state machine changes (extends US-001 §4)

### 4.1 New state

| State | Condition | Meaning |
|-------|-----------|---------|
| `RECOVERY` | user, `currentLevel = aal2`, session was started from a password-reset link | TOTP passed; the owner must set a new password before doing anything else |

`FULL` becomes: user, `currentLevel = aal2`, **not** a recovery session.

**Detecting a recovery session:** the JWT `amr` claim lists the authentication methods used for the session. A session started from a
reset link includes a `recovery` entry. **Verify this against the installed Supabase version first.** If `amr` does not
expose it, use this fallback: `/auth/confirm` sets an `httpOnly`, `secure`, `sameSite=lax`, 15-minute cookie `pw_recovery=1`,
and the reset action clears it. This is acceptable because the cookie only affects routing: `/reset-password` still requires aal2.
Record which approach was used under "Deviations".

`deriveAuthState({ user, aal, isRecovery })` gains the `isRecovery` input.

### 4.2 Full routing table after US-002

| Path | `ANON` | `NEEDS_ENROLL` | `NEEDS_VERIFY` | `RECOVERY` | `FULL` |
|------|--------|----------------|----------------|------------|--------|
| `/login` | ✅ allow | → `/setup-2fa` | → `/verify-2fa` | → `/reset-password` | → `/` |
| `/forgot-password` | ✅ allow | → `/setup-2fa` | → `/verify-2fa` | → `/reset-password` | → `/` |
| `/auth/confirm` | ✅ allow | ✅ allow | ✅ allow | ✅ allow | ✅ allow |
| `/setup-2fa` | → `/login` | ✅ allow | → `/verify-2fa` | → `/reset-password` | → `/` |
| `/verify-2fa` | → `/login` | → `/setup-2fa` | ✅ allow | → `/reset-password` | → `/` |
| `/reset-password` | → `/login` | → `/setup-2fa` | → `/verify-2fa` | ✅ allow | → `/` |
| any other page (e.g. `/`) | → `/login` | → `/setup-2fa` | → `/verify-2fa` | → `/reset-password` | ✅ allow |

- `homeFor(RECOVERY)` = `/reset-password`. Enrollment and verify actions already redirect with `homeFor`, so they send a recovery
  session to `/reset-password` without changes.
- Action state checks: request reset: `ANON`; confirm link: any; reset: `RECOVERY`.
- Unit-test every cell again, including the new rows and column.

## 5. Screens

None of these screens are drawn. Design them yourself from the system (01-design-system §7), following these rules:
- Same `(auth)` layout as `/login`: brand row, then a 20px-gap column. The h1 is 28px (`text-h1`), and the paragraph is `text-body-sm` in `neutral-300`.
- Inputs are `size="lg"` (48px). Primary submit buttons are 48px and full width. Secondary actions are full-width **ghost** buttons (44px). A link
  styled as a button renders an `<a>`.
- Alert tones: **danger** for failed links or updates, **warning** for 429, **success** for confirmations. One per form, above the submit button.

### 5.1 `/login` changes
- Add `<a href="/forgot-password">` "Forgot password?" below the submit button, styled per 01-design-system §6 #13 (neutral text
  link with a ≥44px hit area). Record it in 01-design-system §8.
- When the URL has `?reset=1` (a fixed flag; nothing from the URL is rendered), show a success alert: "Password updated. Sign in with your new password."

### 5.2 `/forgot-password`

| Element | Details |
|---------|---------|
| Heading | "Reset password" |
| Text | "Enter the owner email. If it matches, we'll send a link to choose a new password." |
| Email input | Same attributes as `/login` |
| Alert | Result of the action, or danger "That reset link is invalid or has expired. Request a new one." when the URL has `?error=link` |
| Submit | Full-width "Send reset link". While pending: "Sending…" |
| Secondary | `<a href="/login">` "Back to sign in" (ghost) |

**Server Action `requestPasswordReset`:**
1. Re-check state is `ANON`. Validate the email with zod. An invalid format gets the same response as a valid one.
2. `supabase.auth.resetPasswordForEmail(email)`. **No `redirectTo`**: the link is built by the email template (§6.3).
3. **Always** return the same success message: "If that email belongs to this dashboard, a reset link is on its way. It expires in 15 minutes."
   **Exception:** a 429 returns the rate-limit warning. Rate limits apply per IP, so this reveals nothing about the account.
4. Never log the submitted email.

### 5.3 `/auth/confirm` (reset link landing)

**Verifying on GET is forbidden.** The page renders a confirmation button, and verification happens in a POST.

| Element | Details |
|---------|---------|
| Heading | "Reset your password" |
| Text | "Continue to verify this link. You'll need your authenticator app." |
| Hidden inputs | `token_hash`, `type` (from the query string) |
| Submit | Full-width "Continue" |

- If `token_hash` or `type` is missing, or `type !== 'recovery'`: render the danger alert "That reset link is invalid or has expired." with a
  link to `/forgot-password`. No button.
- `Cache-Control: no-store`, `Referrer-Policy: no-referrer` (the token is in the URL), and `robots` noindex.

**Server Action `confirmRecoveryLink`:**
1. Validate `type === 'recovery'` and that `token_hash` is a non-empty string ≤ 512 chars.
2. `supabase.auth.verifyOtp({ type: 'recovery', token_hash })`. This replaces any existing session.
3. On failure: `redirect('/forgot-password?error=link')`.
4. On success: (set the `pw_recovery` fallback cookie if needed) and `redirect(homeFor(state))`, which will be `/verify-2fa` or `/setup-2fa`.

### 5.4 `/reset-password`

| Element | Details |
|---------|---------|
| Heading | "Choose a new password" |
| Text | "You'll be signed out on every device after changing it." |
| New password | Password input, `name="password"`, `autoComplete="new-password"`, Show/Hide toggle, helper "At least 12 characters." |
| Confirm password | Password input, `name="confirmPassword"`, `autoComplete="new-password"` |
| Alert | Action error |
| Submit | Full-width "Update password". While pending: "Updating…" |
| Secondary | "Cancel and sign out" (ghost, `signOut` form) |

**Server Action `resetPassword`:**
1. Re-check state is `RECOVERY`.
2. Validate with the shared password policy (US-001 §3.1). The passwords must match. Field errors go on the inputs: "Passwords don't match." /
   "Use 12 to 72 characters."
3. `supabase.auth.updateUser({ password })`. Map known errors: reusing the same password → "Choose a different password than your current one.";
   weak password → the policy message; anything else → "Couldn't update your password. Request a new reset link." (danger).
4. On success: clear the `pw_recovery` cookie if used, call `supabase.auth.signOut({ scope: 'global' })`, then `redirect('/login?reset=1')`.

## 6. Supabase configuration

### 6.1 `supabase/config.toml` additions

```toml
[auth]
additional_redirect_urls = ["http://localhost:3000/auth/confirm"]

[auth.email]
otp_expiry = 900                    # reset links expire after 15 minutes

[auth.email.template.recovery]
subject = "Reset your dashboard password"
content_path = "./supabase/templates/recovery.html"

[auth.rate_limit]
email_sent = 4                      # per hour
```

Verify the key names against the installed CLI version, and mirror the settings in the hosted dashboard.

### 6.2 Email delivery

- **Local:** the Supabase CLI runs a mail catcher (web UI and API at `http://localhost:54324`; Inbucket or Mailpit depending on CLI
  version). No real email is sent.
- **Hosted:** Supabase's built-in sender only delivers to addresses that are members of the Supabase organization, at a
  very low hourly rate. **Either** make the owner email a member of the org (enough for one user), **or** configure custom SMTP
  in the Supabase dashboard. This is Supabase configuration, not an app backend. **Decide before resuming this story**, and document it
  in `docs/setup.md`.

### 6.3 Recovery email template `supabase/templates/recovery.html`

- The link **must** use the token-hash form: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
- Content: "Someone asked to reset the password for your dashboard. If it wasn't you, ignore this email; your password
  won't change." Include the link as a button **and** as plain text, and the 15-minute expiry. Use inline styles only, the design's dark neutrals and
  gold button, and no images or external resources.
- Paste the same template into the hosted dashboard (Authentication → Emails → Reset password).

## 7. Code layout additions

```
supabase/templates/recovery.html
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/forgot-password/actions.ts
src/app/(auth)/auth/confirm/page.tsx
src/app/(auth)/auth/confirm/actions.ts
src/app/(auth)/reset-password/page.tsx
src/app/(auth)/reset-password/actions.ts
tests/e2e/helpers/mailbox.ts         # read emails from the local mail catcher API
tests/e2e/password-reset.spec.ts
```
Also modify: `lib/auth/state.ts`, `lib/auth/route-guard.ts` (+ tests), `(auth)/login/page.tsx`, `supabase/config.toml`, `docs/setup.md`, `README.md`.

## 8. Implementation tasks (in order)

| # | Task | Done when |
|---|------|-----------|
| T1 | Config + template (§6), `docs/setup.md` email section. | Requesting a reset locally puts an email in the mail catcher with a `/auth/confirm?token_hash=…&type=recovery` link. |
| T2 | `RECOVERY` state, recovery detection, routing table + unit tests (§4). | Every cell of §4.2 is tested and green. |
| T3 | `/login` link + success flag, `/forgot-password` (§5.1–5.2). | Same message for known and unknown emails. |
| T4 | `/auth/confirm` (§5.3). | GET does not consume the token; Continue does. |
| T5 | `/reset-password` (§5.4). | Full flow works end to end locally. |
| T6 | E2E (§9.2) + README update. | `pnpm test:e2e` green. |

## 9. Acceptance criteria and tests

### 9.1 Acceptance criteria
1. **No account enumeration.** Requesting a reset for the owner email and for an unknown email shows the identical message. Only the
   owner email receives a message in the mail catcher.
2. **Reset link needs a click.** Opening the reset link with a plain GET does not use up the token: a later "Continue" still works.
3. **Reset requires TOTP.** Given an enrolled owner opens a valid link and presses Continue, they land on `/verify-2fa`. `/` and
   `/reset-password` are unreachable until a valid code is entered, after which they land on `/reset-password`, and `/` still
   redirects to `/reset-password`.
4. **Reset completes.** Setting a valid new password signs the owner out of **all** sessions (a second signed-in browser context is
   logged out on its next request), shows the success alert on `/login`, and the old password fails while the new one works.
5. **Bad links.** A used, expired, or tampered link, or one with `type` other than `recovery`, ends on `/forgot-password` with the invalid-link alert.
6. **Routing.** At `FULL`, `/forgot-password` and `/reset-password` redirect to `/`. At `ANON`, `/reset-password` redirects to `/login`.
7. **Mobile and design quality.** The new screens meet US-001 AC 14, and use only system components (01-design-system §7).

### 9.2 E2E test plan
- `tests/e2e/helpers/mailbox.ts` polls the mail catcher API for the newest message to the owner address, extracts the `/auth/confirm`
  link, and clears the mailbox between tests.
- `password-reset.spec.ts` covers AC 1–6 in the mobile profile. Use two browser contexts for AC 4. Run serially.

## 10. Open questions
| # | Question | Default |
|---|----------|---------|
| Q1 | Hosted email delivery: org-member address or custom SMTP? | Must be decided before resuming. |

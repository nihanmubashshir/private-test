# Setup

## Local development

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start local Supabase (requires Docker):
   ```bash
   supabase start
   ```
   This prints a local API URL, publishable key, and secret key.
3. Copy `.env.example` to `.env.local` and fill in the values `supabase start` printed:
   ```bash
   cp .env.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` — the local API URL (`http://127.0.0.1:54321`)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the local publishable/anon key
   - `SUPABASE_SECRET_KEY` — the local secret/service_role key
   - `NEXT_PUBLIC_APP_NAME` — defaults to `Personal Dashboard`
4. Apply migrations to the local database:
   ```bash
   pnpm db reset --local
   ```
5. Create the owner account:
   ```bash
   pnpm owner:create --email you@example.com
   ```
   Use a real inbox you control — a future story (US-002) will send password-reset email there.
   You'll be prompted for a password (hidden input, entered twice). It is never accepted as a
   `--password` flag and never printed.
6. Run the app:
   ```bash
   pnpm dev
   ```
7. Sign in at <http://localhost:3000/login> with the email and password from step 5. You'll be
   forced into TOTP enrollment (`/setup-2fa`) — add the account to an authenticator app (Bitwarden,
   Google Authenticator, etc.) using the setup key or QR code, then enter the 6-digit code to finish.
   Every sign-in after that requires a code from the app (`/verify-2fa`).

### Lockout recovery (local)

- Forgot the password: `pnpm owner:reset-password`
- Lost the authenticator device: `pnpm owner:reset-mfa`

### Regenerating types

After any migration:
```bash
pnpm db types --local     # or: pnpm db types   (hosted)
```

## Hosted Supabase project checklist

Apply these in the hosted project's dashboard (Authentication → Settings, unless noted). They mirror
`supabase/config.toml`, which only applies to the local CLI stack.

- [ ] **Signups disabled.** Authentication → Settings → "Allow new users to sign up" is **off**, for
  both the general and the email provider settings.
- [ ] **Email confirmations off.** The owner account is created pre-confirmed by
  `pnpm owner:create`; there is no signup flow that needs a confirmation email.
- [ ] **TOTP MFA enabled.** Authentication → Settings → "Multi-factor authentication" → TOTP
  (Authenticator app) enroll and verify are both **on**.
- [ ] **Minimum password length: 12.** Authentication → Settings → Password → "Minimum password
  length" is `12`.
- [ ] **Rate limits.** Authentication → Rate Limits: sign-in/sign-up attempts and OTP/token
  verifications are lowered from the defaults (e.g. `10` per 5 minutes), matching
  `supabase/config.toml`.
- [ ] **Site URL.** Authentication → URL Configuration → Site URL is set to the production domain
  (not `localhost`).
- [ ] **Migrations applied.** `pnpm db status` shows every local migration as applied. See
  [Running migrations](#running-migrations).
- [ ] **Environment variables** set wherever the app is hosted: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_NAME`. `SUPABASE_SECRET_KEY` and
  `SUPABASE_DB_URL` are needed only wherever the operator scripts run (a terminal with access to the
  hosted project), never in the deployed app's own environment.
- [ ] **`pnpm owner:create`** run once, from a terminal with `SUPABASE_SECRET_KEY` set to the hosted
  project's secret key, to create the single owner account.

## Running migrations

Every schema change is a file in `supabase/migrations/`, applied in filename order. One command
drives all of it:

```bash
pnpm db <command> [--local]
```

The target is the **hosted** project by default, via `SUPABASE_DB_URL`. Add `--local` to hit the
CLI's Docker stack instead. There is no `supabase link` step and no access token — the connection
string is the only credential, and it lives in `.env.local`.

| Command | What it does |
|---------|--------------|
| `pnpm db status` | Lists local migrations beside those the target database has applied. **Run this first, always.** |
| `pnpm db new <name>` | Creates `supabase/migrations/<timestamp>_<name>.sql` |
| `pnpm db push --dry-run` | Prints what would be applied, changes nothing |
| `pnpm db push` | Applies pending migrations (prompts before touching the hosted database) |
| `pnpm db types` | Regenerates `src/lib/supabase/database.types.ts` |
| `pnpm db baseline` | Marks every local migration as applied **without running it** — see below |
| `pnpm db reset --local` | Drops the local database and re-applies everything. Local only; refuses to run against hosted |

### The normal loop

```bash
pnpm db new weight_tracker      # write the SQL in the file it creates
pnpm db push --local            # try it locally first
pnpm db types --local           # regenerate types
pnpm typecheck
pnpm db push                    # then the hosted project
```

`pnpm db reset --local` is the local escape hatch when a migration needs reworking: edit the file
in place and reset, rather than stacking a fix-up migration. It wipes the local database, so
re-run `pnpm owner:create` afterwards. Never rewrite a migration that has already been pushed to
hosted — write a new one.

### Baselining

`pnpm db baseline` tells the migration history "these files are already applied" without executing
them. It exists for one situation: the schema was created by hand in the SQL Editor, so the objects
exist but `supabase_migrations.schema_migrations` is empty and the next `push` would try to
re-create them and fail.

Only baseline a database whose schema genuinely matches the files. Baselining one that is missing
those objects makes `push` skip them permanently, and the schema silently stays behind.

### Migration ordering

Filenames are UTC timestamps and apply in lexical order, so a new migration must sort *after* every
migration already applied to hosted. `db push` refuses to run out-of-order files rather than
applying them in the wrong sequence.

If you hit this — usually because a migration was hand-stamped with a timestamp ahead of the wall
clock — rename the offending file to a later timestamp. That is only safe while no database has
recorded the old version; once it has been pushed anywhere, `supabase db push --include-all` is the
escape hatch instead.

# Personal Dashboard

A private, single-user, mobile-first personal dashboard. Built with Next.js (App Router,
TypeScript), Tailwind CSS, and Supabase. See [`AGENTS.md`](AGENTS.md) and
[`docs/spec/`](docs/spec/) for the full product and technical spec.

## Quickstart

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start local Supabase (requires Docker):
   ```bash
   supabase start
   ```
   This prints a local API URL, publishable key, and secret key.
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
   `SUPABASE_SECRET_KEY` with the values `supabase start` printed.
4. Apply migrations:
   ```bash
   pnpm db:reset
   ```
5. Create the owner account (you'll be prompted for a password, hidden, entered twice):
   ```bash
   pnpm owner:create --email you@example.com
   ```
6. Run the app:
   ```bash
   pnpm dev
   ```
7. Open <http://localhost:3000>, sign in with the email and password from step 5, and follow the
   forced TOTP enrollment screen — add the account to an authenticator app (Bitwarden, Google
   Authenticator, etc.) using the setup key or QR code, then enter the 6-digit code. Every sign-in
   after that requires a code from the app.

See [`docs/setup.md`](docs/setup.md) for lockout recovery (`pnpm owner:reset-password`,
`pnpm owner:reset-mfa`) and the checklist for a hosted Supabase project.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Run the app on http://localhost:3000 |
| `pnpm build` / `pnpm start` | Production build / run |
| `pnpm typecheck` | `tsc --noEmit` |
| `supabase start` / `supabase stop` | Local Supabase (Docker) |
| `pnpm db:reset` | Re-apply all migrations to the local DB |
| `pnpm db:types` | Regenerate `src/lib/supabase/database.types.ts` |
| `pnpm owner:create` | Create the single owner account |
| `pnpm owner:reset-password` / `pnpm owner:reset-mfa` | Operator lockout recovery |

There is no lint step and no automated test suite in this project (see US-001 §12 Deviations);
`pnpm typecheck` is the only automated check.

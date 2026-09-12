# AGENTS.md

Instructions for AI agents working in this repository. Read this file first, then the spec.

## What this is

A private, **single-user**, **mobile-first** personal dashboard.
Stack: **Next.js (App Router, TypeScript) + Tailwind CSS + Supabase**. There is no other backend.

## Specs are the source of truth

- `docs/spec/00-overview.md`: product principles, architecture, security model, and conventions. **Read it fully.**
- `docs/spec/01-design-system.md`: how to implement the design handoff in `docs/design/`, plus the resolved design conflicts.
- `docs/spec/stories/US-XXX-*.md`: one file per user story, with scope, design, tasks, and acceptance criteria.
- Work on **one story at a time**, and do its tasks in the listed order.
- **Only implement stories with status Ready.** Paused stories (e.g. US-002) are kept for later. Don't build them or add
  parts of them early.
- If you must deviate from a spec, add a **"Deviations"** section to that story file explaining what changed and why.
  Do not silently diverge.
- If a spec is ambiguous and the ambiguity blocks you, stop and ask. Do not invent product behavior.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Run the app on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright E2E (mobile profile; needs local Supabase running) |
| `supabase start` / `supabase stop` | Local Supabase (Docker) |
| `pnpm db:reset` | Re-apply all migrations to local DB |
| `pnpm db:types` | Regenerate `src/lib/supabase/database.types.ts` |
| `pnpm owner:create --email <email>` | Create the single owner account (password is prompted, never passed as a flag) |
| `pnpm owner:reset-password` / `pnpm owner:reset-mfa` | Operator lockout recovery (the only way to change the password until US-002) |

(These commands are created in US-001 T1–T3.)

## Hard rules

1. **Mobile first.** Write base styles for phones and add `sm:`/`md:`/`lg:` for larger screens. No horizontal scroll at 320px.
   Touch targets ≥44px. Input font size ≥16px. Follow overview §7.
2. **Follow the design system.** Use Tailwind only, with the tokens from `docs/design/README.md`, and no component libraries.
   Dark only. Use only the design tokens: no default Tailwind palettes (`gray`, `zinc`, `amber`…) and no arbitrary hex values in components.
   Reusable styling lives in `src/components/ui/`. Read `docs/spec/01-design-system.md` before any UI work.
   The design is a **system, not a full set of screens**. Design any screen that isn't drawn yourself, from its components and feel
   (guide §7). Don't wait for or ask for designer frames. Record any new component or token in guide §8.
3. **No new backend or services.** Use Server Components, Server Actions, Route Handlers, and Supabase. Ask before adding a dependency
   that brings in a hosted service.
4. **Never use the Supabase secret key in `src/`.** It is for `scripts/` only. Never prefix secrets with `NEXT_PUBLIC_`.
5. **Authorize on the server with `getClaims()`/`getUser()`**, never `getSession()`. Every Server Action and protected
   layout re-checks auth state (the app requires **aal2**). Do not rely on `proxy.ts` alone.
6. **Every table gets RLS, an owner policy, and a restrictive aal2 policy.** Use the template in overview §6. Schema
   changes go only through migrations in `supabase/migrations/`.
7. **Never log** passwords, TOTP secrets or codes, or tokens.
8. **Validate all Server Action input with zod.**
9. Check the **installed version's docs** before using Next.js, Supabase, or Tailwind APIs. Versions move; spec
   snippets describe intent.

## Definition of done (every task)

- `pnpm lint && pnpm typecheck && pnpm test` pass. For UI or auth changes, `pnpm test:e2e` passes too.
- New logic has unit tests. New user-facing flows have E2E coverage in the mobile profile.
- Manually check the screen at 375px width.
- The story file's acceptance criteria that the task covers are met.
- Keep commits small and scoped to one task, with messages like `US-001 T4: auth state + route guard`.

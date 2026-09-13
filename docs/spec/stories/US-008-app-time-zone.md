# US-008 — App-wide time zone

> Status: **Done** · Depends on: [US-006](US-006-changelog.md)
> Part of the [design-2 roadmap](../design-2-roadmap.md) (decision **L1**). No designer draft —
> this story exists because the owner's locked decision contradicts two standing specs.

## 1. User story

> **As** someone who travels and keeps a VPN on,
> **I want** one time zone I choose, used everywhere in the app,
> **so that** "today" means the same thing all week and a day's records don't split across two
> zones because of where my phone thinks it is.

## 2. Why this contradicts the specs, and what gives

AGENTS.md hard rule 10 and overview §6.2 both mandated the **recording device's** IANA zone. That
is the right default for most apps and the wrong one here: a device-derived zone changes silently,
so a run logged in one country and a weigh-in logged in another land on different "days" with no
user intent behind it, and Home's "today" moves when a VPN does.

Amending both documents is part of this story (roadmap L1). **Only the source of the zone changes.**
Instants are still UTC `timestamptz`, the zone is still stored per record, the client still does all
conversion and formatting with an explicit zone, and the server still never formats and never uses
its own zone or `now()` for user-meaningful times.

The per-record `time_zone` column stays. It is still worth recording *where* something happened —
`ActivityRow` appends a session's own zone when it differs from the app's, which is now a more
meaningful comparison than it was against the phone's.

## 3. Data

`app_settings`, one row per owner (`supabase/migrations/20260913111148_app_settings.sql`):

| Column | Notes |
|--------|-------|
| `time_zone` | IANA name, `char_length` 1–64. Resolvability is checked in the Server Action with `Intl`, which Postgres has no equivalent of. |

`create unique index app_settings_one_per_owner on public.app_settings (owner_id)` — a singleton
per owner enforced by the database, not by application code, so a double submit cannot insert a
second row. Plus the standard owner and restrictive aal2 policies from overview §6.

## 4. Reading the zone

`src/lib/settings/server.ts` → `getAppSettings()`, wrapped in React `cache()` so the layout and
every page in one render share a single query.

It returns `null` when no row exists rather than substituting a default: **only the client knows a
sensible fallback** (its own zone), and overview §6.2 #3 forbids the server picking one.

`src/components/shell/app-time-zone.tsx` publishes it:

| Hook | Returns |
|------|---------|
| `useAppTimeZone()` | The configured zone, else the device zone **after mount**, else `null` |
| `useIsTimeZoneConfigured()` | False while falling back to the device |
| `useWriteTimeZone()` | A function returning the zone to stamp on a record — falls back synchronously, since a write cannot wait for a mount |

The post-mount fallback matters: the server has no device zone, so resolving one during SSR would
mismatch on hydration. Every consumer already deferred zone-dependent output to after mount for
exactly that reason, so `null` on the first frame costs nothing.

**`getDeviceTimeZone()` is called in exactly one place — this provider.** Anywhere else is a bug.

## 5. Screen

A Preferences group in `/settings` with a Time zone row showing the current zone, and `(device)`
after it while nothing is configured. Tapping opens an `EntrySheet` with a native `<select>`
(design-system §9.1 — on a phone it opens the OS wheel picker, which handles 400-odd options better
than anything hand-built, and types ahead on a keyboard for free), a "Use this device's zone"
shortcut when the selection differs from it, and Save.

Options come from `Intl.supportedValuesOf("timeZone")`, so the list can never drift from what the
Server Action will accept — it validates by resolvability, not against a list we ship.

Saving revalidates `("/", "layout")`: every screen formats instants with this zone, so the whole
tree is stale.

## 6. Tasks

| # | Task |
|---|------|
| T1 | Migration: `app_settings` + unique index + RLS + aal2. Pushed to hosted, types regenerated |
| T2 | `getAppSettings()`, `AppTimeZoneProvider`, and every `getDeviceTimeZone()` call site swapped |
| T3 | Settings → Time zone picker |
| T4 | Amend AGENTS.md rule 10 and overview §6.2; record the deviation |

## 7. Acceptance criteria

1. With no zone configured, the app behaves as before — the device zone is used, and Settings shows
   it with `(device)`.
2. Setting a zone changes Home's date line, day grouping and every formatted time, with no reload.
3. A run started after setting a zone stores that zone in `runs.time_zone`, not the device's.
4. Editing an existing run keeps the zone it was recorded in.
5. A session whose stored zone differs from the app zone shows its own zone in the activity row.
6. An unresolvable zone is rejected by the Server Action with an inline message.
7. Two settings rows cannot exist — the unique index rejects the second.
8. `getDeviceTimeZone()` appears nowhere outside `app-time-zone.tsx` and `lib/time/zone.ts`.

## 8. Deviations

| # | What changed | Why |
|---|--------------|-----|
| D1 | AGENTS.md rule 10 and overview §6.2 were amended rather than followed | Owner's locked decision (roadmap L1). Both documents now name the app zone as the source and carry a note explaining what did *not* change. |
| D2 | `app_settings` holds only the time zone; no units | Roadmap D4 — the draft stories descope lb and mi, so a units picker would be a control that changes nothing. |
| D3 | `pnpm db verify` was not run for this migration | `SUPABASE_DB_URL` is present but **empty** in `.env.local`, and `verify` needs a direct connection string that project-ref mode does not provide. The policies were written from the overview §6 template; verify should be run once that variable is filled in. |

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { SKEW_TOLERANCE_MS } from "@/lib/time/validate";
import { stopwatchKinds, type StopwatchKind, type StopwatchKindConfig } from "./registry";

type Client = SupabaseClient<Database>;

/** How far back a start time may be, so a very stale offline tap can't silently backdate a session. */
const START_LOOKBACK_MS = 24 * 60 * 60_000;

export interface ActiveStopwatch {
  kind: StopwatchKind;
  id: string;
  startedAt: string;
  timeZone: string;
}

export interface CompletedSession {
  kind: StopwatchKind;
  id: string;
  startedAt: string;
  endedAt: string;
  timeZone: string;
  durationSeconds: number;
}

export type StartStopwatchResult =
  | { status: "started"; active: ActiveStopwatch }
  | { status: "already_running"; active: ActiveStopwatch }
  | { status: "overlap" }
  | { status: "invalid_time" };

export type StopStopwatchResult =
  | { status: "stopped"; session: CompletedSession }
  | { status: "not_running" }
  | { status: "overlap" }
  | { status: "invalid_time" };

export type DiscardStopwatchResult = { status: "discarded" } | { status: "not_running" };

interface ActiveRow {
  id: string;
  started_at: string;
  time_zone: string;
}

interface CompletedRow {
  id: string;
  started_at: string;
  ended_at: string;
  time_zone: string;
  duration_seconds: number;
}

/**
 * The timed-entity template (overview §6.3) fixes the columns every kind's table has, but the
 * table *name* is only known at runtime (from the registry) — Postgrest's generated types can't
 * express "whichever table this `kind` names". The registry is the contract here, not the type
 * checker; RLS and the DB constraints (one running row, no overlap, ends-after-start) are what
 * actually enforce correctness.
 */
function timedTable(supabase: Client, kind: StopwatchKind) {
  const config = (stopwatchKinds as Record<string, StopwatchKindConfig>)[kind];
  return (supabase as unknown as SupabaseClient).from(config.table);
}

async function getActive(supabase: Client, kind: StopwatchKind): Promise<ActiveStopwatch | null> {
  const { data } = await timedTable(supabase, kind)
    .select("id, started_at, time_zone")
    .is("ended_at", null)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const row = data as ActiveRow;
  return { kind, id: row.id, startedAt: row.started_at, timeZone: row.time_zone };
}

/** For every registered kind, the currently running session (if any), in parallel. */
export async function getActiveStopwatches(supabase: Client): Promise<ActiveStopwatch[]> {
  const kinds = Object.keys(stopwatchKinds) as StopwatchKind[];
  const actives = await Promise.all(kinds.map((kind) => getActive(supabase, kind)));
  return actives.filter((active): active is ActiveStopwatch => active !== null);
}

export async function startStopwatch(
  supabase: Client,
  kind: StopwatchKind,
  input: { at: Date; timeZone: string },
): Promise<StartStopwatchResult> {
  const at = input.at.getTime();
  const now = Date.now();
  if (at < now - START_LOOKBACK_MS || at > now + SKEW_TOLERANCE_MS) {
    return { status: "invalid_time" };
  }

  const { data, error } = await timedTable(supabase, kind)
    .insert({ started_at: input.at.toISOString(), time_zone: input.timeZone })
    .select("id, started_at, time_zone")
    .single();

  if (error) {
    if (error.code === "23505") {
      const active = await getActive(supabase, kind);
      if (active) return { status: "already_running", active };
    }
    if (error.code === "23P01") {
      return { status: "overlap" };
    }
    throw error;
  }

  const row = data as ActiveRow;
  return { status: "started", active: { kind, id: row.id, startedAt: row.started_at, timeZone: row.time_zone } };
}

export async function stopStopwatch(
  supabase: Client,
  kind: StopwatchKind,
  input: { id: string; at: Date },
): Promise<StopStopwatchResult> {
  const { data: runningData } = await timedTable(supabase, kind)
    .select("id, started_at")
    .eq("id", input.id)
    .is("ended_at", null)
    .maybeSingle();

  if (!runningData) {
    return { status: "not_running" };
  }

  const running = runningData as { id: string; started_at: string };
  const startedAt = Date.parse(running.started_at);
  const at = input.at.getTime();
  const now = Date.now();
  if (!(startedAt < at) || at > now + SKEW_TOLERANCE_MS) {
    return { status: "invalid_time" };
  }

  const { data, error } = await timedTable(supabase, kind)
    .update({ ended_at: input.at.toISOString() })
    .eq("id", input.id)
    .is("ended_at", null)
    .select("id, started_at, ended_at, time_zone, duration_seconds")
    .maybeSingle();

  if (error) {
    if (error.code === "23P01") return { status: "overlap" };
    throw error;
  }

  if (!data) {
    // Raced with another device stopping or discarding this same session.
    return { status: "not_running" };
  }

  const row = data as CompletedRow;
  return {
    status: "stopped",
    session: {
      kind,
      id: row.id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      timeZone: row.time_zone,
      durationSeconds: row.duration_seconds,
    },
  };
}

export async function discardStopwatch(
  supabase: Client,
  kind: StopwatchKind,
  input: { id: string },
): Promise<DiscardStopwatchResult> {
  const { data } = await timedTable(supabase, kind)
    .delete()
    .eq("id", input.id)
    .is("ended_at", null)
    .select("id")
    .maybeSingle();

  return data ? { status: "discarded" } : { status: "not_running" };
}

/**
 * Completed sessions across every registered kind (or just one), newest first — the generic
 * source for Home's "Recent activity" and the Activity tab (01-design-system.md §8). Existing
 * per-kind query modules (e.g. src/lib/runs/queries.ts) stay for their own detail/edit pages.
 */
export async function listCompletedSessions(
  supabase: Client,
  options: { kind?: StopwatchKind; limit: number },
): Promise<CompletedSession[]> {
  const kinds = options.kind ? [options.kind] : (Object.keys(stopwatchKinds) as StopwatchKind[]);

  const perKind = await Promise.all(
    kinds.map(async (kind) => {
      const { data, error } = await timedTable(supabase, kind)
        .select("id, started_at, ended_at, time_zone, duration_seconds")
        .not("ended_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(options.limit);

      if (error) throw error;

      return ((data ?? []) as CompletedRow[]).map(
        (row): CompletedSession => ({
          kind,
          id: row.id,
          startedAt: row.started_at,
          endedAt: row.ended_at,
          timeZone: row.time_zone,
          durationSeconds: row.duration_seconds,
        }),
      );
    }),
  );

  return perKind
    .flat()
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, options.limit);
}

export async function getLastCompletedSession(
  supabase: Client,
  kind: StopwatchKind,
): Promise<CompletedSession | null> {
  const sessions = await listCompletedSessions(supabase, { kind, limit: 1 });
  return sessions[0] ?? null;
}

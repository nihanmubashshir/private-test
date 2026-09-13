import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface CompletedRun {
  id: string;
  startedAt: string;
  endedAt: string;
  timeZone: string;
  durationSeconds: number;
}

export interface RunRow {
  id: string;
  startedAt: string;
  endedAt: string | null;
  timeZone: string;
  durationSeconds: number | null;
}

const COMPLETED_COLUMNS = "id, started_at, ended_at, time_zone, duration_seconds";

export async function listCompletedRuns(supabase: Client, limit: number): Promise<CompletedRun[]> {
  const { data, error } = await supabase
    .from("runs")
    .select(COMPLETED_COLUMNS)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at as string,
    timeZone: row.time_zone,
    durationSeconds: row.duration_seconds as number,
  }));
}

/** A run by id, whatever its state — the caller decides what to do with a still-running one. */
export async function getRun(supabase: Client, id: string): Promise<RunRow | null> {
  const { data, error } = await supabase.from("runs").select(COMPLETED_COLUMNS).eq("id", id).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    timeZone: data.time_zone,
    durationSeconds: data.duration_seconds,
  };
}

export async function getLastCompletedRun(supabase: Client): Promise<CompletedRun | null> {
  const runs = await listCompletedRuns(supabase, 1);
  return runs[0] ?? null;
}

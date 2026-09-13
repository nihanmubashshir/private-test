import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface RunRow {
  id: string;
  startedAt: string;
  endedAt: string | null;
  timeZone: string;
  durationSeconds: number | null;
}

const COMPLETED_COLUMNS = "id, started_at, ended_at, time_zone, duration_seconds";

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

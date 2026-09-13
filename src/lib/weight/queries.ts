import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface WeighIn {
  id: string;
  /** UTC ISO instant the reading was taken. */
  measuredAt: string;
  timeZone: string;
  /** Kilograms. Stored as numeric, which PostgREST returns as a string. */
  valueKg: number;
  note: string | null;
}

/** Postgres `numeric` arrives over the wire as a string, to avoid float rounding. */
function toWeighIn(row: {
  id: string;
  measured_at: string;
  time_zone: string;
  value_kg: number | string;
  note: string | null;
}): WeighIn {
  return {
    id: row.id,
    measuredAt: row.measured_at,
    timeZone: row.time_zone,
    valueKg: typeof row.value_kg === "string" ? Number(row.value_kg) : row.value_kg,
    note: row.note,
  };
}

const COLUMNS = "id, measured_at, time_zone, value_kg, note";

/** Readings newest first. `limit` caps the window; `since` bounds it for a chart range. */
export async function listWeighIns(
  supabase: Client,
  { limit, since }: { limit?: number; since?: string } = {},
): Promise<WeighIn[]> {
  let query = supabase.from("weigh_ins").select(COLUMNS).order("measured_at", { ascending: false });
  if (since) query = query.gte("measured_at", since);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(toWeighIn);
}

export async function getWeighIn(supabase: Client, id: string): Promise<WeighIn | null> {
  const { data, error } = await supabase.from("weigh_ins").select(COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return toWeighIn(data);
}

/** The most recent reading, or null. Drives Home's hero number. */
export async function getLatestWeighIn(supabase: Client): Promise<WeighIn | null> {
  const [latest] = await listWeighIns(supabase, { limit: 1 });
  return latest ?? null;
}

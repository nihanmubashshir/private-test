import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PrayerLog } from "./types";

type Client = SupabaseClient<Database>;

const COLUMNS = "id, waqt, status, prayed_at, time_zone, prayer_date";

function mapRow(row: {
  id: string;
  waqt: PrayerLog["waqt"];
  status: PrayerLog["status"];
  prayed_at: string;
  time_zone: string;
  prayer_date: string;
}): PrayerLog {
  return {
    id: row.id,
    waqt: row.waqt,
    status: row.status,
    prayedAt: row.prayed_at,
    timeZone: row.time_zone,
    prayerDate: row.prayer_date,
  };
}

/** Today's logged waqts, keyed by the client's calendar day (US-015 §3). */
export async function listPrayersForDate(supabase: Client, date: string): Promise<PrayerLog[]> {
  const { data, error } = await supabase.from("prayers").select(COLUMNS).eq("prayer_date", date);
  if (error || !data) return [];
  return data.map(mapRow);
}

/** Most recent logs, newest first, for the history screen. */
export async function listPrayerHistory(supabase: Client, opts: { limit?: number } = {}): Promise<PrayerLog[]> {
  const { data, error } = await supabase
    .from("prayers")
    .select(COLUMNS)
    .order("prayer_date", { ascending: false })
    .order("prayed_at", { ascending: false })
    .limit(opts.limit ?? 500);
  if (error || !data) return [];
  return data.map(mapRow);
}

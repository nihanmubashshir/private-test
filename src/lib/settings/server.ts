import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface AppSettings {
  /** The owner's configured IANA zone, or null before they have set one (US-008 §4). */
  timeZone: string | null;
}

/**
 * The owner's settings, read once per request.
 *
 * `cache()` dedupes this across the layout and every page in the same render, so adding the app
 * zone to the shell costs one query per request rather than one per consumer.
 *
 * Returns `null` rather than a default when no row exists: only the client knows a sensible
 * fallback (its own zone), and the server must never substitute its own (overview §6.2 #3).
 */
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("time_zone").maybeSingle();
  return { timeZone: data?.time_zone ?? null };
});

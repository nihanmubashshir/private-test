import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FeatureRequest } from "./types";

type Client = SupabaseClient<Database>;

/** Every request, newest first. The list splits open from done itself. */
export async function listFeatureRequests(supabase: Client): Promise<FeatureRequest[]> {
  const { data, error } = await supabase
    .from("feature_requests")
    .select("id, title, note, done_at, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    note: row.note,
    doneAt: row.done_at,
    createdAt: row.created_at,
  }));
}

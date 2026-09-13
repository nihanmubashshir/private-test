import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Plan, PlanDay, PlanItem, Workout } from "./types";

type Client = SupabaseClient<Database>;

const num = (value: number | string | null): number | null =>
  value === null ? null : typeof value === "string" ? Number(value) : value;

/** Creates the starter library and an empty week on first use. No-ops after that. */
export async function seedGymDefaults(supabase: Client): Promise<void> {
  await supabase.rpc("seed_gym_defaults");
}

export async function listWorkouts(supabase: Client, { includeArchived = false } = {}): Promise<Workout[]> {
  let query = supabase
    .from("workouts")
    .select("id, name, group_name, tracks, default_sets, notes, archived_at")
    .order("group_name", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (!includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    groupName: row.group_name,
    tracks: row.tracks,
    defaultSets: row.default_sets,
    notes: row.notes,
    archivedAt: row.archived_at,
  }));
}

/**
 * A plan with all seven days and their items, in one round trip.
 *
 * Nested selects rather than three queries: a plan is never useful without its days, and its days
 * are never useful without their items.
 */
function basePlanQuery(supabase: Client) {
  return supabase
    .from("plans")
    .select(
      `id, name, is_active, notes, archived_at,
       plan_days (
         id, weekday, name, is_rest,
         plan_items (
           id, workout_id, position, target_sets, target_reps, target_weight,
           workouts ( name, tracks )
         )
       )`,
    )
    .order("weekday", { referencedTable: "plan_days", ascending: true });
}

type PlanRow = Awaited<ReturnType<typeof basePlanQuery>>["data"];

function toPlan(row: NonNullable<PlanRow>[number]): Plan {
  const days: PlanDay[] = (row.plan_days ?? []).map((day) => {
    const items: PlanItem[] = (day.plan_items ?? [])
      .map((item) => ({
        id: item.id,
        workoutId: item.workout_id,
        workoutName: item.workouts?.name ?? "Removed exercise",
        tracks: item.workouts?.tracks ?? [],
        position: item.position,
        targetSets: item.target_sets,
        targetReps: item.target_reps,
        targetWeight: num(item.target_weight),
      }))
      .sort((a, b) => a.position - b.position);

    return { id: day.id, weekday: day.weekday, name: day.name, isRest: day.is_rest, items };
  });

  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    notes: row.notes,
    archivedAt: row.archived_at,
    days: days.sort((a, b) => a.weekday - b.weekday),
  };
}

export async function listPlans(supabase: Client): Promise<Plan[]> {
  const { data, error } = await basePlanQuery(supabase).order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map(toPlan);
}

export async function getPlan(supabase: Client, id: string): Promise<Plan | null> {
  const query = basePlanQuery(supabase).eq("id", id);
  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;
  return toPlan(data[0]);
}

export async function getActivePlan(supabase: Client): Promise<Plan | null> {
  const query = basePlanQuery(supabase).eq("is_active", true);
  const { data, error } = await query;
  if (error || !data || data.length === 0) return null;
  return toPlan(data[0]);
}

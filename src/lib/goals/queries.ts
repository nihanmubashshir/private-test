import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BestSet, Goal, GoalInputs } from "./types";
import type { Waqt } from "@/lib/prayers/types";

type Client = SupabaseClient<Database>;

const num = (v: number | string | null): number | null => (v === null ? null : typeof v === "string" ? Number(v) : v);

/** How far back streak inputs are read. A year covers every window and any realistic run. */
const LOOKBACK_DAYS = 366;

export async function listGoals(supabase: Client): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select(
      "id, kind, subject, workout_id, label, target_value, start_value, target_metric, target_count, window_days, status, completed_at, workouts ( name )",
    )
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    workoutId: row.workout_id,
    workoutName: row.workouts?.name ?? null,
    label: row.label,
    targetValue: num(row.target_value),
    startValue: num(row.start_value),
    targetMetric: row.target_metric as Goal["targetMetric"],
    targetCount: row.target_count,
    windowDays: row.window_days,
    status: row.status,
    completedAt: row.completed_at,
  }));
}

/**
 * The raw data every goal's progress is computed from, fetched once for all of them.
 *
 * Only reads what the given goals need — no gym query when no goal is about the gym — and returns
 * timestamps rather than days, because a day needs a zone and the zone is the client's (US-008).
 */
export async function loadGoalInputs(supabase: Client, goals: Goal[]): Promise<GoalInputs> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const needs = (subject: Goal["subject"]) => goals.some((goal) => goal.subject === subject);
  const workoutIds = [...new Set(goals.map((goal) => goal.workoutId).filter((id): id is string => id !== null))];

  const [latestWeight, weighIns, runs, gym, sets, prayers] = await Promise.all([
    needs("weight")
      ? supabase.from("weigh_ins").select("value_kg").order("measured_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    needs("weight")
      ? supabase.from("weigh_ins").select("measured_at").gte("measured_at", since)
      : Promise.resolve({ data: [] as { measured_at: string }[] }),
    needs("running")
      ? supabase.from("runs").select("started_at").not("ended_at", "is", null).gte("started_at", since)
      : Promise.resolve({ data: [] as { started_at: string }[] }),
    needs("gym")
      ? supabase.from("gym_sessions").select("started_at").not("ended_at", "is", null).gte("started_at", since)
      : Promise.resolve({ data: [] as { started_at: string }[] }),
    workoutIds.length > 0
      ? supabase
          .from("set_logs")
          .select("workout_id, completed_at, reps, weight, is_warmup")
          .in("workout_id", workoutIds)
          .eq("is_warmup", false)
      : Promise.resolve({
          data: [] as {
            workout_id: string;
            completed_at: string;
            reps: number | null;
            weight: number | string | null;
            is_warmup: boolean;
          }[],
        }),
    needs("prayer")
      ? supabase.from("prayers").select("prayed_at, waqt").gte("prayed_at", since)
      : Promise.resolve({ data: [] as { prayed_at: string; waqt: Waqt }[] }),
  ]);

  const workouts: GoalInputs["workouts"] = {};
  for (const row of sets.data ?? []) {
    const entry = (workouts[row.workout_id] ??= { times: [], sets: [] as BestSet[] });
    entry.times.push(row.completed_at);
    entry.sets.push({ reps: row.reps, weight: num(row.weight) });
  }

  return {
    latestWeightKg: num(latestWeight.data?.value_kg ?? null),
    weighInTimes: (weighIns.data ?? []).map((row) => row.measured_at),
    runTimes: (runs.data ?? []).map((row) => row.started_at),
    gymTimes: (gym.data ?? []).map((row) => row.started_at),
    workouts,
    prayerLogs: (prayers.data ?? []).map((row) => ({ at: row.prayed_at, waqt: row.waqt })),
  };
}

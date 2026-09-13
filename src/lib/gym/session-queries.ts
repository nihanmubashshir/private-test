import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TrackedField } from "./types";

type Client = SupabaseClient<Database>;

const num = (v: number | string | null): number | null => (v === null ? null : typeof v === "string" ? Number(v) : v);

export interface SetLog {
  id: string;
  workoutId: string;
  position: number;
  reps: number | null;
  weight: number | null;
  durationS: number | null;
  distanceM: number | null;
  completedAt: string;
  isWarmup: boolean;
}

export interface SessionExercise {
  workoutId: string;
  name: string;
  tracks: TrackedField[];
  targetSets: number | null;
  targetReps: number | null;
  targetWeight: number | null;
  sets: SetLog[];
}

export interface GymSession {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  timeZone: string;
  note: string | null;
  planDayId: string | null;
  exercises: SessionExercise[];
}

const SET_COLUMNS = "id, workout_id, position, reps, weight, duration_s, distance_m, completed_at, is_warmup";

function toSetLog(row: {
  id: string;
  workout_id: string;
  position: number;
  reps: number | null;
  weight: number | string | null;
  duration_s: number | null;
  distance_m: number | null;
  completed_at: string;
  is_warmup: boolean;
}): SetLog {
  return {
    id: row.id,
    workoutId: row.workout_id,
    position: row.position,
    reps: row.reps,
    weight: num(row.weight),
    durationS: row.duration_s,
    distanceM: row.distance_m,
    completedAt: row.completed_at,
    isWarmup: row.is_warmup,
  };
}

/**
 * A session with its exercises in plan order, each carrying the sets logged against it.
 *
 * The exercise list is **derived from the plan day at read time**, not snapshotted at start, plus
 * any exercise that has sets but is no longer in the plan — so editing the plan mid-session adds
 * or removes rows, but never loses work already logged.
 */
export async function getSession(supabase: Client, id: string): Promise<GymSession | null> {
  const { data: session } = await supabase
    .from("gym_sessions")
    .select("id, name, started_at, ended_at, time_zone, note, plan_day_id")
    .eq("id", id)
    .maybeSingle();
  if (!session) return null;

  const [{ data: setRows }, { data: planItems }] = await Promise.all([
    supabase.from("set_logs").select(SET_COLUMNS).eq("session_id", id).order("position", { ascending: true }),
    session.plan_day_id
      ? supabase
          .from("plan_items")
          .select("workout_id, position, target_sets, target_reps, target_weight, workouts ( name, tracks )")
          .eq("plan_day_id", session.plan_day_id)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const sets = (setRows ?? []).map(toSetLog);
  const byWorkout = new Map<string, SetLog[]>();
  for (const set of sets) {
    const list = byWorkout.get(set.workoutId) ?? [];
    list.push(set);
    byWorkout.set(set.workoutId, list);
  }

  const exercises: SessionExercise[] = [];
  const seen = new Set<string>();

  for (const item of planItems ?? []) {
    seen.add(item.workout_id);
    exercises.push({
      workoutId: item.workout_id,
      name: item.workouts?.name ?? "Removed exercise",
      tracks: item.workouts?.tracks ?? [],
      targetSets: item.target_sets,
      targetReps: item.target_reps,
      targetWeight: num(item.target_weight),
      sets: byWorkout.get(item.workout_id) ?? [],
    });
  }

  // Anything logged that the plan no longer lists — an ad-hoc addition, or an exercise removed
  // from the plan mid-session. Never dropped, or the sets would vanish from the screen.
  const extraIds = [...byWorkout.keys()].filter((workoutId) => !seen.has(workoutId));
  if (extraIds.length > 0) {
    const { data: extras } = await supabase.from("workouts").select("id, name, tracks").in("id", extraIds);
    for (const workout of extras ?? []) {
      exercises.push({
        workoutId: workout.id,
        name: workout.name,
        tracks: workout.tracks,
        targetSets: null,
        targetReps: null,
        targetWeight: null,
        sets: byWorkout.get(workout.id) ?? [],
      });
    }
  }

  return {
    id: session.id,
    name: session.name,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    timeZone: session.time_zone,
    note: session.note,
    planDayId: session.plan_day_id,
    exercises,
  };
}

/** The running session, if any. */
export async function getRunningSession(supabase: Client): Promise<GymSession | null> {
  const { data } = await supabase.from("gym_sessions").select("id").is("ended_at", null).limit(1).maybeSingle();
  if (!data) return null;
  return getSession(supabase, data.id);
}

/** The last set logged for each of these exercises, in any past session — the prefill source. */
export async function lastSetsFor(supabase: Client, workoutIds: string[]): Promise<Map<string, SetLog>> {
  const result = new Map<string, SetLog>();
  if (workoutIds.length === 0) return result;

  const { data } = await supabase
    .from("set_logs")
    .select(SET_COLUMNS)
    .in("workout_id", workoutIds)
    .eq("is_warmup", false)
    .order("completed_at", { ascending: false })
    .limit(200);

  for (const row of data ?? []) {
    const set = toSetLog(row);
    if (!result.has(set.workoutId)) result.set(set.workoutId, set);
  }
  return result;
}

/** Volume counts working sets only — a warmup is not training load (US-011 §5.3). */
export function sessionVolume(exercises: SessionExercise[]): number {
  return exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.reduce((sum, set) => sum + (set.isWarmup ? 0 : (set.reps ?? 0) * (set.weight ?? 0)), 0),
    0,
  );
}

export function sessionSetCount(exercises: SessionExercise[]): number {
  return exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}

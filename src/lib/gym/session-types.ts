import type { TrackedField } from "./types";

/**
 * Session shapes and the values derived from them.
 *
 * Separate from `session-queries.ts`, which is `server-only`: the session screen and the summary
 * are Client Components and need these. A value imported from a `server-only` module pulls the
 * whole module into the client bundle and fails the build — types alone would be erased, but
 * `sessionVolume` and `sessionSetCount` are not types.
 */

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

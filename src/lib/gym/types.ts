import type { Database } from "@/lib/supabase/database.types";

export type TrackedField = Database["public"]["Enums"]["tracked_field"];

/** Fixed order, so a set logger's fields never reorder between exercises (US-011). */
export const TRACKED_FIELDS: TrackedField[] = ["reps", "weight", "duration", "distance"];

export const TRACKED_FIELD_LABELS: Record<TrackedField, string> = {
  reps: "Reps",
  weight: "Weight",
  duration: "Duration",
  distance: "Distance",
};

export interface Workout {
  id: string;
  name: string;
  groupName: string | null;
  tracks: TrackedField[];
  defaultSets: number;
  notes: string | null;
  archivedAt: string | null;
}

export interface PlanItem {
  id: string;
  workoutId: string;
  workoutName: string;
  tracks: TrackedField[];
  position: number;
  targetSets: number | null;
  targetReps: number | null;
  targetWeight: number | null;
}

export interface PlanDay {
  id: string;
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  name: string | null;
  isRest: boolean;
  items: PlanItem[];
}

export interface Plan {
  id: string;
  name: string;
  isActive: boolean;
  notes: string | null;
  archivedAt: string | null;
  days: PlanDay[];
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * `Date.getDay()` is Sunday-first; `plan_days.weekday` is Monday-first (ISO), because the week
 * strip reads Mon–Sun. Converting in one place keeps the off-by-one from spreading.
 */
export function weekdayFromDate(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** `3 × 8 · 100 kg`, omitting whatever is not set. */
export function describeTargets(item: Pick<PlanItem, "targetSets" | "targetReps" | "targetWeight">): string {
  const parts: string[] = [];
  if (item.targetSets && item.targetReps) parts.push(`${item.targetSets} × ${item.targetReps}`);
  else if (item.targetSets) parts.push(`${item.targetSets} sets`);
  else if (item.targetReps) parts.push(`${item.targetReps} reps`);
  if (item.targetWeight !== null) parts.push(`${item.targetWeight} kg`);
  return parts.join(" · ");
}

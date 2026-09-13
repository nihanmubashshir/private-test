"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";

export interface GymActionResult {
  ok: boolean;
  message: string | null;
  id?: string;
}

const GENERIC_ERROR = "Couldn't save that. Try again.";
const NOT_FOUND = "That no longer exists.";
/** Postgres unique-violation. The DB owns uniqueness, so this is how we learn about a collision. */
const UNIQUE_VIOLATION = "23505";

const ok = (id?: string): GymActionResult => ({ ok: true, message: null, id });
const fail = (message: string): GymActionResult => ({ ok: false, message });

/** Gym state shows on Home, in the plan library and in the editor, so writes invalidate the tree. */
function revalidateGym() {
  revalidatePath("/", "layout");
}

const trackedField = z.enum(["reps", "weight", "duration", "distance"]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable();

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : Number(value)))
    .refine((value) => value === null || (Number.isInteger(value) && value >= min && value <= max), {
      message: `Must be a whole number between ${min} and ${max}.`,
    });

const optionalNumber = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : Number(value)))
    .refine((value) => value === null || (Number.isFinite(value) && value >= min && value <= max), {
      message: `Must be between ${min} and ${max}.`,
    });

// ---------------------------------------------------------------- workouts

const workoutSchema = z.object({
  name: z.string().trim().min(1, "Give the exercise a name.").max(60),
  groupName: optionalText(40),
  tracks: z.array(trackedField).min(1, "Track at least one field."),
  defaultSets: z.coerce.number().int().min(1).max(10),
  notes: optionalText(200),
});

function readWorkout(formData: FormData) {
  return {
    name: formData.get("name") ?? "",
    groupName: formData.get("groupName") ?? "",
    tracks: formData.getAll("tracks"),
    defaultSets: formData.get("defaultSets") ?? "3",
    notes: formData.get("notes") ?? "",
  };
}

export async function createWorkout(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = workoutSchema.safeParse(readWorkout(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);

  const { data, error } = await supabase
    .from("workouts")
    .insert({
      name: parsed.data.name,
      group_name: parsed.data.groupName,
      tracks: parsed.data.tracks,
      default_sets: parsed.data.defaultSets,
      notes: parsed.data.notes,
    })
    .select("id")
    .single();

  if (error?.code === UNIQUE_VIOLATION) return fail("An exercise with that name already exists.");
  if (error) return fail(GENERIC_ERROR);

  revalidateGym();
  return ok(data.id);
}

export async function updateWorkout(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = workoutSchema.extend({ id: z.uuid() }).safeParse({ ...readWorkout(formData), id: formData.get("id") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);

  const { data, error } = await supabase
    .from("workouts")
    .update({
      name: parsed.data.name,
      group_name: parsed.data.groupName,
      tracks: parsed.data.tracks,
      default_sets: parsed.data.defaultSets,
      notes: parsed.data.notes,
    })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error?.code === UNIQUE_VIOLATION) return fail("An exercise with that name already exists.");
  if (error) return fail(GENERIC_ERROR);
  if (!data) return fail(NOT_FOUND);

  revalidateGym();
  return ok(data.id);
}

/** Archive rather than delete, so past sessions and existing plans keep rendering the exercise. */
export async function setWorkoutArchived(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = z
    .object({ id: z.uuid(), archived: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), archived: formData.get("archived") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase
    .from("workouts")
    .update({ archived_at: parsed.data.archived === "true" ? new Date().toISOString() : null })
    .eq("id", parsed.data.id);

  if (error) return fail(GENERIC_ERROR);
  revalidateGym();
  return ok();
}

// ---------------------------------------------------------------- plans

export async function createPlan(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = z
    .object({ name: z.string().trim().min(1, "Give the plan a name.").max(60), copyFrom: z.string().optional() })
    .safeParse({ name: formData.get("name") ?? "", copyFrom: formData.get("copyFrom") ?? undefined });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);

  // create_plan() makes the plan and all seven rest days in one transaction.
  const { data, error } = await supabase.rpc("create_plan", { plan_name: parsed.data.name, activate: false });
  if (error || !data) return fail(GENERIC_ERROR);

  if (parsed.data.copyFrom) {
    const copyError = await copyPlanContents(supabase, parsed.data.copyFrom, data);
    if (copyError) return fail(copyError);
  }

  revalidateGym();
  return ok(data);
}

/** Duplicates day names, rest flags, items, positions and targets. The copy is never active. */
async function copyPlanContents(
  supabase: Awaited<ReturnType<typeof requireFull>>,
  fromPlanId: string,
  toPlanId: string,
): Promise<string | null> {
  const { data: source } = await supabase
    .from("plan_days")
    .select("weekday, name, is_rest, plan_items (workout_id, position, target_sets, target_reps, target_weight)")
    .eq("plan_id", fromPlanId);
  if (!source) return GENERIC_ERROR;

  const { data: target } = await supabase.from("plan_days").select("id, weekday").eq("plan_id", toPlanId);
  if (!target) return GENERIC_ERROR;

  const byWeekday = new Map(target.map((day) => [day.weekday, day.id]));

  for (const day of source) {
    const targetId = byWeekday.get(day.weekday);
    if (!targetId) continue;

    await supabase.from("plan_days").update({ name: day.name, is_rest: day.is_rest }).eq("id", targetId);

    const items = day.plan_items ?? [];
    if (items.length === 0) continue;

    const { error } = await supabase.from("plan_items").insert(
      items.map((item) => ({
        plan_day_id: targetId,
        workout_id: item.workout_id,
        position: item.position,
        target_sets: item.target_sets,
        target_reps: item.target_reps,
        target_weight: item.target_weight,
      })),
    );
    if (error) return GENERIC_ERROR;
  }
  return null;
}

export async function renamePlan(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = z
    .object({ id: z.uuid(), name: z.string().trim().min(1, "Give the plan a name.").max(60) })
    .safeParse({ id: formData.get("id"), name: formData.get("name") ?? "" });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);

  const { error } = await supabase.from("plans").update({ name: parsed.data.name }).eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);
  revalidateGym();
  return ok(parsed.data.id);
}

export async function activatePlan(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid() }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  // One RPC, not two updates: the partial unique index rejects a second active plan, so clearing
  // and setting must not be observable apart.
  const { error } = await supabase.rpc("activate_plan", { target: parsed.data.id });
  if (error) return fail(GENERIC_ERROR);

  revalidateGym();
  return ok(parsed.data.id);
}

export async function deletePlan(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid() }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { data: plan } = await supabase.from("plans").select("is_active").eq("id", parsed.data.id).maybeSingle();
  if (!plan) return fail(NOT_FOUND);
  if (plan.is_active) return fail("Make another plan active first.");

  const { error } = await supabase.from("plans").delete().eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);

  revalidateGym();
  return ok();
}

// ---------------------------------------------------------------- days and items

export async function updatePlanDay(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = z
    .object({ id: z.uuid(), name: optionalText(60), isRest: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), name: formData.get("name") ?? "", isRest: formData.get("isRest") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase
    .from("plan_days")
    .update({ name: parsed.data.name, is_rest: parsed.data.isRest === "true" })
    .eq("id", parsed.data.id);

  if (error) return fail(GENERIC_ERROR);
  revalidateGym();
  return ok(parsed.data.id);
}

export async function addPlanItem(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = z
    .object({ planDayId: z.uuid(), workoutId: z.uuid() })
    .safeParse({ planDayId: formData.get("planDayId"), workoutId: formData.get("workoutId") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const [{ data: workout }, { data: existing }] = await Promise.all([
    supabase.from("workouts").select("default_sets").eq("id", parsed.data.workoutId).maybeSingle(),
    supabase.from("plan_items").select("position").eq("plan_day_id", parsed.data.planDayId),
  ]);
  if (!workout) return fail(NOT_FOUND);

  const nextPosition = (existing ?? []).reduce((max, row) => Math.max(max, row.position), -1) + 1;

  const { data, error } = await supabase
    .from("plan_items")
    .insert({
      plan_day_id: parsed.data.planDayId,
      workout_id: parsed.data.workoutId,
      position: nextPosition,
      target_sets: workout.default_sets,
    })
    .select("id")
    .single();

  if (error?.code === UNIQUE_VIOLATION) return fail("That exercise is already in this day.");
  if (error) return fail(GENERIC_ERROR);

  revalidateGym();
  return ok(data.id);
}

export async function updatePlanItem(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = z
    .object({
      id: z.uuid(),
      targetSets: optionalInt(1, 20),
      targetReps: optionalInt(1, 100),
      targetWeight: optionalNumber(0, 1000),
    })
    .safeParse({
      id: formData.get("id"),
      targetSets: formData.get("targetSets") ?? "",
      targetReps: formData.get("targetReps") ?? "",
      targetWeight: formData.get("targetWeight") ?? "",
    });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);

  const { error } = await supabase
    .from("plan_items")
    .update({
      target_sets: parsed.data.targetSets,
      target_reps: parsed.data.targetReps,
      target_weight: parsed.data.targetWeight,
    })
    .eq("id", parsed.data.id);

  if (error) return fail(GENERIC_ERROR);
  revalidateGym();
  return ok(parsed.data.id);
}

export async function removePlanItem(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid() }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase.from("plan_items").delete().eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);
  revalidateGym();
  return ok();
}

/** Reorder writes every position in one go — a swap of two rows would violate nothing but drift. */
export async function reorderPlanItems(_prev: GymActionResult, formData: FormData): Promise<GymActionResult> {
  const supabase = await requireFull();
  const parsed = z.array(z.uuid()).min(1).safeParse(formData.getAll("ids"));
  if (!parsed.success) return fail(GENERIC_ERROR);

  for (const [index, id] of parsed.data.entries()) {
    const { error } = await supabase.from("plan_items").update({ position: index }).eq("id", id);
    if (error) return fail(GENERIC_ERROR);
  }

  revalidateGym();
  return ok();
}

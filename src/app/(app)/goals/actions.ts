"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { isoInstant } from "@/lib/time/validate";

export interface GoalActionResult {
  ok: boolean;
  message: string | null;
  id?: string;
}

const GENERIC_ERROR = "Couldn't save that goal. Try again.";
const ok = (id?: string): GoalActionResult => ({ ok: true, message: null, id });
const fail = (message: string): GoalActionResult => ({ ok: false, message });

/** Goals show on Home and on every subject's screen, so a change invalidates the tree. */
function revalidateGoals() {
  revalidatePath("/", "layout");
}

const blankToNull = (v: FormDataEntryValue | null) => {
  const text = typeof v === "string" ? v.trim() : "";
  return text === "" ? null : text;
};

const createSchema = z
  .object({
    kind: z.enum(["target", "streak"]),
    subject: z.enum(["weight", "running", "gym", "workout"]),
    workoutId: z.uuid().nullable(),
    label: z.string().trim().min(1, "Give the goal a name.").max(60),
    targetValue: z.coerce.number().positive("The target must be above zero.").max(100000).nullable(),
    targetMetric: z.enum(["weight", "reps", "volume"]).nullable(),
    targetCount: z.coerce.number().int().min(1).max(365).nullable(),
    windowDays: z.coerce.number().int().min(1).max(365).nullable(),
  })
  // Mirrors the table's CHECK constraints, so the owner gets a sentence rather than a 23514.
  .superRefine((v, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    if ((v.subject === "workout") !== (v.workoutId !== null)) issue("Pick an exercise.");
    if (v.kind === "target") {
      if (v.targetValue === null) issue("Set a target.");
      if (v.subject !== "weight" && v.subject !== "workout") issue("A target goal needs weight or an exercise.");
      if (v.subject === "workout" && v.targetMetric === null) issue("Choose what the target measures.");
    }
    if (v.kind === "streak") {
      if (v.targetCount === null) issue("Set how many days.");
      if (v.windowDays !== null && v.targetCount !== null && v.targetCount > v.windowDays) {
        issue("That's more days than the window holds.");
      }
    }
  });

export async function createGoal(_prev: GoalActionResult, formData: FormData): Promise<GoalActionResult> {
  const supabase = await requireFull();

  const parsed = createSchema.safeParse({
    kind: formData.get("kind"),
    subject: formData.get("subject"),
    workoutId: blankToNull(formData.get("workoutId")),
    label: formData.get("label") ?? "",
    targetValue: blankToNull(formData.get("targetValue")),
    targetMetric: blankToNull(formData.get("targetMetric")),
    targetCount: blankToNull(formData.get("targetCount")),
    windowDays: blankToNull(formData.get("windowDays")),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);
  const v = parsed.data;

  // A weight target records where it started, read here rather than trusted from the client, so
  // the bar has a fixed origin to measure "distance closed" from.
  let startValue: number | null = null;
  if (v.kind === "target" && v.subject === "weight") {
    const { data } = await supabase
      .from("weigh_ins")
      .select("value_kg")
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    startValue = data ? Number(data.value_kg) : null;
  }

  const { data, error } = await supabase
    .from("goals")
    .insert({
      kind: v.kind,
      subject: v.subject,
      workout_id: v.workoutId,
      label: v.label,
      target_value: v.kind === "target" ? v.targetValue : null,
      start_value: startValue,
      target_metric: v.kind === "target" && v.subject === "workout" ? v.targetMetric : null,
      target_count: v.kind === "streak" ? v.targetCount : null,
      window_days: v.kind === "streak" ? v.windowDays : null,
    })
    .select("id")
    .single();

  if (error) return fail(GENERIC_ERROR);
  revalidateGoals();
  return ok(data.id);
}

export async function setGoalStatus(_prev: GoalActionResult, formData: FormData): Promise<GoalActionResult> {
  const supabase = await requireFull();
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(["active", "paused"]) })
    .safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase
    .from("goals")
    .update({ status: parsed.data.status, completed_at: null })
    .eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);

  revalidateGoals();
  return ok(parsed.data.id);
}

/**
 * Marks a goal complete the first time its computed progress reaches 100% (US-012 §4).
 *
 * Called from the client, because only the client can compute a streak's progress (it needs the
 * app zone). Idempotent: the `status = 'active'` filter makes a repeat or a race a no-op, and a
 * paused goal is never auto-completed behind the owner's back. `completedAt` comes from the client
 * like every other user-meaningful instant (overview §6.2).
 */
export async function completeGoal(_prev: GoalActionResult, formData: FormData): Promise<GoalActionResult> {
  const supabase = await requireFull();
  const parsed = z
    .object({ id: z.uuid(), completedAt: isoInstant })
    .safeParse({ id: formData.get("id"), completedAt: formData.get("completedAt") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase
    .from("goals")
    .update({ status: "completed", completed_at: parsed.data.completedAt.toISOString() })
    .eq("id", parsed.data.id)
    .eq("status", "active");
  if (error) return fail(GENERIC_ERROR);

  revalidateGoals();
  return ok(parsed.data.id);
}

export async function deleteGoal(_prev: GoalActionResult, formData: FormData): Promise<GoalActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid() }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  // Deleting a goal touches nothing else: progress is derived, so there is no data of its own to lose.
  const { error } = await supabase.from("goals").delete().eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);

  revalidateGoals();
  return ok();
}

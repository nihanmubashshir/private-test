"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { isoInstant, timeZone, SKEW_TOLERANCE_MS } from "@/lib/time/validate";

export interface SessionActionResult {
  ok: boolean;
  message: string | null;
  id?: string;
}

const GENERIC_ERROR = "Couldn't save that. Try again.";
const ok = (id?: string): SessionActionResult => ({ ok: true, message: null, id });
const fail = (message: string): SessionActionResult => ({ ok: false, message });

const ONE_RUNNING = "23505";
const OVERLAP = "23P01";

function revalidateGym() {
  revalidatePath("/", "layout");
}

/**
 * Starts a session from a plan day, or ad hoc.
 *
 * `name` is copied off the plan day rather than joined at read time, so deleting the plan later
 * leaves the session readable — `plan_day_id` is `on delete set null` precisely so history
 * survives (US-011 §3).
 */
export async function startSession(_prev: SessionActionResult, formData: FormData): Promise<SessionActionResult> {
  const supabase = await requireFull();

  const parsed = z
    .object({
      planDayId: z.union([z.uuid(), z.literal("")]).transform((v) => (v === "" ? null : v)),
      startedAt: isoInstant,
      timeZone,
    })
    .safeParse({
      planDayId: formData.get("planDayId") ?? "",
      startedAt: formData.get("startedAt"),
      timeZone: formData.get("timeZone"),
    });
  if (!parsed.success) return fail(GENERIC_ERROR);

  if (parsed.data.startedAt.getTime() > Date.now() + SKEW_TOLERANCE_MS) {
    return fail("A session can't start in the future.");
  }

  let name = "Gym session";
  if (parsed.data.planDayId) {
    const { data: day } = await supabase.from("plan_days").select("name").eq("id", parsed.data.planDayId).maybeSingle();
    if (day?.name) name = day.name;
  }

  const { data, error } = await supabase
    .from("gym_sessions")
    .insert({
      started_at: parsed.data.startedAt.toISOString(),
      time_zone: parsed.data.timeZone,
      plan_day_id: parsed.data.planDayId,
      name,
    })
    .select("id")
    .single();

  if (error?.code === ONE_RUNNING) return fail("A session is already running.");
  if (error?.code === OVERLAP) return fail("That overlaps another session.");
  if (error) return fail(GENERIC_ERROR);

  revalidateGym();
  redirect("/gym/session");
}

const setFields = z.object({
  sessionId: z.uuid(),
  workoutId: z.uuid(),
  completedAt: isoInstant,
  reps: z.coerce.number().int().min(1).max(100).nullable().catch(null),
  weight: z.coerce.number().min(0).max(1000).nullable().catch(null),
  durationS: z.coerce.number().int().min(1).max(86400).nullable().catch(null),
  distanceM: z.coerce.number().int().min(1).max(100000).nullable().catch(null),
  isWarmup: z.enum(["true", "false"]).transform((v) => v === "true"),
});

/** Empty string means "this exercise doesn't track that field", which is a null column. */
const emptyToNull = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text === "" ? null : text;
};

export async function logSet(_prev: SessionActionResult, formData: FormData): Promise<SessionActionResult> {
  const supabase = await requireFull();

  const parsed = setFields.safeParse({
    sessionId: formData.get("sessionId"),
    workoutId: formData.get("workoutId"),
    completedAt: formData.get("completedAt"),
    reps: emptyToNull(formData.get("reps")),
    weight: emptyToNull(formData.get("weight")),
    durationS: emptyToNull(formData.get("durationS")),
    distanceM: emptyToNull(formData.get("distanceM")),
    isWarmup: formData.get("isWarmup") ?? "false",
  });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { reps, weight, durationS, distanceM } = parsed.data;
  if (reps === null && weight === null && durationS === null && distanceM === null) {
    return fail("Enter something to log.");
  }

  // Set number within this exercise in this session. Read-then-insert is safe here: one owner,
  // one phone, and a collision would only mean two sets sharing a number, not lost data.
  const { data: existing } = await supabase
    .from("set_logs")
    .select("position")
    .eq("session_id", parsed.data.sessionId)
    .eq("workout_id", parsed.data.workoutId);
  const position = (existing ?? []).reduce((max, row) => Math.max(max, row.position), 0) + 1;

  const { data, error } = await supabase
    .from("set_logs")
    .insert({
      session_id: parsed.data.sessionId,
      workout_id: parsed.data.workoutId,
      position,
      reps,
      weight,
      duration_s: durationS,
      distance_m: distanceM,
      completed_at: parsed.data.completedAt.toISOString(),
      is_warmup: parsed.data.isWarmup,
    })
    .select("id")
    .single();

  if (error) return fail(GENERIC_ERROR);

  revalidateGym();
  return ok(data.id);
}

export async function deleteSet(_prev: SessionActionResult, formData: FormData): Promise<SessionActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid() }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase.from("set_logs").delete().eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);

  revalidateGym();
  return ok();
}

/**
 * Ends the session. `endedAt` comes from the client, like every other user-meaningful instant
 * (overview §6.2) — the server only checks it is sane.
 */
export async function finishSession(_prev: SessionActionResult, formData: FormData): Promise<SessionActionResult> {
  const supabase = await requireFull();

  const parsed = z
    .object({ id: z.uuid(), endedAt: isoInstant, note: z.string().trim().max(500) })
    .safeParse({ id: formData.get("id"), endedAt: formData.get("endedAt"), note: formData.get("note") ?? "" });
  if (!parsed.success) return fail(GENERIC_ERROR);

  if (parsed.data.endedAt.getTime() > Date.now() + SKEW_TOLERANCE_MS) {
    return fail("A session can't end in the future.");
  }

  const { data, error } = await supabase
    .from("gym_sessions")
    .update({
      ended_at: parsed.data.endedAt.toISOString(),
      note: parsed.data.note.length === 0 ? null : parsed.data.note,
    })
    .eq("id", parsed.data.id)
    .is("ended_at", null)
    .select("id")
    .maybeSingle();

  if (error?.code === "23514") return fail("The end time must be after the start.");
  if (error) return fail(GENERIC_ERROR);
  if (!data) return fail("That session isn't running.");

  revalidateGym();
  redirect(`/gym/sessions/${parsed.data.id}?finished=1`);
}

/** Discard deletes the session; `on delete cascade` takes its sets with it. */
export async function discardSession(_prev: SessionActionResult, formData: FormData): Promise<SessionActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid() }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase.from("gym_sessions").delete().eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);

  revalidateGym();
  redirect("/?discarded=1");
}

export async function deleteSession(_prev: SessionActionResult, formData: FormData): Promise<SessionActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid() }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase.from("gym_sessions").delete().eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);

  revalidateGym();
  redirect("/?deleted=1");
}

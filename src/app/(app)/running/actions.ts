"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { isoInstant, timeZone, SKEW_TOLERANCE_MS } from "@/lib/time/validate";

const MAX_DURATION_MS = 24 * 60 * 60_000;

export interface RunActionResult {
  ok: boolean;
  message: string | null;
}

const GENERIC_ERROR = "Couldn't save the run. Try again.";
const NOT_FOUND_MESSAGE = "This run no longer exists.";

const runFieldsSchema = z.object({ startedAt: isoInstant, endedAt: isoInstant, timeZone });
const createSchema = runFieldsSchema;
const updateSchema = runFieldsSchema.extend({ id: z.uuid() });
const deleteSchema = z.object({ id: z.uuid() });

/** Shared range checks for a manual or edited run (US-004 §4.3). */
function validateRange(startedAt: Date, endedAt: Date): string | null {
  if (!(endedAt.getTime() > startedAt.getTime())) return "Stop time must be after the start time.";
  if (endedAt.getTime() - startedAt.getTime() > MAX_DURATION_MS) return "Runs can't be longer than 24 hours.";
  const cutoff = Date.now() + SKEW_TOLERANCE_MS;
  if (startedAt.getTime() > cutoff || endedAt.getTime() > cutoff) return "Runs can't be in the future.";
  return null;
}

export async function createRun(_prevState: RunActionResult, formData: FormData): Promise<RunActionResult> {
  const supabase = await requireFull();

  const parsed = createSchema.safeParse({
    startedAt: formData.get("startedAt"),
    endedAt: formData.get("endedAt"),
    timeZone: formData.get("timeZone"),
  });
  if (!parsed.success) return { ok: false, message: GENERIC_ERROR };

  const rangeError = validateRange(parsed.data.startedAt, parsed.data.endedAt);
  if (rangeError) return { ok: false, message: rangeError };

  const { error } = await supabase.from("runs").insert({
    started_at: parsed.data.startedAt.toISOString(),
    ended_at: parsed.data.endedAt.toISOString(),
    time_zone: parsed.data.timeZone,
  });

  if (error) {
    if (error.code === "23P01") return { ok: false, message: "This overlaps another run." };
    if (error.code === "23514") return { ok: false, message: "Stop time must be after the start time." };
    return { ok: false, message: GENERIC_ERROR };
  }

  revalidatePath("/running");
  revalidatePath("/");
  redirect("/running");
}

export async function updateRun(_prevState: RunActionResult, formData: FormData): Promise<RunActionResult> {
  const supabase = await requireFull();

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    startedAt: formData.get("startedAt"),
    endedAt: formData.get("endedAt"),
    timeZone: formData.get("timeZone"),
  });
  if (!parsed.success) return { ok: false, message: GENERIC_ERROR };

  const rangeError = validateRange(parsed.data.startedAt, parsed.data.endedAt);
  if (rangeError) return { ok: false, message: rangeError };

  // A running session (ended_at is null) can't be edited here.
  const { data, error } = await supabase
    .from("runs")
    .update({
      started_at: parsed.data.startedAt.toISOString(),
      ended_at: parsed.data.endedAt.toISOString(),
      time_zone: parsed.data.timeZone,
    })
    .eq("id", parsed.data.id)
    .not("ended_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23P01") return { ok: false, message: "This overlaps another run." };
    if (error.code === "23514") return { ok: false, message: "Stop time must be after the start time." };
    return { ok: false, message: GENERIC_ERROR };
  }
  if (!data) return { ok: false, message: NOT_FOUND_MESSAGE };

  revalidatePath("/running");
  revalidatePath("/");
  redirect("/running");
}

export async function deleteRun(_prevState: RunActionResult, formData: FormData): Promise<RunActionResult> {
  const supabase = await requireFull();

  const parsed = deleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: GENERIC_ERROR };

  const { data, error } = await supabase
    .from("runs")
    .delete()
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: GENERIC_ERROR };
  if (!data) return { ok: false, message: NOT_FOUND_MESSAGE };

  revalidatePath("/running");
  revalidatePath("/");
  redirect("/running");
}

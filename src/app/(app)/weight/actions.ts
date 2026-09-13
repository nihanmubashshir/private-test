"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { isoInstant, timeZone, SKEW_TOLERANCE_MS } from "@/lib/time/validate";

export interface WeightActionResult {
  ok: boolean;
  message: string | null;
  /** Set on a successful create, so the caller can offer Undo without a refetch. */
  id?: string;
}

const GENERIC_ERROR = "Couldn't save that reading. Try again.";
const NOT_FOUND_MESSAGE = "This reading no longer exists.";

export const MIN_KG = 20;
export const MAX_KG = 400;

/**
 * One decimal place is what the scale shows and what the keypad allows; the column stores two so
 * an imported or corrected value is never silently rounded.
 */
const valueKg = z.coerce
  .number()
  .min(MIN_KG, `Weight must be at least ${MIN_KG} kg.`)
  .max(MAX_KG, `Weight must be at most ${MAX_KG} kg.`);

const note = z
  .string()
  .trim()
  .max(140, "Notes are limited to 140 characters.")
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

const fields = z.object({ measuredAt: isoInstant, timeZone, valueKg, note });
const createSchema = fields;
const updateSchema = fields.extend({ id: z.uuid() });
const deleteSchema = z.object({ id: z.uuid() });

function readForm(formData: FormData) {
  return {
    measuredAt: formData.get("measuredAt"),
    timeZone: formData.get("timeZone"),
    valueKg: formData.get("valueKg"),
    note: formData.get("note") ?? "",
  };
}

/** A reading cannot be in the future — the DB can't check this, since now() isn't immutable. */
function validateInstant(measuredAt: Date): string | null {
  if (measuredAt.getTime() > Date.now() + SKEW_TOLERANCE_MS) return "A reading can't be in the future.";
  return null;
}

/** Every screen shows the latest weight, so a write invalidates the whole tree. */
function revalidateWeight() {
  revalidatePath("/", "layout");
}

export async function createWeighIn(_prevState: WeightActionResult, formData: FormData): Promise<WeightActionResult> {
  const supabase = await requireFull();

  const parsed = createSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  const instantError = validateInstant(parsed.data.measuredAt);
  if (instantError) return { ok: false, message: instantError };

  const { data, error } = await supabase
    .from("weigh_ins")
    .insert({
      measured_at: parsed.data.measuredAt.toISOString(),
      time_zone: parsed.data.timeZone,
      value_kg: parsed.data.valueKg,
      note: parsed.data.note,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: GENERIC_ERROR };

  revalidateWeight();
  return { ok: true, message: null, id: data.id };
}

export async function updateWeighIn(_prevState: WeightActionResult, formData: FormData): Promise<WeightActionResult> {
  const supabase = await requireFull();

  const parsed = updateSchema.safeParse({ ...readForm(formData), id: formData.get("id") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  const instantError = validateInstant(parsed.data.measuredAt);
  if (instantError) return { ok: false, message: instantError };

  const { data, error } = await supabase
    .from("weigh_ins")
    .update({
      measured_at: parsed.data.measuredAt.toISOString(),
      time_zone: parsed.data.timeZone,
      value_kg: parsed.data.valueKg,
      note: parsed.data.note,
    })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, message: GENERIC_ERROR };
  if (!data) return { ok: false, message: NOT_FOUND_MESSAGE };

  revalidateWeight();
  return { ok: true, message: null, id: data.id };
}

export async function deleteWeighIn(_prevState: WeightActionResult, formData: FormData): Promise<WeightActionResult> {
  const supabase = await requireFull();

  const parsed = deleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, message: GENERIC_ERROR };

  const { data, error } = await supabase.from("weigh_ins").delete().eq("id", parsed.data.id).select("id").maybeSingle();

  if (error) return { ok: false, message: GENERIC_ERROR };
  if (!data) return { ok: false, message: NOT_FOUND_MESSAGE };

  revalidateWeight();
  return { ok: true, message: null };
}

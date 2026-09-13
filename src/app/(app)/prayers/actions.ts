"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { isoInstant, timeZone, SKEW_TOLERANCE_MS } from "@/lib/time/validate";
export interface PrayerActionResult {
  ok: boolean;
  message: string | null;
}

const GENERIC_ERROR = "Couldn't save that prayer. Try again.";

const waqt = z.enum(["fajr", "dhuhr", "asr", "maghrib", "isha"]);
const status = z.enum(["mosque", "home", "qadha"]);
// `YYYY-MM-DD` in the app zone, computed client-side (overview §6.2 — the server never formats).
const prayerDate = z.iso.date();

const logSchema = z.object({ waqt, status, prayedAt: isoInstant, timeZone, prayerDate });
const clearSchema = z.object({ waqt, prayerDate });

/** A prayer cannot be logged in the future — the DB can't check this since now() isn't immutable. */
function validateInstant(prayedAt: Date): string | null {
  if (prayedAt.getTime() > Date.now() + SKEW_TOLERANCE_MS) return "A prayer can't be logged in the future.";
  return null;
}

/** Home's goal strip and the checklist both read today's log, so a write invalidates the tree. */
function revalidatePrayers() {
  revalidatePath("/", "layout");
}

export async function logPrayer(_prevState: PrayerActionResult, formData: FormData): Promise<PrayerActionResult> {
  const supabase = await requireFull();

  const parsed = logSchema.safeParse({
    waqt: formData.get("waqt"),
    status: formData.get("status"),
    prayedAt: formData.get("prayedAt"),
    timeZone: formData.get("timeZone"),
    prayerDate: formData.get("prayerDate"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? GENERIC_ERROR };

  const instantError = validateInstant(parsed.data.prayedAt);
  if (instantError) return { ok: false, message: instantError };

  // Re-logging the same waqt on the same day replaces it, per the table's unique constraint.
  const { error } = await supabase.from("prayers").upsert(
    {
      waqt: parsed.data.waqt,
      status: parsed.data.status,
      prayed_at: parsed.data.prayedAt.toISOString(),
      time_zone: parsed.data.timeZone,
      prayer_date: parsed.data.prayerDate,
    },
    { onConflict: "owner_id,prayer_date,waqt" },
  );

  if (error) return { ok: false, message: GENERIC_ERROR };

  revalidatePrayers();
  return { ok: true, message: null };
}

export async function clearPrayer(_prevState: PrayerActionResult, formData: FormData): Promise<PrayerActionResult> {
  const supabase = await requireFull();

  const parsed = clearSchema.safeParse({
    waqt: formData.get("waqt"),
    prayerDate: formData.get("prayerDate"),
  });
  if (!parsed.success) return { ok: false, message: GENERIC_ERROR };

  const { error } = await supabase
    .from("prayers")
    .delete()
    .eq("prayer_date", parsed.data.prayerDate)
    .eq("waqt", parsed.data.waqt);

  if (error) return { ok: false, message: GENERIC_ERROR };

  revalidatePrayers();
  return { ok: true, message: null };
}

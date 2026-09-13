"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { timeZone } from "@/lib/time/validate";

export interface SettingsActionResult {
  ok: boolean;
  message: string | null;
}

const GENERIC_ERROR = "Couldn't save that. Try again.";

const timeZoneSchema = z.object({ timeZone });

/**
 * Sets the app-wide time zone (US-008 §5).
 *
 * Upsert on `owner_id`, which the unique index makes the natural conflict target — the owner has
 * one settings row or none, and this is the only thing that creates it.
 */
export async function setTimeZone(_prevState: SettingsActionResult, formData: FormData): Promise<SettingsActionResult> {
  const supabase = await requireFull();

  const parsed = timeZoneSchema.safeParse({ timeZone: formData.get("timeZone") });
  if (!parsed.success) return { ok: false, message: "That isn't a time zone this device recognises." };

  const { error } = await supabase
    .from("app_settings")
    .upsert({ time_zone: parsed.data.timeZone }, { onConflict: "owner_id" });

  if (error) return { ok: false, message: GENERIC_ERROR };

  // Every screen formats instants with this zone, so the whole tree is stale.
  revalidatePath("/", "layout");
  return { ok: true, message: null };
}

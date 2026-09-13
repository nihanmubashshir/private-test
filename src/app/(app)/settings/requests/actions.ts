"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { isoInstant } from "@/lib/time/validate";

export interface RequestActionResult {
  ok: boolean;
  message: string | null;
  id?: string;
}

const GENERIC_ERROR = "Couldn't save that. Try again.";
const ok = (id?: string): RequestActionResult => ({ ok: true, message: null, id });
const fail = (message: string): RequestActionResult => ({ ok: false, message });

const title = z.string().trim().min(1, "Write something first.").max(120, "Keep it under 120 characters.");
const note = z
  .string()
  .trim()
  .max(500, "Notes are limited to 500 characters.")
  .transform((value) => (value.length === 0 ? null : value))
  .nullable();

/**
 * These actions take typed arguments rather than FormData: they are called from optimistic
 * transitions, not form posts. The argument still crosses the network from the client, so every
 * one is parsed with zod as a whole — the TypeScript signature is a hint, not a guarantee.
 */

function revalidateRequests() {
  revalidatePath("/settings/requests");
}

export async function createRequest(input: unknown): Promise<RequestActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ title, note: note.optional().default(null) }).safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);

  const { data, error } = await supabase
    .from("feature_requests")
    .insert({ title: parsed.data.title, note: parsed.data.note })
    .select("id")
    .single();
  if (error) return fail(GENERIC_ERROR);

  revalidateRequests();
  return ok(data.id);
}

export async function updateRequestTitle(input: unknown): Promise<RequestActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid(), title }).safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? GENERIC_ERROR);

  const { error } = await supabase
    .from("feature_requests")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);

  revalidateRequests();
  return ok(parsed.data.id);
}

/** `doneAt` comes from the client like every user-meaningful instant (overview §6.2); null reopens. */
export async function setRequestDone(input: unknown): Promise<RequestActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid(), doneAt: isoInstant.nullable() }).safeParse(input);
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase
    .from("feature_requests")
    .update({ done_at: parsed.data.doneAt ? parsed.data.doneAt.toISOString() : null })
    .eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);

  revalidateRequests();
  return ok(parsed.data.id);
}

/** No confirmation, by design (US-013 AC 4): low stakes, and easily written again. */
export async function deleteRequest(input: unknown): Promise<RequestActionResult> {
  const supabase = await requireFull();
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return fail(GENERIC_ERROR);

  const { error } = await supabase.from("feature_requests").delete().eq("id", parsed.data.id);
  if (error) return fail(GENERIC_ERROR);

  revalidateRequests();
  return ok();
}

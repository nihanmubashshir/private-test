"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { isoInstant, timeZone } from "@/lib/time/validate";
import { startStopwatch, stopStopwatch, discardStopwatch } from "./server";
import type { ActiveStopwatch, CompletedSession } from "./server";
import { stopwatchKinds, type StopwatchKind } from "./registry";

export type StopwatchAlertTone = "danger" | "warning" | "success" | "neutral";

export interface StopwatchActionResult {
  ok: boolean;
  status:
    | "started"
    | "already_running"
    | "stopped"
    | "discarded"
    | "not_running"
    | "overlap"
    | "invalid_time";
  message: string | null;
  tone: StopwatchAlertTone;
  active?: ActiveStopwatch;
  session?: CompletedSession;
}

const GENERIC_TIME_ERROR = "Couldn't save that time. Check your device clock and try again.";
const OVERLAP_ERROR = "This overlaps an existing entry.";
const NOT_RUNNING_MESSAGE = "This stopwatch was already stopped.";

const kindSchema = z
  .string()
  .refine((value): value is StopwatchKind => value in stopwatchKinds, {
    message: "Unknown stopwatch kind.",
  });

const startSchema = z.object({ kind: kindSchema, at: isoInstant, timeZone });
const stopSchema = z.object({ kind: kindSchema, at: isoInstant, id: z.uuid() });
const discardSchema = z.object({ kind: kindSchema, id: z.uuid() });

const INVALID_RESULT: StopwatchActionResult = {
  ok: false,
  status: "invalid_time",
  message: GENERIC_TIME_ERROR,
  tone: "danger",
};

export async function startStopwatchAction(
  _prevState: StopwatchActionResult,
  formData: FormData,
): Promise<StopwatchActionResult> {
  const supabase = await requireFull();

  const parsed = startSchema.safeParse({
    kind: formData.get("kind"),
    at: formData.get("at"),
    timeZone: formData.get("timeZone"),
  });
  if (!parsed.success) return INVALID_RESULT;

  const result = await startStopwatch(supabase, parsed.data.kind, {
    at: parsed.data.at,
    timeZone: parsed.data.timeZone,
  });

  switch (result.status) {
    case "started":
      revalidatePath("/", "layout");
      return { ok: true, status: "started", message: null, tone: "success", active: result.active };
    case "already_running":
      return { ok: true, status: "already_running", message: null, tone: "neutral", active: result.active };
    case "overlap":
      return { ok: false, status: "overlap", message: OVERLAP_ERROR, tone: "danger" };
    case "invalid_time":
      return INVALID_RESULT;
  }
}

export async function stopStopwatchAction(
  _prevState: StopwatchActionResult,
  formData: FormData,
): Promise<StopwatchActionResult> {
  const supabase = await requireFull();

  const parsed = stopSchema.safeParse({
    kind: formData.get("kind"),
    at: formData.get("at"),
    id: formData.get("id"),
  });
  if (!parsed.success) return INVALID_RESULT;

  const result = await stopStopwatch(supabase, parsed.data.kind, {
    id: parsed.data.id,
    at: parsed.data.at,
  });

  switch (result.status) {
    case "stopped":
      revalidatePath("/", "layout");
      return { ok: true, status: "stopped", message: null, tone: "success", session: result.session };
    case "not_running":
      return { ok: true, status: "not_running", message: NOT_RUNNING_MESSAGE, tone: "neutral" };
    case "overlap":
      return { ok: false, status: "overlap", message: OVERLAP_ERROR, tone: "danger" };
    case "invalid_time":
      return INVALID_RESULT;
  }
}

export async function discardStopwatchAction(
  _prevState: StopwatchActionResult,
  formData: FormData,
): Promise<StopwatchActionResult> {
  const supabase = await requireFull();

  const parsed = discardSchema.safeParse({
    kind: formData.get("kind"),
    id: formData.get("id"),
  });
  if (!parsed.success) return INVALID_RESULT;

  const result = await discardStopwatch(supabase, parsed.data.kind, { id: parsed.data.id });

  switch (result.status) {
    case "discarded":
      revalidatePath("/", "layout");
      return { ok: true, status: "discarded", message: null, tone: "success" };
    case "not_running":
      return { ok: true, status: "not_running", message: NOT_RUNNING_MESSAGE, tone: "neutral" };
  }
}

"use client";

import { useRef, useState, useTransition } from "react";
import type { StopwatchActionResult } from "@/lib/stopwatch/actions";

export type StopwatchRunResult = StopwatchActionResult | { ok: false; networkError: true };

type StopwatchServerAction = (
  prevState: StopwatchActionResult,
  formData: FormData,
) => Promise<StopwatchActionResult>;

const PLACEHOLDER_PREV_STATE: StopwatchActionResult = {
  ok: true,
  status: "already_running",
  message: null,
  tone: "neutral",
};

/**
 * Wraps a stopwatch Server Action, capturing `at` at the moment of the tap rather than the moment
 * the request resolves (US-003 §6.6). A network error or thrown exception surfaces as a
 * `networkError` result instead of rejecting, so the caller can offer Retry with the same `at`.
 *
 * `onOptimistic`, if given, runs synchronously as the first thing inside the transition — the
 * right place to call a `useOptimistic` setter, so the optimistic value is scoped to this same
 * transition and automatically reverts once it settles (US-005 §7.4).
 */
export function useStopwatchAction(
  action: StopwatchServerAction,
  baseFields: Record<string, string>,
  onOptimistic?: (fields: Record<string, string>) => void,
) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StopwatchRunResult | null>(null);
  const lastFieldsRef = useRef<Record<string, string> | null>(null);

  const execute = (fields: Record<string, string>) => {
    lastFieldsRef.current = fields;
    startTransition(async () => {
      onOptimistic?.(fields);
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
      }
      try {
        setResult(await action(PLACEHOLDER_PREV_STATE, formData));
      } catch {
        setResult({ ok: false, networkError: true });
      }
    });
  };

  const run = (formDataExtras: Record<string, string> = {}) => {
    const at = new Date().toISOString();
    execute({ ...baseFields, ...formDataExtras, at });
  };

  const retry = () => {
    if (lastFieldsRef.current) execute(lastFieldsRef.current);
  };

  return { pending, result, run, retry };
}

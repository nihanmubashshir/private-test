"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeGoal } from "@/app/(app)/goals/actions";
import type { GoalStatus } from "@/lib/goals/types";

/**
 * Flips an active goal to completed the render after its progress reaches 100% (US-012 AC 4).
 *
 * Client-side, because only the client can compute a streak (it needs the app zone). The action is
 * idempotent — it only updates `status = 'active'` rows — and `sent` stops this component asking
 * twice while the refresh is in flight.
 *
 * The effect depends on a **string** of due ids, not on the array: an array rebuilt every render is
 * a new identity every render, and an effect downstream of an unstable identity re-fires forever
 * (the same class of bug as US-009 §10.1).
 */
export function useAutoComplete(goals: { id: string; status: GoalStatus; ratio: number }[]) {
  const router = useRouter();
  const sent = useRef(new Set<string>());
  const [, startTransition] = useTransition();

  const due = goals
    .filter((goal) => goal.status === "active" && goal.ratio >= 1)
    .map((goal) => goal.id)
    .sort()
    .join(",");

  useEffect(() => {
    const ids = due.split(",").filter((id) => id !== "" && !sent.current.has(id));
    if (ids.length === 0) return;
    for (const id of ids) sent.current.add(id);

    startTransition(async () => {
      for (const id of ids) {
        const form = new FormData();
        form.set("id", id);
        form.set("completedAt", new Date().toISOString());
        await completeGoal({ ok: true, message: null }, form);
      }
      router.refresh();
    });
  }, [due, router]);
}

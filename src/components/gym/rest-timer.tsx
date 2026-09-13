"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/time/format";
import { Button } from "@/components/ui/button";

/** A single pulse at 90s where the API exists. No notification, no sound (US-011 §5.4). */
const HAPTIC_AT_MS = 90_000;

export interface RestTimerProps {
  /** When the last set was logged. Null clears the bar. */
  since: number | null;
  onSkip: () => void;
}

/**
 * Rest since the last set (US-011 §5.4).
 *
 * Counts **up**, not down to a target — a target rest is a setting this app does not have, and
 * guessing one would be wrong more often than useful.
 *
 * Elapsed is recomputed from `since` on every tick rather than accumulated, so backgrounding the
 * app does not freeze it.
 */
export function RestTimer({ since, onSkip }: RestTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [buzzed, setBuzzed] = useState(false);

  useEffect(() => {
    if (since === null) {
      setElapsed(0);
      setBuzzed(false);
      return;
    }
    const tick = () => setElapsed(Math.max(0, Date.now() - since));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);

  useEffect(() => {
    if (since === null || buzzed || elapsed < HAPTIC_AT_MS) return;
    setBuzzed(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(20);
  }, [elapsed, buzzed, since]);

  if (since === null) return null;

  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-neutral-800 bg-neutral-900 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <span className="text-body-sm text-neutral-400">Rest</span>
      <span className="flex-1 font-mono text-control text-neutral-50 tabular-nums" role="timer">
        {formatElapsed(elapsed)}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
        Skip
      </Button>
    </div>
  );
}

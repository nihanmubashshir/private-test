"use client";

import { useActionState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, Dumbbell } from "lucide-react";
import type { Plan } from "@/lib/gym/types";
import { weekdayInZone } from "@/lib/gym/types";
import { estimateMinutes } from "@/lib/gym/summary";
import { startSession, type SessionActionResult } from "@/app/(app)/gym/session/actions";
import { useAppTimeZone, useWriteTimeZone } from "@/components/shell/app-time-zone";
import { StopwatchElapsed } from "@/components/stopwatch/stopwatch-elapsed";
import { Button } from "@/components/ui/button";

const INITIAL: SessionActionResult = { ok: true, message: null };

/**
 * Today's session on Home (US-010 §5.1) — and the way into starting one (US-011).
 *
 * Reads only the **active** plan; a matching day in an inactive plan changes nothing here. Which
 * day is "today" is resolved in the app zone, after mount when none is configured, so the card
 * renders its chrome first and the outline never moves.
 *
 * **Every state that isn't already running offers Start session**, including no plan and a rest
 * day. The planned-day state once shipped with only "View plan": the edit that added its button
 * missed its anchor and changed nothing, and typecheck and build both passed on a card with no way
 * to start a session.
 */
export function TodayGymCard({
  plan,
  running,
}: {
  plan: Plan | null;
  /** The session in progress, if any — from the stopwatch registry, not a gym-specific query. */
  running: { id: string; startedAt: string } | null;
}) {
  const timeZone = useAppTimeZone();
  const writeTimeZone = useWriteTimeZone();
  const [state, startAction, starting] = useActionState(startSession, INITIAL);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  /**
   * Starts a session stamped with the moment of the tap. Built here rather than rendered into
   * hidden inputs: an input rendered with `new Date()` holds the time Home was *rendered*, so a card
   * left open for twenty minutes started a session already twenty minutes in.
   *
   * On success the action redirects to /gym/session.
   */
  const start = (planDayId: string | null) => {
    const form = new FormData();
    form.set("planDayId", planDayId ?? "");
    form.set("startedAt", new Date().toISOString());
    form.set("timeZone", timeZone ?? writeTimeZone());
    startTransition(() => startAction(form));
  };

  const weekday = timeZone ? weekdayInZone(timeZone) : null;
  const day = plan && weekday !== null ? (plan.days.find((d) => d.weekday === weekday) ?? null) : null;

  // A session in progress outranks whatever today's plan says — including on a rest day.
  if (running) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <Header />
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success-400" aria-hidden />
          <StopwatchElapsed startedAt={running.startedAt} size="bar" />
        </div>
        <Button asChild fullWidth>
          <Link href="/gym/session">Resume</Link>
        </Button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <Header />
        <p className="text-body-sm text-neutral-400">No active plan. Start one anyway and add exercises as you go.</p>
        <div className="flex flex-col gap-2">
          <Button fullWidth pending={starting} disabled={!timeZone} onClick={() => start(null)}>
            Start session
          </Button>
          <Button asChild variant="ghost" fullWidth>
            <Link href="/gym/plans">Build your week</Link>
          </Button>
        </div>
      </div>
    );
  }

  // A rest day is a quiet row, not a card — it shouldn't look like something to act on. Starting
  // one anyway is still one tap, just not the thing the eye lands on.
  if (day && day.isRest) {
    return (
      <div className="flex min-h-14 items-center gap-3 rounded-lg px-1">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-800">
          <Dumbbell className="size-4 text-neutral-500" strokeWidth={1.75} />
        </span>
        <span className="flex-1 text-body-sm text-neutral-400">Rest day</span>
        {/* Secondary, not ghost: the seeded "My week" is seven rest days, so on a fresh install this
            is the only way into a session. */}
        <Button variant="secondary" size="sm" pending={starting} disabled={!timeZone} onClick={() => start(null)}>
          Start session
        </Button>
        <Link
          href={`/gym/plans/${plan.id}`}
          aria-label="View plan"
          className="flex size-tap items-center justify-center"
        >
          <ChevronRight className="size-4 text-neutral-600" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
    );
  }

  const sets = day ? day.items.reduce((total, item) => total + (item.targetSets ?? 0), 0) : 0;
  const minutes = estimateMinutes(sets);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <Header />
      <div className="flex flex-col gap-0.5">
        <p className="text-h2 text-neutral-50">{day?.name ?? (day ? "Unnamed session" : " ")}</p>
        <p className="text-body-sm text-neutral-500">
          {day
            ? `${day.items.length} ${day.items.length === 1 ? "exercise" : "exercises"}${
                minutes ? ` · about ${minutes} min` : ""
              }`
            : " "}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button fullWidth pending={starting} disabled={!timeZone} onClick={() => start(day?.id ?? null)}>
          Start session
        </Button>
        <Button asChild variant="ghost" fullWidth>
          <Link href={`/gym/plans/${plan.id}`}>View plan</Link>
        </Button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <Link href="/gym/sessions" className="-m-2 flex items-center gap-3 p-2 active:bg-surface-hover">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-800">
        <Dumbbell className="size-5 text-neutral-50" strokeWidth={1.75} />
      </span>
      <span className="flex-1 text-control font-semibold text-neutral-50">Gym</span>
      <ChevronRight className="size-5 text-neutral-500" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

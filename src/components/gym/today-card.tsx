"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, Dumbbell } from "lucide-react";
import type { Plan } from "@/lib/gym/types";
import { weekdayFromDate } from "@/lib/gym/types";
import { estimateMinutes } from "@/lib/gym/summary";
import { startSession, type SessionActionResult } from "@/app/(app)/gym/session/actions";
import { useAppTimeZone, useWriteTimeZone } from "@/components/shell/app-time-zone";
import { StopwatchElapsed } from "@/components/stopwatch/stopwatch-elapsed";
import { Button } from "@/components/ui/button";

const INITIAL: SessionActionResult = { ok: true, message: null };

/**
 * Today's session on Home (US-010 §5.1).
 *
 * Reads only the **active** plan — a matching day in an inactive plan changes nothing here.
 *
 * Which day is "today" depends on the app zone, so it resolves after mount. Until then the card
 * renders its chrome with no day, which is why the outline never moves when the value lands.
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
  const [state, formAction, pending] = useActionState(startSession, INITIAL);

  useEffect(() => {
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);
  const weekday = timeZone ? weekdayFromDate(new Date()) : null;
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
        <p className="text-body-sm text-neutral-400">No active plan.</p>
        <Button asChild variant="secondary" fullWidth>
          <Link href="/gym/plans">Build your week</Link>
        </Button>
      </div>
    );
  }

  // A rest day is a quiet row, not a card — it should not look like something to act on. Starting
  // one anyway is still possible, just not the thing the eye lands on.
  if (day && day.isRest) {
    return (
      <div className="flex min-h-14 items-center gap-3 rounded-lg px-1">
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-800">
          <Dumbbell className="size-4 text-neutral-500" strokeWidth={1.75} />
        </span>
        <span className="flex-1 text-body-sm text-neutral-400">Rest day</span>
        <form action={formAction}>
          <input type="hidden" name="planDayId" value="" />
          <input type="hidden" name="startedAt" value={new Date().toISOString()} />
          <input type="hidden" name="timeZone" value={timeZone ?? writeTimeZone()} />
          <Button type="submit" variant="ghost" size="sm" pending={pending} disabled={!timeZone}>
            Start anyway
          </Button>
        </form>
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
      {/* "Start session" arrives with US-011; until then the card is a way into the plan. */}
      <Button asChild variant="secondary" fullWidth>
        <Link href={`/gym/plans/${plan.id}`}>View plan</Link>
      </Button>
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

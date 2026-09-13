"use client";

import Link from "next/link";
import { ChevronRight, Dumbbell } from "lucide-react";
import type { Plan } from "@/lib/gym/types";
import { weekdayFromDate } from "@/lib/gym/types";
import { estimateMinutes } from "@/lib/gym/summary";
import { useAppTimeZone } from "@/components/shell/app-time-zone";
import { Button } from "@/components/ui/button";

/**
 * Today's session on Home (US-010 §5.1).
 *
 * Reads only the **active** plan — a matching day in an inactive plan changes nothing here.
 *
 * Which day is "today" depends on the app zone, so it resolves after mount. Until then the card
 * renders its chrome with no day, which is why the outline never moves when the value lands.
 */
export function TodayGymCard({ plan }: { plan: Plan | null }) {
  const timeZone = useAppTimeZone();
  const weekday = timeZone ? weekdayFromDate(new Date()) : null;
  const day = plan && weekday !== null ? (plan.days.find((d) => d.weekday === weekday) ?? null) : null;

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

  // A rest day is a quiet row, not a card — it should not look like something to act on.
  if (day && day.isRest) {
    return (
      <Link
        href={`/gym/plans/${plan.id}`}
        className="flex min-h-14 items-center gap-3 rounded-lg px-1 active:bg-surface-hover"
      >
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-800">
          <Dumbbell className="size-4 text-neutral-500" strokeWidth={1.75} />
        </span>
        <span className="flex-1 text-body-sm text-neutral-400">Rest day</span>
        <ChevronRight className="size-4 text-neutral-600" strokeWidth={1.75} aria-hidden />
      </Link>
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
    <Link href="/gym/plans" className="-m-2 flex items-center gap-3 p-2 active:bg-surface-hover">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-800">
        <Dumbbell className="size-5 text-neutral-50" strokeWidth={1.75} />
      </span>
      <span className="flex-1 text-control font-semibold text-neutral-50">Gym</span>
      <ChevronRight className="size-5 text-neutral-500" strokeWidth={1.75} aria-hidden />
    </Link>
  );
}

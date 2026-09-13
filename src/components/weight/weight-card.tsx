"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Scale } from "lucide-react";
import type { WeighIn } from "@/lib/weight/queries";
import { useAppTimeZone } from "@/components/shell/app-time-zone";
import { dateKey, formatRelativeDay, formatTime } from "@/lib/time/format";
import { Sparkline } from "@/components/charts/sparkline";
import { LogWeightSheet } from "@/components/weight/log-weight-sheet";
import { Button } from "@/components/ui/button";
import { deltaVsAWeekAgo, describeTrend } from "@/lib/weight/summary";
import { formatKg } from "@/lib/weight/limits";

export interface WeightCardProps {
  latest: WeighIn | null;
  /** Last 30 days, newest first, for the sparkline and the weekly delta. */
  recent: WeighIn[];
}

/** Home's weight card (US-009 §5.1). */
export function WeightCard({ latest, recent }: WeightCardProps) {
  const [open, setOpen] = useState(false);
  const timeZone = useAppTimeZone();
  const delta = deltaVsAWeekAgo(recent);

  // Derived here rather than on the server: "today" depends on the app zone, and until the owner
  // configures one that is the device's, which only the client knows.
  const loggedToday =
    timeZone !== null &&
    latest !== null &&
    dateKey(latest.measuredAt, timeZone) === dateKey(new Date().toISOString(), timeZone);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <Link href="/weight" className="-m-2 flex items-center gap-3 p-2 active:bg-surface-hover">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-800">
            <Scale className="size-5 text-neutral-50" strokeWidth={1.75} />
          </span>
          <span className="flex-1 text-control font-semibold text-neutral-50">Weight</span>
          <ChevronRight className="size-5 text-neutral-500" strokeWidth={1.75} aria-hidden />
        </Link>

        {latest ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[2.5rem] leading-none text-neutral-50 tabular-nums">
                {formatKg(latest.valueKg)}
              </span>
              <span className="text-control text-neutral-400">kg</span>
            </div>

            <div className="flex flex-col gap-0.5">
              {/* Neither direction is coloured: a gain is not an error state (US-009 §5.1). */}
              <p className="text-body-sm text-neutral-300">{describeTrend(delta)}</p>
              <p className="text-xs text-neutral-500">
                {timeZone
                  ? `${formatRelativeDay(latest.measuredAt, timeZone)}, ${formatTime(latest.measuredAt, timeZone)}`
                  : " "}
              </p>
            </div>

            <Sparkline readings={recent} label={describeTrend(delta)} />
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[2.5rem] leading-none text-neutral-600">—</span>
            <p className="text-body-sm text-neutral-400">No readings yet.</p>
          </div>
        )}

        <Button variant={latest && loggedToday ? "secondary" : "primary"} fullWidth onClick={() => setOpen(true)}>
          {latest ? "Log weight" : "Log your first weight"}
        </Button>
      </div>

      <LogWeightSheet open={open} onClose={() => setOpen(false)} lastValueKg={latest?.valueKg ?? null} />
    </>
  );
}

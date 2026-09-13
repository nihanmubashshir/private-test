"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WeighIn } from "@/lib/weight/queries";
import { WEIGHT_RANGES, showsTrendLine, type WeightRange } from "@/lib/weight/range";
import { toSeries } from "@/lib/weight/series";
import { useAppTimeZone } from "@/components/shell/app-time-zone";
import { formatRelativeDay, formatShortDate, formatTime } from "@/lib/time/format";
import { WeightChart } from "@/components/charts/weight-chart";
import { LogWeightSheet } from "@/components/weight/log-weight-sheet";
import { WeighInRow } from "@/components/weight/weigh-in-row";
import { Button } from "@/components/ui/button";
import { formatKg, formatKgDelta } from "@/lib/weight/limits";
import { cn } from "@/lib/utils";

export interface WeightDetailProps {
  range: WeightRange;
  /** Readings inside the selected range — chart and stats. */
  inRange: WeighIn[];
  /** Every reading — the list below. */
  all: WeighIn[];
}

function chartLabel(range: WeightRange, points: { v: number }[]): string {
  if (points.length < 2) return "Weight chart, not enough readings";
  const from = points[0].v;
  const to = points[points.length - 1].v;
  const change = to - from;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "level";
  return `Weight, ${range}: ${direction} ${formatKg(Math.abs(change))} kilograms, from ${formatKg(from)} to ${formatKg(to)}.`;
}

/** The weight detail screen (US-009 §5.3). */
export function WeightDetail({ range, inRange, all }: WeightDetailProps) {
  const router = useRouter();
  const timeZone = useAppTimeZone();
  const [logOpen, setLogOpen] = useState(false);
  const [editing, setEditing] = useState<WeighIn | null>(null);

  const latest = all[0] ?? null;
  const points = toSeries(inRange);
  const values = points.map((p) => p.v);

  const lowest = inRange.reduce<WeighIn | null>((a, b) => (a === null || b.valueKg < a.valueKg ? b : a), null);
  const highest = inRange.reduce<WeighIn | null>((a, b) => (a === null || b.valueKg > a.valueKg ? b : a), null);
  const change = values.length >= 2 ? values[values.length - 1] - values[0] : null;

  const setRange = (next: WeightRange) => {
    // The range lives in the URL so it survives a reload and a back navigation.
    router.replace(`/weight?range=${next}`, { scroll: false });
  };

  return (
    <>
      {latest && (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[2.5rem] leading-none text-neutral-50 tabular-nums">
              {formatKg(latest.valueKg)}
            </span>
            <span className="text-control text-neutral-400">kg</span>
          </div>
          <p className="text-body-sm text-neutral-500">
            {timeZone
              ? `${formatRelativeDay(latest.measuredAt, timeZone)}, ${formatTime(latest.measuredAt, timeZone)}`
              : " "}
          </p>
        </div>
      )}

      <div
        className="flex gap-1 rounded-md border border-neutral-800 bg-neutral-900 p-1"
        role="group"
        aria-label="Range"
      >
        {WEIGHT_RANGES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRange(option)}
            aria-pressed={option === range}
            className={cn(
              "min-h-9 flex-1 rounded-sm font-mono text-xs",
              // Segmented controls are never gold (01-design-system.md §10.2).
              option === range ? "bg-neutral-800 text-neutral-50" : "text-neutral-400 active:text-neutral-50",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {timeZone && (
        <WeightChart
          points={points}
          timeZone={timeZone}
          showTrend={showsTrendLine(range)}
          label={chartLabel(range, points)}
        />
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Change" value={change === null ? "—" : formatKgDelta(change)} sub="kg" />
        <Stat
          label="Lowest"
          value={lowest ? formatKg(lowest.valueKg) : "—"}
          sub={lowest && timeZone ? formatShortDate(lowest.measuredAt, timeZone) : ""}
        />
        <Stat
          label="Highest"
          value={highest ? formatKg(highest.valueKg) : "—"}
          sub={highest && timeZone ? formatShortDate(highest.measuredAt, timeZone) : ""}
        />
      </div>

      <Button variant="secondary" fullWidth onClick={() => setLogOpen(true)}>
        Log weight
      </Button>

      {/* Goals are added from the thing they measure (US-012 §5.4). */}
      <Button asChild variant="ghost" fullWidth>
        <Link href="/goals?new=weight">Add a goal</Link>
      </Button>

      <div className="flex flex-col">
        <h2 className="pb-2 font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">All readings</h2>
        {all.map((reading, index) => (
          <WeighInRow
            key={reading.id}
            reading={reading}
            previous={all[index + 1] ?? null}
            onEdit={() => {
              setEditing(reading);
              setLogOpen(true);
            }}
          />
        ))}
      </div>

      <LogWeightSheet
        open={logOpen}
        onClose={() => {
          setLogOpen(false);
          setEditing(null);
        }}
        lastValueKg={latest?.valueKg ?? null}
        editing={editing}
      />
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="font-mono text-control text-neutral-50 tabular-nums">{value}</span>
      <span className="truncate text-[11px] text-neutral-500">{sub}</span>
    </div>
  );
}

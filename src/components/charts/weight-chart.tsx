"use client";

import { useRef, useState } from "react";
import { formatShortDate } from "@/lib/time/format";
import { gridlines, movingAverage, splitOnGaps, valueExtent, type Point } from "@/lib/weight/series";

const WIDTH = 340;
const HEIGHT = 180;
const PAD_X = 12;
const PAD_Y = 14;
/** Points get noisy past this many; the line alone reads better. */
const MAX_POINTS_DRAWN = 40;

export interface WeightChartProps {
  points: Point[];
  timeZone: string;
  showTrend: boolean;
  label: string;
}

/**
 * The weight chart (US-009 §6). Hand-rolled SVG — see roadmap D3.
 *
 * The y axis is scaled to the data and **never includes zero**: on a weight chart a zero baseline
 * compresses a real 1kg change into nothing, which is worse than no chart.
 *
 * The plot stretches to the container (`preserveAspectRatio="none"`) so it fills the width at any
 * screen size, which means the axis labels **cannot** live inside the SVG — a non-uniform scale
 * squashes `<text>` horizontally. They are positioned HTML over the top instead.
 */
export function WeightChart({ points, timeZone, showTrend, label }: WeightChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<Point | null>(null);

  if (points.length < 2) {
    return (
      <p className="flex h-[180px] items-center justify-center text-body-sm text-neutral-500">
        Two readings are needed before a trend means anything.
      </p>
    );
  }

  const extent = valueExtent(points.map((p) => p.v));
  const first = points[0].t;
  const span = points[points.length - 1].t - first || 1;

  const x = (p: Point) => PAD_X + ((p.t - first) / span) * (WIDTH - PAD_X * 2);
  const y = (p: Point) => PAD_Y + (1 - (p.v - extent.min) / (extent.max - extent.min)) * (HEIGHT - PAD_Y * 2);
  const path = (segment: Point[]) => segment.map((p, i) => `${i === 0 ? "M" : "L"}${x(p)} ${y(p)}`).join(" ");

  const gridY = (value: number) =>
    PAD_Y + (1 - (value - extent.min) / (extent.max - extent.min)) * (HEIGHT - PAD_Y * 2);
  const lines = gridlines(extent);
  const trend = showTrend ? movingAverage(points) : [];

  /** Maps a touch or pointer x back onto the nearest reading. */
  const scrub = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (clientX - rect.left) / rect.width;
    const t = first + ratio * span;
    let nearest = points[0];
    for (const point of points) {
      if (Math.abs(point.t - t) < Math.abs(nearest.t - t)) nearest = point;
    }
    setActive(nearest);
  };

  const xLabels = [0, 0.5, 1].map((ratio) => {
    const t = first + ratio * span;
    return { ratio, label: formatShortDate(new Date(t).toISOString(), timeZone) };
  });

  return (
    <figure className="flex flex-col gap-1">
      <div className="relative h-[180px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full touch-pan-y"
          role="img"
          aria-label={label}
          onPointerDown={(event) => scrub(event.clientX)}
          onPointerMove={(event) => {
            if (event.buttons > 0) scrub(event.clientX);
          }}
          onPointerUp={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          {lines.map((value) => (
            <line
              key={value}
              x1={0}
              x2={WIDTH}
              y1={gridY(value)}
              y2={gridY(value)}
              stroke="var(--color-neutral-800)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {showTrend &&
            splitOnGaps(trend).map((segment, i) =>
              segment.length < 2 ? null : (
                <path
                  key={`trend-${i}`}
                  d={path(segment)}
                  fill="none"
                  stroke="var(--color-neutral-500)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ),
            )}

          {splitOnGaps(points).map((segment, i) =>
            segment.length < 2 ? null : (
              <path
                key={`line-${i}`}
                d={path(segment)}
                fill="none"
                stroke="var(--color-accent-500)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}

          {points.length < MAX_POINTS_DRAWN &&
            points.map((point) => (
              <circle
                key={point.t}
                cx={x(point)}
                cy={y(point)}
                r={2}
                fill="var(--color-accent-500)"
                vectorEffect="non-scaling-stroke"
              />
            ))}

          {active && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={0}
              y2={HEIGHT}
              stroke="var(--color-neutral-600)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {lines.map((value) => (
          <span
            key={value}
            style={{ top: `${(gridY(value) / HEIGHT) * 100}%` }}
            className="pointer-events-none absolute left-0.5 -translate-y-full font-mono text-[11px] text-neutral-500"
            aria-hidden
          >
            {value.toFixed(1)}
          </span>
        ))}
      </div>

      <div className="flex justify-between px-1 font-mono text-[11px] text-neutral-500" aria-hidden>
        {xLabels.map(({ ratio, label: text }) => (
          <span key={ratio}>{text}</span>
        ))}
      </div>

      {/* Live region rather than an SVG tooltip: the value has to be readable, not just drawn. */}
      <figcaption className="min-h-5 text-center text-body-sm text-neutral-300" aria-live="polite">
        {active ? `${active.v.toFixed(1)} kg · ${formatShortDate(new Date(active.t).toISOString(), timeZone)}` : ""}
      </figcaption>
    </figure>
  );
}

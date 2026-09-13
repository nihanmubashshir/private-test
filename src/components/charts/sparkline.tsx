import { splitOnGaps, toSeries, valueExtent, type Point } from "@/lib/weight/series";
import type { WeighIn } from "@/lib/weight/queries";

const WIDTH = 320;
const HEIGHT = 48;
const PAD = 4;

export interface SparklineProps {
  readings: WeighIn[];
  label: string;
}

/**
 * A 48px trend line for a card (US-009 §5.1). No axes, no fill, no interaction.
 *
 * Hand-rolled SVG rather than a charting dependency (roadmap D3): the whole component is an
 * extent, a scale and a path, and a library would still need fighting to drop the zero baseline.
 *
 * Renders on the server — it takes no zone and no `now`, so there is nothing to defer to mount.
 *
 * Uniform aspect ratio, not `preserveAspectRatio="none"`: a non-uniform scale would stretch the
 * end-point dot into an ellipse. The cost is a few pixels of letterboxing at narrow widths.
 */
export function Sparkline({ readings, label }: SparklineProps) {
  const points = toSeries(readings);

  if (points.length < 2) {
    return (
      <div className="flex h-12 items-center" aria-hidden>
        <div className="h-px w-full bg-neutral-800" />
      </div>
    );
  }

  const extent = valueExtent(points.map((p) => p.v));
  const first = points[0].t;
  const span = points[points.length - 1].t - first || 1;

  const x = (p: Point) => PAD + ((p.t - first) / span) * (WIDTH - PAD * 2);
  const y = (p: Point) => PAD + (1 - (p.v - extent.min) / (extent.max - extent.min)) * (HEIGHT - PAD * 2);
  const path = (segment: Point[]) => segment.map((p, i) => `${i === 0 ? "M" : "L"}${x(p)} ${y(p)}`).join(" ");

  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-12 w-full"
      role="img"
      aria-label={label}
    >
      {splitOnGaps(points).map((segment, i) =>
        segment.length < 2 ? null : (
          <path
            key={i}
            d={path(segment)}
            fill="none"
            stroke="var(--color-accent-500)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ),
      )}
      <circle cx={x(last)} cy={y(last)} r={3} fill="var(--color-accent-500)" />
    </svg>
  );
}

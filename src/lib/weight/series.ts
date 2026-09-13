import type { WeighIn } from "@/lib/weight/queries";

export interface Point {
  /** Epoch milliseconds — the x axis is real time, not an index, so gaps are visible. */
  t: number;
  v: number;
}

/** Oldest-first points, which is what every chart wants and the opposite of how they are queried. */
export function toSeries(readings: WeighIn[]): Point[] {
  return readings
    .map((reading) => ({ t: Date.parse(reading.measuredAt), v: reading.valueKg }))
    .sort((a, b) => a.t - b.t);
}

/** A gap longer than this breaks the line, so a long pause never reads as a smooth trend. */
export const GAP_BREAK_MS = 14 * 86_400_000;

/** Splits a series wherever consecutive readings are more than 14 days apart (US-009 §6). */
export function splitOnGaps(points: Point[], gapMs = GAP_BREAK_MS): Point[][] {
  const segments: Point[][] = [];
  let current: Point[] = [];

  for (const point of points) {
    const previous = current[current.length - 1];
    if (previous && point.t - previous.t > gapMs) {
      segments.push(current);
      current = [];
    }
    current.push(point);
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

/**
 * A trailing 7-day mean at each reading — the "trajectory". A day-weighted window rather than a
 * fixed number of samples, so weighing twice one morning and not at all the next does not shift it.
 */
export function movingAverage(points: Point[], windowDays = 7): Point[] {
  const windowMs = windowDays * 86_400_000;
  return points.map((point, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i; j >= 0; j--) {
      if (point.t - points[j].t > windowMs) break;
      sum += points[j].v;
      count++;
    }
    return { t: point.t, v: sum / count };
  });
}

export interface Extent {
  min: number;
  max: number;
}

/**
 * The y extent, padded by 5% and **never including zero** (US-009 §6): on a weight chart a
 * zero-based axis compresses a real 1kg change into nothing.
 *
 * A flat series gets an artificial ±0.5kg so it renders as a line through the middle rather than
 * dividing by a zero range.
 */
export function valueExtent(values: number[], padRatio = 0.05): Extent {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { min: min - 0.5, max: max + 0.5 };
  const pad = (max - min) * padRatio;
  return { min: min - pad, max: max + pad };
}

/** Two or three gridlines at round values inside the extent. */
export function gridlines(extent: Extent, target = 3): number[] {
  const span = extent.max - extent.min;
  if (span <= 0) return [];
  const rough = span / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? magnitude * 10;

  const lines: number[] = [];
  for (let v = Math.ceil(extent.min / step) * step; v <= extent.max; v += step) {
    lines.push(Number(v.toFixed(6)));
  }
  return lines;
}

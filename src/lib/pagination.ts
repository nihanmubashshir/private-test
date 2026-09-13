import { z } from "zod";

/**
 * The `?show=` window shared by every history list (US-007 §4).
 *
 * These constants were duplicated in `activity/page.tsx` and `running/page.tsx`; `/activity` is
 * gone, and every tracker added from here on reads the same window, so they live in one place.
 */
export const DEFAULT_SHOW = 30;
export const MAX_SHOW = 500;

/** Falls back to the default rather than erroring — a hand-edited URL should not 500. */
export const showSchema = z.coerce.number().int().min(1).max(MAX_SHOW).catch(DEFAULT_SHOW);

/** Reads `show` out of an already-awaited `searchParams` object. */
export function parseShow(params: { [key: string]: string | string[] | undefined }): number {
  const raw = Array.isArray(params.show) ? params.show[0] : params.show;
  return showSchema.parse(raw);
}

import { requireFull } from "@/lib/auth/require-full";
import { getActivePlan } from "@/lib/gym/queries";
import { getActiveStopwatches } from "@/lib/stopwatch/server";
import { getLatestWeighIn } from "@/lib/weight/queries";
import { listPrayerHistory } from "@/lib/prayers/queries";
import { RadialMenu } from "./radial-menu";

/**
 * Loads what the radial menu's actions need (US-014 §4), wrapped in `<Suspense fallback={null}>` by
 * the app layout like `ActiveStopwatchSlot`, so the shell paints before these queries finish. The
 * button is `position: fixed`, so arriving a moment later moves nothing on the page.
 *
 * Only the seven day ids and rest flags cross to the client — which day is *today* depends on the
 * app zone, which the client resolves (US-008).
 */
export async function RadialMenuSlot() {
  const supabase = await requireFull();
  const [plan, actives, latest, prayers] = await Promise.all([
    getActivePlan(supabase),
    getActiveStopwatches(supabase),
    getLatestWeighIn(supabase),
    // Two days' worth is enough to cover "today" whichever side of midnight the app zone lands on.
    listPrayerHistory(supabase, { limit: 10 }),
  ]);

  return (
    <RadialMenu
      planDays={plan ? plan.days.map((day) => ({ weekday: day.weekday, id: day.id, isRest: day.isRest })) : null}
      gymRunning={actives.some((active) => active.kind === "gym")}
      lastWeightKg={latest?.valueKg ?? null}
      recentPrayers={prayers}
    />
  );
}

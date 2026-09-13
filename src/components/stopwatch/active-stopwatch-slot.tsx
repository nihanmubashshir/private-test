import { requireFull } from "@/lib/auth/require-full";
import { getActiveStopwatches } from "@/lib/stopwatch/server";
import { ActiveStopwatchBar } from "./active-stopwatch-bar";

/**
 * Wrapped in a <Suspense fallback={null}> by each route group's layout, so the shell paints
 * before this query finishes (01-design-system.md §5.7).
 */
export async function ActiveStopwatchSlot({ dockAboveTabBar }: { dockAboveTabBar: boolean }) {
  const supabase = await requireFull();
  const actives = await getActiveStopwatches(supabase);
  return <ActiveStopwatchBar actives={actives} dockAboveTabBar={dockAboveTabBar} />;
}

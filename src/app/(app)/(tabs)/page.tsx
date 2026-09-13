import { requireFull } from "@/lib/auth/require-full";
import { getActiveStopwatches } from "@/lib/stopwatch/server";
import { getLastCompletedRun } from "@/lib/runs/queries";
import { LargeTitle } from "@/components/shell/large-title";
import { RunningCard } from "./running-card";

export default async function HomePage() {
  const supabase = await requireFull();

  const [actives, lastRun] = await Promise.all([
    getActiveStopwatches(supabase),
    getLastCompletedRun(supabase),
  ]);

  const activeRunning = actives.find((active) => active.kind === "running") ?? null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
      <LargeTitle title="Home" />
      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">TRACKERS</p>
        <RunningCard active={activeRunning} lastRun={lastRun} />
      </div>
    </div>
  );
}

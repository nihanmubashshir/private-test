import { requireFull } from "@/lib/auth/require-full";
import { getActiveStopwatches } from "@/lib/stopwatch/server";
import { getLastCompletedRun } from "@/lib/runs/queries";
import { RunningCard } from "./running-card";

export default async function HomePage() {
  const supabase = await requireFull();

  const [actives, lastRun] = await Promise.all([
    getActiveStopwatches(supabase),
    getLastCompletedRun(supabase),
  ]);

  const activeRunning = actives.find((active) => active.kind === "running") ?? null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-7">
      <h1 className="text-h1 text-neutral-50">Dashboard</h1>
      <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">TRACKERS</p>
      <RunningCard active={activeRunning} lastRun={lastRun} />
    </div>
  );
}

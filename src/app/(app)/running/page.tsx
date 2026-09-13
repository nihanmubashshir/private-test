import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { getActiveStopwatches } from "@/lib/stopwatch/server";
import { listCompletedRuns } from "@/lib/runs/queries";
import { StopwatchControl } from "@/components/stopwatch/stopwatch-control";
import { Button } from "@/components/ui/button";
import { RunList } from "./run-list";

const DEFAULT_SHOW = 30;
const MAX_SHOW = 500;
const showSchema = z.coerce.number().int().min(1).max(MAX_SHOW).catch(DEFAULT_SHOW);

export default async function RunningPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireFull();
  const params = await searchParams;
  const showValue = Array.isArray(params.show) ? params.show[0] : params.show;
  const show = showSchema.parse(showValue);

  const [actives, runs] = await Promise.all([
    getActiveStopwatches(supabase),
    listCompletedRuns(supabase, show + 1),
  ]);

  const active = actives.find((a) => a.kind === "running") ?? null;
  const hasMore = runs.length > show;
  const visibleRuns = runs.slice(0, show);
  const showMoreHref = hasMore ? `/running?show=${Math.min(show + DEFAULT_SHOW, MAX_SHOW)}` : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-7">
      <Button href="/" variant="ghost" size="sm" className="self-start">
        ‹ Dashboard
      </Button>
      <h1 className="text-h1 text-neutral-50">Running</h1>

      <StopwatchControl kind="running" active={active} labels={{ label: "run", activeLabel: "Running" }} />

      <Button href="/running/new" variant="secondary" fullWidth size="lg">
        Add run manually
      </Button>

      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">RUNS</p>
        <RunList runs={visibleRuns} showMoreHref={showMoreHref} />
      </div>
    </div>
  );
}

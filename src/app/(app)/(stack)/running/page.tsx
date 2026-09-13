import Link from "next/link";
import { z } from "zod";
import { Plus } from "lucide-react";
import { requireFull } from "@/lib/auth/require-full";
import { getActiveStopwatches, listCompletedSessions } from "@/lib/stopwatch/server";
import { StopwatchControl } from "@/components/stopwatch/stopwatch-control";
import { Button } from "@/components/ui/button";
import { AppBar } from "@/components/shell/app-bar";
import { PullToRefresh } from "@/components/shell/pull-to-refresh";
import { ToastOnParam } from "@/components/shell/toast-on-param";
import { ActivityList } from "@/components/trackers/activity-list";

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

  const [actives, sessions] = await Promise.all([
    getActiveStopwatches(supabase),
    listCompletedSessions(supabase, { kind: "running", limit: show + 1 }),
  ]);

  const active = actives.find((a) => a.kind === "running") ?? null;
  const hasMore = sessions.length > show;
  const visible = sessions.slice(0, show);

  return (
    <PullToRefresh>
      <div className="min-h-dvh">
        <ToastOnParam param="deleted" message="Run deleted" />
        <AppBar title="Running" backHref="/" />
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
          <StopwatchControl kind="running" active={active} />

          <Button asChild variant="secondary" fullWidth size="lg">
            <Link href="/running/new">
              <Plus className="size-5" aria-hidden />
              Add run manually
            </Link>
          </Button>

          <div className="flex flex-col gap-4">
            <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">RUNS</p>
            {visible.length === 0 ? (
              <p className="text-body-sm text-neutral-400">No runs yet.</p>
            ) : (
              <ActivityList sessions={visible} show={show} pageSize={DEFAULT_SHOW} hasMore={hasMore} />
            )}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}

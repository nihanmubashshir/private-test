import Link from "next/link";
import { Plus } from "lucide-react";
import { requireFull } from "@/lib/auth/require-full";
import { getActiveStopwatches, listCompletedSessions } from "@/lib/stopwatch/server";
import { StopwatchControl } from "@/components/stopwatch/stopwatch-control";
import { Button } from "@/components/ui/button";
import { AppBar } from "@/components/shell/app-bar";
import { ToastOnParam } from "@/components/shell/toast-on-param";
import { ActivityList } from "@/components/trackers/activity-list";
import { parseShow, DEFAULT_SHOW } from "@/lib/pagination";

export default async function RunningPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireFull();
  const show = parseShow(await searchParams);

  const [actives, sessions] = await Promise.all([
    getActiveStopwatches(supabase),
    listCompletedSessions(supabase, { kind: "running", limit: show + 1 }),
  ]);

  const active = actives.find((a) => a.kind === "running") ?? null;
  const hasMore = sessions.length > show;
  const visible = sessions.slice(0, show);

  return (
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
  );
}

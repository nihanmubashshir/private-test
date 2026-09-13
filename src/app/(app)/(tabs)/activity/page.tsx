import { z } from "zod";
import { ListOrdered } from "lucide-react";
import { requireFull } from "@/lib/auth/require-full";
import { listCompletedSessions } from "@/lib/stopwatch/server";
import { LargeTitle } from "@/components/shell/large-title";
import { PullToRefresh } from "@/components/shell/pull-to-refresh";
import { ActivityList } from "@/components/trackers/activity-list";
import { EmptyState } from "@/components/trackers/empty-state";

const DEFAULT_SHOW = 30;
const MAX_SHOW = 500;
const showSchema = z.coerce.number().int().min(1).max(MAX_SHOW).catch(DEFAULT_SHOW);

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireFull();
  const params = await searchParams;
  const showValue = Array.isArray(params.show) ? params.show[0] : params.show;
  const show = showSchema.parse(showValue);

  // The registry has one kind today, so the "?kind=" ToggleGroup filter (01-design-system.md
  // §6.2, "hidden with a single kind") has nothing to filter — add it here, gated on
  // `Object.keys(stopwatchKinds).length > 1`, once a second kind exists.
  const sessions = await listCompletedSessions(supabase, { limit: show + 1 });
  const hasMore = sessions.length > show;
  const visible = sessions.slice(0, show);

  return (
    <PullToRefresh>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <LargeTitle title="Activity" />
        {visible.length === 0 ? (
          <EmptyState
            icon={ListOrdered}
            title="No activity yet"
            hint="Start a stopwatch or add a run."
            actionLabel="Start run"
            actionHref="/running"
          />
        ) : (
          <ActivityList sessions={visible} show={show} pageSize={DEFAULT_SHOW} hasMore={hasMore} />
        )}
      </div>
    </PullToRefresh>
  );
}

import { Dumbbell } from "lucide-react";
import { requireFull } from "@/lib/auth/require-full";
import { listCompletedSessions } from "@/lib/stopwatch/server";
import { parseShow, DEFAULT_SHOW } from "@/lib/pagination";
import { AppBar } from "@/components/shell/app-bar";
import { ActivityList } from "@/components/trackers/activity-list";
import { EmptyState } from "@/components/trackers/empty-state";

/**
 * Past gym sessions (US-011 §7).
 *
 * Uses the generic `ActivityList` fed by the stopwatch registry, not a gym-specific query — which
 * is the payoff for `gym_sessions` following the timed-entity template.
 */
export default async function GymSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireFull();
  const show = parseShow(await searchParams);
  const sessions = await listCompletedSessions(supabase, { kind: "gym", limit: show + 1 });

  const hasMore = sessions.length > show;
  const visible = sessions.slice(0, show);

  return (
    <div className="min-h-dvh">
      <AppBar title="Sessions" backHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        {visible.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No sessions yet"
            hint="Start one from the Gym card on Home."
            actionLabel="Go to Home"
            actionHref="/"
          />
        ) : (
          <ActivityList sessions={visible} show={show} pageSize={DEFAULT_SHOW} hasMore={hasMore} />
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireFull } from "@/lib/auth/require-full";
import { getActiveStopwatches, listCompletedSessions } from "@/lib/stopwatch/server";
import { stopwatchKinds, type StopwatchKind } from "@/lib/stopwatch/registry";
import { LargeTitle } from "@/components/shell/large-title";
import { TodayEyebrow } from "@/components/shell/today-eyebrow";
import { SettingsButton } from "@/components/shell/settings-button";
import { PullToRefresh } from "@/components/shell/pull-to-refresh";
import { ToastOnParam } from "@/components/shell/toast-on-param";
import { Button } from "@/components/ui/button";
import { TrackerCard } from "@/components/trackers/tracker-card";
import { RecentActivity } from "@/components/trackers/recent-activity";

const RECENT_ACTIVITY_LIMIT = 5;

export default async function HomePage() {
  const supabase = await requireFull();
  const kinds = Object.keys(stopwatchKinds) as StopwatchKind[];

  const [actives, recent, lastByKind] = await Promise.all([
    getActiveStopwatches(supabase),
    listCompletedSessions(supabase, { limit: RECENT_ACTIVITY_LIMIT }),
    Promise.all(kinds.map((kind) => listCompletedSessions(supabase, { kind, limit: 1 }))),
  ]);

  return (
    <PullToRefresh>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <ToastOnParam param="missing" message="That page doesn't exist." tone="warning" />
        <LargeTitle
          title="Home"
          eyebrow={<TodayEyebrow />}
          rightSlot={<SettingsButton />}
        />

        <div className="flex flex-col gap-4">
          {kinds.map((kind, index) => (
            <TrackerCard
              key={kind}
              kind={kind}
              active={actives.find((active) => active.kind === kind) ?? null}
              lastCompleted={lastByKind[index][0] ?? null}
              primaryAction={index === 0}
            />
          ))}
        </div>

        {recent.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-h2 text-neutral-50">Recent activity</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/activity">See all</Link>
              </Button>
            </div>
            <RecentActivity sessions={recent} />
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

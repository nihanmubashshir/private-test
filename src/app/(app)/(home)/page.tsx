import { requireFull } from "@/lib/auth/require-full";
import { getActiveStopwatches, listCompletedSessions } from "@/lib/stopwatch/server";
import { stopwatchKinds, type StopwatchKind } from "@/lib/stopwatch/registry";
import { LargeTitle } from "@/components/shell/large-title";
import { TodayEyebrow } from "@/components/shell/today-eyebrow";
import { SettingsButton } from "@/components/shell/settings-button";
import { ToastOnParam } from "@/components/shell/toast-on-param";
import { TrackerCard } from "@/components/trackers/tracker-card";
import { RecentActivity } from "@/components/trackers/recent-activity";
import { WeightCard } from "@/components/weight/weight-card";
import { listWeighIns } from "@/lib/weight/queries";
import { getActivePlan, seedGymDefaults } from "@/lib/gym/queries";
import { TodayGymCard } from "@/components/gym/today-card";
import { listGoals, loadGoalInputs } from "@/lib/goals/queries";
import { GoalsSummary } from "@/components/goals/goals-summary";

const RECENT_ACTIVITY_LIMIT = 5;
const GOAL_SHOWCASE_MS = 7 * 86_400_000;
/** The sparkline window (US-009 §5.1). One extra day so the week-ago comparison has a neighbour. */
const SPARKLINE_DAYS = 31;

export default async function HomePage() {
  const supabase = await requireFull();
  // Kinds with their own Home card (gym) are excluded here and rendered by that card instead.
  const kinds = (Object.keys(stopwatchKinds) as StopwatchKind[]).filter(
    (kind) => !stopwatchKinds[kind].hasCustomHomeCard,
  );

  const since = new Date(Date.now() - SPARKLINE_DAYS * 86_400_000).toISOString();

  const [actives, recent, lastByKind, weighIns] = await Promise.all([
    getActiveStopwatches(supabase),
    listCompletedSessions(supabase, { limit: RECENT_ACTIVITY_LIMIT }),
    Promise.all(kinds.map((kind) => listCompletedSessions(supabase, { kind, limit: 1 }))),
    listWeighIns(supabase, { since }),
  ]);

  // Seeding is idempotent and only writes on a first-ever visit; the active plan is read after it
  // so a brand-new install sees its starter week immediately rather than on the next load.
  await seedGymDefaults(supabase);
  const activePlan = await getActivePlan(supabase);

  // Completed goals stay on Home for a week, then live only in /goals (US-012 §4). An instant
  // difference, not a calendar day, so it needs no zone.
  const goals = await listGoals(supabase);
  const homeGoals = goals.filter(
    (goal) =>
      goal.status === "active" ||
      (goal.status === "completed" &&
        goal.completedAt !== null &&
        Date.now() - Date.parse(goal.completedAt) < GOAL_SHOWCASE_MS),
  );
  const goalInputs = await loadGoalInputs(supabase, homeGoals);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
      <ToastOnParam param="missing" message="That page doesn't exist." tone="warning" />
      <ToastOnParam param="discarded" message="Session discarded" />
      <ToastOnParam param="deleted" message="Session deleted" />
      <LargeTitle title="Home" eyebrow={<TodayEyebrow />} rightSlot={<SettingsButton />} />

      {/* Directly under the header, above the day's session (US-012 §5.1). */}
      {homeGoals.length > 0 && <GoalsSummary goals={homeGoals} inputs={goalInputs} />}

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

        <TodayGymCard plan={activePlan} running={actives.find((a) => a.kind === "gym") ?? null} />

        <WeightCard latest={weighIns[0] ?? null} recent={weighIns} />
      </div>

      {recent.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* No "See all": /activity is gone (US-007 §4) and each row links to its own tracker. */}
          <h2 className="text-h2 text-neutral-50">Recent activity</h2>
          <RecentActivity sessions={recent} />
        </div>
      )}
    </div>
  );
}

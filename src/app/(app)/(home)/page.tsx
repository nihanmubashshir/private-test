import { requireFull } from "@/lib/auth/require-full";
import { LargeTitle } from "@/components/shell/large-title";
import { TodayEyebrow } from "@/components/shell/today-eyebrow";
import { SettingsButton } from "@/components/shell/settings-button";
import { ToastOnParam } from "@/components/shell/toast-on-param";
import { listGoals, loadGoalInputs } from "@/lib/goals/queries";
import { GoalsSummary } from "@/components/goals/goals-summary";

const GOAL_SHOWCASE_MS = 7 * 86_400_000;

export default async function HomePage() {
  const supabase = await requireFull();

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

      {/* Directly under the header (US-012 §5.1). Home is goals-only; every tracker lives on its
          own page, reachable from the radial menu (US-014). */}
      {homeGoals.length > 0 && <GoalsSummary goals={homeGoals} inputs={goalInputs} />}
    </div>
  );
}

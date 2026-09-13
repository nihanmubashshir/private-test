import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { listGoals, loadGoalInputs } from "@/lib/goals/queries";
import type { GoalSubject } from "@/lib/goals/types";
import { listWorkouts } from "@/lib/gym/queries";
import { AppBar } from "@/components/shell/app-bar";
import { GoalsView } from "@/components/goals/goals-view";

const subjectParam = z.enum(["weight", "running", "gym", "workout"]).nullable().catch(null);
const goalParam = z.uuid().nullable().catch(null);

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireFull();
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

  // A hand-edited or stale query string falls back to "nothing preselected" rather than erroring.
  const initialSubject: GoalSubject | null = subjectParam.parse(first(params.new));
  const openGoalId = goalParam.parse(first(params.goal));

  const [goals, workouts] = await Promise.all([listGoals(supabase), listWorkouts(supabase)]);
  const inputs = await loadGoalInputs(supabase, goals);

  return (
    <div className="min-h-dvh">
      <AppBar title="Goals" backHref="/" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <GoalsView
          goals={goals}
          inputs={inputs}
          workouts={workouts}
          initialSubject={initialSubject}
          openGoalId={openGoalId}
        />
      </div>
    </div>
  );
}

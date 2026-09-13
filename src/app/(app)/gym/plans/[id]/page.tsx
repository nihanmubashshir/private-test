import { notFound } from "next/navigation";
import { requireFull } from "@/lib/auth/require-full";
import { getPlan, listWorkouts } from "@/lib/gym/queries";
import { AppBar } from "@/components/shell/app-bar";
import { PlanEditor } from "@/components/gym/plan-editor";

export default async function PlanEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await requireFull();
  const { id } = await params;

  const [plan, workouts] = await Promise.all([getPlan(supabase, id), listWorkouts(supabase)]);
  // A stale link bounces to Home with a toast, rather than a 404 (US-007 §2).
  if (!plan) notFound();

  return (
    <div className="min-h-dvh">
      <AppBar title={plan.name} />
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
        <PlanEditor plan={plan} workouts={workouts} />
      </div>
    </div>
  );
}

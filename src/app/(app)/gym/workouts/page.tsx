import { requireFull } from "@/lib/auth/require-full";
import { listWorkouts, seedGymDefaults } from "@/lib/gym/queries";
import { AppBar } from "@/components/shell/app-bar";
import { WorkoutLibrary } from "@/components/gym/workout-library";

export default async function WorkoutsPage() {
  const supabase = await requireFull();
  // Idempotent: creates the starter library on first visit, no-ops afterwards (US-010 §6).
  await seedGymDefaults(supabase);
  const workouts = await listWorkouts(supabase, { includeArchived: true });

  return (
    <div className="min-h-dvh">
      <AppBar title="Exercises" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
        <WorkoutLibrary workouts={workouts} />
      </div>
    </div>
  );
}

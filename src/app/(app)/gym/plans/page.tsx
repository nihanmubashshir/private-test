import { requireFull } from "@/lib/auth/require-full";
import { listPlans, seedGymDefaults } from "@/lib/gym/queries";
import { AppBar } from "@/components/shell/app-bar";
import { PlanLibrary } from "@/components/gym/plan-library";

export default async function PlansPage() {
  const supabase = await requireFull();
  await seedGymDefaults(supabase);
  const plans = await listPlans(supabase);

  return (
    <div className="min-h-dvh">
      <AppBar title="Plans" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4">
        <PlanLibrary plans={plans} />
      </div>
    </div>
  );
}

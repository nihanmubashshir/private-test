import { requireFull } from "@/lib/auth/require-full";
import { LargeTitle } from "@/components/shell/large-title";

// Full build (grouped list, infinite loading, pull to refresh) is US-005 T7.
export default async function ActivityPage() {
  await requireFull();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
      <LargeTitle title="Activity" />
      <p className="text-body-sm text-neutral-400">Coming soon.</p>
    </div>
  );
}

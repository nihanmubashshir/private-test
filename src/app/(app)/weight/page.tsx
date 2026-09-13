import { Scale } from "lucide-react";
import { requireFull } from "@/lib/auth/require-full";
import { listWeighIns } from "@/lib/weight/queries";
import { DEFAULT_RANGE, isWeightRange, rangeSince } from "@/lib/weight/range";
import { AppBar } from "@/components/shell/app-bar";
import { EmptyState } from "@/components/trackers/empty-state";
import { WeightDetail } from "@/components/weight/weight-detail";

export default async function WeightPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireFull();
  const params = await searchParams;
  const raw = Array.isArray(params.range) ? params.range[0] : params.range;
  const range = isWeightRange(raw) ? raw : DEFAULT_RANGE;

  const since = rangeSince(range);
  // Two windows: the selected range drives the chart and stats, the full list drives the readings
  // below it. One query each rather than fetching everything and filtering twice.
  const [inRange, all] = await Promise.all([
    listWeighIns(supabase, since ? { since } : {}),
    listWeighIns(supabase, { limit: 400 }),
  ]);

  return (
    <div className="min-h-dvh">
      <AppBar title="Weight" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        {all.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="No readings yet"
            hint="Log your weight from the card on Home."
            actionLabel="Go to Home"
            actionHref="/"
          />
        ) : (
          <WeightDetail range={range} inRange={inRange} all={all} />
        )}
      </div>
    </div>
  );
}

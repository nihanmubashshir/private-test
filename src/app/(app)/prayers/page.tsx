import { requireFull } from "@/lib/auth/require-full";
import { listPrayerHistory } from "@/lib/prayers/queries";
import { AppBar } from "@/components/shell/app-bar";
import { PrayerChecklist } from "@/components/prayers/prayer-checklist";
import { PrayerHistory } from "@/components/prayers/prayer-history";

/** Covers today plus a couple of weeks of history from one query (US-015 §5). */
const HISTORY_LIMIT = 5 * 15;

export default async function PrayersPage() {
  const supabase = await requireFull();
  const logs = await listPrayerHistory(supabase, { limit: HISTORY_LIMIT });

  return (
    <div className="min-h-dvh">
      <AppBar title="Prayers" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <PrayerChecklist logs={logs} />

        <div className="flex flex-col gap-3">
          <h2 className="text-body-sm font-semibold text-neutral-400">Recent days</h2>
          <PrayerHistory logs={logs} />
        </div>
      </div>
    </div>
  );
}

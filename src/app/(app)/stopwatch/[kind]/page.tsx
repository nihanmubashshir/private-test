import { notFound } from "next/navigation";
import { requireFull } from "@/lib/auth/require-full";
import { getActiveStopwatches } from "@/lib/stopwatch/server";
import { stopwatchKinds, type StopwatchKind } from "@/lib/stopwatch/registry";
import { FocusView } from "@/components/stopwatch/focus-view";

export default async function StopwatchFocusPage({ params }: { params: Promise<{ kind: string }> }) {
  const supabase = await requireFull();
  const { kind: kindParam } = await params;

  if (!(kindParam in stopwatchKinds)) notFound();
  const kind = kindParam as StopwatchKind;

  const actives = await getActiveStopwatches(supabase);
  const active = actives.find((a) => a.kind === kind) ?? null;

  return <FocusView kind={kind} active={active} />;
}

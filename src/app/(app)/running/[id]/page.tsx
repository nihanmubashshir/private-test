import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { requireFull } from "@/lib/auth/require-full";
import { getRun } from "@/lib/runs/queries";
import { stopwatchKinds } from "@/lib/stopwatch/registry";
import { AppBar } from "@/components/shell/app-bar";
import { ToastOnParam } from "@/components/shell/toast-on-param";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, formatDuration, formatFullDateWithYear, dateKey } from "@/lib/time/format";
import { RunDetailActions } from "./run-detail-actions";

const TWELVE_HOURS_SECONDS = 12 * 60 * 60;

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await requireFull();
  const { id } = await params;

  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) notFound();

  const run = await getRun(supabase, parsedId.data);
  if (!run) notFound();
  if (run.endedAt === null) redirect("/stopwatch/running");

  const config = stopwatchKinds.running;
  const Icon = config.icon;
  const startsOn = dateKey(run.startedAt, run.timeZone);
  const endsOn = dateKey(run.endedAt, run.timeZone);
  const spansNextDay = endsOn > startsOn;
  const durationSeconds = run.durationSeconds ?? 0;
  const isOver12h = durationSeconds > TWELVE_HOURS_SECONDS;

  return (
    <div className="min-h-dvh">
      <ToastOnParam param="saved" message="Run saved" />
      <ToastOnParam param="updated" message="Run updated" />
      <AppBar
        title="Run"
        backHref="/running"
        rightSlot={<RunDetailActions id={run.id} editHref={config.editHref(run.id)} />}
      />
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-neutral-800">
            <Icon className="size-6 text-neutral-50" strokeWidth={1.75} aria-hidden />
          </span>
          <p className="font-mono text-display text-neutral-50">{formatDuration(durationSeconds)}</p>
          <p className="text-body-sm text-neutral-400">{formatFullDateWithYear(run.startedAt, run.timeZone)}</p>
        </div>

        {isOver12h && (
          <div className="flex flex-col gap-2">
            <Alert tone="warning">This run is over 12 hours. Did you forget to stop the stopwatch?</Alert>
            <Button asChild variant="ghost" size="sm" className="self-start">
              <Link href={config.editHref(run.id)}>Fix times</Link>
            </Button>
          </div>
        )}

        <Card className="flex flex-col divide-y divide-neutral-800 px-4 py-0">
          <DetailRow label="Date" value={formatDate(run.startedAt, run.timeZone)} />
          <DetailRow label="Start" value={formatTime(run.startedAt, run.timeZone)} />
          <DetailRow label="Stop" value={`${formatTime(run.endedAt, run.timeZone)}${spansNextDay ? " +1" : ""}`} />
          <DetailRow label="Duration" value={formatDuration(durationSeconds)} />
          <DetailRow label="Time zone" value={run.timeZone} />
        </Card>

        <Button asChild variant="secondary" fullWidth size="lg">
          <Link href={config.editHref(run.id)}>Edit run</Link>
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between">
      <p className="text-body-sm text-neutral-400">{label}</p>
      <p className="font-mono text-[15px] text-neutral-50">{value}</p>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/ui/form-error";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { AppBar } from "@/components/shell/app-bar";
import { BottomCta } from "@/components/shell/bottom-cta";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createRun, updateRun, type RunActionResult } from "./actions";
import { toIso, fromIso, addDays } from "@/lib/time/wall-time";
import { formatDuration } from "@/lib/time/format";
import { APP_LOCALE } from "@/lib/time/locale";
import { useWriteTimeZone } from "@/components/shell/app-time-zone";

const INITIAL_STATE: RunActionResult = { ok: true, message: null };
const DURATION_PRESETS: { label: string; minutes: number }[] = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "45m", minutes: 45 },
  { label: "1h", minutes: 60 },
  { label: "1h 30m", minutes: 90 },
];
const ROUND_TO_MINUTES = 5;
const SMART_DEFAULT_DURATION_MINUTES = 30;

export interface RunFormRun {
  id: string;
  startedAt: string;
  endedAt: string;
  timeZone: string;
}

export interface RunFormProps {
  mode: "new" | "edit";
  run?: RunFormRun;
}

function minutesBetween(start: string, stop: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = stop.split(":").map(Number);
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return minutes;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + minutes) % (24 * 60) + 24 * 60) % (24 * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function formatWallDate(date: string): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(APP_LOCALE, { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(y, m - 1, d),
  );
}

/** now, rounded down to the nearest `ROUND_TO_MINUTES`. */
function roundedNow(): Date {
  const now = new Date();
  const ms = ROUND_TO_MINUTES * 60_000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

export function RunForm({ mode, run }: RunFormProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // The zone a new run is stamped with: the app's, not the device's (US-008).
  const [formTimeZone, setFormTimeZone] = useState<string | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const initial =
    mode === "edit" && run
      ? {
          date: fromIso(run.startedAt, run.timeZone).date,
          start: fromIso(run.startedAt, run.timeZone).time,
          stop: fromIso(run.endedAt, run.timeZone).time,
        }
      : { date: "", start: "", stop: "" };

  const writeTimeZone = useWriteTimeZone();
  const [date, setDate] = useState(initial.date);
  const [start, setStart] = useState(initial.start);
  const [stop, setStop] = useState(initial.stop);

  useEffect(() => {
    const tz = writeTimeZone();
    setFormTimeZone(tz);
    if (mode === "new") {
      // Smart defaults (US-005 §6.6): stop = now rounded down, start = stop − 30m.
      const stopDate = roundedNow();
      const startDate = new Date(stopDate.getTime() - SMART_DEFAULT_DURATION_MINUTES * 60_000);
      const startWall = fromIso(startDate.toISOString(), tz);
      const stopWall = fromIso(stopDate.toISOString(), tz);
      setDate(startWall.date);
      setStart(startWall.time);
      setStop(stopWall.time);
    }
    setMounted(true);
    // Only ever needs to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeZone = mode === "edit" && run ? run.timeZone : (formTimeZone ?? "");
  const isDirty = date !== initial.date || start !== initial.start || stop !== initial.stop;
  const closeHref = mode === "edit" && run ? `/running/${run.id}` : "/running";

  const submitAction = async (_prevState: RunActionResult, formData: FormData): Promise<RunActionResult> => {
    const enteredDate = String(formData.get("date") ?? "");
    const enteredStart = String(formData.get("start") ?? "");
    const enteredStop = String(formData.get("stop") ?? "");
    const zone = mode === "edit" && run ? run.timeZone : writeTimeZone();

    // Seconds preservation (US-004 §4.3): the date can move (e.g. correcting which day a
    // stopwatch run belongs to) without losing the stopwatch's sub-minute precision, as long as
    // the time-of-day text itself wasn't touched. Only an edited time field resets to :00 seconds.
    const startUnchanged = mode === "edit" && run && enteredStart === initial.start;
    const startSeconds = startUnchanged && run ? fromIso(run.startedAt, run.timeZone).seconds : 0;
    const startedAt = toIso({ date: enteredDate, time: enteredStart, timeZone: zone, seconds: startSeconds });

    const endDate = enteredStop < enteredStart ? addDays(enteredDate, 1) : enteredDate;
    const stopUnchanged = mode === "edit" && run && enteredStop === initial.stop;
    const stopSeconds = stopUnchanged && run ? fromIso(run.endedAt, run.timeZone).seconds : 0;
    const endedAt = toIso({ date: endDate, time: enteredStop, timeZone: zone, seconds: stopSeconds });

    const payload = new FormData();
    payload.set("startedAt", startedAt);
    payload.set("endedAt", endedAt);
    payload.set("timeZone", zone);
    if (mode === "edit" && run) payload.set("id", run.id);

    return mode === "edit" ? updateRun(_prevState, payload) : createRun(_prevState, payload);
  };

  const [state, formAction, pending] = useActionState(submitAction, INITIAL_STATE);

  const stopEqualsStart = start !== "" && stop !== "" && start === stop;
  const stopIsEarlier = start !== "" && stop !== "" && !stopEqualsStart && stop < start;
  const durationSeconds = start !== "" && stop !== "" && !stopEqualsStart ? minutesBetween(start, stop) * 60 : null;

  const handleClose = () => {
    if (isDirty) setCloseConfirmOpen(true);
    else router.push(closeHref);
  };

  const applyPreset = (minutes: number) => {
    if (!start) return;
    setStop(addMinutesToTime(start, minutes));
  };

  return (
    <div className="min-h-dvh">
      <AppBar title={mode === "new" ? "Add run" : "Edit run"} mode="close" closeHref={closeHref} onBeforeNavigate={handleClose} />

      <form action={formAction} className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-4">
        <div className="flex flex-col items-center gap-1 py-2 text-center">
          <p className="font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">Duration</p>
          <p className="font-mono text-[2.5rem] text-neutral-50">{durationSeconds !== null ? formatDuration(durationSeconds) : "—"}</p>
          {stopIsEarlier && <p className="text-body-sm text-neutral-400">Ends next day</p>}
        </div>

        <Card className="flex flex-col divide-y divide-neutral-800 p-0">
          <FieldRow label="Date" type="date" name="date" value={date} display={formatWallDate(date)} onChange={setDate} />
          <FieldRow label="Start" type="time" name="start" value={start} display={start || "—"} onChange={setStart} />
          <FieldRow
            label="Stop"
            type="time"
            name="stop"
            value={stop}
            display={stop || "—"}
            onChange={setStop}
            error={stopEqualsStart}
          />
        </Card>
        {stopEqualsStart && <p className="text-sm text-danger-400">Stop time must be after the start time.</p>}

        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={!start}
              onClick={() => applyPreset(preset.minutes)}
              className="h-9 rounded-sm border border-neutral-700 bg-transparent px-3 text-body-sm font-semibold text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-50 disabled:pointer-events-none disabled:opacity-40"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <p className="text-sm text-neutral-500">
          {mode === "new"
            ? mounted && formTimeZone
              ? `Times in ${formTimeZone}`
              : " "
            : `Times in ${timeZone}`}
        </p>

        {!state.ok && state.message && <FormError>{state.message}</FormError>}

        <BottomCta className="-mx-4 mt-2">
          <Button type="submit" fullWidth size="lg" pending={pending} disabled={!mounted}>
            {pending ? "Saving…" : mode === "new" ? "Save run" : "Save changes"}
          </Button>
        </BottomCta>
      </form>

      <ConfirmSheet
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        title="Discard changes?"
        description="Your edits haven't been saved."
        confirmLabel="Discard"
        confirmVariant="danger"
        onConfirm={() => router.push(closeHref)}
      />
    </div>
  );
}

function FieldRow({
  label,
  type,
  name,
  value,
  display,
  onChange,
  error,
}: {
  label: string;
  type: "date" | "time";
  name: string;
  value: string;
  display: string;
  onChange: (value: string) => void;
  error?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-14 items-center justify-between px-4",
        error && "border-l-2 border-danger-400 -ml-px",
      )}
    >
      <span className="text-body-sm text-neutral-400">{label}</span>
      <span className="font-mono text-[15px] text-neutral-50">{display}</span>
      <input
        type={type}
        name={name}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => (event.currentTarget as HTMLInputElement).showPicker?.()}
        className="absolute inset-0 h-full w-full cursor-pointer text-[16px] opacity-0 focus:outline-none"
      />
    </label>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Sheet } from "@/components/ui/sheet";
import { createRun, updateRun, deleteRun, type RunActionResult } from "./actions";
import { toIso, fromIso, addDays } from "@/lib/time/wall-time";
import { formatDuration } from "@/lib/time/format";
import { getDeviceTimeZone } from "@/lib/time/zone";

const INITIAL_STATE: RunActionResult = { ok: true, message: null };

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

export function RunForm({ mode, run }: RunFormProps) {
  const [mounted, setMounted] = useState(false);
  const [deviceTimeZone, setDeviceTimeZone] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const initial =
    mode === "edit" && run
      ? { date: fromIso(run.startedAt, run.timeZone).date, start: fromIso(run.startedAt, run.timeZone).time, stop: fromIso(run.endedAt, run.timeZone).time }
      : { date: "", start: "", stop: "" };

  const [date, setDate] = useState(initial.date);
  const [start, setStart] = useState(initial.start);
  const [stop, setStop] = useState(initial.stop);

  useEffect(() => {
    const tz = getDeviceTimeZone();
    setDeviceTimeZone(tz);
    if (mode === "new") {
      setDate(fromIso(new Date().toISOString(), tz).date);
    }
    setMounted(true);
    // Only ever needs to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeZone = mode === "edit" && run ? run.timeZone : (deviceTimeZone ?? "");

  const submitAction = async (_prevState: RunActionResult, formData: FormData): Promise<RunActionResult> => {
    const enteredDate = String(formData.get("date") ?? "");
    const enteredStart = String(formData.get("start") ?? "");
    const enteredStop = String(formData.get("stop") ?? "");
    const zone = mode === "edit" && run ? run.timeZone : getDeviceTimeZone();

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
  const [, deleteFormAction, deletePending] = useActionState(deleteRun, INITIAL_STATE);

  const stopEqualsStart = start !== "" && stop !== "" && start === stop;
  const stopIsEarlier = start !== "" && stop !== "" && !stopEqualsStart && stop < start;
  const durationText =
    start !== "" && stop !== "" && !stopEqualsStart ? formatDuration(minutesBetween(start, stop) * 60) : null;

  const handleDeleteConfirm = () => {
    if (!run) return;
    const formData = new FormData();
    formData.set("id", run.id);
    deleteFormAction(formData);
  };

  return (
    <div className="flex flex-col gap-6">
      <Button href="/running" variant="ghost" size="sm" className="self-start">
        ‹ Running
      </Button>

      <h1 className="text-h1 text-neutral-50">{mode === "new" ? "Add run" : "Edit run"}</h1>

      <form action={formAction} className="flex flex-col gap-5">
        <Input
          label="Date"
          type="date"
          name="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Input
          label="Start time"
          type="time"
          name="start"
          required
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
        <Input
          label="Stop time"
          type="time"
          name="stop"
          required
          value={stop}
          onChange={(event) => setStop(event.target.value)}
          error={stopEqualsStart ? "Stop time must be after the start time." : undefined}
        />

        <p aria-live="polite" className="font-mono text-body-sm text-neutral-300">
          {durationText ? `Duration ${durationText}` : " "}
          {stopIsEarlier && <span className="ml-2 text-neutral-400">Ends the next day</span>}
        </p>

        <p className="text-sm text-neutral-500">
          {mode === "new"
            ? mounted && deviceTimeZone
              ? `Times in ${deviceTimeZone} (this device)`
              : " "
            : `Times in ${timeZone}`}
        </p>

        {!state.ok && state.message && <FormError>{state.message}</FormError>}

        <Button type="submit" fullWidth size="lg" pending={pending} disabled={!mounted}>
          {pending ? "Saving…" : mode === "new" ? "Save run" : "Save changes"}
        </Button>
      </form>

      {mode === "edit" && run && (
        <>
          <Button
            variant="danger"
            fullWidth
            size="lg"
            className="mt-8"
            disabled={!mounted}
            onClick={() => setDeleteOpen(true)}
          >
            Delete run
          </Button>
          <Sheet
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            title="Delete this run?"
            description="This can't be undone."
            confirmLabel="Delete"
            confirmVariant="danger"
            onConfirm={handleDeleteConfirm}
            pending={deletePending}
          />
        </>
      )}
    </div>
  );
}

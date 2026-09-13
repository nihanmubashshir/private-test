"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Check, Trash2 } from "lucide-react";
import type { GymSession, SessionExercise, SetLog } from "@/lib/gym/session-types";
import { sessionSetCount, sessionVolume } from "@/lib/gym/session-types";
import { describeTargets } from "@/lib/gym/types";
import {
  deleteSet,
  discardSession,
  finishSession,
  logSet,
  type SessionActionResult,
} from "@/app/(app)/gym/session/actions";
import { StopwatchElapsed } from "@/components/stopwatch/stopwatch-elapsed";
import { SetInputs, describeSet, type SetValues } from "@/components/gym/set-inputs";
import { RestTimer } from "@/components/gym/rest-timer";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INITIAL: SessionActionResult = { ok: true, message: null };

export interface SessionScreenProps {
  session: GymSession;
  /** Last working set per exercise, from any past session — the prefill source. */
  lastSets: Record<string, SetLog>;
}

/** Prefill order: this session's last set for the exercise, then the plan target, then last time. */
function prefillFor(exercise: SessionExercise, lastSet: SetLog | undefined): SetValues {
  const source = exercise.sets[exercise.sets.length - 1] ?? lastSet ?? null;
  const values: SetValues = {};
  for (const field of exercise.tracks) {
    if (field === "reps") values.reps = String(source?.reps ?? exercise.targetReps ?? "");
    if (field === "weight") values.weight = String(source?.weight ?? exercise.targetWeight ?? "");
    if (field === "duration") values.duration = source?.durationS ? String(source.durationS) : "";
    if (field === "distance") values.distance = source?.distanceM ? String(source.distanceM) : "";
  }
  return values;
}

/**
 * The active session (US-011 §5).
 *
 * **No back chevron.** Leaving is Minimise, which returns to Home with the session still running —
 * a back button here would read as "cancel", and the mini bar is what brings you back.
 */
export function SessionScreen({ session, lastSets }: SessionScreenProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(session.exercises[0]?.workoutId ?? null);
  const [restSince, setRestSince] = useState<number | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const [logState, logAction, logPending] = useActionState(logSet, INITIAL);
  const [, deleteSetAction] = useActionState(deleteSet, INITIAL);
  const [finishState, finishAction, finishPending] = useActionState(finishSession, INITIAL);
  const [, discardAction] = useActionState(discardSession, INITIAL);

  const setCount = sessionSetCount(session.exercises);
  const volume = sessionVolume(session.exercises);
  const done = session.exercises.filter((exercise) => exercise.sets.length > 0).length;
  const untouched = session.exercises.length - done;

  useEffect(() => {
    if (!logState.ok && logState.message) toast.error(logState.message);
    if (logState.ok && logState.id) setRestSince(Date.now());
  }, [logState]);

  useEffect(() => {
    if (!finishState.ok && finishState.message) toast.error(finishState.message);
  }, [finishState]);

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-20 flex h-[calc(var(--spacing-app-bar)+env(safe-area-inset-top))] items-end gap-2 border-b border-neutral-800 bg-neutral-950 pb-1">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Minimise"
          className="flex size-tap shrink-0 items-center justify-center text-neutral-50 active:text-neutral-300"
        >
          <ChevronDown className="size-5" strokeWidth={1.75} aria-hidden />
        </button>
        <p className="flex-1 truncate text-center text-control font-semibold text-neutral-50">{session.name}</p>
        <div className="flex size-tap shrink-0 items-center justify-center">
          <Button
            type="button"
            size="sm"
            // Finishing with nothing logged would write an empty session, so it waits for a set.
            disabled={setCount === 0 || finishPending}
            onClick={() => (untouched > 0 ? setConfirmFinish(true) : submitFinish())}
          >
            Finish
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-4">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success-400" aria-hidden />
            <StopwatchElapsed startedAt={session.startedAt} size="display" />
          </div>
          <p className="font-mono text-[13px] text-neutral-500 tabular-nums">
            {setCount} {setCount === 1 ? "set" : "sets"}
            {volume > 0 && ` · ${Math.round(volume).toLocaleString("en-GB")} kg`}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {session.exercises.map((exercise) => (
            <ExerciseBlock
              key={exercise.workoutId}
              exercise={exercise}
              sessionId={session.id}
              lastSet={lastSets[exercise.workoutId]}
              expanded={expanded === exercise.workoutId}
              onExpand={() => setExpanded(expanded === exercise.workoutId ? null : exercise.workoutId)}
              onLog={logAction}
              logPending={logPending}
              onDeleteSet={(id) => {
                const form = new FormData();
                form.set("id", id);
                deleteSetAction(form);
              }}
            />
          ))}
          {session.exercises.length === 0 && (
            <p className="py-6 text-center text-body-sm text-neutral-500">
              This session has no exercises. Add some to the plan day, or finish and log it as time only.
            </p>
          )}
        </div>

        <Button type="button" variant="ghost" fullWidth onClick={() => setConfirmDiscard(true)}>
          Discard session
        </Button>
      </div>

      <RestTimer since={restSince} onSkip={() => setRestSince(null)} />

      <ConfirmSheet
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        title="Finish anyway?"
        description={`${untouched} ${untouched === 1 ? "exercise" : "exercises"} not started.`}
        confirmLabel="Finish"
        confirmVariant="primary"
        pending={finishPending}
        onConfirm={() => {
          setConfirmFinish(false);
          submitFinish();
        }}
      />

      <ConfirmSheet
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard this session?"
        description="Every set logged in it goes too. This can't be undone."
        confirmLabel="Discard"
        onConfirm={() => {
          const form = new FormData();
          form.set("id", session.id);
          discardAction(form);
        }}
      />
    </div>
  );

  function submitFinish() {
    const form = new FormData();
    form.set("id", session.id);
    // The client owns user-meaningful instants (overview §6.2); the server only sanity-checks.
    form.set("endedAt", new Date().toISOString());
    form.set("note", "");
    finishAction(form);
  }
}

function ExerciseBlock({
  exercise,
  sessionId,
  lastSet,
  expanded,
  onExpand,
  onLog,
  logPending,
  onDeleteSet,
}: {
  exercise: SessionExercise;
  sessionId: string;
  lastSet: SetLog | undefined;
  expanded: boolean;
  onExpand: () => void;
  onLog: (formData: FormData) => void;
  logPending: boolean;
  onDeleteSet: (id: string) => void;
}) {
  const [values, setValues] = useState<SetValues>(() => prefillFor(exercise, lastSet));
  const [warmup, setWarmup] = useState(false);

  const target = describeTargets(exercise);
  const complete = exercise.targetSets !== null && exercise.sets.length >= exercise.targetSets;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      <button type="button" onClick={onExpand} className="flex min-h-16 w-full items-center gap-3 px-4 text-left">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-control font-semibold text-neutral-50">{exercise.name}</span>
          {target && <span className="truncate font-mono text-xs text-neutral-500">{target}</span>}
        </span>
        <span
          className={cn(
            "shrink-0 font-mono text-control tabular-nums",
            complete ? "text-success-400" : exercise.sets.length > 0 ? "text-neutral-300" : "text-neutral-500",
          )}
        >
          {exercise.targetSets ? `${exercise.sets.length} / ${exercise.targetSets}` : exercise.sets.length}
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-neutral-800 p-4">
          {lastSet && <p className="font-mono text-xs text-neutral-500">Last: {describeSet(lastSet)}</p>}

          {exercise.sets.map((set) => (
            <div key={set.id} className="flex items-center gap-2 border-b border-neutral-800 pb-2">
              <span className="w-6 shrink-0 font-mono text-xs text-neutral-500">
                {set.isWarmup ? "W" : set.position}
              </span>
              <span className="flex-1 font-mono text-body-sm text-neutral-50">{describeSet(set)}</span>
              <Check className="size-4 shrink-0 text-success-400" strokeWidth={2} aria-hidden />
              <button
                type="button"
                onClick={() => onDeleteSet(set.id)}
                aria-label={`Delete set ${set.position}`}
                className="flex size-tap shrink-0 items-center justify-center text-neutral-500 active:text-danger-400"
              >
                <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          ))}

          <SetInputs tracks={exercise.tracks} values={values} onChange={setValues} />

          <label className="flex min-h-tap items-center justify-between gap-3">
            <span className="text-body-sm text-neutral-400">Warmup</span>
            <input
              type="checkbox"
              checked={warmup}
              onChange={(event) => setWarmup(event.target.checked)}
              className="size-6 accent-[var(--color-accent-500)]"
            />
          </label>

          <Button
            type="button"
            fullWidth
            size="lg"
            className="h-13"
            pending={logPending}
            onClick={() => {
              const form = new FormData();
              form.set("sessionId", sessionId);
              form.set("workoutId", exercise.workoutId);
              form.set("completedAt", new Date().toISOString());
              form.set("isWarmup", String(warmup));
              for (const field of exercise.tracks) form.set(fieldName(field), values[field] ?? "");
              onLog(form);
            }}
          >
            Log set {exercise.sets.length + 1}
          </Button>
        </div>
      )}
    </div>
  );
}

/** The form field each tracked field writes to; `duration`/`distance` carry their unit in the name. */
function fieldName(field: string): string {
  if (field === "duration") return "durationS";
  if (field === "distance") return "distanceM";
  return field;
}

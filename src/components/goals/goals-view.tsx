"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Target } from "lucide-react";
import { deleteGoal, setGoalStatus, type GoalActionResult } from "@/app/(app)/goals/actions";
import {
  SUBJECT_LABELS,
  computeProgress,
  type Goal,
  type GoalInputs,
  type GoalSubject,
  type Progress,
} from "@/lib/goals/types";
import type { Workout } from "@/lib/gym/types";
import { formatShortDate } from "@/lib/time/format";
import { useAppTimeZone } from "@/components/shell/app-time-zone";
import { GoalProgress } from "@/components/goals/goal-progress";
import { GoalSheet } from "@/components/goals/goal-sheet";
import { useAutoComplete } from "@/components/goals/use-auto-complete";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const INITIAL: GoalActionResult = { ok: true, message: null };

export interface GoalsViewProps {
  goals: Goal[];
  inputs: GoalInputs;
  workouts: Workout[];
  /** `?new=weight` from a subject's own screen opens the sheet with that subject picked. */
  initialSubject: GoalSubject | null;
  /** `?goal=<id>` from a Home row opens that goal's detail. */
  openGoalId: string | null;
}

function subjectLine(goal: Goal): string {
  const subject = goal.subject === "workout" ? (goal.workoutName ?? "Exercise") : SUBJECT_LABELS[goal.subject];
  return `${subject} · ${goal.kind === "target" ? "target" : "streak"}`;
}

/** The goals screen — also the archive for completed goals (US-012 §4, §5). */
export function GoalsView({ goals, inputs, workouts, initialSubject, openGoalId }: GoalsViewProps) {
  const timeZone = useAppTimeZone();
  const [newOpen, setNewOpen] = useState(initialSubject !== null);
  const [selectedId, setSelectedId] = useState<string | null>(openGoalId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [statusState, statusAction, statusPending] = useActionState(setGoalStatus, INITIAL);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteGoal, INITIAL);

  const progress = new Map<string, Progress>(
    timeZone ? goals.map((goal) => [goal.id, computeProgress(goal, inputs, timeZone)]) : [],
  );
  useAutoComplete(
    goals.map((goal) => ({ id: goal.id, status: goal.status, ratio: progress.get(goal.id)?.ratio ?? 0 })),
  );

  const setSelectedRef = useRef(setSelectedId);
  setSelectedRef.current = setSelectedId;

  // Keyed on the action state alone — see goal-sheet.tsx for why `open` must not be a dependency.
  useEffect(() => {
    if (!statusState.ok && statusState.message) toast.error(statusState.message);
    if (statusState.ok && statusState.id) setSelectedRef.current(null);
  }, [statusState]);

  useEffect(() => {
    if (!deleteState.ok && deleteState.message) toast.error(deleteState.message);
  }, [deleteState]);

  const ratio = (goal: Goal) => progress.get(goal.id)?.ratio ?? 0;
  // Nearest to paying off first (US-012 §5.1).
  const active = goals.filter((g) => g.status === "active").sort((a, b) => ratio(b) - ratio(a));
  const paused = goals.filter((g) => g.status === "paused");
  const completed = goals.filter((g) => g.status === "completed");
  const selected = goals.find((g) => g.id === selectedId) ?? null;

  return (
    <>
      {goals.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-neutral-800">
            <Target className="size-6 text-neutral-400" strokeWidth={1.75} aria-hidden />
          </span>
          <h2 className="text-h2 text-neutral-50">No goals yet</h2>
          <p className="max-w-xs text-body-sm text-neutral-400">
            Point at a number you want to reach, or a habit you want to keep. Progress comes from what you already log.
          </p>
        </div>
      ) : (
        <>
          <Section title="Active" goals={active} progress={progress} onSelect={setSelectedId} />
          <Section title="Paused" goals={paused} progress={progress} onSelect={setSelectedId} />
          <Section title="Completed" goals={completed} progress={progress} onSelect={setSelectedId} />
        </>
      )}

      <Button variant="secondary" fullWidth onClick={() => setNewOpen(true)}>
        <Plus className="size-5" strokeWidth={1.75} aria-hidden />
        New goal
      </Button>

      <GoalSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        workouts={workouts}
        existing={goals}
        initialSubject={initialSubject}
      />

      <EntrySheet open={selected !== null} onClose={() => setSelectedId(null)} title={selected?.label ?? "Goal"}>
        {selected && (
          <div className="flex flex-col gap-4">
            <p className="text-body-sm text-neutral-500">{subjectLine(selected)}</p>

            {progress.get(selected.id) ? (
              <>
                <p className="font-mono text-h2 text-neutral-50 tabular-nums">{progress.get(selected.id)!.text}</p>
                <GoalProgress progress={progress.get(selected.id)!} large done={selected.status === "completed"} />
              </>
            ) : (
              <Skeleton className="h-10 w-full" />
            )}

            {selected.status === "completed" && selected.completedAt && timeZone && (
              <p className="flex items-center gap-2 text-body-sm text-success-400">
                <Check className="size-4" strokeWidth={2} aria-hidden />
                Completed {formatShortDate(selected.completedAt, timeZone)}
              </p>
            )}

            {selected.status !== "completed" && (
              <form action={statusAction}>
                <input type="hidden" name="id" value={selected.id} />
                <input type="hidden" name="status" value={selected.status === "paused" ? "active" : "paused"} />
                <Button type="submit" variant="secondary" fullWidth pending={statusPending}>
                  {selected.status === "paused" ? "Resume" : "Pause"}
                </Button>
              </form>
            )}

            <Button type="button" variant="ghost" fullWidth onClick={() => setConfirmDelete(true)}>
              Delete goal
            </Button>
          </div>
        )}
      </EntrySheet>

      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this goal?"
        description="Only the goal goes. Everything you logged stays exactly as it is."
        confirmLabel="Delete"
        pending={deletePending}
        onConfirm={() => {
          if (!selected) return;
          const form = new FormData();
          form.set("id", selected.id);
          deleteAction(form);
          setConfirmDelete(false);
          setSelectedId(null);
        }}
      />
    </>
  );
}

function Section({
  title,
  goals,
  progress,
  onSelect,
}: {
  title: string;
  goals: Goal[];
  progress: Map<string, Progress>;
  onSelect: (id: string) => void;
}) {
  if (goals.length === 0) return null;
  return (
    <section className="flex flex-col">
      <h2 className="pb-2 font-mono text-[11px] tracking-[0.1em] text-neutral-500 uppercase">{title}</h2>
      {goals.map((goal) => {
        const p = progress.get(goal.id);
        const done = goal.status === "completed";
        return (
          <button
            key={goal.id}
            type="button"
            onClick={() => onSelect(goal.id)}
            className="flex min-h-16 flex-col justify-center gap-2 border-b border-neutral-800 py-3 text-left active:bg-surface-hover"
          >
            <span className="flex items-baseline gap-3">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {done && <Check className="size-4 shrink-0 text-success-400" strokeWidth={2} aria-hidden />}
                <span className="truncate text-control font-semibold text-neutral-50">{goal.label}</span>
              </span>
              <span className="shrink-0 font-mono text-body-sm text-neutral-400 tabular-nums">{p ? p.text : " "}</span>
            </span>
            {p ? <GoalProgress progress={p} done={done} /> : <Skeleton className="h-1.5 w-full rounded-full" />}
          </button>
        );
      })}
    </section>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { createGoal, type GoalActionResult } from "@/app/(app)/goals/actions";
import { SUBJECT_LABELS, type Goal, type GoalKind, type GoalSubject, type TargetMetric } from "@/lib/goals/types";
import type { Workout } from "@/lib/gym/types";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INITIAL: GoalActionResult = { ok: true, message: null };

const WINDOWS: { label: string; value: number | null }[] = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "In a row", value: null },
];

const METRICS: { label: string; value: TargetMetric }[] = [
  { label: "Heaviest set", value: "weight" },
  { label: "Most reps", value: "reps" },
  { label: "Best set volume", value: "volume" },
];

/** A target needs a single number to reach, which only weight and an exercise have (US-012 §3). */
const TARGET_SUBJECTS: GoalSubject[] = ["weight", "workout"];
const ALL_SUBJECTS: GoalSubject[] = ["weight", "running", "gym", "workout"];

export interface GoalSheetProps {
  open: boolean;
  onClose: () => void;
  workouts: Workout[];
  /** For the soft "you already have one" warning — never a block (US-012 §4). */
  existing: Goal[];
  initialSubject?: GoalSubject | null;
}

/** Create a goal (US-012 §5.3). */
export function GoalSheet({ open, onClose, workouts, existing, initialSubject = null }: GoalSheetProps) {
  const [kind, setKind] = useState<GoalKind>("target");
  const [subject, setSubject] = useState<GoalSubject>("weight");
  const [workoutId, setWorkoutId] = useState("");
  const [label, setLabel] = useState("");
  const [labelEdited, setLabelEdited] = useState(false);
  const [targetValue, setTargetValue] = useState("");
  const [metric, setMetric] = useState<TargetMetric>("weight");
  const [count, setCount] = useState(5);
  const [windowDays, setWindowDays] = useState<number | null>(7);
  const [state, formAction, pending] = useActionState(createGoal, INITIAL);

  // Held in a ref so the success effect can depend on `state` alone.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      const start = initialSubject ?? "weight";
      setSubject(start);
      // Running and gym only make sense as streaks.
      setKind(TARGET_SUBJECTS.includes(start) ? "target" : "streak");
      setWorkoutId("");
      setLabel("");
      setLabelEdited(false);
      setTargetValue("");
      setMetric("weight");
      setCount(5);
      setWindowDays(7);
    }
    wasOpen.current = open;
  }, [open, initialSubject]);

  // Depends on `state` only: a new state object means an action just finished. Depending on `open`
  // too would re-run this on the next open with the *previous* success still in state, and close
  // the sheet the moment it appears.
  useEffect(() => {
    if (!state.ok || !state.id) return;
    toast.success("Goal added");
    onCloseRef.current();
  }, [state]);

  const workoutName = workouts.find((w) => w.id === workoutId)?.name ?? null;
  const subjectName = subject === "workout" ? (workoutName ?? "Exercise") : SUBJECT_LABELS[subject];

  // A sensible default name until the owner types their own.
  const suggested =
    kind === "target"
      ? `${subjectName} ${targetValue || "…"}${subject === "workout" && metric === "reps" ? " reps" : " kg"}`
      : `${subjectName} ${count} ${windowDays === null ? "days in a row" : `of ${windowDays} days`}`;
  const effectiveLabel = labelEdited ? label : suggested;

  const duplicate = existing.some(
    (goal) =>
      goal.status === "active" &&
      goal.kind === kind &&
      goal.subject === subject &&
      (subject !== "workout" || goal.workoutId === workoutId),
  );

  const subjects = kind === "target" ? TARGET_SUBJECTS : ALL_SUBJECTS;
  const maxCount = windowDays ?? 365;

  const inputClass =
    "min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600";

  const canSave =
    effectiveLabel.trim() !== "" &&
    (subject !== "workout" || workoutId !== "") &&
    (kind === "streak" || Number(targetValue) > 0);

  return (
    <EntrySheet open={open} onClose={onClose} title="New goal">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="subject" value={subject} />
        <input type="hidden" name="workoutId" value={subject === "workout" ? workoutId : ""} />
        <input type="hidden" name="label" value={effectiveLabel} />
        <input type="hidden" name="targetValue" value={kind === "target" ? targetValue : ""} />
        <input type="hidden" name="targetMetric" value={kind === "target" && subject === "workout" ? metric : ""} />
        <input type="hidden" name="targetCount" value={kind === "streak" ? count : ""} />
        <input type="hidden" name="windowDays" value={kind === "streak" && windowDays !== null ? windowDays : ""} />

        <Segmented
          label="Kind"
          options={[
            { label: "Reach a number", value: "target" },
            { label: "Keep a streak", value: "streak" },
          ]}
          value={kind}
          onChange={(next) => {
            setKind(next);
            if (next === "target" && !TARGET_SUBJECTS.includes(subject)) setSubject("weight");
          }}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">For</span>
          <select value={subject} onChange={(e) => setSubject(e.target.value as GoalSubject)} className={inputClass}>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {SUBJECT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        {subject === "workout" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm text-neutral-400">Exercise</span>
            <select value={workoutId} onChange={(e) => setWorkoutId(e.target.value)} className={inputClass}>
              <option value="">Choose…</option>
              {workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {kind === "target" ? (
          <>
            {subject === "workout" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-body-sm text-neutral-400">Measured by</span>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as TargetMetric)}
                  className={inputClass}
                >
                  {METRICS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-neutral-400">
                Target {subject === "workout" && metric === "reps" ? "(reps)" : "(kg)"}
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder={subject === "weight" ? "78" : "180"}
                className={inputClass}
              />
            </label>
            {subject === "weight" && (
              <p className="text-xs text-neutral-500">
                Your latest reading is taken as the starting point, so losing weight fills the bar too.
              </p>
            )}
          </>
        ) : (
          <>
            <Segmented
              label="Window"
              options={WINDOWS.map((w) => ({ label: w.label, value: String(w.value) }))}
              value={String(windowDays)}
              onChange={(next) => {
                const value = next === "null" ? null : Number(next);
                setWindowDays(value);
                if (value !== null && count > value) setCount(value);
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-sm text-neutral-400">Days</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="Fewer days"
                  onClick={() => setCount((n) => Math.max(1, n - 1))}
                >
                  <Minus className="size-4" strokeWidth={2} aria-hidden />
                </Button>
                <span className="w-10 text-center font-mono text-control text-neutral-50 tabular-nums">{count}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="More days"
                  onClick={() => setCount((n) => Math.min(maxCount, n + 1))}
                >
                  <Plus className="size-4" strokeWidth={2} aria-hidden />
                </Button>
              </div>
            </div>
          </>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Name</span>
          <input
            value={effectiveLabel}
            onChange={(e) => {
              setLabel(e.target.value);
              setLabelEdited(true);
            }}
            maxLength={60}
            className={inputClass}
          />
        </label>

        {duplicate && (
          <p className="text-body-sm text-warning-400">
            You already have an active goal like this. Two can be confusing, but it&apos;s allowed.
          </p>
        )}

        {!state.ok && state.message && <FormError>{state.message}</FormError>}

        <Button type="submit" fullWidth size="lg" className="mt-1 h-13" pending={pending} disabled={!canSave}>
          Add goal
        </Button>
      </form>
    </EntrySheet>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-md border border-neutral-800 bg-neutral-900 p-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-9 flex-1 rounded-sm text-body-sm",
            // Segmented controls are never gold (01-design-system.md §10.2).
            option.value === value ? "bg-neutral-800 text-neutral-50" : "text-neutral-400 active:text-neutral-50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

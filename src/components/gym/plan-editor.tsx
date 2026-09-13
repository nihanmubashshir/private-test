"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Dumbbell, Plus, Trash2 } from "lucide-react";
import {
  addPlanItem,
  removePlanItem,
  reorderPlanItems,
  updatePlanDay,
  updatePlanItem,
  type GymActionResult,
} from "@/app/(app)/gym/actions";
import { WEEKDAY_LABELS, describeTargets, weekdayInZone, type Plan, type Workout } from "@/lib/gym/types";
import { estimateMinutes } from "@/lib/gym/summary";
import { useAppTimeZone } from "@/components/shell/app-time-zone";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { WorkoutPicker } from "@/components/gym/workout-picker";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const INITIAL: GymActionResult = { ok: true, message: null };

export interface PlanEditorProps {
  plan: Plan;
  workouts: Workout[];
}

/**
 * The weekly plan editor (US-010 §5.3).
 *
 * Every edit saves immediately — there is no Save button and no dirty state, because a weekly plan
 * is a list of small independent facts, not a form with a single commit.
 */
export function PlanEditor({ plan, workouts }: PlanEditorProps) {
  const timeZone = useAppTimeZone();
  const [selected, setSelected] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const [, dayAction] = useActionState(updatePlanDay, INITIAL);
  const [addState, addAction, addPending] = useActionState(addPlanItem, INITIAL);
  const [removeState, removeAction, removePending] = useActionState(removePlanItem, INITIAL);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [, reorderAction, reorderPending] = useActionState(reorderPlanItems, INITIAL);
  const [targetState, targetAction, targetPending] = useActionState(updatePlanItem, INITIAL);

  // Open on today, which is the day the owner almost always wants.
  useEffect(() => {
    if (timeZone) setSelected(weekdayInZone(timeZone));
  }, [timeZone]);

  useEffect(() => {
    if (!addState.ok && addState.message) toast.error(addState.message);
  }, [addState]);

  useEffect(() => {
    if (!removeState.ok && removeState.message) {
      toast.error(removeState.message);
      setRemovingItemId(null);
    }
  }, [removeState]);

  useEffect(() => {
    if (targetState.ok && targetState.id) setEditingItem(null);
  }, [targetState]);

  const day = plan.days.find((d) => d.weekday === selected) ?? plan.days[0];
  if (!day) return null;

  const today = timeZone ? weekdayInZone(timeZone) : -1;
  const plannedSets = day.items.reduce((total, item) => total + (item.targetSets ?? 0), 0);
  const minutes = estimateMinutes(plannedSets);

  const submitDay = (patch: { name?: string; isRest?: boolean }) => {
    const form = new FormData();
    form.set("id", day.id);
    form.set("name", patch.name ?? day.name ?? "");
    form.set("isRest", String(patch.isRest ?? day.isRest));
    dayAction(form);
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...day.items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const form = new FormData();
    for (const item of next) form.append("ids", item.id);
    reorderAction(form);
  };

  const alreadyAdded = new Set(day.items.map((item) => item.workoutId));
  const editing = day.items.find((item) => item.id === editingItem) ?? null;

  return (
    <>
      {/* Horizontally scrollable so seven pills never overflow at 320px (US-010 AC 17). */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Weekday">
        {plan.days.map((d) => (
          <button
            key={d.weekday}
            type="button"
            role="tab"
            aria-selected={d.weekday === selected}
            onClick={() => setSelected(d.weekday)}
            className={cn(
              "flex min-h-tap shrink-0 flex-col items-center justify-center rounded-full px-4 text-control",
              d.weekday === selected ? "bg-neutral-800 text-neutral-50" : "text-neutral-400",
              d.weekday === today && d.weekday !== selected && "ring-1 ring-accent-700",
            )}
          >
            {WEEKDAY_LABELS[d.weekday]}
            <span
              className={cn("mt-0.5 size-1 rounded-full", !d.isRest ? "bg-accent-500" : "bg-transparent")}
              aria-hidden
            />
          </button>
        ))}
      </div>

      {/* Uncontrolled + commit on blur. Controlled-with-onChange fired a Server Action per
          keystroke, so naming a day sent one write per character. `key` remounts it when the
          selected day changes, since defaultValue alone would keep the previous day's name. */}
      <input
        key={day.id}
        defaultValue={day.name ?? ""}
        onBlur={(event) => {
          if (event.target.value !== (day.name ?? "")) submitDay({ name: event.target.value });
        }}
        placeholder="Name this day"
        aria-label="Day name"
        maxLength={60}
        className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600"
      />

      <label className="flex min-h-tap items-center justify-between gap-3">
        <span className="text-body-sm text-neutral-300">Rest day</span>
        <input
          type="checkbox"
          checked={day.isRest}
          onChange={(event) => submitDay({ isRest: event.target.checked })}
          className="size-6 accent-[var(--color-accent-500)]"
        />
      </label>

      {/* Exercises are kept when a day is toggled to rest, just greyed and hidden from Home. */}
      <div className={cn("flex flex-col", day.isRest && "opacity-50")}>
        {day.items.map((item, index) => {
          const removing = removingItemId === item.id;
          // Positions are mid-write during either action, so every row's move/remove holds off.
          const rowBusy = reorderPending || removePending;
          return (
            <div
              key={item.id}
              className={cn("flex min-h-16 items-center gap-2 border-b border-neutral-800", removing && "opacity-50")}
            >
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-800">
                <Dumbbell className="size-4 text-neutral-300" strokeWidth={1.75} />
              </span>
              <button
                type="button"
                onClick={() => setEditingItem(item.id)}
                className="flex min-w-0 flex-1 flex-col gap-0.5 py-2 text-left"
              >
                <span className="truncate text-control font-semibold text-neutral-50">{item.workoutName}</span>
                <span className="truncate font-mono text-[13px] text-neutral-500">
                  {describeTargets(item) || "No targets"}
                </span>
              </button>
              {/* Buttons, not drag: a drag handle competes with the week strip's horizontal scroll
                  and the page's vertical scroll, and loses to both on a phone. */}
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0 || rowBusy}
                aria-label={`Move ${item.workoutName} up`}
                className="flex size-tap shrink-0 items-center justify-center text-neutral-500 disabled:opacity-30"
              >
                <ChevronUp className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === day.items.length - 1 || rowBusy}
                aria-label={`Move ${item.workoutName} down`}
                className="flex size-tap shrink-0 items-center justify-center text-neutral-500 disabled:opacity-30"
              >
                <ChevronDown className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemovingItemId(item.id);
                  const form = new FormData();
                  form.set("id", item.id);
                  removeAction(form);
                }}
                disabled={rowBusy}
                aria-label={`Remove ${item.workoutName}`}
                className="flex size-tap shrink-0 items-center justify-center text-neutral-500 active:text-danger-400 disabled:pointer-events-none disabled:opacity-30"
              >
                {removing ? <Spinner size={16} /> : <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />}
              </button>
            </div>
          );
        })}
      </div>

      <Button variant="secondary" fullWidth onClick={() => setPickerOpen(true)}>
        <Plus className="size-5" strokeWidth={1.75} aria-hidden />
        Add exercise
      </Button>

      <p className="text-center text-body-sm text-neutral-500">
        {day.items.length} {day.items.length === 1 ? "exercise" : "exercises"}
        {plannedSets > 0 && ` · ${plannedSets} sets planned`}
        {minutes && ` · about ${minutes} min`}
      </p>

      <EntrySheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add exercise" cancelLabel="Done" tall>
        <WorkoutPicker
          workouts={workouts}
          disabledIds={alreadyAdded}
          pending={addPending}
          onPick={(workoutId) => {
            const form = new FormData();
            form.set("planDayId", day.id);
            form.set("workoutId", workoutId);
            addAction(form);
          }}
        />
      </EntrySheet>

      <EntrySheet
        open={editing !== null}
        onClose={() => setEditingItem(null)}
        title={editing?.workoutName ?? "Targets"}
      >
        {editing && (
          <form action={targetAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={editing.id} />
            <TargetField label="Sets" name="targetSets" defaultValue={editing.targetSets} />
            <TargetField label="Reps" name="targetReps" defaultValue={editing.targetReps} />
            <TargetField label="Weight (kg)" name="targetWeight" defaultValue={editing.targetWeight} step="0.5" />
            <p className="text-xs text-neutral-500">Targets are optional — an exercise with none logs freely.</p>
            <Button type="submit" fullWidth size="lg" className="mt-1 h-13" pending={targetPending}>
              Save targets
            </Button>
          </form>
        )}
      </EntrySheet>
    </>
  );
}

function TargetField({
  label,
  name,
  defaultValue,
  step,
}: {
  label: string;
  name: string;
  defaultValue: number | null;
  step?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-body-sm text-neutral-400">{label}</span>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue ?? ""}
        step={step}
        inputMode="decimal"
        className="min-h-tap w-28 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-right text-base text-neutral-50"
      />
    </label>
  );
}

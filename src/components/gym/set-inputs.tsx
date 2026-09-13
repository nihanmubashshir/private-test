"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { TrackedField } from "@/lib/gym/types";
import { INTEGER_RULES, LARGE_INTEGER_RULES, LOAD_RULES, isComplete, type KeypadRules } from "@/lib/weight/keypad";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { Keypad } from "@/components/ui/keypad";
import { Button } from "@/components/ui/button";

export type SetValues = Partial<Record<TrackedField, string>>;

interface FieldSpec {
  label: string;
  unit: string;
  rules: KeypadRules;
  /** Tap step, and the long-press step for a coarser jump. */
  step: number;
  coarseStep: number;
  decimals: number;
}

/**
 * How each tracked field steps and formats. One table rather than a branch per field, so a new
 * tracked field is a row here and nothing else (US-010 §3).
 */
const FIELDS: Record<TrackedField, FieldSpec> = {
  reps: { label: "Reps", unit: "", rules: INTEGER_RULES, step: 1, coarseStep: 5, decimals: 0 },
  weight: { label: "Weight", unit: "kg", rules: LOAD_RULES, step: 0.5, coarseStep: 2.5, decimals: 1 },
  duration: { label: "Duration", unit: "s", rules: LARGE_INTEGER_RULES, step: 15, coarseStep: 60, decimals: 0 },
  distance: { label: "Distance", unit: "m", rules: LARGE_INTEGER_RULES, step: 50, coarseStep: 250, decimals: 0 },
};

function format(value: number, decimals: number): string {
  return decimals === 0 ? String(Math.round(value)) : String(Number(value.toFixed(decimals)));
}

export interface SetInputsProps {
  tracks: TrackedField[];
  values: SetValues;
  onChange: (next: SetValues) => void;
}

/**
 * The next set's inputs, generated from the exercise's `tracks` (US-011 §5.3).
 *
 * No OS keyboard anywhere: steppers for the common adjustment, and a tap on the number opens the
 * keypad sheet for a jump. Mid-set with one hand free, a keyboard covering half the screen is the
 * worst possible control.
 */
export function SetInputs({ tracks, values, onChange }: SetInputsProps) {
  const [editing, setEditing] = useState<TrackedField | null>(null);
  const [draft, setDraft] = useState("");

  const set = (field: TrackedField, value: string) => onChange({ ...values, [field]: value });

  const bump = (field: TrackedField, direction: 1 | -1, coarse: boolean) => {
    const spec = FIELDS[field];
    const step = coarse ? spec.coarseStep : spec.step;
    const current = Number(values[field] ?? "0");
    const next = Math.max(0, (Number.isFinite(current) ? current : 0) + direction * step);
    set(field, next === 0 ? "" : format(next, spec.decimals));
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        {tracks.map((field) => {
          const spec = FIELDS[field];
          const value = values[field] ?? "";
          return (
            <div key={field} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-body-sm text-neutral-400">{spec.label}</span>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={`Decrease ${spec.label.toLowerCase()}`}
                onClick={() => bump(field, -1, false)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  bump(field, -1, true);
                }}
              >
                <Minus className="size-4" strokeWidth={2} aria-hidden />
              </Button>
              <button
                type="button"
                onClick={() => {
                  setDraft(value);
                  setEditing(field);
                }}
                aria-label={`${spec.label}, tap to type`}
                className="min-h-tap flex-1 rounded-md border border-neutral-800 bg-neutral-950 font-mono text-control text-neutral-50 tabular-nums active:bg-surface-hover"
              >
                {value === "" ? <span className="text-neutral-600">—</span> : value}
                {value !== "" && spec.unit && <span className="text-neutral-500"> {spec.unit}</span>}
              </button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={`Increase ${spec.label.toLowerCase()}`}
                onClick={() => bump(field, 1, false)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  bump(field, 1, true);
                }}
              >
                <Plus className="size-4" strokeWidth={2} aria-hidden />
              </Button>
            </div>
          );
        })}
      </div>

      <EntrySheet open={editing !== null} onClose={() => setEditing(null)} title={editing ? FIELDS[editing].label : ""}>
        {editing && (
          <div className="flex flex-col gap-4">
            <p className="py-2 text-center font-mono text-5xl text-neutral-50 tabular-nums">
              {draft === "" ? <span className="text-neutral-600">0</span> : draft}
              {FIELDS[editing].unit && <span className="text-control text-neutral-400"> {FIELDS[editing].unit}</span>}
            </p>
            <Keypad value={draft} onChange={setDraft} rules={FIELDS[editing].rules} />
            <Button
              fullWidth
              size="lg"
              className="mt-1 h-13"
              disabled={!isComplete(draft, FIELDS[editing].rules)}
              onClick={() => {
                set(editing, draft);
                setEditing(null);
              }}
            >
              Done
            </Button>
          </div>
        )}
      </EntrySheet>
    </>
  );
}

/** `8 × 100 kg`, `45 s`, `3 × 8` — whatever the set actually recorded. */
export function describeSet(set: {
  reps: number | null;
  weight: number | null;
  durationS: number | null;
  distanceM: number | null;
}): string {
  const parts: string[] = [];
  if (set.reps !== null && set.weight !== null) parts.push(`${set.reps} × ${format(set.weight, 1)} kg`);
  else if (set.reps !== null) parts.push(`${set.reps} reps`);
  else if (set.weight !== null) parts.push(`${format(set.weight, 1)} kg`);
  if (set.durationS !== null) parts.push(`${set.durationS}s`);
  if (set.distanceM !== null) parts.push(`${set.distanceM}m`);
  return parts.join(" · ");
}

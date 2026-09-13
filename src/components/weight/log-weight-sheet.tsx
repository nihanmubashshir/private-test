"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { createWeighIn, updateWeighIn, type WeightActionResult } from "@/app/(app)/weight/actions";
import { MIN_KG, MAX_KG } from "@/lib/weight/limits";
import type { WeighIn } from "@/lib/weight/queries";
import { useAppTimeZone, useWriteTimeZone } from "@/components/shell/app-time-zone";
import { fromIso, toIso } from "@/lib/time/wall-time";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { Keypad } from "@/components/ui/keypad";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";
import { isComplete, parseValue } from "@/lib/weight/keypad";

const INITIAL: WeightActionResult = { ok: true, message: null };

export interface LogWeightSheetProps {
  open: boolean;
  onClose: () => void;
  /** The previous reading, shown as a placeholder so Save with no input is never a re-log. */
  lastValueKg?: number | null;
  /** Present when editing rather than creating. */
  editing?: WeighIn | null;
}

/**
 * Log or edit a weight (US-009 §5.2).
 *
 * The value starts **empty with the last reading as a placeholder**, not prefilled: a prefilled
 * field plus a Save button is a one-tap way to silently re-log yesterday's number, which then
 * looks like a real reading forever.
 */
export function LogWeightSheet({ open, onClose, lastValueKg, editing }: LogWeightSheetProps) {
  const appTimeZone = useAppTimeZone();
  const writeTimeZone = useWriteTimeZone();
  const [value, setValue] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [state, formAction, pending] = useActionState(editing ? updateWeighIn : createWeighIn, INITIAL);

  // Reset to a clean sheet (or the reading being edited) every time it opens.
  useEffect(() => {
    if (!open) return;
    const zone = appTimeZone ?? writeTimeZone();
    const wall = fromIso(editing?.measuredAt ?? new Date().toISOString(), zone);
    setValue(editing ? String(editing.valueKg) : "");
    setDate(wall.date);
    setTime(wall.time);
    setNote(editing?.note ?? "");
    setShowNote(Boolean(editing?.note));
  }, [open, editing, appTimeZone, writeTimeZone]);

  // The action returns an id only on a successful write, which is what distinguishes a real
  // success from the untouched initial state.
  useEffect(() => {
    if (!open || !state.ok || !state.id) return;
    toast.success(editing ? "Reading updated" : "Weight logged");
    onClose();
  }, [state, open, editing, onClose]);

  const parsed = parseValue(value);
  const outOfRange = parsed !== null && (parsed < MIN_KG || parsed > MAX_KG);
  const canSave = isComplete(value) && !outOfRange;

  const zone = appTimeZone ?? "";
  const measuredAt = date && time && zone ? toIso({ date, time, timeZone: zone }) : "";

  return (
    <EntrySheet open={open} onClose={onClose} title={editing ? "Edit reading" : "Log weight"}>
      <form action={formAction} className="flex flex-col gap-4">
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <input type="hidden" name="measuredAt" value={measuredAt} />
        <input type="hidden" name="timeZone" value={zone} />
        <input type="hidden" name="valueKg" value={value} />
        <input type="hidden" name="note" value={showNote ? note : ""} />

        <div className="flex items-baseline justify-center gap-2 py-2" aria-live="polite">
          {value === "" ? (
            <span className="font-mono text-5xl text-neutral-600 tabular-nums">
              {lastValueKg !== null && lastValueKg !== undefined ? lastValueKg.toFixed(1) : "0.0"}
            </span>
          ) : (
            <span className="font-mono text-5xl text-neutral-50 tabular-nums">{value}</span>
          )}
          <span className="text-control text-neutral-400">kg</span>
        </div>

        {outOfRange && (
          <p className="text-center text-body-sm text-warning-400">
            Weight must be between {MIN_KG} and {MAX_KG} kg.
          </p>
        )}

        <Keypad value={value} onChange={setValue} />

        <div className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Date"
            className="min-h-tap flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50"
          />
          <input
            type="time"
            name="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-label="Time"
            className="min-h-tap w-32 rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50"
          />
        </div>

        {showNote ? (
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={140}
            placeholder="After gym"
            aria-label="Note"
            className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600"
          />
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowNote(true)}>
            Add note
          </Button>
        )}

        {!state.ok && state.message && <FormError>{state.message}</FormError>}

        <Button type="submit" fullWidth size="lg" className="h-13" disabled={!canSave || !measuredAt} pending={pending}>
          Save
        </Button>
      </form>
    </EntrySheet>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { WeighIn } from "@/lib/weight/queries";
import { createWeighIn, deleteWeighIn } from "@/app/(app)/weight/actions";
import { useAppTimeZone } from "@/components/shell/app-time-zone";
import { formatShortDate, formatTime } from "@/lib/time/format";

export interface WeighInRowProps {
  reading: WeighIn;
  /** The next-older reading, for the day-over-day delta. */
  previous: WeighIn | null;
  onEdit: () => void;
}

/**
 * One reading (US-009 §5.3).
 *
 * Delete is optimistic with an Undo toast rather than a confirm sheet: the row vanishes
 * immediately, and the recovery is one tap for five seconds. A confirm on every delete would cost
 * a tap every time to guard against a mistake that is trivially reversible.
 *
 * Undo re-creates rather than un-deletes, so the restored row has a new id. That is invisible here
 * — nothing references a reading by id — and it avoids a soft-delete column that every query would
 * then have to filter on forever.
 */
export function WeighInRow({ reading, previous, onEdit }: WeighInRowProps) {
  const timeZone = useAppTimeZone();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [removed, setRemoved] = useState(false);

  const delta = previous ? reading.valueKg - previous.valueKg : null;

  const restore = () => {
    const form = new FormData();
    form.set("measuredAt", reading.measuredAt);
    form.set("timeZone", reading.timeZone);
    form.set("valueKg", String(reading.valueKg));
    form.set("note", reading.note ?? "");
    startTransition(async () => {
      const result = await createWeighIn({ ok: true, message: null }, form);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't restore that reading.");
        return;
      }
      setRemoved(false);
      router.refresh();
    });
  };

  const remove = () => {
    setRemoved(true);
    const form = new FormData();
    form.set("id", reading.id);
    startTransition(async () => {
      const result = await deleteWeighIn({ ok: true, message: null }, form);
      if (!result.ok) {
        setRemoved(false);
        toast.error(result.message ?? "Couldn't delete that reading.");
        return;
      }
      toast.success("Reading deleted", { action: { label: "Undo", onClick: restore }, duration: 5000 });
      router.refresh();
    });
  };

  if (removed) return null;

  return (
    <div className="flex min-h-14 items-center gap-2 border-b border-neutral-800">
      <button
        type="button"
        onClick={onEdit}
        className="-mx-2 flex flex-1 items-center gap-3 px-2 py-2 text-left active:bg-surface-hover"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-body-sm text-neutral-50">
            {timeZone ? formatShortDate(reading.measuredAt, timeZone) : " "}
          </span>
          <span className="font-mono text-[13px] text-neutral-500">
            {timeZone ? formatTime(reading.measuredAt, timeZone) : " "}
            {reading.note && ` · ${reading.note}`}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="font-mono text-control text-neutral-50 tabular-nums">{reading.valueKg.toFixed(1)}</span>
          {delta !== null && (
            <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={remove}
        aria-label={`Delete reading of ${reading.valueKg.toFixed(1)} kilograms`}
        className="flex size-tap shrink-0 items-center justify-center text-neutral-500 active:text-danger-400"
      >
        <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}

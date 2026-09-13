"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { logPrayer, clearPrayer, type PrayerActionResult } from "@/app/(app)/prayers/actions";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { Button } from "@/components/ui/button";
import { WAQT_LABELS, STATUS_LABELS, type PrayerLog, type PrayerStatus, type Waqt } from "@/lib/prayers/types";

const STATUSES: PrayerStatus[] = ["mosque", "home", "qadha"];
const EMPTY: PrayerActionResult = { ok: true, message: null };

export interface LogPrayerSheetProps {
  open: boolean;
  onClose: () => void;
  waqt: Waqt;
  prayerDate: string;
  timeZone: string;
  existing: PrayerLog | null;
}

/**
 * Mark a waqt Mosque / Home / Qadha (US-015). A picker-style sheet — each button saves as you tap,
 * matching `EntrySheet`'s "omit submitLabel for pickers" contract.
 */
export function LogPrayerSheet({ open, onClose, waqt, prayerDate, timeZone, existing }: LogPrayerSheetProps) {
  const [pending, startTransition] = useTransition();

  const save = (status: PrayerStatus) => {
    const form = new FormData();
    form.set("waqt", waqt);
    form.set("status", status);
    form.set("prayedAt", new Date().toISOString());
    form.set("timeZone", timeZone);
    form.set("prayerDate", prayerDate);
    startTransition(async () => {
      const result = await logPrayer(EMPTY, form);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't save that prayer.");
        return;
      }
      toast.success(`${WAQT_LABELS[waqt]} logged — ${STATUS_LABELS[status]}`);
      onClose();
    });
  };

  const clear = () => {
    const form = new FormData();
    form.set("waqt", waqt);
    form.set("prayerDate", prayerDate);
    startTransition(async () => {
      const result = await clearPrayer(EMPTY, form);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't clear that prayer.");
        return;
      }
      toast.success(`${WAQT_LABELS[waqt]} cleared`);
      onClose();
    });
  };

  return (
    <EntrySheet open={open} onClose={onClose} title={WAQT_LABELS[waqt]}>
      <div className="flex flex-col gap-2">
        {STATUSES.map((status) => (
          <Button
            key={status}
            type="button"
            variant={existing?.status === status ? "primary" : "secondary"}
            size="lg"
            fullWidth
            className="h-13 justify-center"
            disabled={pending}
            onClick={() => save(status)}
          >
            {STATUS_LABELS[status]}
          </Button>
        ))}
        {existing && (
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={clear} className="mt-1 self-center">
            Clear
          </Button>
        )}
      </div>
    </EntrySheet>
  );
}

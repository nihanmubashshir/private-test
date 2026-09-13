"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { finishReadingSession, type ReadingActionResult } from "@/app/(app)/reading/actions";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";

const INITIAL: ReadingActionResult = { ok: true, message: null };

export interface FinishSessionSheetProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  startPage: number;
  totalPages: number;
}

/** Stops the running session and records the page reached (US-016 §5). */
export function FinishSessionSheet({ open, onClose, sessionId, startPage, totalPages }: FinishSessionSheetProps) {
  const [page, setPage] = useState(String(startPage));
  const [state, formAction, pending] = useActionState(finishReadingSession, INITIAL);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) setPage(String(startPage));
    wasOpen.current = open;
  }, [open, startPage]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!state.ok || !state.id) return;
    toast.success("Reading session saved");
    onCloseRef.current();
  }, [state]);

  const pageNumber = Number(page);
  const canSave = Number.isInteger(pageNumber) && pageNumber >= startPage && pageNumber <= totalPages;

  return (
    <EntrySheet open={open} onClose={onClose} title="Finish reading">
      <form
        action={formAction}
        // Stamped at submit time — the sheet can sit open a while before Save is tapped.
        onSubmit={(event) => {
          const input = event.currentTarget.elements.namedItem("endedAt") as HTMLInputElement;
          input.value = new Date().toISOString();
        }}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="id" value={sessionId} />
        <input type="hidden" name="endedAt" />
        <input type="hidden" name="endPage" value={page} />

        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Page you reached</span>
          <input
            type="number"
            inputMode="numeric"
            min={startPage}
            max={totalPages}
            value={page}
            onChange={(event) => setPage(event.target.value)}
            className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50"
          />
        </label>
        <p className="text-xs text-neutral-500">
          Started at page {startPage}. Must be between {startPage} and {totalPages}.
        </p>

        {!state.ok && state.message && <FormError>{state.message}</FormError>}

        <Button type="submit" fullWidth size="lg" className="mt-1 h-13" disabled={!canSave} pending={pending}>
          Save
        </Button>
      </form>
    </EntrySheet>
  );
}

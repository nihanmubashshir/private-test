"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { bumpPage, type ReadingActionResult } from "@/app/(app)/reading/actions";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";

const INITIAL: ReadingActionResult = { ok: true, message: null };

export interface BumpPageSheetProps {
  open: boolean;
  onClose: () => void;
  bookId: string;
  pagesRead: number;
  totalPages: number;
}

/** Pages read without timing them — not every stretch of reading has a timer (US-016 §2). */
export function BumpPageSheet({ open, onClose, bookId, pagesRead, totalPages }: BumpPageSheetProps) {
  const [pages, setPages] = useState("");
  const [state, formAction, pending] = useActionState(bumpPage, INITIAL);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) setPages("");
    wasOpen.current = open;
  }, [open]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!state.ok || !state.id) return;
    toast.success("Pages added");
    onCloseRef.current();
  }, [state]);

  const remaining = totalPages - pagesRead;
  const count = Number(pages);
  const canSave = Number.isInteger(count) && count > 0 && count <= remaining;

  return (
    <EntrySheet open={open} onClose={onClose} title="Add pages read">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="bookId" value={bookId} />
        <input type="hidden" name="pages" value={pages} />

        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">How many pages did you read?</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={remaining}
            value={pages}
            onChange={(event) => setPages(event.target.value)}
            placeholder="e.g. 12"
            className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600"
          />
        </label>
        <p className="text-xs text-neutral-500">No timer needed — this just adds to your total, untimed.</p>

        {!state.ok && state.message && <FormError>{state.message}</FormError>}

        <Button type="submit" fullWidth size="lg" className="mt-1 h-13" disabled={!canSave} pending={pending}>
          Save
        </Button>
      </form>
    </EntrySheet>
  );
}

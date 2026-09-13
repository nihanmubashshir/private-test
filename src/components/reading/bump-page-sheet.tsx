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
  currentPage: number;
  totalPages: number;
}

/** Pages read without timing them — not every page has a time (US-016 §2). */
export function BumpPageSheet({ open, onClose, bookId, currentPage, totalPages }: BumpPageSheetProps) {
  const [page, setPage] = useState("");
  const [state, formAction, pending] = useActionState(bumpPage, INITIAL);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) setPage("");
    wasOpen.current = open;
  }, [open]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!state.ok || !state.id) return;
    toast.success("Page updated");
    onCloseRef.current();
  }, [state]);

  const pageNumber = Number(page);
  const canSave = Number.isInteger(pageNumber) && pageNumber > currentPage && pageNumber <= totalPages;

  return (
    <EntrySheet open={open} onClose={onClose} title="Jump to a page">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="bookId" value={bookId} />
        <input type="hidden" name="page" value={page} />

        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Now at page</span>
          <input
            type="number"
            inputMode="numeric"
            min={currentPage + 1}
            max={totalPages}
            value={page}
            onChange={(event) => setPage(event.target.value)}
            placeholder={String(currentPage + 1)}
            className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600"
          />
        </label>
        <p className="text-xs text-neutral-500">No timer needed — this just moves your progress forward.</p>

        {!state.ok && state.message && <FormError>{state.message}</FormError>}

        <Button type="submit" fullWidth size="lg" className="mt-1 h-13" disabled={!canSave} pending={pending}>
          Save
        </Button>
      </form>
    </EntrySheet>
  );
}

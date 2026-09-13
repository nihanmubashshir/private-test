"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBook, type ReadingActionResult } from "@/app/(app)/reading/actions";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";

const INITIAL: ReadingActionResult = { ok: true, message: null };

export interface CreateBookSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Set up a book with its page count (US-016 §2). */
export function CreateBookSheet({ open, onClose }: CreateBookSheetProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [state, formAction, pending] = useActionState(createBook, INITIAL);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setTitle("");
      setTotalPages("");
    }
    wasOpen.current = open;
  }, [open]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!state.ok || !state.id) return;
    toast.success("Book added");
    onCloseRef.current();
    router.push(`/reading/${state.id}`);
  }, [state, router]);

  const pages = Number(totalPages);
  const canSave = title.trim() !== "" && Number.isInteger(pages) && pages > 0;

  return (
    <EntrySheet open={open} onClose={onClose} title="New book">
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Title</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={140}
            autoComplete="off"
            className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Total pages</span>
          <input
            name="totalPages"
            type="number"
            inputMode="numeric"
            min={1}
            max={20000}
            value={totalPages}
            onChange={(event) => setTotalPages(event.target.value)}
            className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50"
          />
        </label>

        {!state.ok && state.message && <FormError>{state.message}</FormError>}

        <Button type="submit" fullWidth size="lg" className="mt-1 h-13" disabled={!canSave} pending={pending}>
          Add book
        </Button>
      </form>
    </EntrySheet>
  );
}

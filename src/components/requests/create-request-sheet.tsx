"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { Button } from "@/components/ui/button";

/**
 * The full add flow for `/settings/requests` (US-013 §3): a name plus a large details textarea,
 * in the same sheet shell as the radial menu's `QuickCaptureSheet` (US-014) so the two feel like
 * one pattern rather than two different "add" experiences.
 */
export function CreateRequestSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (values: { title: string; note: string | null }) => void;
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setTitle("");
      setNote("");
    }
    wasOpen.current = open;
  }, [open]);

  const save = (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (trimmedTitle === "") return;
    const trimmedNote = note.trim();
    startTransition(() => {
      onCreate({ title: trimmedTitle, note: trimmedNote === "" ? null : trimmedNote });
      onClose();
    });
  };

  return (
    <EntrySheet open={open} onClose={onClose} title="Add request" tall>
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col gap-4">
        <label className="flex shrink-0 flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Name</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="What should the app do?"
            enterKeyHint="next"
            className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600"
          />
        </label>

        <label className="flex min-h-0 flex-1 flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Details</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            placeholder="Anything that makes the idea clearer (optional)"
            className="w-full min-h-32 flex-1 resize-none rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-base text-neutral-50 placeholder:text-neutral-600"
          />
        </label>

        <Button type="submit" fullWidth size="lg" className="h-13 shrink-0" pending={pending} disabled={title.trim() === ""}>
          Save
        </Button>
      </form>
    </EntrySheet>
  );
}

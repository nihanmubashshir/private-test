"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { Button } from "@/components/ui/button";

export interface RequestSheetValues {
  title: string;
  note: string | null;
}

export interface RequestSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: RequestSheetValues) => void;
  pending?: boolean;
}

/**
 * The one add-request sheet, used both from `/settings/requests` and the radial menu's quick
 * capture (US-014) — the two used to look different, which read as two features rather than one.
 * The sheet only collects and validates the fields; each caller decides how to persist them
 * (the settings list adds optimistically, the radial menu awaits the Server Action and toasts).
 */
export function RequestSheet({ open, onClose, onSubmit, pending }: RequestSheetProps) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

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
    onSubmit({ title: trimmedTitle, note: trimmedNote === "" ? null : trimmedNote });
  };

  return (
    <EntrySheet open={open} onClose={onClose} title="Add request" tall>
      <form onSubmit={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
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

        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-neutral-400">Details</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={8}
            placeholder="Anything that makes the idea clearer (optional)"
            className="w-full resize-none rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-base text-neutral-50 placeholder:text-neutral-600"
          />
        </label>

        {/* Flows after the fields rather than pinned to the bottom edge — on a short sheet it
            just sits below the textarea; on a long one it scrolls with everything else. */}
        <Button type="submit" fullWidth size="lg" className="h-13" pending={pending} disabled={title.trim() === ""}>
          Save
        </Button>
      </form>
    </EntrySheet>
  );
}

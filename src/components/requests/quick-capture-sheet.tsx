"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createRequest } from "@/app/(app)/settings/requests/actions";
import { EntrySheet } from "@/components/ui/entry-sheet";
import { Button } from "@/components/ui/button";

/**
 * The radial menu's lighter capture (US-014 §4): one field and Save, from any screen, straight into
 * the request log (US-013). The note is left for the full screen — the point here is catching the
 * idea before it's gone.
 *
 * A transition rather than `useActionState`, so there is no lingering action state for a success
 * effect to re-read on the next open (the bug fixed in 9245ac9).
 */
export function QuickCaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) setTitle("");
    wasOpen.current = open;
  }, [open]);

  const submit = (value: string) => {
    startTransition(async () => {
      const result = await createRequest({ title: value });
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't save that request.", {
          action: { label: "Retry", onClick: () => submit(value) },
        });
        return;
      }
      toast.success("Request saved", {
        action: { label: "View", onClick: () => router.push("/settings/requests") },
      });
      onClose();
    });
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    const value = title.trim();
    if (value !== "") submit(value);
  };

  return (
    <EntrySheet open={open} onClose={onClose} title="Add request">
      <form onSubmit={save} className="flex flex-col gap-4">
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="What should the app do?"
          aria-label="Request"
          enterKeyHint="done"
          className="min-h-tap w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-base text-neutral-50 placeholder:text-neutral-600"
        />
        <Button type="submit" fullWidth size="lg" className="h-13" pending={pending} disabled={title.trim() === ""}>
          Save
        </Button>
      </form>
    </EntrySheet>
  );
}

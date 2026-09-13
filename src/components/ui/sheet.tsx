"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, type ButtonVariant } from "./button";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  pending?: boolean;
}

/**
 * Bottom sheet on mobile, centered dialog from `sm:` (docs/design/README.md "Modal / bottom
 * sheet"). Built on the native `<dialog>` element, which provides the focus trap and Esc-to-close
 * for free — Esc fires the dialog's default "cancel then close" behavior, which React surfaces as
 * `onClose` below.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  pending,
}: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [entered, setEntered] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      const frame = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(frame);
    }

    setEntered(false);
    if (dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={onClose}
      className={cn(
        "fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none bg-transparent p-0 backdrop:bg-black/55",
        "sm:top-1/2 sm:bottom-auto sm:m-auto sm:h-fit sm:w-full sm:max-w-[320px] sm:-translate-y-1/2",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-5 rounded-t-lg border-t border-neutral-800 bg-neutral-900 p-5",
          "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out-soft",
          entered ? "translate-y-0" : "translate-y-full",
          "sm:translate-y-0 sm:rounded-lg sm:border sm:p-6 sm:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)]",
          "sm:motion-safe:transition-[opacity,transform] sm:motion-safe:duration-200 sm:motion-safe:ease-out-soft",
          entered ? "sm:scale-100 sm:opacity-100" : "sm:scale-95 sm:opacity-0",
        )}
      >
        <div aria-hidden="true" className="mx-auto h-1 w-9 rounded-full bg-neutral-700 sm:hidden" />
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-h2 text-neutral-50">
            {title}
          </h2>
          <p id={descriptionId} className="text-body-sm text-neutral-400">
            {description}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            className="sm:w-auto"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            fullWidth
            size="lg"
            className="sm:w-auto"
            pending={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

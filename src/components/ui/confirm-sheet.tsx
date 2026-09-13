"use client";

import { Button, type ButtonVariant } from "./button";
import { Dialog, DialogContent } from "./dialog";
import { Drawer, DrawerContent } from "./drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

export interface ConfirmSheetProps {
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
 * A responsive confirmation: a swipe-to-dismiss bottom Drawer below `sm:`, a centered Dialog from
 * `sm:` up (docs/design/README.md "Modal / bottom sheet"; 01-design-system.md §9.1).
 */
export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  pending,
}: ConfirmSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 40rem)");

  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const body = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-h2 text-neutral-50">{title}</h2>
        <p className="text-body-sm text-neutral-400">{description}</p>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" fullWidth size="lg" className="sm:w-auto" onClick={onClose} disabled={pending}>
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
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false}>{body}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="gap-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{body}</DrawerContent>
    </Drawer>
  );
}

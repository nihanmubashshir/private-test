"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { Drawer, DrawerContent, DrawerTitle } from "./drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export interface EntrySheetProps {
  open: boolean;
  onClose: () => void;
  /** Sits top-left in the header and is the accessible name of the dialog. */
  title: string;
  /** The committing action. Omit for sheets that save as you tap, like a picker. */
  submitLabel?: string;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  pending?: boolean;
  /** "Cancel" by default; becomes "Done" once a picker-style sheet has changed something. */
  cancelLabel?: string;
  /** Fills 90vh, for long lists or forms. Otherwise the sheet sizes to its content, between 60vh and 85vh. */
  tall?: boolean;
  children: ReactNode;
}

/**
 * The sheet every create/edit flow opens (US-007 §5): anything that writes a single record is a
 * bottom sheet over the current screen, never a pushed screen.
 *
 * Built on the existing vaul `Drawer`, which already does drag-to-dismiss with real physics, and
 * on `Dialog` from `sm:` up — the same split `confirm-sheet.tsx` uses. Deliberately **not** a
 * Motion component: re-implementing a drag-dismissible sheet would be worse than the one already
 * in the bundle (01-design-system.md §9.1, "CSS for state, Motion for gesture" — this is neither,
 * it is a solved primitive).
 *
 * The header is title + Cancel rather than an X, so the dismiss affordance is reachable by a
 * thumb and reads as a choice. The CTA is padded past the home indicator, so it stays above the
 * keyboard on a phone.
 *
 * The body always scrolls, inside the sheet's own height cap (85vh normally, 90vh for `tall`). A
 * sheet that merely "fits its content" is fine until the content is a keypad plus a date row on a
 * short phone, at which point the bottom — including the Save button — is simply unreachable.
 */
export function EntrySheet({
  open,
  onClose,
  title,
  submitLabel,
  onSubmit,
  submitDisabled,
  pending,
  cancelLabel = "Cancel",
  tall,
  children,
}: EntrySheetProps) {
  const isDesktop = useMediaQuery("(min-width: 40rem)");

  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const Title = isDesktop ? DialogTitle : DrawerTitle;

  const body = (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <Title className="text-h2 text-neutral-50">{title}</Title>
        <Button variant="ghost" size="sm" className="-mr-2 min-h-tap" onClick={onClose} disabled={pending}>
          {cancelLabel}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-1">{children}</div>

      {submitLabel && (
        <Button
          fullWidth
          size="lg"
          className="h-13 shrink-0"
          onClick={onSubmit}
          disabled={submitDisabled}
          pending={pending}
        >
          {submitLabel}
        </Button>
      )}
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "flex max-h-[85vh] min-h-[60vh] flex-col gap-4",
            tall && "h-[90vh] max-h-[90vh]",
          )}
        >
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          "min-h-[60vh] gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          // The base bottom/top variants cap at 80vh — override that cap explicitly, same
          // variant, so it wins the merge instead of losing to source order.
          tall &&
            "h-[90vh] data-[vaul-drawer-direction=bottom]:max-h-[90vh] data-[vaul-drawer-direction=top]:max-h-[90vh]",
        )}
      >
        {body}
      </DrawerContent>
    </Drawer>
  );
}

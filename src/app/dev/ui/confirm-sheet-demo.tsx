"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";

/** Interactive trigger for the ConfirmSheet gallery entry — resize the viewport to see both layouts. */
export function ConfirmSheetDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open discard sheet
      </Button>
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Discard this run?"
        description="The stopwatch will stop and nothing will be saved."
        confirmLabel="Discard"
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

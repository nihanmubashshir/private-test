"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

/** Interactive trigger for the Sheet gallery entry — resize the viewport to see both layouts. */
export function SheetDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open discard sheet
      </Button>
      <Sheet
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

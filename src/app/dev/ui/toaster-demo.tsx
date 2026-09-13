"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";

/** Interactive trigger for the Toaster gallery entry. Mounts its own <Toaster /> (T4 mounts the real one in the app shell). */
export function ToasterDemo() {
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => toast.success("Run saved · 32m 10s")}>
        Success
      </Button>
      <Button variant="secondary" size="sm" onClick={() => toast.error("Couldn't reach the server.")}>
        Error
      </Button>
      <Button variant="secondary" size="sm" onClick={() => toast.info("Back online")}>
        Info
      </Button>
      <Button variant="secondary" size="sm" onClick={() => toast.loading("Saving…")}>
        Loading
      </Button>
      <Toaster position="bottom-center" />
    </>
  );
}

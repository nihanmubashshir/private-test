"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ErrorScreenProps {
  /** Re-renders the failed segment. Next 16 names this `retry`, not `reset`. */
  onRetry: () => void;
  /** Shown in mono under the actions, so a failure can be matched to a server log. */
  digest?: string;
  title?: string;
  hint?: string;
  /** Omitted by `global-error`, which cannot use the client router. */
  homeHref?: string | null;
}

/**
 * The shared error screen (US-007 §3). Follows the empty-state anatomy (§10.2) — icon circle, one
 * line of title, one of hint, then the actions — because a crash should look like part of the app,
 * not like the app fell over.
 */
export function ErrorScreen({
  onRetry,
  digest,
  title = "Something went wrong",
  hint = "That didn't load. Trying again usually fixes it.",
  homeHref = "/",
}: ErrorScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-neutral-800">
        <TriangleAlert className="size-6 text-warning-400" strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="text-h2 text-neutral-50">{title}</h1>
      <p className="text-body-sm max-w-xs text-neutral-400">{hint}</p>

      <div className="mt-2 flex w-full flex-col gap-2">
        <Button onClick={onRetry} fullWidth>
          Try again
        </Button>
        {homeHref && (
          <Button asChild variant="ghost" fullWidth>
            <Link href={homeHref}>Go to the dashboard</Link>
          </Button>
        )}
      </div>

      {digest && <p className="pt-2 font-mono text-xs text-neutral-600">{digest}</p>}
    </main>
  );
}

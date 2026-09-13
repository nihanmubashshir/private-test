"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/shell/error-screen";

/**
 * Runtime errors anywhere under the root layout (US-007 §3).
 *
 * `error.tsx` must be a Client Component — it is the React error boundary itself. Errors thrown by
 * the root layout are caught by `global-error.tsx` instead, which this file cannot see.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Server-side details are already redacted into `digest` before they reach the browser.
    console.error(error);
  }, [error]);

  return <ErrorScreen onRetry={retry} digest={error.digest} />;
}

"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/shell/error-screen";
import "./globals.css";

/**
 * The root layout itself failed, so this replaces it — html and body included (US-007 §3).
 *
 * The layout is what loads the fonts, so this renders in the fallback stack. It also has no
 * router above it, hence no Home link: reloading is the only recovery worth offering.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-50 antialiased">
        <ErrorScreen
          onRetry={retry}
          digest={error.digest}
          title="The app failed to start"
          hint="Reloading usually fixes it. If it doesn't, the deployment may be mid-update."
          homeHref={null}
        />
      </body>
    </html>
  );
}

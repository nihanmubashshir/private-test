"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Mutation layer for optimistic UI (gym session/plan editing — see AGENTS.md's Server Action
 * critique). Reads stay Server Components; this only backs `useMutation` calls that wrap the
 * existing Server Actions, so a tap updates the screen before the round trip finishes.
 *
 * One `QueryClient` per browser tab, created lazily so it survives re-renders but not a full
 * reload (matches the TanStack Query App Router guidance — never a module-level singleton, which
 * would leak state across requests on the server render pass).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

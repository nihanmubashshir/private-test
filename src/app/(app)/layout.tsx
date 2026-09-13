import type { ReactNode } from "react";
import { requireFull } from "@/lib/auth/require-full";
import { Toaster } from "@/components/ui/toaster";
import { NavigationProgressProvider } from "@/components/shell/navigation-progress";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Defense in depth: src/proxy.ts already guards this route, but every
  // protected layout re-checks FULL itself (US-001 §4.2).
  await requireFull();

  return (
    <NavigationProgressProvider>
      {children}
      <Toaster position="bottom-center" />
    </NavigationProgressProvider>
  );
}

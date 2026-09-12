import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/lib/auth/state";
import { homeFor } from "@/lib/auth/route-guard";
import { Brand } from "@/components/ui/brand";
import { SignOutForm } from "@/components/sign-out-form";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  // Defense in depth: src/proxy.ts already guards this route, but every
  // protected layout re-checks FULL itself (US-001 §4.2).
  const state = await getAuthState(supabase);
  if (state !== "FULL") {
    redirect(homeFor(state));
  }

  return (
    <div className="min-h-dvh">
      <header
        className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-900"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-14 items-center justify-between pr-2 pl-4">
          <Brand />
          <SignOutForm />
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-4">{children}</main>
    </div>
  );
}

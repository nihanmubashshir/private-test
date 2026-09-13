import type { ReactNode } from "react";
import Link from "next/link";
import { requireFull } from "@/lib/auth/require-full";
import { getActiveStopwatches } from "@/lib/stopwatch/server";
import { Brand } from "@/components/ui/brand";
import { SignOutForm } from "@/components/sign-out-form";
import { ActiveStopwatchBar } from "@/components/stopwatch/active-stopwatch-bar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Defense in depth: src/proxy.ts already guards this route, but every
  // protected layout re-checks FULL itself (US-001 §4.2).
  const supabase = await requireFull();
  const actives = await getActiveStopwatches(supabase);

  return (
    <div className="min-h-dvh">
      <header
        className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-900"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-14 items-center justify-between pr-2 pl-4">
          <Link href="/">
            <Brand />
          </Link>
          <SignOutForm />
        </div>
      </header>
      <main
        className="mx-auto max-w-[1120px] px-4"
        style={{ paddingBottom: "var(--stopwatch-bar-height, 0px)" }}
      >
        {children}
      </main>
      <ActiveStopwatchBar actives={actives} />
    </div>
  );
}

import type { ReactNode } from "react";
import { Brand } from "@/components/ui/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // Top third, not vertically centered — so the keyboard never covers the fields (01-design-system.md §6.8).
    <div className="flex min-h-dvh flex-col px-4 pt-[max(3rem,10vh)]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
        <div className="flex justify-center">
          <Brand />
        </div>
        {children}
      </div>
    </div>
  );
}

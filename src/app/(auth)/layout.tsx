import type { ReactNode } from "react";
import { Brand } from "@/components/ui/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-4">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex justify-center">
          <Brand />
        </div>
        {children}
      </div>
    </div>
  );
}

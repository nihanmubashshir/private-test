"use client";

import { useState } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface CopySecretButtonProps {
  secret: string;
  className?: string;
}

export function CopySecretButton({ secret, className }: CopySecretButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const stripped = secret.replace(/\s+/g, "");
    try {
      await navigator.clipboard.writeText(stripped);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      onClick={handleClick}
      className={cn(copied && "border-success-800 bg-success-950 text-success-400", className)}
    >
      <span aria-live="polite">{copied ? "Copied" : "Copy setup key"}</span>
    </Button>
  );
}

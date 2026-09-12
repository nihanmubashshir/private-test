"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface OtpInputProps {
  label: string;
  name: string;
  error?: string;
  defaultValue?: string;
  autoFocus?: boolean;
}

/** One real <input>, not six boxes — keeps paste, password managers, and autofill working. */
export function OtpInput({ label, name, error, defaultValue, autoFocus }: OtpInputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [hasValue, setHasValue] = useState(Boolean(defaultValue));

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm leading-tight font-semibold text-neutral-50">
        {label}
      </label>
      <input
        id={id}
        name={name}
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        defaultValue={defaultValue}
        placeholder="••••••"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => setHasValue(event.target.value.length > 0)}
        className={cn(
          "min-h-[60px] rounded-md border bg-neutral-900 text-center font-mono text-otp tracking-[0.35em] text-neutral-50 placeholder:text-neutral-600",
          "focus:border-accent-500 focus:outline-2 focus:outline-offset-2 focus:outline-accent-500",
          error ? "border-danger-400" : "border-neutral-700",
          hasValue && "pl-[0.35em]",
        )}
      />
      {error && (
        <p id={errorId} className="text-sm text-danger-400">
          {error}
        </p>
      )}
    </div>
  );
}

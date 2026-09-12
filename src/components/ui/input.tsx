"use client";

import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  error?: string;
  helperText?: string;
  size?: "md" | "lg";
  password?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, size = "md", password, className, id, type, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const [visible, setVisible] = useState(false);

  const heightClass = size === "lg" ? "h-12" : "h-tap";
  const resolvedType = password ? (visible ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm leading-tight font-semibold text-neutral-50">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            "w-full rounded-md border border-neutral-700 bg-neutral-900 px-3.5 text-base text-neutral-50 placeholder:text-neutral-400",
            "[&:not(:placeholder-shown)]:border-neutral-600",
            "focus:border-accent-500 focus:outline-2 focus:outline-offset-2 focus:outline-accent-500",
            "disabled:border-neutral-800 disabled:bg-surface-sunken disabled:text-neutral-600",
            error && "border-danger-400",
            password && "pr-1 font-mono tracking-[0.1em]",
            heightClass,
            className,
          )}
          {...props}
        />
        {password && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-1 h-10 min-w-11 -translate-y-1/2 rounded-sm px-2 text-sm font-semibold text-neutral-300 hover:text-neutral-50"
          >
            {visible ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-danger-400">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-sm text-neutral-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

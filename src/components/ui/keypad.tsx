"use client";

import { Delete } from "lucide-react";
import { pressBackspace, pressDecimalPoint, pressDigit } from "@/lib/weight/keypad";
import { cn } from "@/lib/utils";

/** A short tick where the API exists. Silent everywhere else — never a fallback sound. */
function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
}

export interface KeypadProps {
  value: string;
  onChange: (next: string) => void;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * A purpose-built decimal keypad (US-009 §5.2).
 *
 * Buttons, not an `<input>`: the OS keyboard must never open, and `inputMode="decimal"` only
 * *suggests* a numeric keyboard — it still opens one, still covers half the screen, and still lets
 * a second decimal point through. Keys are 56px so the grid fits at 320px without shrinking below
 * the touch minimum.
 */
export function Keypad({ value, onChange }: KeypadProps) {
  const press = (next: string) => {
    if (next !== value) haptic();
    onChange(next);
  };

  const keyClass =
    "flex min-h-14 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 font-mono text-2xl text-neutral-50 active:bg-surface-hover motion-safe:active:scale-[0.97]";

  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Number keypad">
      {DIGITS.map((digit) => (
        <button key={digit} type="button" className={keyClass} onClick={() => press(pressDigit(value, digit))}>
          {digit}
        </button>
      ))}
      <button
        type="button"
        className={keyClass}
        onClick={() => press(pressDecimalPoint(value))}
        aria-label="Decimal point"
      >
        .
      </button>
      <button type="button" className={keyClass} onClick={() => press(pressDigit(value, "0"))}>
        0
      </button>
      <button
        type="button"
        className={cn(keyClass, "text-neutral-300")}
        onClick={() => press(pressBackspace(value))}
        aria-label="Delete"
      >
        <Delete className="size-6" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}

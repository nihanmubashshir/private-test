/**
 * Decimal entry rules for the on-screen keypad (US-009 §5.2, generalised in US-011).
 *
 * Pure string transitions, deliberately: the value is what the owner has typed so far, not a
 * number. `"82."` is a legal intermediate state that no numeric type can hold, and parsing early
 * would turn a half-typed `"8"` into a weight.
 */

export interface KeypadRules {
  /** Digits allowed before the decimal point. */
  maxIntegerDigits: number;
  /** Digits allowed after it. 0 means the keypad is integer-only and hides the point. */
  maxDecimals: number;
}

/** Body weight: 3 digits, 4 decimals — a precise scale reads finer than one (owner instruction). */
export const WEIGHT_RULES: KeypadRules = { maxIntegerDigits: 3, maxDecimals: 4 };
/** Reps, and anything else counted rather than measured. */
export const INTEGER_RULES: KeypadRules = { maxIntegerDigits: 3, maxDecimals: 0 };
/** Lifted weight: 0.5kg steps in the stepper, one decimal from the keypad. */
export const LOAD_RULES: KeypadRules = { maxIntegerDigits: 4, maxDecimals: 1 };
/** Seconds and metres — five digits, no fractions. */
export const LARGE_INTEGER_RULES: KeypadRules = { maxIntegerDigits: 5, maxDecimals: 0 };

export function pressDigit(current: string, digit: string, rules: KeypadRules): string {
  const [whole = "", fraction] = current.split(".");

  if (fraction !== undefined) {
    // Further presses past the limit are ignored, not queued.
    if (fraction.length >= rules.maxDecimals) return current;
    return `${whole}.${fraction}${digit}`;
  }

  if (whole.length >= rules.maxIntegerDigits) return current;
  // No leading zeros: "0" then "8" is 8, not 08.
  if (whole === "0") return digit;
  return whole + digit;
}

export function pressDecimalPoint(current: string, rules: KeypadRules): string {
  if (rules.maxDecimals === 0) return current;
  if (current.includes(".")) return current;
  // A leading "." becomes "0." rather than an unparseable ".5".
  if (current === "") return "0.";
  return `${current}.`;
}

export function pressBackspace(current: string): string {
  return current.slice(0, -1);
}

/** True once the string is a complete number, so Save can enable. */
export function isComplete(current: string, rules: KeypadRules): boolean {
  const fraction = rules.maxDecimals > 0 ? `(\\.\\d{1,${rules.maxDecimals}})?` : "";
  return new RegExp(`^\\d{1,${rules.maxIntegerDigits}}${fraction}$`).test(current) && Number(current) > 0;
}

export function parseValue(current: string, rules: KeypadRules): number | null {
  return isComplete(current, rules) ? Number(current) : null;
}

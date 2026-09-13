/**
 * Decimal entry rules for the weight keypad (US-009 §5.2).
 *
 * Pure string transitions, deliberately: the value is what the owner has typed so far, not a
 * number. `"82."` is a legal intermediate state that no numeric type can hold, and parsing early
 * would turn a half-typed `"8"` into a weight.
 */

const MAX_INTEGER_DIGITS = 3;
const MAX_DECIMALS = 1;

export function pressDigit(current: string, digit: string): string {
  const [whole = "", fraction] = current.split(".");

  if (fraction !== undefined) {
    // At most one digit after the point; further presses are ignored, not queued.
    if (fraction.length >= MAX_DECIMALS) return current;
    return `${whole}.${fraction}${digit}`;
  }

  if (whole.length >= MAX_INTEGER_DIGITS) return current;
  // No leading zeros: "0" then "8" is 8, not 08.
  if (whole === "0") return digit;
  return whole + digit;
}

export function pressDecimalPoint(current: string): string {
  if (current.includes(".")) return current;
  // A leading "." becomes "0." rather than an unparseable ".5".
  if (current === "") return "0.";
  return `${current}.`;
}

export function pressBackspace(current: string): string {
  return current.slice(0, -1);
}

/** True once the string is a complete number, so Save can enable. */
export function isComplete(current: string): boolean {
  return /^\d{1,3}(\.\d)?$/.test(current) && Number(current) > 0;
}

export function parseValue(current: string): number | null {
  return isComplete(current) ? Number(current) : null;
}

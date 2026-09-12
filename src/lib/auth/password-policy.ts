import { z } from "zod";

const MIN_LENGTH = 12;
const MAX_BYTES = 72;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export const passwordSchema = z
  .string()
  .min(MIN_LENGTH, `Password must be at least ${MIN_LENGTH} characters.`)
  .refine((value) => byteLength(value) <= MAX_BYTES, {
    message: `Password must be at most ${MAX_BYTES} bytes long.`,
  });

export const PASSWORD_POLICY_DESCRIPTION = `At least ${MIN_LENGTH} characters.`;

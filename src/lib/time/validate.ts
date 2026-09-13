import { z } from "zod";
import { isValidTimeZone } from "./zone";

/** How far a client-supplied timestamp may lead the server's clock before it's rejected. */
export const SKEW_TOLERANCE_MS = 5 * 60_000;

/** A UTC ISO 8601 instant with an explicit offset (`new Date().toISOString()`), parsed to a Date. */
export const isoInstant = z
  .iso.datetime({ offset: true })
  .transform((value) => new Date(value));

/** An IANA time zone name, validated by resolvability rather than a fixed list. */
export const timeZone = z
  .string()
  .max(64)
  .refine(isValidTimeZone, { message: "Invalid time zone." });

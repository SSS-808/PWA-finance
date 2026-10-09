import { z } from "zod";
import { CURRENCY_CODES } from "@/modules/money";
import { isValidTimeZone } from "./time-zones";
import type { ProfileErrorKey, ProfileFieldName } from "./types";

export type { ProfileErrorKey };

export const MAX_NAME_LENGTH = 60;

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(MAX_NAME_LENGTH, { error: "name_too_long" })
    .transform((value) => (value === "" ? null : value)),
  baseCurrency: z.enum(CURRENCY_CODES, { error: "invalid_currency" }),
  timeZone: z
    .string({ error: "invalid_time_zone" })
    .refine(isValidTimeZone, { error: "invalid_time_zone" }),
});

const ERROR_KEYS: readonly string[] = [
  "name_too_long",
  "invalid_currency",
  "invalid_time_zone",
];

// Turns schema issues into error keys, one per field
export function fieldErrorsFrom(
  error: z.ZodError,
): Partial<Record<ProfileFieldName, ProfileErrorKey>> {
  const result: Partial<Record<ProfileFieldName, ProfileErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as ProfileFieldName;
    result[field] = ERROR_KEYS.includes(issue.message)
      ? (issue.message as ProfileErrorKey)
      : "unknown";
  }
  return result;
}

import { z } from "zod";
import {
  TRIP_ERROR_KEYS,
  type TripErrorKey,
  type TripFieldName,
} from "./types";

export const MAX_NAME_LENGTH = 60;
export const MIN_DATE = "2000-01-01";
export const MAX_DATE = "2100-12-31";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A real calendar date as YYYY-MM-DD, inside the range the database allows
export function isValidTripDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  if (value < MIN_DATE || value > MAX_DATE) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export const tripSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "name_required" })
      .max(MAX_NAME_LENGTH, { error: "name_too_long" }),
    startsOn: z.string().trim(),
    endsOn: z.string().trim(),
  })
  .transform((fields, ctx) => {
    let valid = true;
    for (const field of ["startsOn", "endsOn"] as const) {
      if (!isValidTripDate(fields[field])) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "date_invalid",
        });
        valid = false;
      }
    }
    if (!valid) return z.NEVER;
    if (fields.endsOn < fields.startsOn) {
      ctx.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "dates_out_of_order",
      });
      return z.NEVER;
    }
    return fields;
  });

// Turns schema issues into error keys, one per field
export function fieldErrorsFrom(
  error: z.ZodError,
): Partial<Record<TripFieldName, TripErrorKey>> {
  const result: Partial<Record<TripFieldName, TripErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as TripFieldName;
    result[field] = (TRIP_ERROR_KEYS as readonly string[]).includes(
      issue.message,
    )
      ? (issue.message as TripErrorKey)
      : "unknown";
  }
  return result;
}

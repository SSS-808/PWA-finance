import { z } from "zod";
import {
  CATEGORY_ERROR_KEYS,
  CATEGORY_KINDS,
  type CategoryErrorKey,
  type CategoryFieldName,
  type CategoryKind,
} from "./types";

export const MAX_NAME_LENGTH = 40;

export const categoryFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "name_required" })
    .max(MAX_NAME_LENGTH, { error: "name_too_long" }),
});

export const createCategorySchema = categoryFieldsSchema.extend({
  kind: z.enum(CATEGORY_KINDS, { error: "invalid_kind" }),
});

export function isCategoryKind(value: string): value is CategoryKind {
  return (CATEGORY_KINDS as readonly string[]).includes(value);
}

// Turns schema issues into error keys, one per field
export function fieldErrorsFrom(
  error: z.ZodError,
): Partial<Record<CategoryFieldName, CategoryErrorKey>> {
  const result: Partial<Record<CategoryFieldName, CategoryErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as CategoryFieldName;
    result[field] = (CATEGORY_ERROR_KEYS as readonly string[]).includes(
      issue.message,
    )
      ? (issue.message as CategoryErrorKey)
      : "unknown";
  }
  return result;
}

import { z } from "zod";
import {
  CATEGORY_COLORS,
  CATEGORY_ERROR_KEYS,
  CATEGORY_ICONS,
  CATEGORY_KINDS,
  type CategoryColor,
  type CategoryErrorKey,
  type CategoryFieldName,
  type CategoryIconKey,
  type CategoryKind,
} from "./types";

export const MAX_NAME_LENGTH = 40;

export const categoryFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "name_required" })
    .max(MAX_NAME_LENGTH, { error: "name_too_long" }),
  icon: z.enum(CATEGORY_ICONS, { error: "invalid_icon" }),
  color: z.enum(CATEGORY_COLORS, { error: "invalid_color" }),
});

export const createCategorySchema = categoryFieldsSchema.extend({
  kind: z.enum(CATEGORY_KINDS, { error: "invalid_kind" }),
});

export function isCategoryKind(value: string): value is CategoryKind {
  return (CATEGORY_KINDS as readonly string[]).includes(value);
}

export function isCategoryIcon(value: string): value is CategoryIconKey {
  return (CATEGORY_ICONS as readonly string[]).includes(value);
}

export function isCategoryColor(value: string): value is CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
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

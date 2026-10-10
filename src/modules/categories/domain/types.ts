export const CATEGORY_KINDS = ["expense", "income"] as const;

export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export type Category = { id: string; name: string; kind: CategoryKind };

// A category as the Settings pages see it; hidden ones are still listed there
export type ManagedCategory = Category & { hidden: boolean };

export const CATEGORY_ERROR_KEYS = [
  "name_required",
  "name_too_long",
  "name_taken",
  "invalid_kind",
  "not_found",
  "unknown",
] as const;

export type CategoryErrorKey = (typeof CATEGORY_ERROR_KEYS)[number];

export type CategoryFieldName = "name" | "kind";

export type CategoryFormValues = Record<CategoryFieldName, string>;

export type CategoryFormState = {
  status: "idle" | "error";
  error?: CategoryErrorKey;
  fieldErrors?: Partial<Record<CategoryFieldName, CategoryErrorKey>>;
  values?: CategoryFormValues;
};

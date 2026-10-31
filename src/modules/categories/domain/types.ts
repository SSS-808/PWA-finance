export const CATEGORY_KINDS = ["expense", "income"] as const;

export type CategoryKind = (typeof CATEGORY_KINDS)[number];

// Must stay the same as the check constraints in the category_icons migration
export const CATEGORY_ICONS = [
  "tag",
  "utensils",
  "car",
  "graduation-cap",
  "tv",
  "shopping-bag",
  "zap",
  "heart-pulse",
  "plane",
  "ellipsis",
  "briefcase",
  "laptop",
  "store",
  "trending-up",
  "gift",
  "house",
  "shirt",
  "coffee",
  "fuel",
  "smartphone",
  "baby",
  "paw-print",
  "dumbbell",
  "wrench",
  "landmark",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICONS)[number];

export const CATEGORY_COLORS = [
  "gray",
  "orange",
  "blue",
  "violet",
  "pink",
  "teal",
  "amber",
  "rose",
  "indigo",
  "green",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export type CategoryLook = { icon: CategoryIconKey; color: CategoryColor };

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
} & CategoryLook;

// A category as the Settings pages see it; hidden ones are still listed there
export type ManagedCategory = Category & { hidden: boolean };

export const CATEGORY_ERROR_KEYS = [
  "name_required",
  "name_too_long",
  "name_taken",
  "invalid_kind",
  "invalid_icon",
  "invalid_color",
  "not_found",
  "unknown",
] as const;

export type CategoryErrorKey = (typeof CATEGORY_ERROR_KEYS)[number];

export type CategoryFieldName = "name" | "kind" | "icon" | "color";

export type CategoryFormValues = Record<CategoryFieldName, string>;

export type CategoryFormState = {
  status: "idle" | "error";
  error?: CategoryErrorKey;
  fieldErrors?: Partial<Record<CategoryFieldName, CategoryErrorKey>>;
  values?: CategoryFormValues;
};

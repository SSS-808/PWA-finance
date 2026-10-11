import type { CurrencyCode } from "@/modules/money";

export const BUDGET_ERROR_KEYS = [
  "category_required",
  "invalid_currency",
  "amount_required",
  "amount_invalid",
  "amount_zero",
  "amount_too_many_decimals",
  "amount_too_large",
  "invalid_category",
  "unknown",
] as const;

export type BudgetErrorKey = (typeof BUDGET_ERROR_KEYS)[number];

export type BudgetFieldName = "categoryId" | "currency" | "amount";

export type BudgetFormValues = Record<BudgetFieldName, string>;

export type BudgetFormState = {
  status: "idle" | "error";
  error?: BudgetErrorKey;
  fieldErrors?: Partial<Record<BudgetFieldName, BudgetErrorKey>>;
  values?: BudgetFormValues;
};

// A budget in force for one category and currency, as the Edit page needs it
export type BudgetToEdit = {
  categoryId: string;
  categoryName: string;
  currency: CurrencyCode;
  amountMinor: number;
};

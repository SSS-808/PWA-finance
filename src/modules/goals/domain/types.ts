export const GOAL_ERROR_KEYS = [
  "name_required",
  "name_too_long",
  "name_taken",
  "invalid_currency",
  "amount_required",
  "amount_invalid",
  "amount_zero",
  "amount_too_many_decimals",
  "amount_too_large",
  "invalid_date",
  "not_enough_saved",
  "not_enough_in_account",
  "not_found",
  "unknown",
] as const;

export type GoalErrorKey = (typeof GOAL_ERROR_KEYS)[number];

export type GoalFieldName =
  "name" | "currency" | "target" | "deadline" | "amount" | "direction";

export type GoalFormValues = Record<
  "name" | "currency" | "target" | "deadline",
  string
>;

export type ContributionFormValues = { amount: string; account: string };

export type GoalFormState = {
  status: "idle" | "error";
  error?: GoalErrorKey;
  fieldErrors?: Partial<Record<GoalFieldName, GoalErrorKey>>;
  values?: GoalFormValues;
};

export type ContributionFormState = {
  status: "idle" | "error";
  error?: GoalErrorKey;
  fieldErrors?: Partial<Record<GoalFieldName, GoalErrorKey>>;
  values?: ContributionFormValues;
};

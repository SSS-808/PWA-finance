import { z } from "zod";
import {
  CURRENCY_CODES,
  type CurrencyCode,
  type Money,
  type ParseMoneyError,
  isZero,
  parseMoney,
} from "@/modules/money";
import {
  BUDGET_ERROR_KEYS,
  type BudgetErrorKey,
  type BudgetFieldName,
} from "./types";

type AmountErrorKey = Extract<BudgetErrorKey, `amount_${string}`>;

export type BudgetAmountResult =
  { ok: true; value: Money } | { ok: false; error: AmountErrorKey };

const AMOUNT_ERRORS: Record<ParseMoneyError, AmountErrorKey> = {
  empty: "amount_required",
  invalid: "amount_invalid",
  negative: "amount_invalid",
  too_many_decimals: "amount_too_many_decimals",
  too_large: "amount_too_large",
};

// A budget limit must be above 0; ending a budget is its own action
export function parseBudgetAmount(
  input: string,
  currency: CurrencyCode,
): BudgetAmountResult {
  const parsed = parseMoney(input, currency);
  if (!parsed.ok) return { ok: false, error: AMOUNT_ERRORS[parsed.error] };
  if (isZero(parsed.value)) return { ok: false, error: "amount_zero" };
  return { ok: true, value: parsed.value };
}

export const budgetSchema = z
  .object({
    categoryId: z.uuid({ error: "category_required" }),
    currency: z.enum(CURRENCY_CODES, { error: "invalid_currency" }),
    amount: z.string(),
  })
  .transform((fields, ctx) => {
    const amount = parseBudgetAmount(fields.amount, fields.currency);
    if (!amount.ok) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: amount.error });
      return z.NEVER;
    }
    return {
      categoryId: fields.categoryId,
      currency: fields.currency,
      amount: amount.value,
    };
  });

// Turns schema issues into error keys, one per field
export function fieldErrorsFrom(
  error: z.ZodError,
): Partial<Record<BudgetFieldName, BudgetErrorKey>> {
  const result: Partial<Record<BudgetFieldName, BudgetErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as BudgetFieldName;
    result[field] = (BUDGET_ERROR_KEYS as readonly string[]).includes(
      issue.message,
    )
      ? (issue.message as BudgetErrorKey)
      : "unknown";
  }
  return result;
}

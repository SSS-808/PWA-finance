import { z } from "zod";
import {
  CURRENCY_CODES,
  type CurrencyCode,
  type Money,
  type ParseMoneyError,
  negate,
  parseMoney,
  zero,
} from "@/modules/money";
import { ACCOUNT_TYPES, type AccountType, isDebt } from "./account-types";
import {
  ACCOUNT_ERROR_KEYS,
  type AccountErrorKey,
  type AccountFieldName,
} from "./types";

export const MAX_NAME_LENGTH = 60;

export const accountFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "name_required" })
    .max(MAX_NAME_LENGTH, { error: "name_too_long" }),
  type: z.enum(ACCOUNT_TYPES, { error: "invalid_type" }),
  startingAmount: z.string(),
});

export const createAccountSchema = accountFieldsSchema.extend({
  currency: z.enum(CURRENCY_CODES, { error: "invalid_currency" }),
});

// Turns schema issues into error keys, one per field
export function fieldErrorsFrom(
  error: z.ZodError,
): Partial<Record<AccountFieldName, AccountErrorKey>> {
  const result: Partial<Record<AccountFieldName, AccountErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as AccountFieldName;
    result[field] = (ACCOUNT_ERROR_KEYS as readonly string[]).includes(
      issue.message,
    )
      ? (issue.message as AccountErrorKey)
      : "unknown";
  }
  return result;
}

export type StartingAmountError =
  | "amount_invalid"
  | "amount_negative"
  | "amount_too_many_decimals"
  | "amount_too_large";

export type StartingAmountResult =
  { ok: true; value: Money } | { ok: false; error: StartingAmountError };

const AMOUNT_ERRORS: Record<
  Exclude<ParseMoneyError, "empty">,
  StartingAmountError
> = {
  invalid: "amount_invalid",
  negative: "amount_negative",
  too_many_decimals: "amount_too_many_decimals",
  too_large: "amount_too_large",
};

// Empty means 0; a debt is typed as what you owe and comes back negative
export function parseStartingAmount(
  input: string,
  type: AccountType,
  currency: CurrencyCode,
): StartingAmountResult {
  const parsed = parseMoney(input, currency);
  if (!parsed.ok) {
    if (parsed.error === "empty") return { ok: true, value: zero(currency) };
    return { ok: false, error: AMOUNT_ERRORS[parsed.error] };
  }
  return {
    ok: true,
    value: isDebt(type) ? negate(parsed.value) : parsed.value,
  };
}

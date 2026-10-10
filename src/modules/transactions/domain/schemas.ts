import { z } from "zod";
import {
  type CurrencyCode,
  type Money,
  type ParseMoneyError,
  isZero,
  negate,
  parseMoney,
} from "@/modules/money";
import {
  ENTRY_KINDS,
  TRANSACTION_ERROR_KEYS,
  type EntryFieldName,
  type EntryKind,
  type TransactionErrorKey,
} from "./types";

export const MAX_NOTE_LENGTH = 200;
export const MIN_DATE = "2000-01-01";
export const MAX_DATE = "2100-12-31";

type AmountErrorKey = Extract<TransactionErrorKey, `amount_${string}`>;

export type EntryAmountResult =
  { ok: true; value: Money } | { ok: false; error: AmountErrorKey };

const AMOUNT_ERRORS: Record<
  Exclude<ParseMoneyError, "empty">,
  AmountErrorKey
> = {
  invalid: "amount_invalid",
  negative: "amount_negative",
  too_many_decimals: "amount_too_many_decimals",
  too_large: "amount_too_large",
};

// Income comes back positive and expense negative; empty and 0 are refused
export function parseEntryAmount(
  input: string,
  currency: CurrencyCode,
  kind: EntryKind,
): EntryAmountResult {
  const parsed = parseMoney(input, currency);
  if (!parsed.ok) {
    return {
      ok: false,
      error:
        parsed.error === "empty"
          ? "amount_required"
          : AMOUNT_ERRORS[parsed.error],
    };
  }
  if (isZero(parsed.value)) return { ok: false, error: "amount_required" };
  return {
    ok: true,
    value: kind === "income" ? parsed.value : negate(parsed.value),
  };
}

// The checks that need no account, so the form can answer at once; decimals and size wait for the currency
export function amountShapeError(input: string): AmountErrorKey | null {
  const result = parseEntryAmount(input, "USD", "income");
  if (result.ok) return null;
  if (
    result.error === "amount_too_many_decimals" ||
    result.error === "amount_too_large"
  ) {
    return null;
  }
  return result.error;
}

// A real calendar day in the allowed range, written YYYY-MM-DD
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (value < MIN_DATE || value > MAX_DATE) return false;
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  // A day like 30 February rolls over into March, which changes the text
  return new Date(Date.UTC(year, month - 1, day))
    .toISOString()
    .startsWith(value);
}

export const entrySchema = z.object({
  kind: z.enum(ENTRY_KINDS),
  amount: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const error = amountShapeError(value);
      if (error) ctx.addIssue({ code: "custom", message: error });
    }),
  accountId: z.uuid({ error: "account_required" }),
  categoryId: z.uuid({ error: "category_required" }),
  date: z.string().refine(isValidDate, { error: "invalid_date" }),
  note: z
    .string()
    .trim()
    .max(MAX_NOTE_LENGTH, { error: "note_too_long" })
    .transform((value) => (value === "" ? null : value)),
});

export type EntryInput = z.input<typeof entrySchema>;
export type EntryOutput = z.output<typeof entrySchema>;

// Turns schema issues into error keys, one per field
export function fieldErrorsFrom<Field extends string = EntryFieldName>(
  error: z.ZodError,
): Partial<Record<Field, TransactionErrorKey>> {
  const result: Partial<Record<Field, TransactionErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as Field;
    result[field] = (TRANSACTION_ERROR_KEYS as readonly string[]).includes(
      issue.message,
    )
      ? (issue.message as TransactionErrorKey)
      : "unknown";
  }
  return result;
}

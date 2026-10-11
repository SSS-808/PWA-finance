import { z } from "zod";
import {
  CURRENCY_CODES,
  type CurrencyCode,
  type Money,
  type ParseMoneyError,
  isZero,
  negate,
  parseMoney,
} from "@/modules/money";
import {
  GOAL_ERROR_KEYS,
  type GoalErrorKey,
  type GoalFieldName,
} from "./types";

type AmountErrorKey = Extract<GoalErrorKey, `amount_${string}`>;

export type GoalAmountResult =
  { ok: true; value: Money } | { ok: false; error: AmountErrorKey };

export const MAX_NAME_LENGTH = 60;
export const MIN_DEADLINE = "2000-01-01";
export const MAX_DEADLINE = "2100-12-31";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const AMOUNT_ERRORS: Record<ParseMoneyError, AmountErrorKey> = {
  empty: "amount_required",
  invalid: "amount_invalid",
  negative: "amount_invalid",
  too_many_decimals: "amount_too_many_decimals",
  too_large: "amount_too_large",
};

// A target or a contribution must be above 0; the direction decides the sign of a contribution
export function parseGoalAmount(
  input: string,
  currency: CurrencyCode,
): GoalAmountResult {
  const parsed = parseMoney(input, currency);
  if (!parsed.ok) return { ok: false, error: AMOUNT_ERRORS[parsed.error] };
  if (isZero(parsed.value)) return { ok: false, error: "amount_zero" };
  return { ok: true, value: parsed.value };
}

// A real calendar date as YYYY-MM-DD, inside the range the database allows
export function isValidDeadline(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  if (value < MIN_DEADLINE || value > MAX_DEADLINE) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export const goalSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "name_required" })
      .max(MAX_NAME_LENGTH, { error: "name_too_long" }),
    currency: z.enum(CURRENCY_CODES, { error: "invalid_currency" }),
    target: z.string(),
    deadline: z.string(),
  })
  .transform((fields, ctx) => {
    const target = parseGoalAmount(fields.target, fields.currency);
    if (!target.ok) {
      ctx.addIssue({ code: "custom", path: ["target"], message: target.error });
      return z.NEVER;
    }
    const deadline = fields.deadline.trim();
    if (deadline !== "" && !isValidDeadline(deadline)) {
      ctx.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "invalid_date",
      });
      return z.NEVER;
    }
    return {
      name: fields.name,
      currency: fields.currency,
      target: target.value,
      deadline: deadline === "" ? null : deadline,
    };
  });

// The currency is the goal's own, read from the database; the amount comes back signed
export const contributionSchema = z
  .object({
    currency: z.enum(CURRENCY_CODES, { error: "invalid_currency" }),
    amount: z.string(),
    direction: z.enum(["add", "take"], { error: "unknown" }),
  })
  .transform((fields, ctx) => {
    const amount = parseGoalAmount(fields.amount, fields.currency);
    if (!amount.ok) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: amount.error });
      return z.NEVER;
    }
    return {
      currency: fields.currency,
      amount: fields.direction === "take" ? negate(amount.value) : amount.value,
    };
  });

// Turns schema issues into error keys, one per field
export function fieldErrorsFrom(
  error: z.ZodError,
): Partial<Record<GoalFieldName, GoalErrorKey>> {
  const result: Partial<Record<GoalFieldName, GoalErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as GoalFieldName;
    result[field] = (GOAL_ERROR_KEYS as readonly string[]).includes(
      issue.message,
    )
      ? (issue.message as GoalErrorKey)
      : "unknown";
  }
  return result;
}

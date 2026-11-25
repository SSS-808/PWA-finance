import { z } from "zod";
import {
  type CurrencyCode,
  type Money,
  type ParseMoneyError,
  isZero,
  parseMoney,
} from "@/modules/money";
import { PEOPLE_ERROR_KEYS, type PeopleErrorKey } from "./types";

export const MAX_NAME_LENGTH = 40;
export const MAX_NOTE_LENGTH = 200;
export const MIN_DATE = "2000-01-01";
export const MAX_DATE = "2100-12-31";

// Select values that are not an id
export const NEW_PERSON = "new";
export const NO_ACCOUNT = "none";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A real calendar date as YYYY-MM-DD, inside the range the database allows
export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  if (value < MIN_DATE || value > MAX_DATE) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const AMOUNT_ERRORS: Record<
  Exclude<ParseMoneyError, "empty">,
  PeopleErrorKey
> = {
  invalid: "amount_invalid",
  negative: "amount_negative",
  too_many_decimals: "amount_too_many_decimals",
  too_large: "amount_too_large",
};

export type AmountResult =
  { ok: true; value: Money } | { ok: false; error: PeopleErrorKey };

// A positive amount in the currency; empty and 0 are refused, and emptyError names which box is empty
export function parseAmount(
  input: string,
  currency: CurrencyCode,
  emptyError: PeopleErrorKey = "amount_required",
): AmountResult {
  const parsed = parseMoney(input, currency);
  if (!parsed.ok) {
    return {
      ok: false,
      error:
        parsed.error === "empty" ? emptyError : AMOUNT_ERRORS[parsed.error],
    };
  }
  if (isZero(parsed.value)) return { ok: false, error: emptyError };
  return parsed;
}

const note = z
  .string()
  .trim()
  .max(MAX_NOTE_LENGTH, { error: "note_too_long" })
  .transform((value) => (value === "" ? null : value));

const date = z.string().trim().refine(isValidDate, { error: "date_invalid" });

// An empty "Pay back by" is fine
const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || isValidDate(value), {
    error: "date_invalid",
  })
  .transform((value) => (value === "" ? null : value));

const personName = z
  .string()
  .trim()
  .min(1, { error: "name_required" })
  .max(MAX_NAME_LENGTH, { error: "name_too_long" });

// A select value that is an id or one fixed word
function idOr(word: string, error: PeopleErrorKey) {
  return z
    .string()
    .refine((value) => value === word || z.uuid().safeParse(value).success, {
      error,
    });
}

export const moveSchema = z
  .object({
    kind: z.enum(["lend", "borrow"], { error: "unknown" }),
    person: idOr(NEW_PERSON, "person_required"),
    newName: z.string().trim(),
    account: idOr(NO_ACCOUNT, "account_required"),
    currency: z.string().trim(),
    amount: z.string().trim(),
    date,
    dueOn: optionalDate,
    note,
  })
  .superRefine((fields, ctx) => {
    if (fields.person !== NEW_PERSON) return;
    const name = personName.safeParse(fields.newName);
    if (!name.success) {
      ctx.addIssue({
        code: "custom",
        path: ["newName"],
        message: name.error.issues[0]?.message ?? "unknown",
      });
    }
  });

export const repaySchema = z.object({
  amount: z.string().trim(),
  account: z.uuid({ error: "account_required" }),
  accountAmount: z.string().trim(),
  date,
});

export const nameSchema = personName;
export const dueSchema = optionalDate;

// Turns schema issues into error keys, one per field
export function fieldErrorsFrom<Field extends string>(
  error: z.ZodError,
): Partial<Record<Field, PeopleErrorKey>> {
  const result: Partial<Record<Field, PeopleErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as Field;
    result[field] = (PEOPLE_ERROR_KEYS as readonly string[]).includes(
      issue.message,
    )
      ? (issue.message as PeopleErrorKey)
      : "unknown";
  }
  return result;
}

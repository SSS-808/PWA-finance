import { z } from "zod";
import type { CurrencyCode, Money } from "@/modules/money";
import {
  MAX_NOTE_LENGTH,
  amountShapeError,
  isValidDate,
  parseEntryAmount,
} from "./schemas";
import type { TransactionErrorKey } from "./types";

export type TransferAmountsResult =
  | { ok: true; from: Money; to: Money }
  | {
      ok: false;
      field: "amount" | "arrived";
      error: TransactionErrorKey;
    };

// The money that leaves and the money that arrives, both positive; one currency means one amount
export function parseTransferAmounts(
  fromInput: string,
  toInput: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
): TransferAmountsResult {
  const from = parseEntryAmount(fromInput, fromCurrency, "income");
  if (!from.ok) return { ok: false, field: "amount", error: from.error };
  if (fromCurrency === toCurrency) {
    return { ok: true, from: from.value, to: from.value };
  }
  const to = parseEntryAmount(toInput, toCurrency, "income");
  if (!to.ok) {
    return {
      ok: false,
      field: "arrived",
      error: to.error === "amount_required" ? "arrived_required" : to.error,
    };
  }
  return { ok: true, from: from.value, to: to.value };
}

// The arrived box only counts when the two accounts use different currencies, which the form knows
export function transferSchemaFor(requireArrived: boolean) {
  return z
    .object({
      fromAccountId: z.uuid({ error: "account_required" }),
      toAccountId: z.uuid({ error: "account_required" }),
      amount: z
        .string()
        .trim()
        .superRefine((value, ctx) => {
          const error = amountShapeError(value);
          if (error) ctx.addIssue({ code: "custom", message: error });
        }),
      arrived: z
        .string()
        .trim()
        .superRefine((value, ctx) => {
          if (!requireArrived) return;
          const error = amountShapeError(value);
          if (error) {
            ctx.addIssue({
              code: "custom",
              message: error === "amount_required" ? "arrived_required" : error,
            });
          }
        }),
      date: z.string().refine(isValidDate, { error: "invalid_date" }),
      note: z
        .string()
        .trim()
        .max(MAX_NOTE_LENGTH, { error: "note_too_long" })
        .transform((value) => (value === "" ? null : value)),
    })
    .superRefine((value, ctx) => {
      if (
        value.fromAccountId !== "" &&
        value.fromAccountId === value.toAccountId
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "same_account",
        });
      }
    });
}

// The shape check the server runs; the arrived amount is judged later, with the real currencies
export const transferSchema = transferSchemaFor(false);

export type TransferInput = z.input<typeof transferSchema>;
export type TransferOutput = z.output<typeof transferSchema>;

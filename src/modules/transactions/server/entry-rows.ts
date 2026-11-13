import "server-only";
import type { z } from "zod";
import { listAccounts } from "@/modules/accounts";
import {
  type EntryOutput,
  fieldErrorsFrom,
  parseEntryAmount,
} from "../domain/schemas";
import {
  ENTRY_FIELDS,
  type EntryFieldName,
  type EntryFormState,
} from "../domain/types";

export type EntryRow = {
  account_id: string;
  category_id: string;
  kind: "income" | "expense";
  amount_minor: number;
  currency: string;
  description: string | null;
  transaction_date: string;
  trip_id: string | null;
};

export type BuiltRow =
  { ok: true; row: EntryRow } | { ok: false; state: EntryFormState };

export function readValues(formData: FormData): Record<EntryFieldName, string> {
  const values = {} as Record<EntryFieldName, string>;
  for (const name of ENTRY_FIELDS) {
    const value = formData.get(name);
    values[name] = typeof value === "string" ? value : "";
  }
  return values;
}

// A tampered kind has no field on screen, so it shows as the general error
export function invalidState(error: z.ZodError): EntryFormState {
  const fieldErrors = fieldErrorsFrom(error);
  return fieldErrors.kind
    ? { status: "error", error: "unknown" }
    : { status: "error", fieldErrors };
}

// The currency comes from the database account, never from the browser
export async function buildRow(
  data: EntryOutput,
  unchangedAccountId?: string,
): Promise<BuiltRow> {
  const accounts = await listAccounts();
  const account = accounts.find(
    (candidate) =>
      candidate.id === data.accountId &&
      (!candidate.archived || candidate.id === unchangedAccountId),
  );
  if (!account) {
    return {
      ok: false,
      state: {
        status: "error",
        fieldErrors: { accountId: "account_required" },
      },
    };
  }
  const amount = parseEntryAmount(data.amount, account.currency, data.kind);
  if (!amount.ok) {
    return {
      ok: false,
      state: { status: "error", fieldErrors: { amount: amount.error } },
    };
  }
  return {
    ok: true,
    row: {
      account_id: account.id,
      category_id: data.categoryId,
      kind: data.kind,
      amount_minor: amount.value.minor,
      currency: account.currency,
      description: data.note,
      transaction_date: data.date,
      trip_id: data.tripId === "" ? null : data.tripId,
    },
  };
}

export function databaseErrorState(error: {
  code: string;
  message: string;
}): EntryFormState {
  // 23503 is a foreign key: the trip is not yours or is gone, else the category
  if (error.code === "23503" && /trip/i.test(error.message)) {
    return { status: "error", fieldErrors: { tripId: "trip_not_found" } };
  }
  if (error.code === "23503") {
    return { status: "error", fieldErrors: { categoryId: "invalid_category" } };
  }
  // 23514 is a check constraint, such as the amount sign or size
  if (error.code === "23514") {
    return { status: "error", fieldErrors: { amount: "amount_invalid" } };
  }
  console.error("Could not save the transaction", {
    code: error.code,
    message: error.message,
  });
  return { status: "error", error: "unknown" };
}

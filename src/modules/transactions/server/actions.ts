"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { listAccounts } from "@/modules/accounts";
import { requireUser } from "@/modules/auth";
import {
  type EntryOutput,
  entrySchema,
  fieldErrorsFrom,
  parseEntryAmount,
} from "../domain/schemas";
import {
  ENTRY_KINDS,
  type EntryFieldName,
  type EntryFormState,
} from "../domain/types";
import { rememberAccount } from "./last-account";
import { getEntry } from "./queries";
import { savedTarget, withParam } from "./saved-target";

type EntryRow = {
  account_id: string;
  category_id: string;
  kind: "income" | "expense";
  amount_minor: number;
  currency: string;
  description: string | null;
  transaction_date: string;
};

type BuiltRow =
  { ok: true; row: EntryRow } | { ok: false; state: EntryFormState };

const FIELDS: readonly EntryFieldName[] = [
  "kind",
  "amount",
  "accountId",
  "categoryId",
  "date",
  "note",
];

function readValues(formData: FormData): Record<EntryFieldName, string> {
  const values = {} as Record<EntryFieldName, string>;
  for (const name of FIELDS) {
    const value = formData.get(name);
    values[name] = typeof value === "string" ? value : "";
  }
  return values;
}

// A tampered kind has no field on screen, so it shows as the general error
function invalidState(error: z.ZodError): EntryFormState {
  const fieldErrors = fieldErrorsFrom(error);
  return fieldErrors.kind
    ? { status: "error", error: "unknown" }
    : { status: "error", fieldErrors };
}

// The currency comes from the database account, never from the browser
async function buildRow(
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
    },
  };
}

function databaseErrorState(error: {
  code: string;
  message: string;
}): EntryFormState {
  // 23503 is the foreign key to categories: wrong owner or wrong kind
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

export async function createEntry(
  returnTo: string,
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  await requireUser();
  const parsed = entrySchema.safeParse(readValues(formData));
  if (!parsed.success) return invalidState(parsed.error);
  const built = await buildRow(parsed.data);
  if (!built.ok) return built.state;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .insert(built.row)
    .select("id")
    .single();
  if (error) return databaseErrorState(error);

  await rememberAccount(built.row.account_id);
  redirect(withParam(savedTarget(returnTo), "saved", data.id));
}

export async function updateEntry(
  id: string,
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  await requireUser();
  // A bad id, someone else's entry or a deleted one is a 404
  const entry = await getEntry(id);
  const parsed = entrySchema.safeParse(readValues(formData));
  if (!parsed.success) return invalidState(parsed.error);
  // An entry on an archived account can still be edited while it stays on that account
  const built = await buildRow(parsed.data, entry.accountId);
  if (!built.ok) return built.state;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update(built.row)
    .eq("id", id)
    .in("kind", [...ENTRY_KINDS])
    .is("deleted_at", null)
    .select("id");
  if (error) return databaseErrorState(error);
  if (data.length === 0) return { status: "error", error: "not_found" };

  redirect(`/transactions?saved=${id}`);
}

// A soft delete: the row stays, marked as deleted, and the audit log keeps its history
export async function deleteEntry(id: string): Promise<void> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .in("kind", [...ENTRY_KINDS])
    .is("deleted_at", null)
    .select("id");
  if (error) {
    console.error("Could not delete the transaction", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Could not delete the transaction", { cause: error });
  }
  if (data.length === 0) notFound();

  redirect("/transactions?deleted=1");
}

"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { getProfile, todayIn } from "@/modules/profile";
import {
  accountFieldsSchema,
  createAccountSchema,
  fieldErrorsFrom,
  parseStartingAmount,
} from "../domain/schemas";
import type { AccountFormState, AccountFormValues } from "../domain/types";
import { getAccount } from "./queries";

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readValues(formData: FormData, currency?: string): AccountFormValues {
  return {
    name: textField(formData, "name"),
    type: textField(formData, "type"),
    currency: currency ?? textField(formData, "currency"),
    startingAmount: textField(formData, "startingAmount"),
  };
}

function logDatabaseError(
  message: string,
  error: { code: string; message: string },
) {
  console.error(message, { code: error.code, message: error.message });
}

export async function createAccount(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  await requireUser();
  const values = readValues(formData);
  const parsed = createAccountSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }
  const amount = parseStartingAmount(
    parsed.data.startingAmount,
    parsed.data.type,
    parsed.data.currency,
  );
  if (!amount.ok) {
    return {
      status: "error",
      fieldErrors: { startingAmount: amount.error },
      values,
    };
  }

  const profile = await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_account", {
    p_name: parsed.data.name,
    p_type: parsed.data.type,
    p_currency: parsed.data.currency,
    p_opening_balance_minor: amount.value.minor,
    p_opened_on: todayIn(profile.timeZone),
  });
  if (error) {
    // 23505 is the unique index on active account names
    if (error.code === "23505") {
      return { status: "error", fieldErrors: { name: "name_taken" }, values };
    }
    logDatabaseError("Could not create the account", error);
    return { status: "error", error: "unknown", values };
  }

  redirect("/accounts?notice=added");
}

export async function updateAccount(
  id: string,
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  // The currency comes from the database, never from the browser
  const account = await getAccount(id);
  const values = readValues(formData, account.currency);
  const parsed = accountFieldsSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }
  const amount = parseStartingAmount(
    parsed.data.startingAmount,
    parsed.data.type,
    account.currency,
  );
  if (!amount.ok) {
    return {
      status: "error",
      fieldErrors: { startingAmount: amount.error },
      values,
    };
  }

  const profile = await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_account", {
    p_account_id: id,
    p_name: parsed.data.name,
    p_type: parsed.data.type,
    p_opening_balance_minor: amount.value.minor,
    p_opened_on: todayIn(profile.timeZone),
  });
  if (error) {
    if (error.code === "23505") {
      return { status: "error", fieldErrors: { name: "name_taken" }, values };
    }
    // P0002 is raised by update_account when the row isn't there or isn't yours
    if (error.code === "P0002") {
      return { status: "error", error: "not_found", values };
    }
    logDatabaseError("Could not update the account", error);
    return { status: "error", error: "unknown", values };
  }

  redirect(`/accounts/${id}?notice=saved`);
}

// Returns "name_taken" when bringing an account back would clash with an active one of the same name
async function setArchivedAt(
  id: string,
  archivedAt: string | null,
): Promise<"ok" | "name_taken"> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .update({ archived_at: archivedAt })
    .eq("id", id)
    .select("id");
  if (error?.code === "23505") return "name_taken";
  if (error) {
    logDatabaseError("Could not change the archived state", error);
    throw new Error("Could not change the archived state", { cause: error });
  }
  if (data.length === 0) notFound();
  return "ok";
}

export async function archiveAccount(id: string): Promise<void> {
  await setArchivedAt(id, new Date().toISOString());
  redirect("/accounts?notice=archived");
}

export async function unarchiveAccount(id: string): Promise<void> {
  const result = await setArchivedAt(id, null);
  if (result === "name_taken") {
    redirect(`/accounts/${id}?notice=unarchive_name_taken`);
  }
  redirect(`/accounts/${id}`);
}

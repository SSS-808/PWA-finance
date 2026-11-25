"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { JAR_TYPE } from "@/modules/accounts";
import { requireUser } from "@/modules/auth";
import {
  type CurrencyCode,
  type Money,
  isCurrencyCode,
  isZero,
  money,
} from "@/modules/money";
import { getProfile, todayIn } from "@/modules/profile";
import {
  NEW_PERSON,
  NO_ACCOUNT,
  dueSchema,
  fieldErrorsFrom,
  moveSchema,
  nameSchema,
  parseAmount,
  repaySchema,
} from "../domain/schemas";
import type {
  EditFieldName,
  EditFormState,
  FormState,
  MoveFieldName,
  MoveFormState,
  PeopleErrorKey,
  RepayFieldName,
  RepayFormState,
} from "../domain/types";
import { getPerson, listAccountChoices } from "./queries";

const idSchema = z.uuid();

const MOVE_FIELDS: readonly MoveFieldName[] = [
  "kind",
  "person",
  "newName",
  "account",
  "currency",
  "amount",
  "date",
  "dueOn",
  "note",
];

const REPAY_FIELDS: readonly RepayFieldName[] = [
  "amount",
  "account",
  "accountAmount",
  "date",
];

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readValues<Field extends string>(
  formData: FormData,
  fields: readonly Field[],
): Record<Field, string> {
  const values = {} as Record<Field, string>;
  for (const name of fields) values[name] = textField(formData, name);
  return values;
}

// Only the error code is logged, never the message, which can hold names or amounts
function logDatabaseError(message: string, error: { code: string }) {
  console.error(message, { code: error.code });
}

function fail<Field extends string>(
  values: Record<Field, string>,
  fieldErrors: Partial<Record<Field, PeopleErrorKey>>,
): FormState<Field> {
  return { status: "error", fieldErrors, values };
}

// P0002 is a person, jar or account that is not there; the other codes are bugs
function rpcFailure<Field extends string>(
  error: { code: string },
  values: Record<Field, string>,
): FormState<Field> {
  if (error.code === "P0002") {
    return { status: "error", error: "not_found", values };
  }
  logDatabaseError("Could not save the money", error);
  return { status: "error", error: "unknown", values };
}

async function setDueDate(
  personId: string,
  currency: CurrencyCode,
  dueOn: string,
): Promise<boolean> {
  const supabase = await createClient();
  const jar = await supabase.rpc("person_jar", {
    p_person_id: personId,
    p_currency: currency,
  });
  if (jar.error) {
    logDatabaseError("Could not find the jar", jar.error);
    return false;
  }
  const { error } = await supabase
    .from("accounts")
    .update({ due_on: dueOn })
    .eq("id", jar.data)
    .eq("type", JAR_TYPE);
  if (error) {
    logDatabaseError("Could not set the date", error);
    return false;
  }
  return true;
}

// Lend or borrow: money between an account and a person, or a debt from before the app
export async function moveMoney(
  _prev: MoveFormState,
  formData: FormData,
): Promise<MoveFormState> {
  await requireUser();
  const values = readValues(formData, MOVE_FIELDS);
  const parsed = moveSchema.safeParse(values);
  if (!parsed.success) {
    return fail(values, fieldErrorsFrom<MoveFieldName>(parsed.error));
  }
  const input = parsed.data;

  // The currency comes from the account in the database, never from the browser
  let currency: CurrencyCode;
  let accountId: string | null = null;
  if (input.account === NO_ACCOUNT) {
    if (!isCurrencyCode(input.currency)) {
      return fail(values, { currency: "currency_invalid" });
    }
    currency = input.currency;
  } else {
    const accounts = await listAccountChoices();
    const account = accounts.find((choice) => choice.id === input.account);
    if (!account) return fail(values, { account: "account_required" });
    currency = account.currency;
    accountId = account.id;
  }
  const amount = parseAmount(input.amount, currency);
  if (!amount.ok) return fail(values, { amount: amount.error });

  const supabase = await createClient();
  let personId = input.person;
  if (personId === NEW_PERSON) {
    const created = await supabase
      .from("people")
      .insert({ name: input.newName.trim() })
      .select("id")
      .single();
    if (created.error) {
      if (created.error.code === "23505") {
        return fail(values, { newName: "name_taken" });
      }
      logDatabaseError("Could not add the person", created.error);
      return { status: "error", error: "unknown", values };
    }
    personId = created.data.id;
  }

  const lend = input.kind === "lend";
  const result =
    accountId === null
      ? await supabase.rpc("start_person_balance", {
          p_person_id: personId,
          p_currency: currency,
          p_amount_minor: lend ? amount.value.minor : -amount.value.minor,
          p_date: input.date,
          p_description: input.note ?? undefined,
        })
      : await supabase.rpc("move_money_with_person", {
          p_person_id: personId,
          p_account_id: accountId,
          p_to_person: lend,
          p_person_currency: currency,
          p_person_amount_minor: amount.value.minor,
          p_account_amount_minor: amount.value.minor,
          p_date: input.date,
          p_description: input.note ?? undefined,
        });
  if (result.error) return rpcFailure(result.error, values);

  if (
    input.dueOn !== null &&
    !(await setDueDate(personId, currency, input.dueOn))
  ) {
    return { status: "error", error: "unknown", values };
  }
  redirect(`/people/${personId}?notice=saved`);
}

// A jar's balance, read from the database; null when the jar is not this person's
async function jarBalance(
  personId: string,
  jarId: string,
): Promise<Money | null> {
  const supabase = await createClient();
  const jar = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", jarId)
    .eq("person_id", personId)
    .eq("type", JAR_TYPE)
    .is("archived_at", null)
    .maybeSingle();
  if (jar.error) {
    throw new Error("Could not load the jar", { cause: jar.error });
  }
  if (!jar.data || !isCurrencyCode(jar.data.currency)) return null;
  const balance = await supabase
    .from("account_balances")
    .select("balance_minor")
    .eq("account_id", jarId)
    .maybeSingle();
  if (balance.error) {
    throw new Error("Could not load the balance", { cause: balance.error });
  }
  return money(balance.data?.balance_minor ?? 0, jar.data.currency);
}

// Pay back: they paid you (jar above zero) or you paid them (jar below zero)
export async function repay(
  personId: string,
  jarId: string,
  _prev: RepayFormState,
  formData: FormData,
): Promise<RepayFormState> {
  await requireUser();
  if (!idSchema.safeParse(personId).success) notFound();
  if (!idSchema.safeParse(jarId).success) notFound();
  const values = readValues(formData, REPAY_FIELDS);
  const parsed = repaySchema.safeParse(values);
  if (!parsed.success) {
    return fail(values, fieldErrorsFrom<RepayFieldName>(parsed.error));
  }
  const input = parsed.data;

  const owed = await jarBalance(personId, jarId);
  if (owed === null || isZero(owed)) {
    return { status: "error", error: "not_found", values };
  }
  const accounts = await listAccountChoices();
  const account = accounts.find((choice) => choice.id === input.account);
  if (!account) return fail(values, { account: "account_required" });

  const amount = parseAmount(input.amount, owed.currency);
  if (!amount.ok) return fail(values, { amount: amount.error });
  if (amount.value.minor > Math.abs(owed.minor)) {
    return fail(values, { amount: "amount_too_much" });
  }
  let accountAmount = amount.value;
  if (account.currency !== owed.currency) {
    const other = parseAmount(
      input.accountAmount,
      account.currency,
      "account_amount_required",
    );
    if (!other.ok) return fail(values, { accountAmount: other.error });
    accountAmount = other.value;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_money_with_person", {
    p_person_id: personId,
    p_account_id: account.id,
    p_to_person: owed.minor < 0,
    p_person_currency: owed.currency,
    p_person_amount_minor: amount.value.minor,
    p_account_amount_minor: accountAmount.minor,
    p_date: input.date,
  });
  if (error) return rpcFailure(error, values);

  redirect(`/people/${personId}?notice=saved`);
}

// Writes off what is left in a jar; the database makes the expense or income
export async function forgiveJar(
  personId: string,
  jarId: string,
): Promise<void> {
  await requireUser();
  if (!idSchema.safeParse(personId).success) notFound();
  if (!idSchema.safeParse(jarId).success) notFound();
  if ((await jarBalance(personId, jarId)) === null) notFound();
  const profile = await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("forgive_person_balance", {
    p_jar_id: jarId,
    p_date: todayIn(profile.timeZone),
  });
  if (error?.code === "P0002") notFound();
  // 22023 means the jar is already at 0, so there is nothing to do
  if (error && error.code !== "22023") {
    logDatabaseError("Could not forgive the balance", error);
    throw new Error("Could not forgive the balance", { cause: error });
  }

  redirect(`/people/${personId}?notice=${error ? "saved" : "forgiven"}`);
}

// Renames the person (the database renames the jars) and sets or clears each open jar's date
export async function updatePerson(
  personId: string,
  _prev: EditFormState,
  formData: FormData,
): Promise<EditFormState> {
  await requireUser();
  const person = await getPerson(personId);
  const values: Record<string, string> = {
    name: textField(formData, "name"),
  };
  const dueDates = new Map<string, string | null>();
  const fieldErrors: Record<string, PeopleErrorKey> = {};
  for (const jar of person.jars) {
    const field = `due:${jar.id}`;
    values[field] = textField(formData, field);
    const due = dueSchema.safeParse(values[field]);
    if (due.success) dueDates.set(jar.id, due.data);
    else fieldErrors[field] = "date_invalid";
  }
  const name = nameSchema.safeParse(values.name);
  if (!name.success) {
    fieldErrors.name = fieldErrorsFrom<"name">(name.error).name ?? "unknown";
  }
  if (!name.success || Object.keys(fieldErrors).length > 0) {
    return fail<EditFieldName>(values, fieldErrors);
  }

  const supabase = await createClient();
  const renamed = await supabase
    .from("people")
    .update({ name: name.data })
    .eq("id", person.id);
  if (renamed.error) {
    if (renamed.error.code === "23505") {
      return fail<EditFieldName>(values, { name: "name_taken" });
    }
    logDatabaseError("Could not rename the person", renamed.error);
    return { status: "error", error: "unknown", values };
  }
  for (const [jarId, dueOn] of dueDates) {
    const { error } = await supabase
      .from("accounts")
      .update({ due_on: dueOn })
      .eq("id", jarId)
      .eq("person_id", person.id)
      .eq("type", JAR_TYPE);
    if (error) {
      logDatabaseError("Could not set the date", error);
      return { status: "error", error: "unknown", values };
    }
  }

  redirect(`/people/${person.id}?notice=saved`);
}

// Archives a person whose jars are all at 0; they leave the list and History keeps their name
export async function archivePerson(personId: string): Promise<void> {
  await requireUser();
  const person = await getPerson(personId);
  if (person.jars.some((jar) => !isZero(jar.balance))) {
    redirect(`/people/${person.id}`);
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("people")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", person.id);
  if (error) {
    logDatabaseError("Could not archive the person", error);
    throw new Error("Could not archive the person", { cause: error });
  }

  redirect("/people?notice=archived");
}

// Deletes one row of the person's history: both legs of a transfer, or a single entry; transferId is "" for a single entry
export async function deletePersonEntry(
  personId: string,
  entryId: string,
  transferId: string,
): Promise<void> {
  await requireUser();
  if (!idSchema.safeParse(entryId).success) notFound();
  const person = await getPerson(personId);
  const jarIds = person.jars.map((jar) => jar.id);
  const supabase = await createClient();

  if (transferId === "") {
    const { data, error } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", entryId)
      .in("account_id", jarIds)
      .in("kind", ["adjustment", "income", "expense"])
      .is("deleted_at", null)
      .select("id");
    if (error) {
      logDatabaseError("Could not delete the entry", error);
      throw new Error("Could not delete the entry", { cause: error });
    }
    if (data.length === 0) notFound();
  } else {
    if (!idSchema.safeParse(transferId).success) notFound();
    // The transfer must touch one of this person's jars
    const leg = await supabase
      .from("transactions")
      .select("id")
      .eq("id", entryId)
      .eq("transfer_id", transferId)
      .in("account_id", jarIds)
      .is("deleted_at", null)
      .maybeSingle();
    if (leg.error) {
      throw new Error("Could not load the transfer", { cause: leg.error });
    }
    if (!leg.data) notFound();
    const { error } = await supabase.rpc("delete_transfer", {
      p_transfer_id: transferId,
    });
    if (error?.code === "P0002") notFound();
    if (error) {
      logDatabaseError("Could not delete the transfer", error);
      throw new Error("Could not delete the transfer", { cause: error });
    }
  }

  redirect(`/people/${person.id}?notice=entryDeleted`);
}

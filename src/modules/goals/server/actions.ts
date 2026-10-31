"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { listAccounts } from "@/modules/accounts";
import { requireUser } from "@/modules/auth";
import { isCurrencyCode } from "@/modules/money";
import { getProfile, todayIn } from "@/modules/profile";
import {
  contributionSchema,
  fieldErrorsFrom,
  goalSchema,
} from "../domain/schemas";
import type {
  ContributionFormState,
  GoalFormState,
  GoalFormValues,
} from "../domain/types";

const LIST_PATH = "/goals";

const idSchema = z.uuid();

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function logDatabaseError(
  message: string,
  error: { code: string; message: string },
) {
  console.error(message, { code: error.code, message: error.message });
}

// The goal's own currency and state, read under the person's access rules, never taken from the browser
async function readGoal(id: string) {
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("currency, archived_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logDatabaseError("Could not load the goal", error);
    throw new Error("Could not load the goal", { cause: error });
  }
  if (!data) notFound();
  // The database checks this value, so anything else is a bug
  if (!isCurrencyCode(data.currency)) {
    throw new Error(`Unexpected goal currency: ${data.currency}`);
  }
  return { currency: data.currency, archived: data.archived_at !== null };
}

function readValues(formData: FormData, currency?: string): GoalFormValues {
  return {
    name: textField(formData, "name"),
    currency: currency ?? textField(formData, "currency"),
    target: textField(formData, "target"),
    deadline: textField(formData, "deadline"),
  };
}

export async function createGoal(
  _prev: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  await requireUser();
  const values = readValues(formData);
  const parsed = goalSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("goals").insert({
    name: parsed.data.name,
    currency: parsed.data.currency,
    target_minor: parsed.data.target.minor,
    deadline: parsed.data.deadline,
  });
  if (error) {
    // 23505 is the unique index on active goal names
    if (error.code === "23505") {
      return { status: "error", fieldErrors: { name: "name_taken" }, values };
    }
    logDatabaseError("Could not create the goal", error);
    return { status: "error", error: "unknown", values };
  }

  redirect(`${LIST_PATH}?notice=added`);
}

export async function updateGoal(
  id: string,
  _prev: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  await requireUser();
  const goal = await readGoal(id);
  const values = readValues(formData, goal.currency);
  const parsed = goalSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  // The currency is not in this update, so it can never change
  const { data, error } = await supabase
    .from("goals")
    .update({
      name: parsed.data.name,
      target_minor: parsed.data.target.minor,
      deadline: parsed.data.deadline,
    })
    .eq("id", id)
    .select("id");
  if (error) {
    if (error.code === "23505") {
      return { status: "error", fieldErrors: { name: "name_taken" }, values };
    }
    logDatabaseError("Could not update the goal", error);
    return { status: "error", error: "unknown", values };
  }
  if (data.length === 0) {
    return { status: "error", error: "not_found", values };
  }

  redirect(`${LIST_PATH}/${id}?notice=saved`);
}

// Returns "name_taken" when bringing a goal back would clash with an active one of the same name
async function setArchivedAt(
  id: string,
  archivedAt: string | null,
): Promise<"ok" | "name_taken"> {
  await requireUser();
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
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

export async function archiveGoal(id: string): Promise<void> {
  await setArchivedAt(id, new Date().toISOString());
  redirect(`${LIST_PATH}?notice=archived`);
}

export async function unarchiveGoal(id: string): Promise<void> {
  const result = await setArchivedAt(id, null);
  if (result === "name_taken") {
    redirect(`${LIST_PATH}?archived=1&notice=unarchive_name_taken`);
  }
  redirect(`${LIST_PATH}/${id}?notice=saved`);
}

// The account must be one of the person's active accounts in the goal's currency; an empty value means no account
async function readAccountId(
  value: string,
  currency: string,
): Promise<{ ok: true; id: string | null } | { ok: false }> {
  if (value === "") return { ok: true, id: null };
  if (!idSchema.safeParse(value).success) return { ok: false };
  const accounts = await listAccounts();
  const account = accounts.find(
    (candidate) =>
      candidate.id === value &&
      !candidate.archived &&
      candidate.currency === currency,
  );
  return account ? { ok: true, id: account.id } : { ok: false };
}

// Money set aside for a goal; the currency comes from the goal and the date from the server, never from the browser
export async function addContribution(
  goalId: string,
  _prev: ContributionFormState,
  formData: FormData,
): Promise<ContributionFormState> {
  await requireUser();
  const goal = await readGoal(goalId);
  const values = {
    amount: textField(formData, "amount"),
    account: textField(formData, "account"),
  };
  if (goal.archived) return { status: "error", error: "not_found", values };

  const parsed = contributionSchema.safeParse({
    currency: goal.currency,
    amount: values.amount,
    direction: textField(formData, "direction"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const account = await readAccountId(values.account, goal.currency);
  if (!account.ok) return { status: "error", error: "not_found", values };

  const profile = await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("goal_contributions").insert({
    goal_id: goalId,
    currency: parsed.data.currency,
    amount_minor: parsed.data.amount.minor,
    contributed_on: todayIn(profile.timeZone),
    account_id: account.id,
  });
  if (error) {
    // 23514 is the check that what a goal holds, in an account or outside any, never goes below zero
    if (error.code === "23514") {
      return {
        status: "error",
        fieldErrors: {
          amount:
            account.id === null ? "not_enough_saved" : "not_enough_in_account",
        },
        values,
      };
    }
    // 23503 is the foreign key: the goal is missing or not the person's
    if (error.code === "23503") notFound();
    logDatabaseError("Could not save the contribution", error);
    return { status: "error", error: "unknown", values };
  }

  redirect(
    `${LIST_PATH}/${goalId}?notice=${parsed.data.amount.minor < 0 ? "money_taken" : "money_added"}`,
  );
}

// Takes out the goal money an account no longer holds; the database works out the amount, never the browser
export async function takeOutMissing(
  goalId: string,
  accountId: string,
): Promise<void> {
  await requireUser();
  const goal = await readGoal(goalId);
  if (!idSchema.safeParse(accountId).success || goal.archived) notFound();

  const profile = await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_goal_shortfall", {
    p_account_id: accountId,
    p_goal_id: goalId,
    p_on: todayIn(profile.timeZone),
  });
  // P0002 is raised when the account isn't there or isn't the person's
  if (error?.code === "P0002") notFound();
  if (error) {
    logDatabaseError("Could not take out the missing money", error);
    throw new Error("Could not take out the missing money", { cause: error });
  }

  redirect(`${LIST_PATH}/${goalId}?notice=missing_taken`);
}

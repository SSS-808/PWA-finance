"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { CURRENCY_CODES } from "@/modules/money";
import { getProfile, todayIn } from "@/modules/profile";
import { budgetSchema, fieldErrorsFrom } from "../domain/schemas";
import type { BudgetFormState, BudgetFormValues } from "../domain/types";

const LIST_PATH = "/budgets";

const endSchema = z.object({
  categoryId: z.uuid(),
  currency: z.enum(CURRENCY_CODES),
});

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

// The month a change is written for; always the server's current month, never one from the browser
async function currentMonthStart(): Promise<string> {
  const profile = await getProfile();
  return `${todayIn(profile.timeZone).slice(0, 7)}-01`;
}

export async function saveBudget(
  _prev: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  await requireUser();
  const values: BudgetFormValues = {
    categoryId: textField(formData, "categoryId"),
    currency: textField(formData, "currency"),
    amount: textField(formData, "amount"),
  };
  const parsed = budgetSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const startMonth = await currentMonthStart();
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").upsert(
    {
      category_id: parsed.data.categoryId,
      currency: parsed.data.currency,
      start_month: startMonth,
      amount_minor: parsed.data.amount.minor,
    },
    { onConflict: "user_id,category_id,currency,start_month" },
  );
  if (error) {
    // 23503 is the foreign key: the category is missing, someone else's, or not an expense category
    if (error.code === "23503") {
      return {
        status: "error",
        fieldErrors: { categoryId: "invalid_category" },
        values,
      };
    }
    logDatabaseError("Could not save the budget", error);
    return { status: "error", error: "unknown", values };
  }

  redirect(`${LIST_PATH}?notice=saved`);
}

// Ending is a change to 0 from the current month on; earlier months keep the budget
export async function endBudget(
  categoryId: string,
  currency: string,
): Promise<void> {
  await requireUser();
  const parsed = endSchema.safeParse({ categoryId, currency });
  if (!parsed.success) notFound();

  const startMonth = await currentMonthStart();
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").upsert(
    {
      category_id: parsed.data.categoryId,
      currency: parsed.data.currency,
      start_month: startMonth,
      amount_minor: 0,
    },
    { onConflict: "user_id,category_id,currency,start_month" },
  );
  if (error?.code === "23503") notFound();
  if (error) {
    logDatabaseError("Could not end the budget", error);
    throw new Error("Could not end the budget", { cause: error });
  }

  redirect(`${LIST_PATH}?notice=ended`);
}

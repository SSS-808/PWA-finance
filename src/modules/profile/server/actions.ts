"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { fieldErrorsFrom, profileSchema } from "../domain/schemas";
import type { ProfileFormState, ProfileFormValues } from "../domain/types";

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const values: ProfileFormValues = {
    displayName: textField(formData, "displayName"),
    baseCurrency: textField(formData, "baseCurrency"),
    timeZone: textField(formData, "timeZone"),
  };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      base_currency: parsed.data.baseCurrency,
      timezone: parsed.data.timeZone,
    })
    .eq("id", user.id);
  if (error) {
    console.error("Could not save the profile", {
      code: error.code,
      message: error.message,
    });
    return { status: "error", error: "unknown", values };
  }

  // Refetches the current page so Settings and Home show the saved values
  refresh();
  return {
    status: "saved",
    values: { ...values, displayName: parsed.data.displayName ?? "" },
  };
}

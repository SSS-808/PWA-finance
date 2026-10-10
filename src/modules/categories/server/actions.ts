"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import {
  categoryFieldsSchema,
  createCategorySchema,
  fieldErrorsFrom,
} from "../domain/schemas";
import type { CategoryFormState, CategoryFormValues } from "../domain/types";
import { getCategory } from "./queries";

const LIST_PATH = "/settings/categories";

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

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireUser();
  const values: CategoryFormValues = {
    name: textField(formData, "name"),
    kind: textField(formData, "kind"),
  };
  const parsed = createCategorySchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ name: parsed.data.name, kind: parsed.data.kind });
  if (error) {
    // 23505 is the unique index on active category names per kind
    if (error.code === "23505") {
      return { status: "error", fieldErrors: { name: "name_taken" }, values };
    }
    logDatabaseError("Could not create the category", error);
    return { status: "error", error: "unknown", values };
  }

  redirect(`${LIST_PATH}?notice=added`);
}

export async function renameCategory(
  id: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  // The kind comes from the database, never from the browser
  const category = await getCategory(id);
  const values: CategoryFormValues = {
    name: textField(formData, "name"),
    kind: category.kind,
  };
  const parsed = categoryFieldsSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsFrom(parsed.error),
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select("id");
  if (error) {
    if (error.code === "23505") {
      return { status: "error", fieldErrors: { name: "name_taken" }, values };
    }
    logDatabaseError("Could not rename the category", error);
    return { status: "error", error: "unknown", values };
  }
  if (data.length === 0) return { status: "error", error: "not_found", values };

  redirect(`${LIST_PATH}?notice=saved`);
}

// Returns "name_taken" when showing a category again would clash with an active one of the same name
async function setArchivedAt(
  id: string,
  archivedAt: string | null,
): Promise<"ok" | "name_taken"> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ archived_at: archivedAt })
    .eq("id", id)
    .select("id");
  if (error?.code === "23505") return "name_taken";
  if (error) {
    logDatabaseError("Could not change the hidden state", error);
    throw new Error("Could not change the hidden state", { cause: error });
  }
  if (data.length === 0) notFound();
  return "ok";
}

export async function hideCategory(id: string): Promise<void> {
  await setArchivedAt(id, new Date().toISOString());
  redirect(`${LIST_PATH}?notice=hidden`);
}

export async function showCategory(id: string): Promise<void> {
  const result = await setArchivedAt(id, null);
  redirect(
    `${LIST_PATH}?notice=${result === "name_taken" ? "show_name_taken" : "shown"}`,
  );
}

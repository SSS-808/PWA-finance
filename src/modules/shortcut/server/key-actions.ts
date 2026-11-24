"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { shortcutEnabled } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";
import { listAccounts } from "@/modules/accounts";
import { requireUser } from "@/modules/auth";
import { newKeySchema, type NewKeyState } from "../domain/keys";

const idSchema = z.uuid();

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// Logs only the error code, never the key
function logCode(message: string, error: { code: string }) {
  console.error(message, { code: error.code });
}

export async function createShortcutKey(
  _prev: NewKeyState,
  formData: FormData,
): Promise<NewKeyState> {
  await requireUser();
  if (!shortcutEnabled()) return { status: "error", error: "unknown" };
  const parsed = newKeySchema.safeParse({
    name: textField(formData, "name"),
    accountId: textField(formData, "accountId"),
  });
  if (!parsed.success) {
    const fieldErrors: Extract<
      NewKeyState,
      { status: "error" }
    >["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "name") {
        fieldErrors.name =
          issue.message === "name_too_long" ? "name_too_long" : "name_required";
      } else if (issue.path[0] === "accountId") {
        fieldErrors.accountId = "account_required";
      }
    }
    return { status: "error", fieldErrors };
  }

  const accounts = await listAccounts();
  const account = accounts.find(
    (candidate) =>
      candidate.id === parsed.data.accountId && !candidate.archived,
  );
  if (!account) {
    return { status: "error", fieldErrors: { accountId: "account_required" } };
  }

  const key = `pw_${randomBytes(32).toString("base64url")}`;
  const keyHash = createHash("sha256").update(key).digest("hex");
  const supabase = await createClient();
  const { error } = await supabase
    .from("shortcut_keys")
    .insert({
      name: parsed.data.name,
      account_id: account.id,
      currency: account.currency,
      key_hash: keyHash,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "P0001" && error.message === "shortcut_key_limit") {
      return { status: "error", error: "limit" };
    }
    if (error.code === "23514") {
      return { status: "error", fieldErrors: { name: "name_required" } };
    }
    if (error.code === "23503") {
      return {
        status: "error",
        fieldErrors: { accountId: "account_required" },
      };
    }
    logCode("Could not make the Shortcut key", error);
    return { status: "error", error: "unknown" };
  }

  revalidatePath("/settings/shortcut");
  revalidatePath("/settings");
  return { status: "created", name: parsed.data.name, key };
}

export async function deleteShortcutKey(id: string): Promise<void> {
  await requireUser();
  if (!shortcutEnabled() || !idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { error } = await supabase.from("shortcut_keys").delete().eq("id", id);
  if (error) {
    logCode("Could not delete the Shortcut key", error);
    throw new Error("Could not delete the Shortcut key", { cause: error });
  }
  redirect("/settings/shortcut?deleted=1");
}

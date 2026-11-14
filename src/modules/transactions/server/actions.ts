"use server";

import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { RELEASE_GOALS_FIELD } from "../domain/overspend";
import { entrySchema } from "../domain/schemas";
import { ENTRY_KINDS, type EntryFormState } from "../domain/types";
import {
  buildRow,
  databaseErrorState,
  invalidState,
  readValues,
} from "./entry-rows";
import { getEntry } from "./queries";
import { releaseGoalMoney } from "./release-goals";

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

  if (built.row.kind === "expense") {
    await releaseGoalMoney(
      built.row.account_id,
      formData.get(RELEASE_GOALS_FIELD) === "1",
    );
  }
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

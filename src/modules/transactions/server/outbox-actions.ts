"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth";
import {
  type OutboxResult,
  outboxInputSchema,
  refusalFrom,
} from "../domain/outbox";
import { entrySchema } from "../domain/schemas";
import { buildRow, databaseErrorState, invalidState } from "./entry-rows";
import { rememberAccount } from "./last-account";
import { releaseGoalMoney } from "./release-goals";

// Saves one entry from the phone's outbox; it never redirects, the client reads the result
export async function sendOutboxEntry(input: unknown): Promise<OutboxResult> {
  const checked = outboxInputSchema.safeParse(input);
  if (!checked.success) return { status: "refused", error: "unknown" };
  const { id, userId, fields, releaseGoals } = checked.data;

  const user = await getCurrentUser();
  if (!user) return { status: "signed_out" };
  if (user.id !== userId) return { status: "other_user" };

  const parsed = entrySchema.safeParse(fields);
  if (!parsed.success) return refusalFrom(invalidState(parsed.error));
  const built = await buildRow(parsed.data);
  if (!built.ok) return refusalFrom(built.state);

  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .insert({ ...built.row, id })
    .select("id")
    .single();

  if (error?.code === "23505") {
    // A repeat of an entry that already went through; goal money is not released again
    const { data: found, error: readError } = await supabase
      .from("transactions")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (readError) return { status: "failed" };
    if (found) return { status: "already_saved" };
    console.error("Outbox entry hit a duplicate key but no row is visible", {
      code: error.code,
    });
    return { status: "refused", error: "unknown" };
  }
  if (error) {
    const state = databaseErrorState(error);
    if (state.error === "unknown") return { status: "failed" };
    return refusalFrom(state);
  }

  await rememberAccount(built.row.account_id);
  if (built.row.kind === "expense") {
    await releaseGoalMoney(built.row.account_id, releaseGoals);
  }
  return { status: "saved" };
}

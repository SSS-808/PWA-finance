import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { isCurrencyCode } from "@/modules/money";
import type { ShortcutKey } from "../domain/keys";

// The person's keys, oldest first; the hash column is never read
export async function listShortcutKeys(): Promise<ShortcutKey[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shortcut_keys")
    .select("id, name, account_id, currency, created_at, last_used_at")
    .order("created_at");
  if (error) throw new Error("Could not load the keys", { cause: error });
  return data.map((row) => {
    // The database checks this value, so anything else is a bug
    if (!isCurrencyCode(row.currency)) {
      throw new Error(`Unexpected key currency: ${row.currency}`);
    }
    return {
      id: row.id,
      name: row.name,
      accountId: row.account_id,
      currency: row.currency,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    };
  });
}

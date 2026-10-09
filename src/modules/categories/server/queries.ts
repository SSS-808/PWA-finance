import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { countUsage, sortByUsage } from "../domain/usage";
import type { Category, CategoryKind } from "../domain/types";

// Usage is counted over the latest rows only, so old habits fade out
const USAGE_SAMPLE = 500;

// Active categories of one kind, most-used first
export async function listCategories(kind: CategoryKind): Promise<Category[]> {
  await requireUser();
  const supabase = await createClient();
  const [categories, recent] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("kind", kind)
      .is("archived_at", null),
    supabase
      .from("transactions")
      .select("category_id")
      .eq("kind", kind)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(USAGE_SAMPLE),
  ]);
  if (categories.error) {
    throw new Error("Could not load the categories", {
      cause: categories.error,
    });
  }
  if (recent.error) {
    throw new Error("Could not load the category usage", {
      cause: recent.error,
    });
  }
  const usage = countUsage(recent.data.map((row) => row.category_id));
  return sortByUsage(
    categories.data.map((row) => ({ id: row.id, name: row.name, kind })),
    usage,
  );
}

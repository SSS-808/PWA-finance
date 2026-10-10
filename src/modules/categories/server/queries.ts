import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { isCategoryKind } from "../domain/schemas";
import { countUsage, sortByUsage } from "../domain/usage";
import type { Category, CategoryKind, ManagedCategory } from "../domain/types";

// Usage is counted over the latest rows only, so old habits fade out
const USAGE_SAMPLE = 500;

const idSchema = z.uuid();

type CategoryRow = {
  id: string;
  name: string;
  kind: string;
  archived_at: string | null;
};

const CATEGORY_COLUMNS = "id, name, kind, archived_at";

function toManaged(row: CategoryRow): ManagedCategory {
  // The database checks this value, so anything else is a bug
  if (!isCategoryKind(row.kind)) {
    throw new Error(`Unexpected category kind: ${row.kind}`);
  }
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    hidden: row.archived_at !== null,
  };
}

// Active categories of one kind, most-used first; includeId keeps one hidden category in the list
export async function listCategories(
  kind: CategoryKind,
  includeId?: string,
): Promise<Category[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase.from("categories").select("id, name").eq("kind", kind);
  // Only a real uuid goes into the filter text
  query =
    includeId !== undefined && idSchema.safeParse(includeId).success
      ? query.or(`archived_at.is.null,id.eq.${includeId}`)
      : query.is("archived_at", null);
  const [categories, recent] = await Promise.all([
    query,
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

// Active and hidden categories of both kinds, sorted by name
export async function listAllCategories(): Promise<ManagedCategory[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_COLUMNS);
  if (error) {
    throw new Error("Could not load the categories", { cause: error });
  }
  return data
    .map(toManaged)
    .sort((a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
    );
}

// One category; a bad id or someone else's category is a 404
export async function getCategory(id: string): Promise<ManagedCategory> {
  await requireUser();
  if (!idSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error("Could not load the category", { cause: error });
  }
  if (!data) notFound();
  return toManaged(data);
}

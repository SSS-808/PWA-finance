import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import {
  isCategoryColor,
  isCategoryIcon,
  isCategoryKind,
} from "../domain/schemas";
import { sortByPosition } from "../domain/order";
import type {
  Category,
  CategoryKind,
  CategoryLook,
  ManagedCategory,
} from "../domain/types";

const idSchema = z.uuid();

type CategoryRow = {
  id: string;
  name: string;
  kind: string;
  icon: string;
  color: string;
  archived_at: string | null;
  position: number;
};

const CATEGORY_COLUMNS = "id, name, kind, icon, color, archived_at, position";

// The database checks these values, so anything else is a bug
function toLook(row: { icon: string; color: string }): CategoryLook {
  if (!isCategoryIcon(row.icon)) {
    throw new Error(`Unexpected category icon: ${row.icon}`);
  }
  if (!isCategoryColor(row.color)) {
    throw new Error(`Unexpected category colour: ${row.color}`);
  }
  return { icon: row.icon, color: row.color };
}

function toManaged(row: CategoryRow): ManagedCategory {
  // The database checks this value, so anything else is a bug
  if (!isCategoryKind(row.kind)) {
    throw new Error(`Unexpected category kind: ${row.kind}`);
  }
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    ...toLook(row),
    hidden: row.archived_at !== null,
  };
}

// Active categories of one kind in the person's order; includeId keeps one hidden category in the list
export async function listCategories(
  kind: CategoryKind,
  includeId?: string,
): Promise<Category[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase
    .from("categories")
    .select("id, name, icon, color, position")
    .eq("kind", kind);
  // Only a real uuid goes into the filter text
  query =
    includeId !== undefined && idSchema.safeParse(includeId).success
      ? query.or(`archived_at.is.null,id.eq.${includeId}`)
      : query.is("archived_at", null);
  const { data, error } = await query;
  if (error) {
    throw new Error("Could not load the categories", { cause: error });
  }
  return sortByPosition(data).map((row) => ({
    id: row.id,
    name: row.name,
    kind,
    ...toLook(row),
  }));
}

// Active and hidden categories of both kinds in the person's order
export async function listAllCategories(): Promise<ManagedCategory[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_COLUMNS);
  if (error) {
    throw new Error("Could not load the categories", { cause: error });
  }
  return sortByPosition(data).map(toManaged);
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

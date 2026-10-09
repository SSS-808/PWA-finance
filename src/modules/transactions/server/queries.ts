import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { type Money, isCurrencyCode, money } from "@/modules/money";
import {
  type DayGroup,
  type HistoryRow,
  groupByDay,
  toHistoryItems,
} from "../domain/history";
import {
  ENTRY_KINDS,
  TRANSACTION_KINDS,
  type Entry,
  type EntryKind,
  type TransactionKind,
} from "../domain/types";

export type SavedSummary = {
  kind: TransactionKind;
  categoryName: string | null;
  amount: Money;
};

const idSchema = z.uuid();

const HISTORY_COLUMNS =
  "id, kind, transfer_id, transaction_date, created_at, description, amount_minor, currency, accounts(name), categories(name)";

function isTransactionKind(value: string): value is TransactionKind {
  return (TRANSACTION_KINDS as readonly string[]).includes(value);
}

function isEntryKind(value: string): value is EntryKind {
  return (ENTRY_KINDS as readonly string[]).includes(value);
}

type HistoryRecord = {
  id: string;
  kind: string;
  transfer_id: string | null;
  transaction_date: string;
  created_at: string;
  description: string | null;
  amount_minor: number;
  currency: string;
  accounts: { name: string } | null;
  categories: { name: string } | null;
};

function toHistoryRow(record: HistoryRecord): HistoryRow {
  // The database checks these values, so anything else is a bug
  if (!isTransactionKind(record.kind)) {
    throw new Error(`Unexpected transaction kind: ${record.kind}`);
  }
  if (!isCurrencyCode(record.currency)) {
    throw new Error(`Unexpected transaction currency: ${record.currency}`);
  }
  return {
    id: record.id,
    kind: record.kind,
    transferId: record.transfer_id,
    date: record.transaction_date,
    createdAt: record.created_at,
    accountName: record.accounts?.name ?? "",
    categoryName: record.categories?.name ?? null,
    note: record.description,
    amount: money(record.amount_minor, record.currency),
  };
}

// The latest transactions grouped by day; a transfer always comes with both of its legs
export async function listRecentTransactions(limit = 50): Promise<DayGroup[]> {
  await requireUser();
  const supabase = await createClient();
  const recent = await supabase
    .from("transactions")
    .select(HISTORY_COLUMNS)
    .is("deleted_at", null)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (recent.error) {
    throw new Error("Could not load the transactions", { cause: recent.error });
  }

  // The cut-off can fall between the two legs of a transfer, so fetch every leg of the ones shown
  const transferIds = [
    ...new Set(
      recent.data.flatMap((record) =>
        record.transfer_id ? [record.transfer_id] : [],
      ),
    ),
  ];
  let records: HistoryRecord[] = recent.data;
  if (transferIds.length > 0) {
    const legs = await supabase
      .from("transactions")
      .select(HISTORY_COLUMNS)
      .in("transfer_id", transferIds)
      .is("deleted_at", null);
    if (legs.error) {
      throw new Error("Could not load the transfers", { cause: legs.error });
    }
    const loaded = new Set(records.map((record) => record.id));
    records = [
      ...records,
      ...legs.data.filter((record) => !loaded.has(record.id)),
    ];
  }
  return groupByDay(toHistoryItems(records.map(toHistoryRow)));
}

// An income or expense that is yours and not deleted; anything else is a 404
export async function getEntry(id: string): Promise<Entry> {
  await requireUser();
  if (!idSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, kind, account_id, category_id, amount_minor, currency, description, transaction_date",
    )
    .eq("id", id)
    .in("kind", [...ENTRY_KINDS])
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    throw new Error("Could not load the transaction", { cause: error });
  }
  if (!data) notFound();
  // The database checks these values, so anything else is a bug
  if (!isEntryKind(data.kind) || data.category_id === null) {
    throw new Error(`Unexpected transaction: ${data.kind}`);
  }
  if (!isCurrencyCode(data.currency)) {
    throw new Error(`Unexpected transaction currency: ${data.currency}`);
  }
  return {
    id: data.id,
    kind: data.kind,
    accountId: data.account_id,
    categoryId: data.category_id,
    amount: money(data.amount_minor, data.currency),
    date: data.transaction_date,
    note: data.description,
  };
}

// What the "Saved" note needs; an unknown or foreign id gives null, so the URL can't be used to probe
export async function getSavedSummary(
  id: string,
): Promise<SavedSummary | null> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("kind, amount_minor, currency, categories(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error("Could not load the saved transaction", { cause: error });
  }
  if (!data) return null;
  if (!isTransactionKind(data.kind) || !isCurrencyCode(data.currency)) {
    throw new Error(`Unexpected transaction: ${data.kind} ${data.currency}`);
  }
  return {
    kind: data.kind,
    categoryName: data.categories?.name ?? null,
    amount: money(data.amount_minor, data.currency),
  };
}

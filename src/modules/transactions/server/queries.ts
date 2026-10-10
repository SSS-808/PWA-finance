import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { type Money, isCurrencyCode, money, negate } from "@/modules/money";
import {
  KINDS_BY_TYPE,
  type HistoryFilters,
  escapeLike,
  monthRange,
} from "../domain/filters";
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
  type Transfer,
} from "../domain/types";

export type SavedSummary = {
  kind: TransactionKind;
  categoryName: string | null;
  amount: Money;
};

export type SavedTransferSummary = {
  from: string;
  to: string;
  fromAmount: Money;
  toAmount: Money;
};

const idSchema = z.uuid();

const MAX_ROWS = 500;

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

// The transactions that match the filters, newest first and grouped by day; a transfer always comes with both of its legs
export async function listTransactions(
  filters: HistoryFilters,
  limit = MAX_ROWS,
): Promise<DayGroup[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(HISTORY_COLUMNS)
    .is("deleted_at", null);
  if (filters.month) {
    const { from, to } = monthRange(filters.month);
    query = query.gte("transaction_date", from).lt("transaction_date", to);
  }
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.type) query = query.in("kind", [...KINDS_BY_TYPE[filters.type]]);
  if (filters.q) {
    query = query.ilike("description", `%${escapeLike(filters.q)}%`);
  }
  const recent = await query
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

type LegRecord = {
  account_id: string;
  amount_minor: number;
  currency: string;
  description: string | null;
  transaction_date: string;
  accounts: { name: string } | null;
};

type Leg = {
  accountId: string;
  accountName: string;
  amount: Money;
  date: string;
  note: string | null;
};

type TransferLegs = { out: Leg; into: Leg };

const LEG_COLUMNS =
  "account_id, amount_minor, currency, description, transaction_date, accounts(name)";

function toLeg(record: LegRecord): Leg {
  // The database checks this value, so anything else is a bug
  if (!isCurrencyCode(record.currency)) {
    throw new Error(`Unexpected transfer currency: ${record.currency}`);
  }
  return {
    accountId: record.account_id,
    accountName: record.accounts?.name ?? "",
    amount: money(record.amount_minor, record.currency),
    date: record.transaction_date,
    note: record.description,
  };
}

// Both legs of a transfer that is yours and not deleted; anything else gives null
async function loadLegs(transferId: string): Promise<TransferLegs | null> {
  if (!idSchema.safeParse(transferId).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(LEG_COLUMNS)
    .eq("transfer_id", transferId)
    .eq("kind", "transfer")
    .is("deleted_at", null);
  if (error) {
    throw new Error("Could not load the transfer", { cause: error });
  }
  // The money leaves with the negative leg and arrives with the positive one
  const [out] = data.filter((leg) => leg.amount_minor < 0);
  const [into] = data.filter((leg) => leg.amount_minor > 0);
  if (data.length !== 2 || !out || !into) return null;
  return { out: toLeg(out), into: toLeg(into) };
}

// A transfer that is yours and not deleted, as the edit form needs it; anything else is a 404
export async function getTransfer(transferId: string): Promise<Transfer> {
  await requireUser();
  const legs = await loadLegs(transferId);
  if (!legs) notFound();
  return {
    id: transferId,
    from: legs.out.accountId,
    to: legs.into.accountId,
    fromAmount: negate(legs.out.amount),
    toAmount: legs.into.amount,
    date: legs.out.date,
    note: legs.out.note,
  };
}

// What the "Saved" note needs for a transfer; an unknown or foreign id gives null
export async function getSavedTransferSummary(
  transferId: string,
): Promise<SavedTransferSummary | null> {
  await requireUser();
  const legs = await loadLegs(transferId);
  if (!legs) return null;
  return {
    from: legs.out.accountName,
    to: legs.into.accountName,
    fromAmount: negate(legs.out.amount),
    toAmount: legs.into.amount,
  };
}

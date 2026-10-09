import { type Money, isNegative } from "@/modules/money";
import type { TransactionKind } from "./types";

export type HistoryRow = {
  id: string;
  kind: TransactionKind;
  transferId: string | null;
  date: string;
  createdAt: string;
  accountName: string;
  categoryName: string | null;
  note: string | null;
  amount: Money;
};

export type EntryItem = {
  id: string;
  kind: Exclude<TransactionKind, "transfer">;
  date: string;
  createdAt: string;
  accountName: string;
  categoryName: string | null;
  note: string | null;
  amount: Money;
};

// A missing leg leaves its account and amount empty
export type TransferItem = {
  id: string;
  kind: "transfer";
  date: string;
  createdAt: string;
  from: string | null;
  to: string | null;
  fromAmount: Money | null;
  toAmount: Money | null;
  note: string | null;
};

export type HistoryItem = EntryItem | TransferItem;

export type DayGroup = { date: string; items: HistoryItem[] };

// The two legs of a transfer become one item; every other row stays one item
export function toHistoryItems(rows: readonly HistoryRow[]): HistoryItem[] {
  const items: HistoryItem[] = [];
  const transfers = new Map<string, TransferItem>();
  for (const row of rows) {
    if (row.kind !== "transfer") {
      items.push({
        id: row.id,
        kind: row.kind,
        date: row.date,
        createdAt: row.createdAt,
        accountName: row.accountName,
        categoryName: row.categoryName,
        note: row.note,
        amount: row.amount,
      });
      continue;
    }
    const key = row.transferId ?? row.id;
    let transfer = transfers.get(key);
    if (!transfer) {
      transfer = {
        id: key,
        kind: "transfer",
        date: row.date,
        createdAt: row.createdAt,
        from: null,
        to: null,
        fromAmount: null,
        toAmount: null,
        note: null,
      };
      transfers.set(key, transfer);
      items.push(transfer);
    }
    // The money leaves the account with the negative leg
    if (isNegative(row.amount)) {
      transfer.from = row.accountName;
      transfer.fromAmount = row.amount;
    } else {
      transfer.to = row.accountName;
      transfer.toAmount = row.amount;
    }
    transfer.note ??= row.note;
  }
  return items;
}

// Timestamps from the database sort correctly as text, down to the microsecond
function newestFirst(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? 1 : -1;
}

// Newest day first; inside a day the newest entry first
export function groupByDay(items: readonly HistoryItem[]): DayGroup[] {
  const sorted = [...items].sort(
    (a, b) =>
      newestFirst(a.date, b.date) || newestFirst(a.createdAt, b.createdAt),
  );
  const days: DayGroup[] = [];
  for (const item of sorted) {
    const last = days.at(-1);
    if (last?.date === item.date) {
      last.items.push(item);
    } else {
      days.push({ date: item.date, items: [item] });
    }
  }
  return days;
}

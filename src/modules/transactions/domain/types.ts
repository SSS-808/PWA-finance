import type { CurrencyCode, Money } from "@/modules/money";

// Income and expense are the two kinds a person enters by hand
export const ENTRY_KINDS = ["expense", "income"] as const;

export type EntryKind = (typeof ENTRY_KINDS)[number];

// Matches the kind check on the transactions table
export const TRANSACTION_KINDS = [
  "income",
  "expense",
  "transfer",
  "opening_balance",
  "adjustment",
] as const;

export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const TRANSACTION_ERROR_KEYS = [
  "amount_required",
  "amount_invalid",
  "amount_negative",
  "amount_too_many_decimals",
  "amount_too_large",
  "category_required",
  "invalid_category",
  "account_required",
  "invalid_date",
  "note_too_long",
  "same_account",
  "amounts_must_match",
  "arrived_required",
  "not_found",
  "unknown",
] as const;

export type TransactionErrorKey = (typeof TRANSACTION_ERROR_KEYS)[number];

export type EntryFieldName =
  "kind" | "amount" | "accountId" | "categoryId" | "date" | "note";

export type EntryFormValues = {
  kind: EntryKind;
  amount: string;
  accountId: string;
  categoryId: string;
  date: string;
  note: string;
};

export type EntryFormState = {
  status: "idle" | "error";
  error?: TransactionErrorKey;
  fieldErrors?: Partial<Record<EntryFieldName, TransactionErrorKey>>;
};

export type AccountOption = {
  id: string;
  name: string;
  currency: CurrencyCode;
};

export type CategoryOption = { id: string; name: string };

// An income or expense as stored; the amount keeps its sign
export type Entry = {
  id: string;
  kind: EntryKind;
  accountId: string;
  categoryId: string;
  amount: Money;
  date: string;
  note: string | null;
};

export type TransferFieldName =
  "fromAccountId" | "toAccountId" | "amount" | "arrived" | "date" | "note";

export type TransferFormValues = Record<TransferFieldName, string>;

export type TransferFormState = {
  status: "idle" | "error";
  error?: TransactionErrorKey;
  fieldErrors?: Partial<Record<TransferFieldName, TransactionErrorKey>>;
};

// A transfer as stored: from and to are account ids, both amounts are positive
export type Transfer = {
  id: string;
  from: string;
  to: string;
  fromAmount: Money;
  toAmount: Money;
  date: string;
  note: string | null;
};

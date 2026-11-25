import type { CurrencyCode, Money } from "@/modules/money";

export const PEOPLE_ERROR_KEYS = [
  "name_required",
  "name_too_long",
  "name_taken",
  "person_required",
  "account_required",
  "currency_invalid",
  "amount_required",
  "amount_invalid",
  "amount_negative",
  "amount_too_many_decimals",
  "amount_too_large",
  "amount_too_much",
  "account_amount_required",
  "date_invalid",
  "note_too_long",
  "not_found",
  "unknown",
] as const;

export type PeopleErrorKey = (typeof PEOPLE_ERROR_KEYS)[number];

export type MoveKind = "lend" | "borrow";

// One IOU jar: above zero the person owes you, below zero you owe them; dates are YYYY-MM-DD
export type Jar = {
  id: string;
  currency: CurrencyCode;
  balance: Money;
  dueOn: string | null;
};

export type Person = { id: string; name: string; jars: Jar[] };

// A real account the forms offer
export type AccountChoice = {
  id: string;
  name: string;
  currency: CurrencyCode;
};

export type JarStatus = "owed" | "owe" | "paid";

export type EntryLabel =
  "lent" | "borrowed" | "paid_back" | "you_paid_back" | "before" | "forgiven";

// A non-deleted row of a person's jar; kind is the transactions kind
export type JarRow = {
  id: string;
  jarId: string;
  kind: "transfer" | "adjustment" | "income" | "expense";
  transferId: string | null;
  amount: Money;
  date: string;
  createdAt: string;
  note: string | null;
  // The other account of a transfer, null for the rest
  otherAccount: string | null;
};

export type PersonEntry = JarRow & { label: EntryLabel };

export type MoveFieldName =
  | "kind"
  | "person"
  | "newName"
  | "account"
  | "currency"
  | "amount"
  | "date"
  | "dueOn"
  | "note";

export type RepayFieldName = "amount" | "account" | "accountAmount" | "date";

export type EditFieldName = "name" | `due:${string}`;

export type FormState<Field extends string> = {
  status: "idle" | "error";
  error?: PeopleErrorKey;
  fieldErrors?: Partial<Record<Field, PeopleErrorKey>>;
  values?: Record<Field, string>;
};

export type MoveFormState = FormState<MoveFieldName>;
export type RepayFormState = FormState<RepayFieldName>;
export type EditFormState = FormState<EditFieldName>;

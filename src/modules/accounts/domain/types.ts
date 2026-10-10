import type { CurrencyCode, Money } from "@/modules/money";
import type { AccountType } from "./account-types";

export const ACCOUNT_ERROR_KEYS = [
  "name_required",
  "name_too_long",
  "name_taken",
  "invalid_type",
  "invalid_currency",
  "amount_invalid",
  "amount_negative",
  "amount_too_many_decimals",
  "amount_too_large",
  "not_found",
  "unknown",
] as const;

export type AccountErrorKey = (typeof ACCOUNT_ERROR_KEYS)[number];

export type AccountFieldName = "name" | "type" | "currency" | "startingAmount";

export type AccountFormValues = Record<AccountFieldName, string>;

export type AccountFormState = {
  status: "idle" | "error";
  error?: AccountErrorKey;
  fieldErrors?: Partial<Record<AccountFieldName, AccountErrorKey>>;
  values?: AccountFormValues;
};

export type FixBalanceFieldName = "amount" | "note";

export type FixBalanceValues = Record<FixBalanceFieldName, string>;

export type FixBalanceState = {
  status: "idle" | "error";
  error?: AccountErrorKey;
  fieldErrors?: Partial<Record<FixBalanceFieldName, AccountErrorKey>>;
  values?: FixBalanceValues;
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  archived: boolean;
  balance: Money;
};

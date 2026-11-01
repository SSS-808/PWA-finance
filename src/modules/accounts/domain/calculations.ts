import {
  CURRENCY_CODES,
  type CurrencyCode,
  type Money,
  isNegative,
  isZero,
  money,
  negate,
  subtract,
  sum,
  zero,
} from "@/modules/money";
import { type AccountType, isDebt } from "./account-types";

// The minimum a bank account starts with, in minor units: ₭50,000, $10.00 and ฿500.00
const BANK_MINIMUM_MINOR: Record<CurrencyCode, number> = {
  LAK: 50_000,
  USD: 1_000,
  THB: 50_000,
};

// A debt with a negative balance is shown as a positive amount that is owed
export function displayBalance(
  type: AccountType,
  balance: Money,
): { amount: Money; owed: boolean } {
  if (isDebt(type) && isNegative(balance)) {
    return { amount: negate(balance), owed: true };
  }
  return { amount: balance, owed: false };
}

export type CurrencyGroup<T> = {
  currency: CurrencyCode;
  accounts: T[];
  total: Money;
};

// Only currencies that have accounts, in the app's currency order
export function groupByCurrency<
  T extends { currency: CurrencyCode; balance: Money },
>(accounts: readonly T[]): CurrencyGroup<T>[] {
  const groups: CurrencyGroup<T>[] = [];
  for (const currency of CURRENCY_CODES) {
    const matching = accounts.filter(
      (account) => account.currency === currency,
    );
    if (matching.length > 0) {
      groups.push({
        currency,
        accounts: matching,
        total: sum(
          matching.map((account) => account.balance),
          currency,
        ),
      });
    }
  }
  return groups;
}

export type NameGroup<T> = { name: string; accounts: [T, ...T[]] };

// One group per name (capitals ignored), sorted by name, each with its accounts in currency order
export function groupByName<T extends { name: string; currency: CurrencyCode }>(
  accounts: readonly T[],
): NameGroup<T>[] {
  const groups = new Map<string, NameGroup<T>>();
  for (const account of accounts) {
    const key = account.name.toLowerCase();
    const group = groups.get(key);
    if (group) {
      group.accounts.push(account);
    } else {
      groups.set(key, { name: account.name, accounts: [account] });
    }
  }
  const result = [...groups.values()];
  for (const group of result) {
    group.accounts.sort(
      (a, b) =>
        CURRENCY_CODES.indexOf(a.currency) - CURRENCY_CODES.indexOf(b.currency),
    );
  }
  return result.sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );
}

// The other accounts that share this account's name, capitals ignored
export function sameNameOthers<T extends { id: string; name: string }>(
  account: T,
  accounts: readonly T[],
): T[] {
  const key = account.name.toLowerCase();
  return accounts.filter(
    (other) => other.id !== account.id && other.name.toLowerCase() === key,
  );
}

// What the bank keeps by default: a bank account holds ₭50,000, $10 or ฿500, everything else nothing
export function defaultMinimum(
  type: AccountType,
  currency: CurrencyCode,
): Money {
  if (type !== "bank") return zero(currency);
  return money(BANK_MINIMUM_MINOR[currency], currency);
}

// The balance minus the minimum the bank keeps and the money set aside for goals; it goes below 0 when those add up to more
export function freeToSpend(
  balance: Money,
  minimum: Money,
  setAside: Money,
): Money {
  return subtract(subtract(balance, minimum), setAside);
}

// Free to spend is shown only for an account with a minimum or money set aside for goals
export function showsFree(account: {
  minimum: Money;
  setAside: Money;
}): boolean {
  return !isZero(account.minimum) || !isZero(account.setAside);
}

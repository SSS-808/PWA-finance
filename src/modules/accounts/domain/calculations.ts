import {
  CURRENCY_CODES,
  type CurrencyCode,
  type Money,
  isNegative,
  negate,
  sum,
} from "@/modules/money";
import { type AccountType, isDebt } from "./account-types";

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

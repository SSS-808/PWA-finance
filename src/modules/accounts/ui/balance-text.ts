import { en } from "@/messages/en";
import { type Money, formatMoney } from "@/modules/money";
import type { AccountType } from "../domain/account-types";
import { displayBalance } from "../domain/calculations";

// A debt reads "Owed $30.00" and everything else is the plain amount
export function balanceText(
  type: AccountType,
  balance: Money,
): { text: string; owed: boolean } {
  const { amount, owed } = displayBalance(type, balance);
  const formatted = formatMoney(amount);
  return {
    text: owed ? en.accounts.owed.replace("{amount}", formatted) : formatted,
    owed,
  };
}

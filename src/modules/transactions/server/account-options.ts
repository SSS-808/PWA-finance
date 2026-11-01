import { type Account, freeToSpend, showsFree } from "@/modules/accounts";
import { isZero } from "@/modules/money";
import type { AccountOption } from "../domain/types";

// The accounts as the forms offer them; goalMoney says which goals hold money in which account, largest first
export function toAccountOptions(
  accounts: readonly Account[],
  goalMoney: readonly { accountId: string; goalName: string }[],
): AccountOption[] {
  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    currency: account.currency,
    free: showsFree(account)
      ? freeToSpend(account.balance, account.minimum, account.setAside)
      : null,
    minimum: isZero(account.minimum) ? null : account.minimum,
    setAside: isZero(account.setAside) ? null : account.setAside,
    goals: goalMoney
      .filter((item) => item.accountId === account.id)
      .map((item) => ({ name: item.goalName })),
  }));
}

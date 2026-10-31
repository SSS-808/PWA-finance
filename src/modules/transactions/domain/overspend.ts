import { type Money, add } from "@/modules/money";
import type { AccountOption } from "./types";

export type OverspendWarning = { free: Money; minimum: Money; account: string };

// The pop-up numbers when a payment is more than the account has free, else null; back is the edited entry's old amount, which the balance already counts
export function overspendWarning(
  account: AccountOption,
  amount: Money,
  back: Money | null,
): OverspendWarning | null {
  if (account.free === null || account.minimum === null) return null;
  const free = back === null ? account.free : add(account.free, back);
  if (amount.minor <= free.minor) return null;
  // The amounts already show the currency, so the plain name reads best
  return { free, minimum: account.minimum, account: account.name };
}

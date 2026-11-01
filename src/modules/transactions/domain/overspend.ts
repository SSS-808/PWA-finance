import { type Money, add, isZero, zero } from "@/modules/money";
import type { AccountOption } from "./types";

// The form field the pop-up adds when the person chooses to take the part spent from goal money out of the goals
export const RELEASE_GOALS_FIELD = "release_goals";

// aside and goals are only there when goals hold money in the account
export type OverspendWarning = {
  free: Money;
  minimum: Money;
  account: string;
  aside: Money | null;
  goals: string[];
};

// The pop-up numbers when a payment is more than the account has free, else null; back is the edited entry's old amount, which the balance already counts
export function overspendWarning(
  account: AccountOption,
  amount: Money,
  back: Money | null,
): OverspendWarning | null {
  if (account.free === null) return null;
  const free = back === null ? account.free : add(account.free, back);
  if (amount.minor <= free.minor) return null;
  // The amounts already show the currency, so the plain name reads best
  return {
    free,
    minimum: account.minimum ?? zero(free.currency),
    account: account.name,
    aside:
      account.setAside === null || isZero(account.setAside)
        ? null
        : account.setAside,
    goals: account.goals.map((goal) => goal.name),
  };
}

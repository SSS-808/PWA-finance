# ADR-012: Goal money sits in an account and lowers what is free to spend there

**Status:** Accepted · 2026-10-31 · Replaces part of [ADR-011](011-goals-are-earmarks.md)

## In plain words
Think of a sticky note on the cash in your wallet: "₭1,000,000 of this is for the laptop". The money doesn't move, so your bank balance still matches the bank app. But the app now knows **which account** holds the goal's money, so that account's **Free to spend** goes down by it and you can't spend the same money twice without noticing. "Take out" gives it back to the account it came from.

## Context
With ADR-011 a goal was only a plan: the app couldn't tell whether the money still existed. The owner asked (2026-10-31) that money put into a goal "should cut from the account". Moving it to another account would make the balance stop matching the bank. Fixes task 2 had just added a minimum per account and "Free to spend = balance − minimum".

## Decision
- `goal_contributions.account_id` names the account the money sits in. A foreign key on `(account_id, user_id, currency)` makes sure it is the same user's account in the goal's currency.
- Each account's share of a goal (and the share with no account) can never go below 0. The trigger that already stopped a goal going below 0 now checks per account, so the goal's total can't go below 0 either.
- View `account_set_aside`: per account, the money set aside for goals that are **not archived**. Archiving a goal frees its money.
- **Free to spend = balance − minimum − set aside.** The balance itself never changes because of a goal.
- Money added before this decision has no account. It still counts toward the goal, but not against any account.
- The app may spend into goal money: it warns, and offers to take the part it used out of the goals in that account. The database function `release_goal_shortfall` works out that part itself, so the browser never sends an amount for it. A goal whose account no longer holds its money shows a warning with a one-tap "take out" fix.

## Alternatives
- **Move goal money to a separate account (a transfer):** the bank balance would no longer match the bank app, and every goal would need an account.
- **Shrink goals silently when the account runs low:** with two goals in one account the app would have to guess which one, and undoing an expense would have to guess again.

## Consequences
- ✅ Free to spend tells the truth about what you can use.
- ✅ Balances still match the bank.
- ⚠️ An account can be "over-promised" when money is spent anyway; the app shows it instead of hiding it.
- ↩️ Contributions are still never edited or deleted (ADR-011): corrections are new rows.

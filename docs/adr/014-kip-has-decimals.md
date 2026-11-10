# ADR-014: Kip has 2 decimals, like every other currency

**Status:** Accepted · 2026-11-09 · Changes the kip part of [ADR-003](003-money-integer-minor-units.md)

## In plain words
Kip used to be saved in whole kip, because kip has no coins in real life. The owner's bank shows kip with two decimals, so the app now does too.

The app saves money as whole numbers of the smallest unit, so kip needed a smaller unit. It's like a shop rewriting every price tag from kip to "kip cents": the money is the same, but every saved number became 100 times bigger.

```
₭12,000,000   before: 12000000     after: 1200000000
```

## Context
- ISO 4217 gives LAK 2 decimals, and the owner's bank displays them, so the balance in the app could not match the bank to the last digit.
- ADR-003 chose 0 decimals and warned that changing it would need every kip amount multiplied by 100.
- The owner chose real decimals over only drawing `.00` on the screen.

## Decision
- `currencies.minor_unit` for LAK is **2**, and `MINOR_UNITS` in `currency.ts` matches. Every currency now has 2 decimals.
- Migration `20261109140000_kip_two_decimals.sql` multiplies every LAK amount by 100 in the five places money is saved: `transactions.amount_minor` (deleted rows too), `budgets.amount_minor`, `goals.target_minor`, `goal_contributions.amount_minor` and `accounts.minimum_minor`. Balances and goal totals are views, so they follow.
- The migration is **one statement, so it is all or nothing**. It stops without changing anything if kip already has decimals, if an amount or balance would go over the limit, or if a table's kip total afterwards is not exactly 100 times the total before.
- **The audit log is not rewritten** ([ADR-007](007-soft-delete-and-audit.md)). The update adds one line per kip entry showing the old and new amount, so the log records the change itself. Audit lines older than that are in whole kip.
- Kip always shows two decimals: `₭12,000,000.00`.
- The largest single kip amount is now ₭100,000,000,000 (the limit is still 10¹³ in the smallest unit).

## How it was tested
Rehearsed on a local database filled with old-scale data, covering same-currency and cross-currency transfers, a deleted entry, an archived account, budgets, goals and goal money in an account. Every kip row became exactly ×100, every dollar row stayed the same, and each kip entry gained one audit line. With an impossible amount planted in the last table processed, the migration stopped and no row changed.

## Going live
Data and app must change together, so the owner stays out of the app for about 5 minutes. In order: back up the data, run the migration, release the app. Between the last two, kip looks 100 times too big because the data is new and the app is old. Nothing is lost, but a kip entry saved in that gap would be stored at the wrong size.

**To undo:** divide the same five columns by 100, set LAK back to 0 and put the old app back. That only works until someone saves kip with real decimals; after that, restore the backup.

## Alternatives
- **Only draw `.00`, keep whole kip underneath:** no data change, but the app could never hold ₭0.50, so it could not match the bank exactly.
- **Keep 0 decimals:** the simplest, but not what the owner wants.

## Consequences
- ✅ Kip works like every other currency, and balances can match the bank exactly.
- ✅ The money module no longer needs a case for currencies without decimals.
- ⚠️ Kip amounts are 3 characters longer on screen, so the big balance and the Home stats use a smaller size on narrow phones.
- ⚠️ Old CSV exports show whole kip; new ones show two decimals.

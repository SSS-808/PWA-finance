# ADR-005: Work out account balances from transactions, never store them

**Status:** Accepted · 2026-10-09

## Context
The brief lists `balance` as an account field but asks whether it should be stored. A stored balance is a second copy of the truth. If one update fails, or a bug slips in, it drifts away from the transactions and stays wrong.

## Decision
No `balance` column. Balance = the sum of `amount_minor` over the account's non-deleted transactions, provided by the view `account_balances` (with `security_invoker` so RLS applies). Starting balances are `opening_balance` transactions; corrections are `adjustment` transactions.

## Alternatives
- **A stored balance updated by app code:** drifts on partial failures and bugs.
- **A stored balance updated by a database trigger:** stays consistent, but the trigger must handle inserts, edits, soft deletes and account moves correctly, and gets a lot of edge-case tests.

## Consequences
- ✅ One source of truth, and the balance always matches the history.
- ✅ The balance on **any past date** comes for free (sum the rows up to that date), which gives Phase 8 its net-worth history.
- ⚠️ It adds up on every read. At personal scale (thousands of rows, indexed) that takes milliseconds. If a page is ever *measured* as slow, add a cached column kept up to date by a trigger.

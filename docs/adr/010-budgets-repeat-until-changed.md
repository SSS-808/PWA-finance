# ADR-010: A budget repeats every month until you change it

**Status:** Accepted · 2026-10-12

## In plain words
A budget works like a standing instruction at the bank, not like a form you fill in every month. You say once "Food: ₭2,000,000 a month", and it applies to this month and every month after. When you change the number, the new number applies **from that month on**, and the earlier months keep the old one. So looking back at last March still shows what your budget was in March.

## Context
Phase 6 adds monthly budgets per category. The first sketch in [database.md](../database.md) had one row per category per month, which means either a monthly chore ("copy last month's budgets") or the app quietly writing rows when you only look at a month. The user chose "set it once, it repeats" (2026-10-12), and also wanted the same category to be budgeted in more than one currency.

## Decision
- The `budgets` table stores **changes**, not months. A row is `(category, currency, start_month, amount)` and means "from `start_month` on".
- The budget for a month is the latest row at or before that month. This is worked out by a pure function in the app, with full tests.
- Amount `0` ends a budget from that month on. Rows are never deleted, so history stays correct.
- One budget per category **per currency**. Only spending in that currency counts ([ADR-008](008-no-currency-mixing.md)).
- Only expense categories can have a budget. The database enforces it with the same composite foreign key that protects transactions.
- Access: Row Level Security (own rows only) plus explicit grants (read, add, change for logged-in users; nothing for logged-out visitors; no delete for anyone).

## Alternatives
- **One row per month, copied forward by a button:** simple to store, but a chore every month, and a forgotten month shows no budgets.
- **One row per month, copied automatically on first view:** no chore, but reading a page would write to the database, which is surprising and hard to test.
- **A single "current budget" row without history:** simplest, but past months would always show today's number, so "budget history" would be wrong.

## Consequences
- ✅ No monthly chore, and history is exact.
- ✅ Changing or ending a budget is one small write.
- ⚠️ Finding the budget for a month needs "the latest row at or before it" instead of a plain lookup. It lives in one tested function.
- ⚠️ A budget set by mistake can be ended (amount 0) but its row stays. It's harmless and invisible in the app.
- ↩️ Worth revisiting if budgets need per-month one-off exceptions ("only this December is higher").

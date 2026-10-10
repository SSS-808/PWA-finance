# Phase 5: Dashboard (2026-10-10)

## In plain words
Home is now an **overview**: one card per currency with its total balance, plus this month's income, spending, saved amount and savings rate. "Where your money went" is a bar list of the top categories (tap one to see them in History). There's a month switcher and the 10 most recent transactions. Transfers, starting amounts and balance fixes never count as income or spending.

## Decisions
- One card per currency, never mixed (ADR-008).
- Savings rate = (income − spending) ÷ income as a whole percent; "—" with no income; it can be negative.
- Plain HTML bars instead of a chart library: clearer on a phone, accessible, and no new dependency.
- A bad `?month=` falls back to the current month.
- The month is read in pages of 1,000 rows (the API's limit).

## Checks (phase end)
388 unit tests (100% on all rule code), 126 database tests, 63 robot browser tests. Security review: the dashboard only reads, every query runs as the user (RLS), there's a login check first, and bad input is ignored.

## Next
A **human launch check** by the user ([docs/launch-check.md](../../docs/launch-check.md)). Then Phase 5.5: the first deploy ([docs/deploy.md](../../docs/deploy.md)), and branches and PRs come back.

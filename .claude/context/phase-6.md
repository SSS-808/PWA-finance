# Phase 6: Budgets (2026-10-12)

## In plain words
You can set a monthly spending limit for an expense category, in one currency: "Food: ₭2,000,000 a month". For any month the app shows how much of it is used, how much is left, and a red bar with "over" when you pass it. Budgets live on their own page (Home → Budgets), and Home shows the three most used ones per currency.

A budget **repeats every month until you change it**. A change applies from the current month on, and earlier months keep the number they had, so looking back stays honest.

## Decisions
- Repeat until changed: the table stores changes, not months ([ADR-010](../../docs/adr/010-budgets-repeat-until-changed.md)). Amount 0 ends a budget; rows are never deleted.
- One budget per category **per currency**. Only expenses in that currency count. Transfers, balance fixes and deleted entries never count.
- Budgets can only be added, changed or ended while looking at the current month. The server works out the month itself and never trusts one from the browser. Past months are read-only.
- No new menu icon: Home has a Budgets section with "See all", and Home stays the active menu item on the Budgets pages.
- Category budgets only, with a total line per currency. No overall monthly limit, no pop-up warnings.

## What was built
- **6.1** (PR #8): table `budgets` with Row Level Security, explicit grants (read, add, change for logged-in users; no delete for anyone; nothing for logged-out visitors) and 22 database tests. On staging and prod.
- **6.2** (PR #9): module `src/modules/budgets` (pure calculations, queries, `saveBudget` and `endBudget`), pages `/budgets`, `/budgets/new`, `/budgets/edit`.
- **6.3**: `BudgetSummary` on Home, `mostUsedLines`, the shared `Progress` bar.

## Gotchas
- Local sign-up gets flaky when 8 browser tests run at once; run budget and dashboard specs with `--workers=2`. GitHub already uses 2.
- After switching branches, a stale `.next/dev/types` folder can break typecheck. Delete the folder and run it again.
- `supabase test db --linked` does not run pgTAP against a hosted project ("No plan found"). Check a hosted database by reading the schema back (`db dump --linked --schema public`) and with `db advisors --linked`.
- `supabase link` needed no database password: the tool used the logged-in session.

## Checks (phase end)
469 unit tests (100% on all rule code), 148 database tests, 87 browser tests on GitHub. Security review: every query and action calls `requireUser()` first and checks its input with Zod; no user id or month comes from the browser for a write; the database refuses other users' categories, income categories and deletes on its own; prod shows 7 tables, all with RLS, and no advisor errors.

## Changed during this phase (how we work)
- Finished branches are deleted right after merging.
- From Phase 7: task branches go into a `dev` branch (staging), and `dev` is released into `main` once per phase, on the owner's "release".

## Next
Set up the `dev` branch (CI for `dev`, docs), then Phase 7: Savings goals.

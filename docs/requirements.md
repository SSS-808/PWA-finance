# Requirements

Phase 0 · 2026-10-09 · Source: [brief.md](brief.md)

## 1. Purpose

A personal wallet and financial-planning PWA. You can record money in and out in a few seconds on your phone, and later see the whole picture: income → expenses → savings → investments → net worth → goals.

It is also a portfolio project, so the code, tests and docs matter as much as the features.

## 2. Decisions (agreed 2026-10-09)

| # | Topic | Decision |
|---|---|---|
| D1 | Users | One user (the owner), in Laos. Database and security are built for many users from day one. |
| D2 | Time zone | `Asia/Vientiane` (UTC+7), saved per user in `profiles.timezone`. |
| D3 | Language | English UI for the MVP. All UI text lives in one file (`src/messages/en.ts`) so Lao can be added later. |
| D4 | Currencies | LAK, USD, THB. LAK is the base currency. |
| D5 | Mixed currencies | The MVP shows a total per currency and never adds currencies together. Exchange rates (typed in by hand) come with Net Worth in Phase 8. See [ADR-008](adr/008-no-currency-mixing.md). |
| D6 | Currency exchange | Works in the MVP as a transfer where each side keeps its own amount. |
| D7 | Deadline | None. Target: MVP live in about 4–6 weeks. |
| D8 | Starting balances | An `opening_balance` entry when an account is created. An `adjustment` entry when the app's balance and the bank's balance disagree. Neither counts as income or expense. |
| D9 | Debts | Credit card and loan account types are in the MVP. No interest or statements. |
| D10 | Deleting | Transactions are soft-deleted (marked, not erased). Accounts and categories are archived. Every change to a transaction is written to an audit log. |
| D11 | Not in the MVP | Splitting one payment across categories, receipt photos, repeating transactions, CSV import. |
| D12 | Environments | Local Supabase in Docker for development, plus one online Supabase project for production. |
| D13 | Repository | Public on GitHub. Real data and secrets never go in it. |
| D14 | Visual style | shadcn/ui defaults plus dark mode. Real design choices come from a/b/c mockups once the first screens exist. |

## 3. MVP features

### Auth
- **FR-1** Sign up with email and password, with email confirmation.
- **FR-2** Log in and log out; you stay logged in between visits.
- **FR-3** Reset your password by email.
- **FR-4** Every app page needs a logged-in user. Logged-out visitors go to `/login`.
- **FR-5** Profile: display name, base currency, time zone.

### Accounts
- **FR-6** Create an account: name, type (cash, bank, savings, credit card, loan, investment, other), currency, and an optional opening balance with its date.
- **FR-7** Edit the name and type. The currency can't change once the account has transactions.
- **FR-8** Archive and unarchive an account. An archived account keeps its history and is hidden from pickers.
- **FR-9** Account list grouped by currency, with each balance. Debts are shown as the amount you owe.
- **FR-10** Account detail page: the balance and its transactions.

### Categories
- **FR-11** New users get the default categories from brief §11.
- **FR-12** Create, rename and archive your own categories.

### Transactions
- **FR-13** Quick add: tap **+**, enter the amount, pick a category, Save. It starts as an expense, using your last account and today's date.
- **FR-14** Add an income or expense with account, category, amount, date and an optional note.
- **FR-15** Transfer between two of your accounts. If the currencies differ, you enter both amounts.
- **FR-16** Set an account's balance to a given amount ("my BCEL app says 2,950,000"). The app records the difference as an adjustment.
- **FR-17** Edit or delete any transaction. A transfer is always edited or deleted as a pair.
- **FR-18** History, newest first. Filter by date range, account, category and type; search the note text; sort by date or amount. Filters live in the URL.

### Dashboard
- **FR-19** For each currency: total balance (= net worth in that currency), plus this month's income, expenses and savings rate.
- **FR-20** One chart of this month's spending by category.
- **FR-21** The 10 most recent transactions.
- **FR-22** Switch to another month.

## 4. Quality requirements

- **NFR-1 Precision:** money is a whole number of the currency's smallest unit plus a currency code, never a float ([ADR-003](adr/003-money-integer-minor-units.md)).
- **NFR-2 Security:** every table holding user data has Row Level Security, and the server re-checks every input ([security.md](security.md)).
- **NFR-3 Integrity:** the database enforces the rules (constraints, foreign keys, functions), not just the UI.
- **NFR-4 Atomicity:** operations that write several rows (a transfer, or an account with its opening balance) succeed or fail as one.
- **NFR-5 Speed:** recording an expense takes under 5 seconds on a phone. Pages are usable on a mid-range phone on 4G.
- **NFR-6 Responsive:** no sideways scrolling at 320, 390, 768, 1024, 1280 or 1440 px.
- **NFR-7 Accessibility:** WCAG 2.2 AA: labels, full keyboard use, visible focus, and readable contrast in light and dark mode.
- **NFR-8 Traceability:** created and updated times on every row, and an audit log for transactions.
- **NFR-9 Testability:** financial calculations are pure functions, and every branch is tested.

## 5. After the MVP

Budgets (Phase 6) · Savings goals (7) · Net worth history and exchange rates (8) · Investments with prices typed in by hand (9) · Analytics (10) · PWA and offline (11) · Production hardening (12). See [roadmap.md](roadmap.md).

## 6. Open questions for later phases

| Phase | Question | Proposed default |
|---|---|---|
| 1 | Which database do Vercel preview deployments use? | A second free Supabase project ("staging"), never production. |
| 2 | Should anyone be able to sign up on the live site? | No, close sign-up once your account exists. Add a demo account with fake data for portfolio visitors. |
| 6 | Which currency is a budget in, when spending happens in several? | One currency per budget; only spending in that currency counts. |
| 7 | Is goal progress typed in, or linked to an account? | Contributions are recorded against the goal, optionally linked to a savings account. |
| 8 | Where do exchange rates come from? | Typed in by hand, one rate per currency pair per date. |
| 9 | Which cost basis method? | Average cost. |
| 11 | Offline: read-only, or saving changes to send later? | Read-only cache first; queued changes only if really needed. |
| 12 | Backups and export? | A regular CSV/SQL export, so your history never depends on one service. |

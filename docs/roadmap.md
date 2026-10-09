# Roadmap

Phase 0 · 2026-10-09

Size (part-time work, rough): **S** about 1–2 days · **M** about 3–5 days · **L** about 1–2 weeks.

| Phase | Name | Size | Status |
|---|---|---|---|
| 0 | Planning | S | Done |
| 1 | Foundation | L | Done (first deploy moved to 5.5) |
| 2 | Authentication | M | Done |
| 3 | Accounts | M | Done |
| 4 | Transactions, categories, transfers | L | Next |
| 5 | Dashboard | M | |
| **5.5** | **MVP release** | M | |
| 6 | Budgets | M | |
| 7 | Savings goals | M | |
| 8 | Net worth and exchange rates | M | |
| 9 | Investments | L | |
| 10 | Analytics | M | |
| 11 | PWA and offline | M | |
| 12 | Production hardening | M | |

## MVP

### Phase 1: Foundation
1. **App skeleton:** Next.js (TypeScript strict, App Router, `src/`), Tailwind v4, shadcn/ui, ESLint (with module-boundary rules), Prettier, `.gitattributes`, and a project `CLAUDE.md` listing the real commands.
2. **Database:** Supabase CLI, `supabase init`, the first migrations from [database.md](database.md), seed data, pgTAP tests, and generated types. (`lib/supabase` and `lib/env.ts` move to Phase 2, their first real user.)
3. **Tests:** Vitest with the `money` module and its full tests, pgTAP tests for RLS and constraints, and a Playwright smoke test.
4. **CI:** a GitHub Actions workflow.
5. **First deploy:** moved to Phase 5.5 (your decision, 2026-10-10). Until then, each phase adds its deploy steps to [deploy.md](deploy.md) while they're fresh.

**Done when:** every check passes locally and in CI. ✅ Done 2026-10-10.

### Phase 2: Authentication
`lib/supabase` clients and `lib/env.ts` (with `.env.example`), sign-up, login, logout, forgot and reset password, `/auth/callback`, `proxy.ts`, the logged-in layout that checks the user, profile settings (name, base currency, time zone), `messages/en.ts`, and an end-to-end auth test.
**Done when:** logged-out visitors are redirected, a password reset works through the local email inbox, and the RLS tests pass.

### Phase 3: Accounts
Create (with an opening balance, via `create_account`), edit, archive and unarchive, a list grouped by currency with balances, and a detail page.
**Done when:** balances match the seed data, and user B can't see user A's accounts (pgTAP and e2e).

### Phase 4: Transactions (the core)
1. Category management (custom categories, archive)
2. Quick-add sheet and the full income/expense form
3. History with filters, search and sort kept in the URL
4. Edit and soft delete
5. Transfers, including currency exchange (`create_transfer`, `update_transfer`, `delete_transfer`)
6. "Set balance" adjustments

**Done when:** an expense is recorded in under 5 seconds on a phone, and transfers never show up in income or expenses (unit, DB and e2e tests).

### Phase 5: Dashboard
Per currency: total balance, this month's income, expenses and savings rate, spending by category (one chart), 10 recent transactions, and a month switcher.
**Done when:** the numbers match hand-calculated seed data in tests.

### Phase 5.5: MVP release
**First deploy**, following [deploy.md](deploy.md): Supabase staging and production projects, Vercel, environment variables, migrations. Then error and 404 pages, loading states, an accessibility pass, responsive measurements at all six widths, a clean Supabase Security Advisor report, e2e tests in CI, and closing public sign-up. Then **use it every day for two weeks** before Phase 6. Real use shows what to fix better than any plan does.

## After the MVP

| Phase | Key points |
|---|---|
| 6 Budgets | One budget per category per month, in one currency. Progress, overspending warning, history against actual spending. |
| 7 Savings goals | A target, deadline and contributions; progress bar; optional link to a savings account. |
| 8 Net worth | Assets and liabilities from account types. Exchange rates typed in by hand. History worked out from transactions, so no snapshots are needed. |
| 9 Investments | Instruments, buy and sell trades with fees, average cost basis, prices typed in by hand, profit/loss, allocation. |
| 10 Analytics | Trends, largest expenses, average monthly spending, budget performance. Every number explains how it was calculated. |
| 11 PWA | Manifest, icons, installability, and offline viewing of cached data. |
| 12 Production | Two-factor login, security headers, logging, performance, a full accessibility and security review, data export. |

## Risks

| Risk | Plan |
|---|---|
| Scope creep | The MVP list in [requirements.md](requirements.md) is fixed. New ideas go into a "Later" list. |
| Free Supabase projects pause when they sit unused | Daily use avoids it. Check the free plan's limits at the 5.5 deploy. |
| Losing real financial data | Check what backups the Supabase plan includes; add an export before Phase 6. |
| Library changes (Next.js, Supabase) | Pin versions, and read the release notes before upgrading. |

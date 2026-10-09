# Personal Wallet App — Master Development Brief

> The original brief, saved for reference on 2026-10-09. Where later decisions refine it, see [requirements.md](requirements.md) and [adr/](adr/).

You are a senior full-stack software engineer, software architect, database designer, security engineer, and technical mentor.

I want to build a production-quality personal wallet and financial planning Progressive Web App (PWA). This is both a real personal application and a serious portfolio project for demonstrating software engineering skills.

Do NOT simply generate the entire application at once. Build it incrementally, explain important architectural decisions, and keep the code maintainable.

---

## 1. Project Goal

Build a personal finance application that allows me to:

- Track income and expenses
- Manage multiple financial accounts
- Categorize transactions
- Create and track budgets
- Set savings goals
- Track net worth
- Plan monthly cash flow
- Track investments
- Monitor investment performance
- View financial analytics
- Work on desktop and mobile
- Install the application as a PWA
- Eventually support offline usage and synchronization

The application should eventually provide a complete picture of:

```
Income → Expenses → Savings → Investments → Net Worth → Financial Goals
```

## 2. Target User

Initially this is a single-user personal finance application.

However, design authentication and database security properly so that the application can support multiple users later without requiring a complete rewrite.

Do not prematurely optimize for millions of users.

## 3. Technology Stack

**Frontend:** TypeScript, Next.js, React, Tailwind CSS, shadcn/ui.

Use Next.js App Router. Prefer Server Components by default. Use Client Components only when interactivity requires them.

**Backend:** Next.js server-side functionality where appropriate, Supabase, PostgreSQL.

Supabase will provide: PostgreSQL database, Authentication, Row Level Security, Storage if needed, Realtime functionality where appropriate.

Do not create a separate Node/Express backend unless there is a concrete architectural reason.

## 4. Database

Use PostgreSQL. Do NOT use MongoDB. The application contains strongly relational financial data, so PostgreSQL is the preferred database.

Use: foreign keys, unique constraints, check constraints, indexes, transactions, appropriate numeric/integer types, database-level integrity rules.

Do not rely exclusively on frontend validation.

## 5. Money Representation

This is a financial application. Never use JavaScript floating-point arithmetic for financial calculations where precision matters.

Design a consistent monetary representation. Prefer storing monetary amounts using integer minor units where appropriate. For example, 100000 LAK should be represented without relying on floating-point precision.

The design must also account for currencies that use decimal subdivisions.

Every monetary value must have an associated currency. Do not silently mix currencies.

## 6. Architecture

Use a **Modular Monolith**. Do NOT use microservices.

The application should be deployed as one application while maintaining strong internal module boundaries. Organize the system around business domains rather than creating one giant collection of unrelated files.

Suggested structure:

```
src/
├── app/
│   ├── dashboard/
│   ├── transactions/
│   ├── accounts/
│   ├── budgets/
│   ├── goals/
│   ├── investments/
│   └── settings/
│
├── modules/
│   ├── auth/
│   ├── accounts/
│   ├── transactions/
│   ├── categories/
│   ├── budgets/
│   ├── goals/
│   ├── investments/
│   └── analytics/
│
├── components/
│   ├── ui/
│   └── shared/
│
├── lib/
│   ├── supabase/
│   ├── validation/
│   └── utilities/
│
└── tests/
```

The exact structure may be adjusted if there is a strong reason, but maintain clear domain boundaries.

## 7. Internal Architecture

Where appropriate, organize modules into `domain/`, `application/`, `infrastructure/`, `presentation/`. For example:

```
transactions/
├── domain/
│   ├── transaction.ts
│   └── calculations.ts
├── application/
│   ├── createTransaction.ts
│   ├── updateTransaction.ts
│   └── deleteTransaction.ts
├── infrastructure/
│   └── transactionRepository.ts
└── presentation/
    └── TransactionForm.tsx
```

Do not blindly apply Clean Architecture everywhere. Use abstraction where it improves maintainability. Avoid unnecessary layers and boilerplate.

## 8. Core Modules — Authentication

Features: sign up, login, logout, password reset, session management, protected routes, user profile.

Use Supabase Auth. Never store passwords manually.

## 9. Accounts

Users should be able to create financial accounts. Examples: Cash, BCEL, Savings, Bank Account, Credit Card, Investment Account, Other.

Each account should contain appropriate information such as: id, user_id, name, type, currency, balance, created_at, updated_at.

Do not blindly store balances if they can be derived from transactions. Consider carefully whether an account balance should be calculated from transactions, cached, or maintained through controlled database operations. Explain the tradeoffs and choose an appropriate approach.

## 10. Transactions

Transactions are the core of the application. Support: Income, Expense, Transfer.

A transaction should contain information such as: id, user_id, account_id, category_id, type, amount, currency, description, transaction_date, created_at, updated_at.

Support: create, read, update, delete, search, filtering, sorting, date ranges, categories, accounts.

Transfers must be designed carefully. A transfer between accounts should not accidentally be counted as income or expense. Example:

```
BCEL   -500,000 LAK
Cash   +500,000 LAK
```

This is a transfer, not income = 500,000 and expense = 500,000.

## 11. Categories

Allow users to organize transactions.

- Example expense categories: Food, Transportation, Education, Entertainment, Shopping, Bills, Healthcare, Travel, Other.
- Example income categories: Salary, Freelance, Business, Investment, Gift, Other.

Allow custom categories.

## 12. Budgeting

Implement monthly budgeting. Example:

```
Food
Budget:    2,000,000 LAK
Spent:     1,250,000 LAK
Remaining:   750,000 LAK
```

Provide: monthly budgets, category budgets, budget progress, overspending warnings, remaining budget, budget history. Allow users to compare budget vs actual spending.

## 13. Savings Goals

Allow users to create goals. Examples: Emergency Fund, New Laptop, Japan Trip, Education, Investment.

Each goal could contain: name, target_amount, current_amount, deadline, currency.

Display progress:

```
████████████░░░░░░
70%
7,000,000 / 10,000,000 LAK
```

## 14. Net Worth

Calculate `Net Worth = Assets - Liabilities`.

- Assets may include: cash, bank accounts, savings, investments.
- Liabilities may include: credit cards, loans, other debts.

Show historical net worth where practical.

## 15. Investment Module

Build investments after the expense/budget system is stable.

Support concepts such as: investment account, asset, buy, sell, quantity, price, fees, cost basis, current value, profit/loss, return. Example:

```
Investment
──────────────────
Asset: XYZ
Quantity: 10
Average Cost: $100
Current Price: $120

Cost: $1,000
Value: $1,200

Profit: +$200
Return: +20%
```

Do not build live market-price integration in the first version. First build manual investment tracking correctly. Later, external market-data APIs can be added.

## 16. Dashboard

The dashboard should provide a financial overview. Display: total balance, net worth, monthly income, monthly expenses, savings rate, budget progress, investment value, recent transactions, financial goals.

Use charts where they improve understanding. Possible charts: income vs expenses, spending by category, monthly spending trends, net worth over time, investment allocation, budget progress.

Use Recharts or another appropriate React charting library. Do not create charts just for decoration.

## 17. Analytics

Add useful financial analytics. Examples: monthly spending, spending by category, income sources, savings rate, average monthly expenses, largest expenses, budget performance, net worth growth, investment performance.

Prefer calculations that are transparent and explainable.

## 18. Validation

Use Zod for validation. Validate data at appropriate boundaries. Examples: transaction amount, currency, transaction type, category, date, budget amount, investment quantity.

Never trust client-side validation alone. Validate again on the server/database boundary.

## 19. Forms

Use React Hook Form where appropriate. Forms should have: clear labels, validation messages, loading states, error states, success feedback, keyboard accessibility, mobile-friendly controls.

## 20. Security

Treat this as financial software. Implement: Supabase authentication, Row Level Security, user ownership checks, server-side validation, secure environment variables, no secrets in frontend code, protection against unauthorized access, database constraints, safe error handling.

Every user should only be able to access their own financial data. For every table containing user-owned data, carefully evaluate RLS policies. Never assume frontend route protection is sufficient.

## 21. Database Transactions and Atomicity

Financial operations must be designed carefully. For example:

```
Transfer 500,000 LAK
Account A  -500,000
Account B  +500,000
```

Both operations must succeed or both must fail. Do not allow partial financial operations. Use appropriate PostgreSQL transaction mechanisms or server-side database functions where necessary.

## 22. Auditability

Financial data should be traceable. Avoid destructive operations when they could damage financial history. Consider created_at, updated_at, deleted_at and/or transaction history.

If a transaction is edited or deleted, think carefully about whether an audit trail is appropriate. Explain the design before implementing complicated audit functionality.

## 23. PWA

The application should eventually be installable on Android, iPhone, iPad, desktop.

Implement: Web App Manifest, app icons, installability, responsive UI, mobile navigation, offline-friendly architecture.

Do not implement complicated offline synchronization in the first milestone. First make the online application reliable. Then add offline functionality.

## 24. Responsive Design

Design mobile-first. The application should work well on mobile, tablet, desktop. The mobile experience is especially important because this is a wallet application.

Adding a transaction should be extremely fast. Example flow:

```
Open app → Tap + → Enter amount → Choose category → Save
```

Minimize unnecessary steps.

## 25. State Management

Do not introduce global state management unnecessarily. Prefer React state, Server Components, URL state, server-side data fetching.

Use Zustand only when persistent client-side state genuinely requires it. Do not put all server data into a global client store.

## 26. Testing

Use Vitest for unit/integration tests and Playwright for end-to-end tests.

Prioritize tests around financial calculations. Test: budget calculations, transaction totals, transfers, account balances, net worth, savings rate, investment profit/loss, currency handling.

Financial calculations should have strong test coverage.

## 27. Development Strategy

Do NOT build all features simultaneously. Follow this order.

- **Phase 0 — Planning.** Before writing application code: define requirements, define MVP, design database schema, define modules, define authentication model, define financial/money representation, define transaction model, define security model, create development roadmap. Do not start coding until the architecture is clear.
- **Phase 1 — Project Foundation.** Next.js, TypeScript, Tailwind, shadcn/ui, Supabase, PostgreSQL, ESLint, formatting, environment configuration, basic project structure, testing setup. Create the initial database migrations.
- **Phase 2 — Authentication.** Registration, login, logout, password reset, protected routes, user profile. Verify RLS before continuing.
- **Phase 3 — Accounts.** Create account, edit account, delete/archive account, account list, account details, account balance. Test account ownership and security.
- **Phase 4 — Transactions.** Add transaction, edit transaction, delete/archive transaction, transaction history, filtering, searching, categories, transfers. This is the core MVP.
- **Phase 5 — Dashboard.** Total balance, monthly income, monthly expenses, spending by category, recent transactions, basic charts.
- **Phase 6 — Budgeting.** Monthly budgets, category budgets, budget progress, overspending, historical comparisons.
- **Phase 7 — Savings Goals.** Create goal, update goal, progress tracking, deadline, goal dashboard.
- **Phase 8 — Net Worth.** Assets − Liabilities = Net Worth. Add historical tracking.
- **Phase 9 — Investments.** Investment accounts, assets, buy transactions, sell transactions, quantity, cost basis, fees, profit/loss, portfolio allocation. Initially use manually entered market prices.
- **Phase 10 — Advanced Analytics.** Financial trends, spending trends, savings rate, net worth history, investment performance, budget performance.
- **Phase 11 — PWA.** Manifest, icons, installability, mobile optimization, offline caching. Only after the main application is stable.
- **Phase 12 — Production.** Production environment, database migrations, error handling, logging, performance optimization, security review, accessibility review, responsive testing, automated tests, deployment. Deploy the application using Vercel and Supabase.

## 28. Git Workflow

Use Git throughout development. Create meaningful commits such as:

```
feat: add transaction creation
feat: implement account management
feat: add monthly budgets
fix: prevent transfer from affecting expense totals
test: add budget calculation tests
refactor: separate transaction domain logic
```

Do not make one giant commit containing the entire application.

## 29. Documentation

Maintain:

```
README.md
docs/
├── architecture.md
├── database.md
├── security.md
├── development.md
└── roadmap.md
```

Document important architectural decisions. Create an Architecture Decision Record when a significant decision is made. Example:

- ADR-001: Use PostgreSQL instead of MongoDB
- ADR-002: Use Modular Monolith
- ADR-003: Store monetary values using integer minor units
- ADR-004: Use Supabase authentication

## 30. Engineering Principles

- **Keep it simple.** Do not over-engineer.
- **Prefer composition.** Build small reusable functions and components.
- **Keep business logic separate from UI.** Financial calculations should not live inside React components.

```
❌ Component → calculate budget → calculate spending → render UI
✅ transactions → domain calculations → application logic → UI
```

- **Prefer pure functions for financial calculations**, for example `calculateExpenses()`, `calculateIncome()`, `calculateBudgetRemaining()`, `calculateSavingsRate()`, `calculateNetWorth()`, `calculateInvestmentReturn()`. These should be easy to test.
- **Avoid unnecessary dependencies.** Add a library only when it provides meaningful value.

## 31. UX Principles

The application should feel: fast, clean, simple, mobile-first, financially trustworthy, easy to understand.

The user should be able to record an expense in a few seconds. Avoid overwhelming the dashboard with too much information. Use progressive disclosure.

## 32. MVP Definition

The first usable version should contain only:

```
Authentication → Accounts → Categories → Transactions → Transfers → Dashboard
```

Do NOT implement investments, advanced analytics, or complicated offline synchronization before this works correctly. The MVP must be deployed and usable before moving to advanced features.

## 33. Development Method

Work incrementally. For every major feature: explain the goal, explain the architecture, design the database changes, implement the backend/domain logic, implement the UI, add validation, add tests, review security, test manually, commit the change, update documentation.

Do not skip directly from requirements to a huge code dump.

## 34. Mentor Mode

I am a Computer Science student and I want this project to teach me professional software engineering. When implementing something important:

- Explain why the design was chosen
- Explain alternatives briefly
- Point out tradeoffs
- Warn me about common mistakes
- Do not hide complexity that I should understand
- Do not over-explain basic syntax I already know
- Prefer practical examples
- Encourage good engineering practices

If I propose a bad architectural decision, tell me directly and explain why. Do not blindly follow my instructions if they would create a poor engineering design.

## 35. Important Constraints

Do NOT:

- Use microservices
- Use MongoDB
- Create a separate backend without a real need
- Put all business logic inside React components
- Store passwords manually
- Trust client-side authorization
- Use floating-point numbers carelessly for money
- Build every feature at once
- Add unnecessary dependencies
- Over-engineer the first version
- Build live investment-market integrations before the core system works

## 36. Final Architecture

```
                    ┌──────────────────────┐
                    │       Next.js        │
                    │     TypeScript       │
                    └──────────┬───────────┘
                               │
                       Modular Monolith
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
       ▼                       ▼                       ▼
  Transactions             Budgeting              Investments
       │                       │                       │
       ▼                       ▼                       ▼
  Accounts                  Goals                 Analytics
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
                         Supabase
                               │
                         PostgreSQL
                               │
                         Row Level Security
```

Supporting technologies: TypeScript, Next.js, React, Tailwind CSS, shadcn/ui, Supabase, PostgreSQL, Zod, React Hook Form, Recharts, Vitest, Playwright, Vercel, PWA, Git/GitHub.

## 37. First Task

Before writing application code, produce:

- A concise requirements document
- MVP feature list
- Database ERD
- PostgreSQL schema proposal
- Module architecture
- Folder structure
- Authentication/security design
- Money representation strategy
- Transaction/transfer model
- Development roadmap
- Testing strategy
- Initial Git workflow

Then ask for confirmation before implementing Phase 1. Do not generate the entire application in one response.

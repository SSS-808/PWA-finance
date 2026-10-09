# Architecture

Phase 0 · 2026-10-09 · Decisions: [ADR-002 Modular monolith](adr/002-modular-monolith.md)

## 1. Big picture

```
Phone / desktop browser (installable PWA)
        │  HTTPS
        ▼
Next.js app on Vercel  ── one deployable app, split into modules
  ├─ proxy.ts           refreshes the login cookie, redirects logged-out users (convenience only)
  ├─ Server Components  read data
  └─ Server Actions     change data (check user → validate → call Supabase)
        │  carries the user's login token, so RLS applies
        ▼
Supabase
  ├─ Auth               users, sessions, confirmation and reset emails
  ├─ API (PostgREST)    turns tables and functions into an API
  └─ PostgreSQL         tables, constraints, RLS, functions  ← the real security boundary
```

All data access happens on the server. The browser only renders pages and submits forms. (Next.js 16 renamed `middleware.ts` to `proxy.ts`. We'll use whichever name the installed version expects.)

## 2. Example: adding an expense

1. The quick-add form (a Client Component using React Hook Form and a Zod schema) checks the input as you type.
2. Save calls the `createTransaction` Server Action.
3. The action gets the logged-in user, checks the input again with the **same** Zod schema, and turns "25,000" into `-25000` (an expense is stored as negative).
4. It inserts the row through the server-side Supabase client, which carries your login token.
5. Postgres checks Row Level Security (`user_id = auth.uid()`), the constraints (sign, category kind, account owner and currency), and the audit trigger writes a history row. All of this happens in one database transaction.
6. The action returns `{ ok: true }` or a friendly error, and calls `revalidatePath` so the list and dashboard refresh.

## 3. Modules

| Module | Owns | Public API (examples) |
|---|---|---|
| `money` | The Money type, parsing, formatting, currency rules | `parseMoney`, `formatMoney`, `addMoney` |
| `auth` | Session helpers, login/signup/reset actions | `requireUser()`, `getCurrentUser()`, `logIn` |
| `profile` | Your preferences: name, main currency, time zone | `getProfile()`, `updateProfile`, `ProfileForm` |
| `accounts` | Accounts, balances, archiving | `listAccountsWithBalances()`, `createAccount` |
| `categories` | Default and custom categories | `listCategories(kind)` |
| `transactions` | Income, expense, transfer, adjustment; history filters | `createTransaction`, `createTransfer`, `listTransactions(filters)` |
| `dashboard` | Monthly summary, totals per currency | `getMonthSummary(month)` |

Later phases add `budgets`, `goals`, `networth`, `investments` and `analytics`.

**Boundary rules** (enforced with ESLint `no-restricted-imports` in Phase 1):

1. `domain/` is pure TypeScript: no React, no Supabase, no network. It may import only `modules/money`.
2. Code outside a module imports it only through its `index.ts`, never through deep paths.
3. A module doesn't query another module's tables directly; it calls that module's public functions.
4. Pages in `app/` stay thin: get the user, call module functions, render module components.

## 4. Inside a module

```
modules/transactions/
├── domain/                 pure logic and Zod schemas (unit-tested)
│   ├── schemas.ts
│   ├── calculations.ts
│   └── calculations.test.ts
├── server/                 talks to Supabase; starts with `import 'server-only'`
│   ├── queries.ts
│   └── actions.ts
├── ui/                     this module's React components
│   └── QuickAddSheet.tsx
└── index.ts                the public API
```

**Why 3 folders instead of the brief's 4** (domain, application, infrastructure, presentation): with Supabase, "infrastructure" is a few query functions and "application" is the Server Action. Splitting them gives two thin files that only call each other. If a module later gets real multi-step logic (for example investments working out cost basis across many trades), it gets an `application/` folder at that point.

## 5. Folder structure

```
.
├── docs/                       planning docs and ADRs
├── supabase/
│   ├── config.toml
│   ├── migrations/             SQL changes, applied in order; never edited after reaching production
│   ├── seed.sql                fake data for local development
│   └── tests/                  pgTAP database tests (RLS and constraints)
├── src/
│   ├── app/
│   │   ├── (auth)/             login, signup, forgot-password (logged-out pages)
│   │   ├── auth/confirm/       route.ts: handles links from emails (token_hash)
│   │   ├── (app)/              logged-in area: home (/), reset-password, and later the rest
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── accounts/
│   │   │   └── settings/       profile, categories
│   │   ├── layout.tsx
│   │   └── globals.css         design tokens (the only place colours live)
│   ├── modules/                money, auth, accounts, categories, transactions, dashboard
│   ├── components/
│   │   ├── ui/                 shadcn/ui components
│   │   └── shared/             AppShell, BottomNav, MoneyText, EmptyState
│   ├── lib/
│   │   ├── supabase/           server client, proxy helper, database.types.ts (generated)
│   │   └── env.ts              environment variables checked with Zod
│   ├── messages/en.ts          all UI text
│   └── proxy.ts                session refresh and redirect
├── tests/e2e/                  Playwright
└── README.md
```

Changes from the brief's suggested structure, and why:

- Unit tests sit next to the code they test, so they're easy to keep in sync. Only end-to-end tests live in `tests/`.
- There's no `lib/validation`, because Zod schemas belong in their module's `domain/`.
- `lib/utilities` becomes the `money` module, because money is part of the business, not a utility.
- The `budgets/`, `goals/` and `investments/` folders are created in their own phases, not now.

## 6. How data moves

- **Reads:** Server Components call `server/queries.ts`. There is no client-side fetching in the MVP.
- **Cache Components** is on (the Next.js 16.4 default, and it becomes mandatory in the next major version). Data is fresh on every request unless marked `use cache`. Anything that reads the login cookie sits inside `<Suspense>`, while the static shell (layout, nav) appears instantly. Per-user data never goes into a plain `use cache`. `getCurrentUser()` calls `await connection()` first, because Supabase's session check reads the clock, and Next.js only allows that at request time. In plain words: your money data is always fresh, never prepared ahead of time.
- **Writes:** Server Actions in `server/actions.ts`. Each one does: check the user → Zod → database → revalidate → return a typed result.
- **State:** filters, month and sort order live in the URL (`?month=2026-10&account=…`). Form state lives in React. There is no global store (no Zustand) in the MVP.
- **Errors:** actions return `{ ok: true, data } | { ok: false, error: { message, fieldErrors? } }`. Raw database errors are logged on the server and never sent to the browser.
- **Dates:** transaction dates are plain `YYYY-MM-DD` strings. "Today" is worked out in your time zone with `Intl.DateTimeFormat`. No date library in the MVP.

## 7. Where calculations run

| What | Where | Why |
|---|---|---|
| Account balance (all time) | SQL view `account_balances` | It adds up every row ever written; the database does that fastest. |
| Monthly income, expenses, savings rate | TypeScript `domain/`, on that month's rows | A month is roughly 100–300 rows, and pure functions are easy to test and explain. |
| Spending by category | TypeScript `domain/` | Same reason. |

If a TypeScript calculation ever gets slow, it moves to SQL, and the TypeScript tests stay as the reference for the expected results.

## 8. Mobile layout

- On phones, a bottom nav; from 1024 px it becomes a sidebar that stays pinned while you scroll (`src/components/shared/app-nav.tsx`). It only shows pages that exist: today Home · Settings. Later: Home · Transactions · **+** · Accounts · Settings.
- Dark mode follows the phone's setting (CSS `prefers-color-scheme` in `globals.css`). A manual switch waits until after the MVP.
- **+** opens a bottom sheet with the amount field already focused and the number keyboard showing (`inputmode="decimal"`). Below it are category chips (most-used first) and Save. Account and date are filled in already; tap them to change. Target: 2 taps plus typing.
- A switch at the top of the sheet picks Expense, Income or Transfer. Expense is the default.

## 9. Libraries

| Need | Library | Note |
|---|---|---|
| Framework | Next.js (App Router), React, TypeScript in strict mode | |
| Styling | Tailwind CSS v4, shadcn/ui | Tokens in `globals.css` |
| Database and auth | `@supabase/supabase-js`, `@supabase/ssr` | |
| Validation | Zod | Same schemas on client and server |
| Forms | React Hook Form, `@hookform/resolvers` | |
| Charts | Recharts, through shadcn's chart component | Only where a chart explains something |
| Tests | Vitest, Playwright, pgTAP (`supabase test db`) | |

Any other library needs a reason written in its PR.

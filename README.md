# Personal Wallet

A mobile-first personal finance PWA. Track money across cash, bank, card and loan accounts in LAK, USD and THB, then plan budgets, savings goals, net worth and investments. Recording an expense should take a few seconds.

**Status:** Phase 0 (planning). No app code yet. See the [roadmap](docs/roadmap.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (PostgreSQL, Auth, Row Level Security) · Zod · React Hook Form · Recharts · Vitest · Playwright · Vercel

## Engineering highlights (planned)

- Money is stored as a whole number of the currency's smallest unit, always with its currency. No floating-point maths. ([ADR-003](docs/adr/003-money-integer-minor-units.md))
- Balances are worked out from transactions, never stored, so they can't drift. ([ADR-005](docs/adr/005-derived-balances.md))
- A transfer is two linked rows saved together by one database function, and it can never be counted as income or expense. ([ADR-006](docs/adr/006-transactions-as-legs.md))
- Row Level Security plus composite foreign keys make it impossible to reach another user's data at the database level. ([ADR-004](docs/adr/004-supabase-auth-rls.md))
- Every change to a transaction is written to an audit log. ([ADR-007](docs/adr/007-soft-delete-and-audit.md))

## Docs

| Doc | What's in it |
|---|---|
| [brief.md](docs/brief.md) | The original project brief |
| [requirements.md](docs/requirements.md) | Decisions, MVP features, quality requirements |
| [architecture.md](docs/architecture.md) | Modules, folder structure, how data moves |
| [database.md](docs/database.md) | ERD, schema, transaction model, RLS |
| [security.md](docs/security.md) | Auth, keys, layers of protection, checklists |
| [development.md](docs/development.md) | Setup, scripts, testing strategy, Git workflow |
| [roadmap.md](docs/roadmap.md) | Phases, sizes, risks |
| [adr/](docs/adr/) | Architecture Decision Records 001–008 |

## Getting started

Arrives in Phase 1. See [development.md](docs/development.md).

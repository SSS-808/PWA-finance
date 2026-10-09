# Personal Wallet

A mobile-first personal finance PWA. Track money across cash, bank, card and loan accounts in LAK, USD and THB, then plan budgets, savings goals, net worth and investments. Recording an expense should take a few seconds.

**Status:** MVP in progress. Login, settings and accounts work; transactions (Phase 4) are being built. See the [roadmap](docs/roadmap.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (PostgreSQL, Auth, Row Level Security) · Zod · React Hook Form · Recharts · Vitest · Playwright · Vercel

## Engineering highlights (planned)

- Money is stored as a whole number of the currency's smallest unit, always with its currency. No floating-point maths. ([ADR-003](docs/adr/003-money-integer-minor-units.md))
- Balances are worked out from transactions, never stored, so they can't drift. ([ADR-005](docs/adr/005-derived-balances.md))
- A transfer is two linked rows saved together by one database function, and it can never be counted as income or expense. ([ADR-006](docs/adr/006-transactions-as-legs.md))
- Row Level Security plus composite foreign keys make it impossible to reach another user's data at the database level. ([ADR-004](docs/adr/004-supabase-auth-rls.md))
- Every change to a transaction is written to an audit log. ([ADR-007](docs/adr/007-soft-delete-and-audit.md))
- Every query runs as the logged-in user, so the database's own guard (RLS) applies. No ORM holds a master key. ([ADR-009](docs/adr/009-supabase-client-not-orm.md))

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
| [deploy.md](docs/deploy.md) | The step-by-step checklist for going online |
| [adr/](docs/adr/) | Architecture Decision Records 001–009 |

## Getting started

### What is pnpm?

**pnpm** is a *package manager*: a tool that does two jobs.

1. **Downloads the building blocks** (called *packages*) the app is made of, like Next.js and Supabase. They land in the `node_modules/` folder, which isn't in git.
2. **Runs the project's commands.** `pnpm dev` runs the `"dev"` command written in [`package.json`](package.json). Think of `package.json` as a menu, and `pnpm <name>` as ordering from it.

It does the same job as `npm`, but faster and using less disk space.

> ⚠️ **Only use `pnpm` in this project, never `npm` or `yarn`.** The exact versions are pinned in `pnpm-lock.yaml`, and the other tools would ignore that file and could install different versions.

### First time on a computer

You need **Node.js 24**, **pnpm**, and **Docker Desktop** for the local database.

```bash
pnpm install
```
Downloads all the packages. Run it again whenever `package.json` changes (for example after `git pull`).

```bash
pnpm db:start
```
Starts the local database in Docker. **Open Docker Desktop first.** The very first time it downloads a few GB.

Then copy `.env.example` to `.env.local` and fill in the two values printed by `pnpm supabase status` (API URL and Publishable key). `.env.local` is never committed.

```bash
pnpm db:reset
```
Builds the database from the migrations and adds the demo data. The demo login is at the top of `supabase/seed.sql` and only works on your laptop.

```bash
pnpm dev
```
Starts the app at **http://localhost:3000**. Press `Ctrl + C` in the terminal to stop it.

### Everyday commands

| Command | What it does | When to use it |
|---|---|---|
| `pnpm dev` | Runs the app on your laptop and reloads it as code changes | While working |
| `pnpm db:start` | Starts the local database (needs Docker Desktop open) | Start of the day |
| `pnpm db:stop` | Stops it and frees memory; **your data is kept** | End of the day |
| `pnpm db:reset` | Rebuilds the local database from scratch with the demo data. ⚠️ **Erases your local test data** | When local data is a mess, or after pulling new migrations |
| `pnpm install` | Downloads or updates the packages | After `package.json` changes |

### Checks: the same ones the GitHub robot (CI) runs

| Command | What it checks | Needs Docker? |
|---|---|---|
| `pnpm typecheck` | Type mistakes, like text where a number belongs | No |
| `pnpm lint` | Bad habits and our "rooms" rules | No |
| `pnpm format` | **Fixes** spacing and layout automatically (`pnpm format:check` only checks) | No |
| `pnpm test` | The small tests (money maths, rules) | No |
| `pnpm test:coverage` | The same, and fails if money code isn't 100% tested | No |
| `pnpm build` | Builds the real website, the way it'll run online | No |
| `pnpm test:db` | Database safety tests (who can see what) | Yes |
| `pnpm test:e2e` | Robot browser tests: signs up, adds money, checks every screen size | Yes, and `.env.local` |

**Before you commit,** the quick set is enough: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. CI runs the rest on GitHub.

### Less common

| Command | What it does |
|---|---|
| `pnpm db:types` | Updates the TypeScript copy of the database layout. Run it after any new migration. |
| `pnpm supabase status` | Shows the local database addresses and keys |
| `pnpm supabase <command>` | Runs any other Supabase tool command |
| `pnpm add <name>` / `pnpm add -D <name>` | Adds a package (`-D` = only needed while developing). Ask first; every package is something to maintain. |

### Handy local addresses

| Address | What's there |
|---|---|
| http://localhost:3000 | The app |
| http://127.0.0.1:54323 | **Supabase Studio**: look inside your database |
| http://127.0.0.1:54324 | **Mailpit**: the pretend inbox that catches the app's emails |

More detail is in [development.md](docs/development.md).

# ADR-001: Use PostgreSQL (via Supabase), not MongoDB

**Status:** Accepted · 2026-10-09

## In plain words
Our data lives in **tables that point at each other**, like a spreadsheet where every row in a "transactions" sheet points to a row in an "accounts" sheet. PostgreSQL is a database that **refuses broken links and bad data by itself**. Even if our app has a bug, it won't save a transaction for an account that doesn't exist. MongoDB stores loose "documents" and leaves those checks to our code, which is riskier for money.

## Context
Financial data is tightly linked: accounts have transactions, transactions have categories, and transfers link two transactions. We need foreign keys, check constraints, multi-row transactions and grouped totals, and we want the database to enforce the rules even when app code has a bug.

## Decision
Use PostgreSQL, hosted by Supabase, which also gives us Auth and Row Level Security.

## Alternatives
- **MongoDB:** no foreign keys, and integrity rules would live in app code. Grouped totals across collections are awkward. Its strengths (flexible documents, easy sharding) aren't problems we have.
- **SQLite:** excellent locally, but has no managed auth or row-level security for a web app.

## Consequences
- ✅ Integrity is enforced by the database, totals are done in SQL, and access control lives next to the data.
- ✅ It's plain Postgres, so we could move to another host later.
- ⚠️ You need to learn SQL migrations and RLS. That's worth knowing anyway.

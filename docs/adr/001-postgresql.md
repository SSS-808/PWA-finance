# ADR-001: Use PostgreSQL (via Supabase), not MongoDB

**Status:** Accepted · 2026-10-09

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

# ADR-002: One Next.js app, split into modules (modular monolith)

**Status:** Accepted · 2026-10-09

## Context
One developer, one user, one database. We want clear separation between business areas (accounts, transactions, budgets…) without the cost of running several services.

## Decision
One Next.js app deployed to Vercel. Business code lives in `src/modules/<name>/`, and each module has `domain/` (pure logic), `server/` (Supabase queries and Server Actions), `ui/` and an `index.ts` public API. ESLint blocks deep imports across modules and any React or Supabase import inside `domain/`. Details: [architecture.md](../architecture.md).

## Alternatives
- **Microservices:** network calls, separate deploys and keeping data consistent across services cost a lot. That only pays off with several teams.
- **Flat Next.js** (pages query the database directly): fastest at the start, but business logic gets spread across components and is hard to test.
- **Full Clean Architecture** (4 folders per module): with Supabase, the extra folders would mostly hold thin wrappers that just call each other.

## Consequences
- ✅ One deploy and one database, with logic that's easy to test and clear boundaries.
- ✅ A module can get more folders later if it needs them.
- ⚠️ Boundaries rely on discipline and lint rules, not on separate network services.

# ADR-009: Talk to the database through the Supabase client, not an ORM like Prisma

**Status:** Accepted · 2026-10-10

## In plain words
Think of the database as an office building with a locked room for each user. **Prisma would enter with a master key** that opens every room, and our code would have to remember "only open this user's room" on every single query. **The Supabase client enters with the user's own key card** (their login token), and the building itself (RLS) checks the card at every door. Even if our code has a bug and asks for someone else's room, the door stays shut. For money data, the key card is the safer choice.

## Context
The app needs typed, safe access to PostgreSQL from Next.js Server Components and Server Actions. Every table holding user data is protected by Row Level Security ([ADR-004](004-supabase-auth-rls.md)). An ORM such as Prisma or Drizzle is the common alternative in Next.js projects.

## Decision
- **Queries** go through `@supabase/supabase-js`, created per request in `src/lib/supabase/server.ts` with the user's session cookie. Every query therefore runs **as that user**, and RLS applies.
- **The schema** lives in SQL migrations (`supabase/migrations/`), the single source of truth.
- **Types** are generated from the real database (`pnpm db:types` → `src/lib/supabase/database.types.ts`). CI fails if they drift from the migrations.
- **All-or-nothing operations** (`create_account`, `update_account`, `create_transfer`) are PostgreSQL functions called with `.rpc()`. Each call is one database transaction.
- The Supabase **secret key** (which bypasses RLS) isn't used by the app at all.

## Alternatives
- **Prisma (or Drizzle) with a direct database connection:**
  - It connects as a powerful database role that skips RLS, so security would depend on remembering a `where user_id = …` in every query.
  - It needs a database password on the server (one more secret), and a second schema definition kept in sync with the SQL migrations.
  - Making RLS work through an ORM is possible (setting the user per transaction), but fiddly and easy to get subtly wrong.
- **Raw SQL with a Postgres driver:** the same master-key problem, and no generated types.

## Consequences
- ✅ Access control is enforced by the database, and pgTAP tests prove it (`supabase/tests/`).
- ✅ One schema (SQL), with generated types and fewer secrets.
- ✅ Multi-step money operations are atomic by design.
- ⚠️ Queries that join tables are less elegant than an ORM's. Views can't be "embedded", so `listAccounts` merges two queries in TypeScript.
- ⚠️ More logic lives in SQL functions, which is a second language to read and test.
- ↩️ Worth revisiting if the app leaves Supabase, or needs server-only jobs across all users (for example monthly reports for everyone).

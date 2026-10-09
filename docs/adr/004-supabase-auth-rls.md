# ADR-004: Supabase Auth, with Row Level Security as the security boundary

**Status:** Accepted · 2026-10-09

## Context
Financial data must only ever be visible to its owner. The app is single-user today but must support more users without a rewrite. Checks in app code alone fail the first time someone forgets `WHERE user_id = …`.

## Decision
- **Supabase Auth** with email and password. It handles hashing, sessions and emails; we never store passwords.
- **RLS on every table holding user data.** Policies compare `user_id` with `auth.uid()`.
- The app always calls the database **with the user's login token**. The secret key isn't used in the MVP.
- Composite foreign keys that include `user_id` make sure linked rows (account, category) belong to the same user, because foreign-key checks ignore RLS.
- Details: [security.md](../security.md).

## Alternatives
- **Auth.js or custom auth, with checks only in app code:** every query must remember the user filter, so one miss leaks data.
- **Clerk or another hosted auth service:** adds a second vendor, and you still need database-level protection.

## Consequences
- ✅ A forgotten filter in app code can't leak another user's data.
- ✅ Ready for more users from day one.
- ⚠️ RLS must be tested (pgTAP) because its mistakes are silent.
- ⚠️ It's tied to Supabase Auth. Supabase is open source and can be self-hosted, which softens that.

# Security

Phase 0 · 2026-10-09 · Decision: [ADR-004 Supabase Auth + RLS](adr/004-supabase-auth-rls.md)

## 1. What we protect, and from whom

- **What:** your balances, transactions and financial history, and your login.
- **From:** other logged-in users (once there is more than one), anonymous people on the internet, bugs in our own code, leaked keys, and malicious input.

## 2. Layers

Each layer assumes the one above it might fail.

```
1. proxy.ts              redirects logged-out users                 → convenience, NOT security
2. Server Action / page  requireUser() + Zod check                  → rejects bad input early
3. Row Level Security    each row must belong to auth.uid()         → the real gate
4. Constraints and FKs   data must be valid and consistent          → holds even if 1–3 have a bug
```

**Why the proxy isn't security:** in March 2025 a Next.js bug (CVE-2025-29927) let attackers skip middleware entirely by sending one extra HTTP header. Apps that only protected pages in middleware were exposed. Apps that also checked access next to the data (layers 2–4) were not.

## 3. Keys and environment variables

| Variable | Where | Safe in the browser? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, Vercel | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formerly the "anon" key) | `.env.local`, Vercel | Yes, because RLS decides what it can reach |
| Supabase **secret** key (formerly "service_role") | **Not used in the MVP** | **Never.** It skips RLS. |

- Anything prefixed `NEXT_PUBLIC_` is copied into JavaScript that every visitor downloads. Never put a secret there.
- `.env.local` is gitignored. `.env.example` (names only, no values) is committed.
- `src/lib/env.ts` checks the variables with Zod at startup, so a missing one fails loudly instead of quietly.
- You set production values in Vercel's dashboard yourself. They are never pasted into chat or code.

## 4. Authentication

- **Method:** email and password through Supabase Auth, which handles password hashing, sessions and emails. We never store passwords.
- **Email confirmation** is on. Minimum password length is 10 (a Supabase project setting).
- **Sessions:** cookies managed by `@supabase/ssr` and refreshed in `proxy.ts`.
- **Trusting the user on the server:** use `supabase.auth.getClaims()` (or `getUser()`). **Never** use `getSession()` on the server, because it reads the cookie without verifying it.
- **Email links** (confirm sign-up, reset password) point to `/auth/confirm?token_hash=…&type=…`. The route checks the token with `verifyOtp()`, which starts a session. Unlike the older "code" links, these work on any device, not only the one that signed up. The templates are in `supabase/templates/`.
- **Password reset:** email link → `/auth/confirm` (type `recovery`) → `/reset-password` form → `updateUser({ password })` → home with "Your password was changed."
- **No open redirects:** "send me back to the page I wanted" (`?next=`) goes through `safeNextPath()`, which only allows paths on our own site (`/accounts`), never `//evil.com` or `https://…`. Supabase's redirect allow-list holds only `localhost` and the production address.
- **No account fishing:** "Forgot password" shows the same message whether or not an account exists. Sign-up with an existing email also looks like a normal sign-up (Supabase's own protection).
- **No personal data in URLs:** the "check your email" view appears in place on the page, instead of a `?email=` address that would end up in logs and browser history.
- **Later (Phase 12):** two-factor login (TOTP), which Supabase supports. Worth having for a finance app.

## 5. Server Actions are public endpoints

A Server Action looks like a function call, but under the hood it's a public POST endpoint. Anyone can call it with any arguments, not only through your form. So every action:

1. Calls `requireUser()` first.
2. Checks every argument with Zod. Nothing from the client is trusted, including IDs, amounts and user IDs.
3. Never accepts a `user_id` from the client. The database fills it in with `auth.uid()`.
4. Lets RLS and the constraints make the final decision.
5. Returns a safe error message and logs the real one on the server.

## 6. Database functions

| Kind | When | Rules |
|---|---|---|
| `security invoker` (default) | All RPC functions the app calls (`create_transfer` and so on) | Runs as the user, so RLS applies |
| `security definer` | Only triggers that must write where users can't: sign-up, audit, transfer check | Lives in the `private` schema (not exposed by the API) and has `set search_path = ''` |

`set search_path = ''` forces every name to be fully written out (`public.transactions`). That stops an attacker from creating a look-alike table that a powerful function might use by mistake.

Run-permission for RPC functions is taken away from `public` and `anon` and given only to `authenticated`.

## 7. Errors and logging

- The UI shows friendly messages ("That account no longer exists"). It never shows raw Postgres errors, which can reveal table or column names.
- Database errors are mapped by code: `23514` (check failed) → validation message; `23503` (foreign key) → "not found"; anything else → "Something went wrong" plus a server log line.
- Logs never contain amounts tied to names, passwords, tokens or full request bodies.

## 8. Checklist for every new table

- [ ] `user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade`
- [ ] `alter table … enable row level security`
- [ ] Select, insert and update policies `to authenticated`, using `(select auth.uid())`
- [ ] No delete policy, unless hard delete is truly wanted
- [ ] Links to other user-owned rows use a composite FK that includes `user_id`
- [ ] Index on `user_id` and on the foreign-key columns
- [ ] Views use `with (security_invoker = true)`
- [ ] pgTAP test: user B can't read, insert into or update user A's rows; `anon` sees nothing
- [ ] Supabase **Security Advisor** shows no warnings (run it before each release)

## 9. Common mistakes to watch for

1. Forgetting `enable row level security`, which leaves the table readable by anyone holding the publishable key.
2. Creating a view without `security_invoker`, so it skips RLS.
3. Putting `NEXT_PUBLIC_` on a secret, so it ships to every browser.
4. Trusting a `userId` that came from the client.
5. Using a plain foreign key to another user-owned row. FK checks ignore RLS.
6. Calling `getSession()` on the server to decide who the user is.
7. Showing raw database errors in the UI.
8. Checking access only in `proxy.ts` or only in the UI.

## 10. Later

- Content-Security-Policy and other security headers (Phase 12).
- A dependency audit (`pnpm audit`) in CI.
- Rate limiting beyond Supabase Auth's built-in limits, if sign-up opens to the public.

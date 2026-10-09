# Phase 2: Logging in, the front door (2026-10-10)

## In plain words

The house now has a **front door with a lock**, and two rooms you can walk into.

1. **Logging in** (task 2.1):
   - **Sign up:** email and password → "Check your email" → tap the link → you're in. The link works even on a different device.
   - **Log in and log out.** A wrong password gives a clear message, and your email stays filled in.
   - **Forgot password:** you get an email, choose a new password, and see "Your password was changed."
   - **A doorman** (`proxy.ts`): if you're not logged in, any page sends you to the login page, then back to where you wanted to go.
2. **Inside the house** (task 2.2):
   - A **navigation bar**: at the bottom on phones (thumb reach), on the left on computers. It shows only pages that exist (Home, Settings).
   - **Home:** "Hi, your name!" and "your accounts and transactions will appear here soon".
   - **Settings:** your name, main currency (₭ / $ / ฿) and time zone, saved and remembered. Plus Change password and Log out.
   - **Dark mode** turns on automatically when your phone is in dark mode.

Tests: **165** small tests, **81** database tests and **20** robot browser tests. The robots sign up, open the confirmation email in the local inbox, log in and out, reset a password, change settings, and check every screen size.

## Decisions made in this phase

| Decision | Why |
|---|---|
| Function before looks until the MVP (you) | Working, easy screens now; polish later |
| Login style B: big boxes and buttons, one column | Easy to use with one thumb |
| Email links use `token_hash` (`/auth/confirm`) | They work across devices; Supabase's recommended method |
| No email address in web addresses | Addresses end up in history and logs |
| "Forgot password" never says whether an account exists | Strangers can't use it to check emails |
| `safeNextPath`: only send people back to pages on our own site | Blocks the "open redirect" trick |
| Plain forms + server checks (no React Hook Form yet) | 2-field forms don't need it; it comes back for transactions |
| A separate `profile` module | Preferences aren't login logic |
| Time zones: only exact official names (plus UTC) | Odd spellings like `asia/bangkok` can't be saved |
| `await connection()` in `getCurrentUser` | Supabase's login check reads the clock; Next.js only allows that at request time, so money data is always fresh |
| Dark mode follows the phone; no manual switch | The switch is decoration, so it waits for after the MVP |
| Local login rate limits raised | Repeated robot test runs don't hit "Too many tries" (laptop only) |

## Problems we hit (and fixed)

- Next.js keeps the previous page hidden in the background after you move between pages, so the robot tests had to look only at visible boxes.
- The shared "Save / Log in" button had to move to `components/shared`, because a browser-side form can't import the login module, which contains server-only code.
- After saving, the form briefly jumped back to the old values. Fixed by sending the saved values back to the form.
- A Next.js warning appeared ("`Date.now()` while prerendering"), caused by Supabase's session check reading the clock. Fixed with `await connection()`, following Next.js's own guide.
- The sidebar scrolled away on long pages; it's now pinned.

## Numbers

- Commits: `8e9644f` (2.1). Task 2.2 is waiting for your commit.
- Tests: 165 unit (100% coverage on money, profile and calculations), 81 database, 20 E2E.

The full step-by-step tracker is in `.claude/archive/phase-2-task.md` (local only).
